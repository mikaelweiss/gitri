import {initFormSubmitState, startFormSubmitting, stopFormSubmitting} from './form-submit-state.ts';

afterEach(() => document.body.replaceChildren());

function createForm() {
  document.body.innerHTML = `<form method="post"><button class="cancel">c</button><button id="save">s</button></form>`;
  return document.querySelector('form')!;
}

test('the default button shows the state until stopped', () => {
  const form = createForm();
  const button = form.querySelector('#save')!;
  startFormSubmitting(form);
  expect(button.classList.contains('is-loading')).toBe(true);
  expect(form.classList.contains('form-submitting')).toBe(true);
  stopFormSubmitting(form);
  expect(button.classList.contains('is-loading')).toBe(false);
  expect(form.classList.contains('form-submitting')).toBe(false);
});

test('quick submit spins the primary button, a modal form spins its action button', () => {
  document.body.innerHTML = `<form><button id="close">c</button><button id="comment" class="primary">s</button></form>`;
  const form = document.querySelector('form')!;
  startFormSubmitting(form);
  expect(document.querySelector('#comment')!.classList.contains('is-loading')).toBe(true);
  stopFormSubmitting(form);

  document.body.innerHTML = `<dialog class="modal-dialog"><form></form><div class="actions"><button type="button" class="approve">s</button></div></dialog>`;
  const modalForm = document.querySelector('form')!;
  startFormSubmitting(modalForm);
  expect(document.querySelector('.approve')!.classList.contains('is-loading')).toBe(true);
  stopFormSubmitting(modalForm);
});

test('a submitting form blocks another submit', () => {
  initFormSubmitState();
  const form = createForm();
  const onSubmit = vi.fn((e: Event) => e.preventDefault());
  form.addEventListener('submit', onSubmit);
  startFormSubmitting(form);
  form.requestSubmit();
  expect(onSubmit).not.toHaveBeenCalled();
  stopFormSubmitting(form);
  form.requestSubmit();
  expect(onSubmit).toHaveBeenCalledOnce();
});
