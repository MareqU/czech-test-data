// The generator's controls: identifier switch (home page only), mode switch, the picker (variant chips for edge
// and invalid values, generator options for valid ones) and the advanced fields (seed, reference date).
// Each change goes through `update` with the next state.
import { infoOf } from './catalog.js';
import type { IdentifierInfo, OptionInfo } from './catalog.js';
import { h, revealInRow } from './dom.js';
import { cz } from './typography.js';
import { disabledOptions, withMode } from './state.js';
import type { Mode, State } from './state.js';

/** `controls` re-renders the controls too (identifier or mode changed); `output` only the values. */
export type Scope = 'controls' | 'output';
/** Applies `change` to the current state; handlers never use the state captured when they were rendered. */
export type Update = (change: (current: State) => State, scope: Scope) => void;

export const MODES: Readonly<Record<Mode, { readonly label: string; readonly hint: string }>> = {
  valid: { label: 'Platné', hint: 'Obyčejné, slušně vychované hodnoty.' },
  edge: { label: 'Hraniční', hint: 'Platné, ale zákeřné. Na těch formuláře padají nejčastěji.' },
  invalid: { label: 'Chybné', hint: 'Rozbité schválně a vždy jen jednou chybou. Formulář by je měl odmítnout.' },
};

function segment(selected: boolean, label: string, onPick: () => void): HTMLButtonElement {
  const button = h('button', { type: 'button', role: 'radio', class: 'seg-item', 'aria-checked': String(selected) }, label);
  button.addEventListener('click', onPick);
  return button;
}

/** The valid / edge / invalid switch. */
export function renderModes(container: HTMLElement, state: State, update: Update): void {
  container.replaceChildren(
    ...(Object.keys(MODES) as Mode[]).map((mode) =>
      segment(mode === state.mode, MODES[mode].label, () => {
        update((current) => withMode(current, mode), 'controls');
      }),
    ),
  );
}

function variantChip(info: IdentifierInfo, state: State, update: Update, name: string): HTMLButtonElement {
  const label: (Node | string)[] = [name === 'all' ? 'Všechny po řadě' : cz(info.titles[name] ?? name)];
  if (info.disputed.includes(name)) {
    label.push(h('span', { class: 'tag' }, 'sporné'));
  }
  const texts = state.mode === 'edge' ? info.edge : info.invalid;
  const chip = h(
    'button',
    { type: 'button', role: 'radio', class: 'chip', 'aria-checked': String(state.variant === name), title: texts[name] ?? '' },
    ...label,
  );
  chip.addEventListener('click', () => {
    update((current) => ({ ...current, variant: name, index: 0 }), 'controls');
  });
  return chip;
}

/** Variant chips: always visible, one scrollable row on phones. */
function variantChips(info: IdentifierInfo, state: State, update: Update): HTMLElement {
  const names = Object.keys(state.mode === 'edge' ? info.edge : info.invalid);
  return h(
    'div',
    { class: 'chips', role: 'radiogroup', 'aria-label': 'Varianta' },
    ...['all', ...names].map((name) => variantChip(info, state, update, name)),
  );
}

function optionInput(option: Exclude<OptionInfo, { kind: 'checkbox' }>, id: string, value: string): HTMLInputElement | HTMLSelectElement {
  if (option.kind === 'select') {
    return h(
      'select',
      { id, 'data-key': option.key },
      ...option.choices.map(([choice, label]) => h('option', { value: choice, selected: choice === value }, cz(label))),
    );
  }
  if (option.kind === 'date') {
    return h('input', { type: 'date', id, 'data-key': option.key, value, min: option.min, max: option.max });
  }
  return h('input', { type: 'text', id, 'data-key': option.key, value, placeholder: option.placeholder, spellcheck: 'false' });
}

function optionField(option: OptionInfo, state: State, update: Update): HTMLElement {
  const set = (next: string): void => {
    update((current) => {
      const others = Object.entries(current.options).filter(([key]) => key !== option.key);
      const options = Object.fromEntries(next === '' ? others : [...others, [option.key, next]]);
      return { ...current, options, index: 0 };
    }, 'output');
  };
  const value = state.options[option.key] ?? '';
  const id = `option-${option.key}`;
  if (option.kind === 'checkbox') {
    const input = h('input', { type: 'checkbox', id, 'data-key': option.key, checked: value === 'true' });
    input.addEventListener('change', () => {
      set(input.checked ? 'true' : '');
    });
    return h('label', { class: 'field checkbox', for: id }, input, cz(option.label));
  }
  const input = optionInput(option, id, value);
  input.addEventListener(option.kind === 'text' ? 'input' : 'change', () => {
    set(input.value);
  });
  return h('label', { class: 'field', for: id }, h('span', {}, cz(option.label)), input);
}

function seedField(state: State, update: Update): HTMLElement {
  const input = h('input', { type: 'number', inputmode: 'numeric', id: 'seed', min: '0', max: '4294967295', value: String(state.seed) });
  input.addEventListener('input', () => {
    if (input.validity.valid && input.value !== '') {
      update((current) => ({ ...current, seed: Number(input.value), index: 0 }), 'output');
    }
  });
  return h('label', { class: 'field', for: 'seed', title: 'Stejný seed dává stejné hodnoty.' }, h('span', {}, 'Seed'), input);
}

function dateField(state: State, update: Update): HTMLElement {
  const input = h('input', { type: 'date', id: 'reference-date', value: state.referenceDate });
  input.addEventListener('change', () => {
    if (input.value !== '') {
      update((current) => ({ ...current, referenceDate: input.value, index: 0 }), 'output');
    }
  });
  return h(
    'label',
    { class: 'field', for: 'reference-date', title: 'Vůči tomuto datu se posuzuje budoucí datum narození.' },
    h('span', {}, 'Dnešní datum pro kontrolu'),
    input,
  );
}

/**
 * What to generate: variant chips for edge and invalid values, the identifier's generator options for valid ones
 * (none for identifiers without options). Seed and reference date go to the advanced fields.
 */
export function renderControls(picker: HTMLElement, advanced: HTMLElement, state: State, update: Update): void {
  const info = infoOf(state.id);
  if (state.mode === 'valid') {
    picker.replaceChildren(...info.options.map((option) => optionField(option, state, update)));
    picker.className = 'picker fields';
  } else {
    picker.replaceChildren(variantChips(info, state, update));
    picker.className = 'picker';
  }
  picker.hidden = picker.childElementCount === 0;
  revealInRow(picker.querySelector('.chip[aria-checked="true"]'));
  advanced.replaceChildren(seedField(state, update), ...(info.dateDependent ? [dateField(state, update)] : []));
  syncDisabled(picker, state);
}

/** Disables options excluded by another option, in place, so typing keeps the focus. */
export function syncDisabled(container: HTMLElement, state: State): void {
  const disabled = new Set(disabledOptions(infoOf(state.id), state.options));
  for (const element of container.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-key]')) {
    element.disabled = disabled.has(element.dataset.key ?? '');
  }
}
