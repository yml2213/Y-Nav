import { LinkItem, Category } from '../types';

// Simple ID generator using crypto.randomUUID() for modern browsers
// Fallback to timestamp-based ID for older environments
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export interface ParsedBookmarkLink extends LinkItem {
  folderPath: string[];
}

export interface ImportResult {
  links: ParsedBookmarkLink[];
  categories: Category[];
}

export const parseBookmarks = async (file: File): Promise<ImportResult> => {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');

  const links: ParsedBookmarkLink[] = [];
  const categories: Category[] = [];
  const categoryMap = new Map<string, { id: string; name: string }>(); // PathKey -> {id, name}
  const genericRootFolders = new Set(['Bookmarks Bar', '书签栏', 'Other Bookmarks', '其他书签']);

  const normalizeFolderPath = (path: string[]) => {
    const trimmed = path.map(seg => seg.trim()).filter(Boolean);
    // Strip generic root folders like "Bookmarks Bar" / "Other Bookmarks"
    while (trimmed.length > 0 && genericRootFolders.has(trimmed[0])) {
      trimmed.shift();
    }
    return trimmed;
  };

  const getCategoryNameFromPath = (path: string[]) => {
    if (path.length === 0) return 'common';
    return path.join(' / ');
  };

  // Helper to get or create category ID (categories in Y-Nav are flat, so we use full folder path to avoid collisions)
  const getCategoryIdByFolderPath = (folderPath: string[]): string => {
    const normalizedPath = normalizeFolderPath(folderPath);
    const name = getCategoryNameFromPath(normalizedPath);
    if (!name || name === 'common') return 'common';

    const key = JSON.stringify(normalizedPath);
    const existing = categoryMap.get(key);
    if (existing) return existing.id;

    const newId = generateId();
    categories.push({
      id: newId,
      name,
      icon: 'Folder'
    });
    categoryMap.set(key, { id: newId, name });
    return newId;
  };

  // Traverse the DL/DT structure
  // Chrome structure: <DT><H3>Folder Name</H3><DL> ...items... </DL>
  
  const traverse = (element: Element, currentPath: string[]) => {
    const children = Array.from(element.children);
    
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      const tagName = node.tagName.toUpperCase();

      if (tagName === 'DT') {
        // DT can contain an H3 (Folder) or A (Link)
        const h3 = node.querySelector('h3');
        const a = node.querySelector('a');
        const dl = node.querySelector('dl');

        if (h3 && dl) {
            // It's a folder
            const folderName = (h3.textContent || 'Unknown').trim();
            traverse(dl, [...currentPath, folderName]);
        } else if (a) {
            // It's a link
            const title = a.textContent || a.getAttribute('href') || 'No Title';
            const url = a.getAttribute('href');
            
            if (url && !url.startsWith('chrome://') && !url.startsWith('about:')) {
                const folderPath = currentPath.length ? [...currentPath] : [];
                links.push({
                    id: generateId(),
                    title: title,
                    url: url,
                    categoryId: getCategoryIdByFolderPath(folderPath),
                    createdAt: Date.now(),
                    icon: a.getAttribute('icon') || undefined,
                    folderPath
                });
            }
        }
      }
    }
  };

  const rootDl = doc.querySelector('dl');
  if (rootDl) {
    traverse(rootDl, []);
  }

  return { links, categories };
};
