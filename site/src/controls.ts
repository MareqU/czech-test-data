// The controls of the generator: identifier tabs, the mode switch, variant chips, generator options and the
// common fields (count, seed, reference date). Each change goes through `update` with the next state.
import { IDENTIFIERS, infoOf } from './catalog.js';
import type { IdentifierInfo, OptionInfo } from './catalog.js';
import { h } from './dom.js';
import { MAX_COUNT, disabledOptions, withIdentifier, withMode } from './state.js';
import type { Mode, State } from './state.js';

/** `controls` re-renders the controls too (identifier or mode changed); `output` only the results. */
export type Scope = 'controls' | 'output';
/** Applies `change` to the current state; handlers never use the state captured when they were rendered. */
export type Update = (change: (current: State) => State, scope: Scope) => void;

export const MODES: Readonly<Record<Mode, { readonly label: string; readonly hint: string }>> = {
  valid: { label: 'Platné', hint: 'Běžné platné hodnoty.' },
  edge: {
    label: 'Hraniční',
    hint: 'Platné, ale neobvyklé hodnoty, na kterých aplikace často chybují. Formulář by je měl přijmout.',
  },
  invalid: {
    label: 'Nevalidní',
    hint: 'Každá hodnota má právě jednu pojmenovanou chybu. Formulář by ji měl odmítnout.',
  },
};

/** A form tick box acting as a radio button; `extraClass` styles it, `children` is its label. */
function check(checked: boolean, extraClass: string, onPick: () => void, ...children: (Node | string)[]): HTMLButtonElement {
  const button = h(
    'button',
    { type: 'button', role: 'radio', class: `check ${extraClass}`.trim(), 'aria-checked': String(checked) },
    ...children,
  );
  button.addEventListener('click', onPick);
  return button;
}

/** The identifier tick boxes. */
export function renderIdentifiers(container: HTMLElement, state: State, update: Update): void {
  container.replaceChildren(
    ...IDENTIFIERS.map((info) =>
      check(info.id === state.id, '', () => {
        update((current) => withIdentifier(current, info.id), 'controls');
      }, info.label),
    ),
  );
}

/** The valid / edge / invalid tick boxes. */
export function renderModes(container: HTMLElement, state: State, update: Update): void {
  container.replaceChildren(
    ...(Object.keys(MODES) as Mode[]).map((mode) =>
      check(mode === state.mode, `check-${mode}`, () => {
        update((current) => withMode(current, mode), 'controls');
      }, MODES[mode].label),
    ),
  );
}

function variantCheck(info: IdentifierInfo, state: State, update: Update, value: string): HTMLButtonElement {
  const named = value !== 'all' && value !== 'random';
  const label: (Node | string)[] = named ? [value] : [value === 'all' ? 'všechny varianty' : 'náhodná'];
  if (info.disputed.includes(value)) {
    label.push(h('span', { class: 'tag' }, 'sporné'));
  }
  return check(state.variant === value, named ? 'mono' : '', () => {
    update((current) => ({ ...current, variant: value }), 'controls');
  }, ...label);
}

function variantPicker(info: IdentifierInfo, state: State, update: Update): HTMLElement {
  const texts = state.mode === 'edge' ? info.edge : info.invalid;
  const checks = ['all', 'random', ...Object.keys(texts)].map((value) => variantCheck(info, state, update, value));
  const description =
    texts[state.variant] ??
    (state.variant === 'random' ? 'Každá hodnota z náhodně vybrané varianty.' : 'Od každé varianty zvolený počet hodnot.');
  return h(
    'fieldset',
    { class: 'variants' },
    h('legend', {}, 'Varianta'),
    h(
      'div',
      { class: 'variant-body' },
      h('div', { class: 'checks', role: 'radiogroup', 'aria-label': 'Varianta' }, ...checks),
      h('p', { class: 'variant-hint' }, description),
    ),
  );
}

function optionField(option: OptionInfo, state: State, update: Update): HTMLElement {
  const value = state.options[option.key] ?? '';
  const set = (next: string): void => {
    update((current) => {
      const others = Object.entries(current.options).filter(([key]) => key !== option.key);
      const options = Object.fromEntries(next === '' ? others : [...others, [option.key, next]]);
      return { ...current, options };
    }, 'output');
  };
  const id = `option-${option.key}`;
  if (option.kind === 'checkbox') {
    const input = h('input', { type: 'checkbox', id, 'data-key': option.key, checked: value === 'true' });
    input.addEventListener('change', () => {
      set(input.checked ? 'true' : '');
    });
    return h('label', { class: 'field checkbox' }, input, option.label);
  }
  const input = fieldInput(option, id, value);
  input.addEventListener(option.kind === 'text' ? 'input' : 'change', () => {
    set(input.value);
  });
  return h('label', { class: 'field', for: id }, h('span', {}, option.label), input);
}

function fieldInput(option: Exclude<OptionInfo, { kind: 'checkbox' }>, id: string, value: string): HTMLInputElement | HTMLSelectElement {
  if (option.kind === 'select') {
    return h(
      'select',
      { id, 'data-key': option.key },
      ...option.choices.map(([choice, label]) => h('option', { value: choice, selected: choice === value }, label)),
    );
  }
  if (option.kind === 'date') {
    return h('input', { type: 'date', id, 'data-key': option.key, value, min: option.min, max: option.max });
  }
  return h('input', { type: 'text', id, 'data-key': option.key, value, placeholder: option.placeholder, spellcheck: 'false' });
}

function numberField(label: string, attributes: Readonly<Record<string, string>>, onValue: (value: number) => void): HTMLElement {
  const input = h('input', { type: 'number', inputmode: 'numeric', ...attributes });
  input.addEventListener('input', () => {
    if (input.validity.valid && input.value !== '') {
      onValue(Number(input.value));
    }
  });
  return h('label', { class: 'field small' }, h('span', {}, label), input);
}

function commonFields(info: IdentifierInfo, state: State, update: Update): HTMLElement {
  const count = numberField('Počet', { min: '1', max: String(MAX_COUNT), value: String(state.count), id: 'count' }, (value) => {
    update((current) => ({ ...current, count: value }), 'output');
  });
  const seed = numberField('Seed', { min: '0', max: '4294967295', value: String(state.seed), id: 'seed' }, (value) => {
    update((current) => ({ ...current, seed: value }), 'output');
  });
  const fields = [count, seed];
  if (info.dateDependent) {
    const input = h('input', { type: 'date', id: 'reference-date', value: state.referenceDate });
    input.addEventListener('change', () => {
      if (input.value !== '') {
        update((current) => ({ ...current, referenceDate: input.value }), 'output');
      }
    });
    fields.push(h('label', { class: 'field', title: 'Vůči tomuto datu se posuzuje budoucí datum narození.' }, h('span', {}, 'Referenční datum („dnes“)'), input));
  }
  return h('div', { class: 'fields common' }, ...fields);
}

/** Variant chips or generator options, then the common fields. */
export function renderControls(container: HTMLElement, state: State, update: Update): void {
  const info = infoOf(state.id);
  const specific =
    state.mode === 'valid'
      ? info.options.length > 0
        ? h('div', { class: 'fields' }, ...info.options.map((option) => optionField(option, state, update)))
        : h('p', { class: 'fields variant-hint' }, 'Tento údaj nemá žádné volby.')
      : variantPicker(info, state, update);
  container.replaceChildren(specific, commonFields(info, state, update));
  syncDisabled(container, state);
}

/** Disables options excluded by another option, in place, so typing keeps the focus. */
export function syncDisabled(container: HTMLElement, state: State): void {
  const disabled = new Set(disabledOptions(infoOf(state.id), state.options));
  for (const element of container.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-key]')) {
    element.disabled = disabled.has(element.dataset.key ?? '');
  }
}
