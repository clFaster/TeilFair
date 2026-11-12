import { useEffect } from 'react';

/**
 * Show `title` in the browser tab while the calling page is mounted.
 * Titles reach history, bookmarks and telemetry: never pass group names or tokens.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
