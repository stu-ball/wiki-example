import { $patchStyleText } from '@lexical/selection'
import {
  activeEditor$,
  Cell,
  createRootEditorSubscription$,
  currentSelection$,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
  directivesPlugin,
  headingsPlugin,
  JsxEditorProps,
  jsxPlugin,
  linkDialogPlugin,
  linkPlugin,
  MDXEditor,
  realmPlugin,
  toolbarPlugin,
  useCellValue,
  useCellValues
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import { $getRoot, $isTextNode, ElementNode, LexicalNode } from 'lexical'
import React, { FC, useEffect, useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import {
  Button,
  FluentProvider,
  Input,
  makeStyles,
  shorthands,
  Switch,
  Text,
  Title3,
  tokens,
  webDarkTheme,
  webLightTheme
} from '@fluentui/react-components'
import { mdxEditorEmojiPickerPlugin } from './emoji/mdxEditorEmojiPickerPlugin'
import { mdxEditorMentionsPlugin } from './mentions/mdxEditorMentionsPlugin'
import './popover-styles.css'
import { dummyMentionsData } from './usersToMention'
import { loadPages, savePages, WikiPage } from './wikiPages'

type TocHeading = { level: number; content: string }

const useStyles = makeStyles({
  app: {
    display: 'flex',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1
  },
  sidebar: {
    width: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalM),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1)
  },
  pageList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS
  },
  pageButton: {
    justifyContent: 'flex-start'
  },
  selectedPageButton: {
    backgroundColor: tokens.colorNeutralBackground3
  },
  main: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    gap: tokens.spacingVerticalM
  },
  toolbarRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM
  },
  titleInput: {
    maxWidth: '560px'
  },
  editorShell: {
    flex: 1,
    minHeight: 0,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground1
  },
  rightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL
  }
})

const currentHeadings$ = Cell<TocHeading[]>([], (r) => {
  r.pub(createRootEditorSubscription$, (editor) => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot()
        const headings: TocHeading[] = []

        for (const node of root.getChildren()) {
          if (node.getType() === 'heading') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const headingNode = node as any
            headings.push({
              level: parseInt(headingNode.getTag().at(1)),
              content: headingNode.getTextContent()
            })
          }
        }

        r.pub(currentHeadings$, headings)
      })
    })
  })
})

const TOCEditor: FC<JsxEditorProps> = () => {
  const headings = useCellValue(currentHeadings$)

  return (
    <div>
      <Text weight="semibold">TOC</Text>
      <ul>
        {headings.map((heading, idx) => (
          <li key={`${heading.level}-${heading.content}-${idx}`}>
            {heading.level} {heading.content}
          </li>
        ))}
      </ul>
    </div>
  )
}

const ColorsToolbar = () => {
  const [currentSelection, activeEditor] = useCellValues(currentSelection$, activeEditor$)

  const currentColor = React.useMemo(() => {
    return (
      activeEditor?.getEditorState().read(() => {
        const selectedNodes = currentSelection?.getNodes() ?? []
        if (selectedNodes.length === 1) {
          let node: ElementNode | LexicalNode | null | undefined = selectedNodes[0]
          let style = ''
          while (!style && node && node !== $getRoot()) {
            if ($isTextNode(node)) {
              style = node.getStyle()
            }
            node = node.getParent()
          }
          return parseStyleString(style).color
        }

        return null
      }) ?? null
    )
  }, [currentSelection, activeEditor])

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="IconButton" aria-label="Choose text color" title="Choose text color">
          Color
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="PopoverContent" sideOffset={5}>
          <>
            {['blue', 'red', 'green', 'orange', null].map((color) => {
              const label = color ?? 'clear'
              return (
                <button
                  key={label}
                  aria-label={`Set color ${label}`}
                  title={`Set color ${label}`}
                  style={{
                    border: currentColor === color ? '2px solid black' : '2px solid gray',
                    width: '20px',
                    height: '20px',
                    backgroundColor: color ?? 'transparent'
                  }}
                  onClick={() => {
                    if (activeEditor !== null && currentSelection !== null) {
                      activeEditor.update(() => {
                        $patchStyleText(currentSelection, { color })
                      })
                    }
                  }}
                />
              )
            })}
          </>
          <Popover.Arrow className="PopoverArrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

const editorPlugins = [
  linkPlugin(),
  mdxEditorMentionsPlugin({
    searchCallback: async (search) => {
      await new Promise((resolve) => setTimeout(resolve, 250))
      return dummyMentionsData.filter((mention) => mention.toLowerCase().includes(search.toLowerCase()))
    }
  }),
  mdxEditorEmojiPickerPlugin(),
  directivesPlugin(),
  linkDialogPlugin({
    onClickLinkCallback(url) {
      console.log(`${url} clicked from the dialog`)
    },
    onReadOnlyClickLinkCallback(e, _node, url) {
      e.preventDefault()
      console.log(`${url} clicked from the dialog in read-only mode`)
    }
  }),
  headingsPlugin(),
  diffSourcePlugin(),
  jsxPlugin({
    jsxComponentDescriptors: [
      {
        name: 'TOCEditor',
        props: [],
        Editor: TOCEditor,
        hasChildren: false,
        kind: 'flow',
        source: 'toc'
      }
    ]
  }),
  toolbarPlugin({
    toolbarContents: () => (
      <DiffSourceToggleWrapper SourceToolbar={<div>Source toolbar</div>}>
        <ColorsToolbar />
      </DiffSourceToggleWrapper>
    )
  }),
  (realmPlugin({ init: (realm) => realm.register(currentHeadings$) }))()
]

export default function App() {
  const styles = useStyles()
  const [pages, setPages] = useState<WikiPage[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(prefersDark)

    const loadedPages = loadPages()
    setPages(loadedPages)
    if (loadedPages.length > 0) {
      setSelectedPageId(loadedPages[0].id)
    }
  }, [])

  const selectedPage = useMemo(() => pages.find((page) => page.id === selectedPageId) ?? null, [pages, selectedPageId])

  function upsertPages(nextPages: WikiPage[]) {
    setPages(nextPages)
    savePages(nextPages)
  }

  function handleCreatePage() {
    const newId = prompt('Page ID (unique, e.g. my-page):')?.trim()
    if (!newId || pages.some((p) => p.id === newId)) {
      return
    }

    const newTitle = prompt('Page title:')?.trim() || newId
    const newPage: WikiPage = {
      id: newId,
      title: newTitle,
      content: `# ${newTitle}\n\nStart writing here...`
    }

    const nextPages = [...pages, newPage]
    upsertPages(nextPages)
    setSelectedPageId(newId)
    setIsEditing(true)
  }

  function handleTitleChange(title: string) {
    if (!selectedPage) {
      return
    }

    const nextPages = pages.map((page) =>
      page.id === selectedPage.id
        ? {
          ...page,
          title
        }
        : page
    )

    upsertPages(nextPages)
  }

  function handleContentChange(markdown: string) {
    if (!selectedPage) {
      return
    }

    const nextPages = pages.map((page) =>
      page.id === selectedPage.id
        ? {
          ...page,
          content: markdown
        }
        : page
    )

    upsertPages(nextPages)
  }

  return (
    <FluentProvider theme={isDark ? webDarkTheme : webLightTheme}>
      <div className={styles.app}>
        <aside className={styles.sidebar}>
          <Title3>Wiki Pages</Title3>

          <div className={styles.pageList}>
            {pages.map((page) => (
              <Button
                key={page.id}
                className={page.id === selectedPageId ? styles.selectedPageButton : styles.pageButton}
                appearance={page.id === selectedPageId ? 'secondary' : 'subtle'}
                onClick={() => setSelectedPageId(page.id)}
              >
                {page.title}
              </Button>
            ))}
          </div>

          <Button appearance="primary" onClick={handleCreatePage}>
            New Page
          </Button>
        </aside>

        <main className={styles.main}>
          {selectedPage && (
            <>
              <div className={styles.toolbarRow}>
                <Input
                  className={styles.titleInput}
                  aria-label="Page title"
                  contentBefore={<Text weight="semibold">Title</Text>}
                  value={selectedPage.title}
                  onChange={(_, data) => handleTitleChange(data.value)}
                />

                <div className={styles.rightControls}>
                  <Switch
                    label={isEditing ? 'Edit mode' : 'Preview mode'}
                    checked={isEditing}
                    onChange={(_, data) => setIsEditing(data.checked)}
                  />
                  <Switch
                    label={isDark ? 'Dark theme' : 'Light theme'}
                    checked={isDark}
                    onChange={(_, data) => setIsDark(data.checked)}
                  />
                </div>
              </div>

              <div className={styles.editorShell}>
                <MDXEditor
                  key={selectedPage.id}
                  readOnly={!isEditing}
                  markdown={selectedPage.content}
                  plugins={editorPlugins}
                  onChange={handleContentChange}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </FluentProvider>
  )
}

function parseStyleString(styleString: string) {
  styleString = styleString.trim().replace(/;$/, '')
  const declarations = styleString.split(';')
  const styles: Record<string, string> = {}

  for (const declaration of declarations) {
    if (!declaration.trim()) {
      continue
    }

    const [property, value] = declaration.split(':').map((str) => str.trim())
    const camelProperty = property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
    styles[camelProperty] = value
  }

  return styles
}
