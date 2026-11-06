export const scrollRestoreKeyPrefix = 'scroll-restore:';

// lives apart from "features/scroll-restore.ts" so the blocking bundle stays free of the toast code
export function hideFirstPaintForScrollRestore() {
  try {
    if (window.location.hash || !sessionStorage.getItem(scrollRestoreKeyPrefix + window.location.pathname)) return;
    document.documentElement.style.visibility = 'hidden';
    document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.visibility = '' }, {once: true});
  } catch {}
}
