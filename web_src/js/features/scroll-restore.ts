import {showErrorToast, showInfoToast, showSuccessToast, showWarningToast} from '../modules/toast.ts';
import {scrollRestoreKeyPrefix as keyPrefix} from '../modules/scroll-restore-gate.ts';

export function saveScrollPosition(path = window.location.pathname, scrollY = window.scrollY) {
  if (scrollY <= 0) return; // a page at the top needs no restoring, and keeps its inline flash
  try {
    sessionStorage.setItem(keyPrefix + path, String(scrollY));
  } catch {}
}

// clears every entry, one saved by a form that landed on another path must not fire on a later visit
export function consumeScrollPosition(path: string): number | null {
  try {
    const scrollY = Number(sessionStorage.getItem(keyPrefix + path));
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(keyPrefix)) sessionStorage.removeItem(key);
    }
    return scrollY > 0 ? scrollY : null;
  } catch {
    return null;
  }
}

const flashToasts = {
  'flash-error': showErrorToast,
  'flash-warning': showWarningToast,
  'flash-info': showInfoToast,
  'flash-success': showSuccessToast,
};

function showFlashMessagesAsToasts() {
  for (const [flashClass, showFlashToast] of Object.entries(flashToasts)) {
    for (const el of document.querySelectorAll(`.flash-message.${flashClass}:not(.flash-keep-inline)`)) {
      showFlashToast(el.innerHTML, {useHtmlBody: true});
      el.remove();
    }
  }
}

export function initScrollRestore() {
  const scrollY = consumeScrollPosition(window.location.pathname);
  if (scrollY === null || window.location.hash) return;
  // waits for the other init functions, they can change the page height
  document.addEventListener('DOMContentLoaded', () => {
    showFlashMessagesAsToasts();
    window.scrollTo({top: scrollY, behavior: 'instant'});
  }, {once: true});
}
