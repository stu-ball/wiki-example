// src/wikiPages.ts
// Wiki page store with localStorage persistence

export type WikiPage = {
  id: string;
  title: string;
  content: string;
};

const STORAGE_KEY = 'wiki-pages';

export function loadPages(): WikiPage[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fallback to initial
    }
  }
  return initialPages;
}

export function savePages(pages: WikiPage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
}

export const initialPages: WikiPage[] = [
  {
    id: 'home',
    title: 'Home',
    content: `# Welcome to the Wiki\n\nThis is the home page. Use the sidebar to navigate or create new pages.`
  },
  {
    id: 'example',
    title: 'Example Page',
    content: `# Example Page\n\nThis is an example wiki page. You can edit or create more pages!`
  }
];
