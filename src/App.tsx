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
import { mdxEditorEmojiPickerPlugin } from './emoji/mdxEditorEmojiPickerPlugin'
import { mdxEditorMentionsPlugin } from './mentions/mdxEditorMentionsPlugin'
import './popover-styles.css'
import { dummyMentionsData } from './usersToMention'
import { loadPages, savePages, WikiPage } from './wikiPages'

type TocHeading = { level: number, content: string }

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
      TOC
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
  const [pages, setPages] = useState<WikiPage[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const loadedPages = loadPages()
    setPages(loadedPages)
    if (loadedPages.length > 0) {
      setSelectedPageId(loadedPages[0].id)
    }
  }, [])

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedPageId) ?? null,
    [pages, selectedPageId]
  )

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
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 240, borderRight: '1px solid #ccc', padding: 12 }}>
        <h3>Wiki Pages</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {pages.map((page) => (
            <li key={page.id}>
              <button
                style={{
                  background: page.id === selectedPageId ? '#eef' : 'transparent',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  padding: 6,
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedPageId(page.id)}
              >
                {page.title}
              </button>
            </li>
          ))}
        </ul>

        <button onClick={handleCreatePage} style={{ marginTop: 12 }}>
          + New Page
        </button>
      </aside>

      <main style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {selectedPage && (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input
                aria-label="Page title"
                title="Page title"
                placeholder="Page title"
                value={selectedPage.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                style={{ fontSize: 20, width: '100%', maxWidth: 500 }}
              />
              <button onClick={() => setIsEditing((v) => !v)}>
                {isEditing ? 'Preview' : 'Edit'}
              </button>
            </div>

            <MDXEditor
              key={selectedPage.id}
              readOnly={!isEditing}
              markdown={selectedPage.content}
              plugins={editorPlugins}
              onChange={handleContentChange}
            />
          </>
        )}
      </main>
    </div>
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
