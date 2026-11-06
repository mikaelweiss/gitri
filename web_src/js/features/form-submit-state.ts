import {shouldTriggerAreYouSure} from '../modules/are-you-sure.ts';
import {saveScrollPosition} from './scroll-restore.ts';

const submittingForms = new Map<HTMLFormElement, {button: HTMLButtonElement | null, timer: ReturnType<typeof setTimeout>}>();

// a response that downloads a file leaves the page in place and fires no event
const maxSubmittingMs = 30 * 1000;

function findSpinnerButton(form: HTMLFormElement, submitter?: HTMLElement | null): HTMLButtonElement | null {
  if (submitter) return submitter instanceof HTMLButtonElement ? submitter : null; // an input can't show the "::after" spinner
  const submitButton = 'button:not([type=button], [type=reset], .cancel)';
  return form.querySelector<HTMLButtonElement>(`${submitButton}.primary`) ?? form.querySelector<HTMLButtonElement>(submitButton) ??
    form.closest('.modal-dialog')?.querySelector<HTMLButtonElement>('.actions :is(.ok, .approve)') ?? null;
}

export function startFormSubmitting(form: HTMLFormElement, submitter?: HTMLElement | null) {
  if (submittingForms.has(form)) return;
  const button = findSpinnerButton(form, submitter);
  // "disabled" would drop the submitter's name and value from the plain form's data
  button?.classList.add('is-loading');
  button?.setAttribute('aria-busy', 'true');
  form.classList.add('form-submitting');
  submittingForms.set(form, {button, timer: setTimeout(() => stopFormSubmitting(form), maxSubmittingMs)});
}

export function stopFormSubmitting(form: HTMLFormElement) {
  const state = submittingForms.get(form);
  if (!state) return;
  clearTimeout(state.timer);
  state.button?.classList.remove('is-loading');
  state.button?.removeAttribute('aria-busy');
  form.classList.remove('form-submitting');
  submittingForms.delete(form);
}

function stopAllFormSubmitting() {
  for (const form of submittingForms.keys()) stopFormSubmitting(form);
}

function onPlainFormSubmit(e: SubmitEvent) {
  const form = e.target as HTMLFormElement;
  if (e.defaultPrevented || !e.isTrusted) return; // an untrusted event never navigates
  const target = e.submitter?.getAttribute('formtarget') || form.getAttribute('target');
  const method = (e.submitter?.getAttribute('formmethod') || form.getAttribute('method') || 'get').toLowerCase();
  if ((target && target !== '_self') || method === 'dialog') return; // the page stays
  if (method === 'post') saveScrollPosition();
  startFormSubmitting(form, e.submitter);
}

export function initFormSubmitState() {
  document.addEventListener('submit', (e) => {
    if (!submittingForms.has(e.target as HTMLFormElement)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, {capture: true});

  window.addEventListener('submit', onPlainFormSubmit); // on window, to run after the delegated document listeners

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) stopAllFormSubmitting();
  });

  // the page survives if the leave dialog is cancelled, timers only run once it closes
  window.addEventListener('beforeunload', () => {
    if (shouldTriggerAreYouSure()) setTimeout(stopAllFormSubmitting, 0);
  });
}
