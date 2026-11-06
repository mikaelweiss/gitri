import {consumeScrollPosition, initScrollRestore, saveScrollPosition} from './scroll-restore.ts';
import {hideFirstPaintForScrollRestore} from '../modules/scroll-restore-gate.ts';

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

test('position is consumed once', () => {
  saveScrollPosition('/a', 120);
  expect(consumeScrollPosition('/a')).toBe(120);
  expect(consumeScrollPosition('/a')).toBeNull();
});

test('landing on another path drops the position', () => {
  saveScrollPosition('/a', 120);
  expect(consumeScrollPosition('/b')).toBeNull();
  expect(consumeScrollPosition('/a')).toBeNull();
});

test('the top of the page is not saved', () => {
  saveScrollPosition('/a', 0);
  expect(sessionStorage.length).toBe(0);
});

test('a saved position hides the first paint until DOMContentLoaded', () => {
  hideFirstPaintForScrollRestore();
  expect(document.documentElement.style.visibility).toBe('');
  saveScrollPosition(window.location.pathname, 120);
  hideFirstPaintForScrollRestore();
  expect(document.documentElement.style.visibility).toBe('hidden');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  expect(document.documentElement.style.visibility).toBe('');
});

test('blocked storage is ignored', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') });
  saveScrollPosition('/a', 120);
  expect(consumeScrollPosition('/a')).toBeNull();
});

test('restoring turns flash messages into toasts, except the inline ones', () => {
  document.body.innerHTML = `
    <div class="flash-message flash-success"><div>saved</div></div>
    <div class="flash-message flash-error flash-keep-inline">enroll</div>`;
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  saveScrollPosition(window.location.pathname, 120);
  initScrollRestore();
  document.dispatchEvent(new Event('DOMContentLoaded'));
  expect(scrollTo).toHaveBeenCalledWith({top: 120, behavior: 'instant'});
  expect(document.querySelector('.flash-success')).toBeNull();
  expect(document.querySelector('.flash-keep-inline')).not.toBeNull();
  expect(document.querySelector('.toast-success')!.textContent).toContain('saved');
});
