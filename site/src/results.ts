// What the page says about a value: the explanation under the big value, the list of more values and the
// validator verdicts.
import type { IdentifierInfo } from './catalog.js';
import { copyText, h } from './dom.js';
import type { Row } from './generate.js';
import type { KitRow } from './kit.js';
import { cz } from './typography.js';
import type { Mode } from './state.js';

export interface Explanation {
  /** Variant name, or the reason code of an invalid value. */
  readonly name?: string;
  /** Short Czech name of the variant. */
  readonly title: string;
  readonly text: string;
  readonly disputed: boolean;
}

/** Why the value is what it is: the variant's Czech text, or the identifier's format for a plain valid value. */
export function explain(info: IdentifierInfo, mode: Mode, row: Row): Explanation {
  // An invalid value fails with the reason of its variant's name (core contract), so the reason names it too.
  const name = row.variant ?? (mode === 'invalid' ? row.reason : undefined);
  if (mode === 'valid' || name === undefined) {
    return { title: '', text: cz(info.hint), disputed: false };
  }
  const texts = mode === 'edge' ? info.edge : info.invalid;
  return { name, title: cz(info.titles[name] ?? name), text: cz(texts[name] ?? ''), disputed: info.disputed.includes(name) };
}

function mark(valid: boolean): HTMLElement {
  return h('span', { class: valid ? 'mark ok' : 'mark bad' }, valid ? '✓ platné' : '✗ neplatné');
}

/** The list of values; clicking a value copies it. */
export function renderList(list: HTMLElement, info: IdentifierInfo, mode: Mode, rows: readonly Row[]): void {
  list.replaceChildren(
    ...rows.map((row) => {
      const value = h('button', { type: 'button', class: 'value', title: 'Kopírovat' }, row.value);
      value.addEventListener('click', () => {
        void copyText(row.value, `Zkopírováno: ${row.value}`);
      });
      const { name, title, text } = explain(info, mode, row);
      const note = name === undefined ? [] : [h('strong', {}, title), ' ', h('code', { class: 'name' }, name), ' ', text];
      return h('li', { class: 'item' }, value, mark(row.valid), h('span', { class: 'note' }, ...note));
    }),
  );
}

/** Validator verdicts, one per input line, with the Czech meaning of the reason. */
export function renderVerdicts(list: HTMLElement, info: IdentifierInfo, rows: readonly Row[]): void {
  list.replaceChildren(
    ...rows.map((row) => {
      const reason = row.reason ?? '';
      // `white-space: pre` and a background in CSS make leading or trailing spaces visible.
      const value = h('code', { class: 'input' }, row.value);
      const note = row.valid
        ? h('span', { class: 'note' }, 'Odpovídá pravidlům.')
        : h('span', { class: 'note' }, h('code', { class: 'name' }, reason), ' ', cz(info.reasons[reason] ?? ''));
      return h('li', { class: 'item' }, value, mark(row.valid), note);
    }),
  );
}

/** The form-check kit as table rows; clicking a value copies it. On phones CSS stacks each row as a card. */
export function renderKit(body: HTMLElement, rows: readonly KitRow[]): void {
  body.replaceChildren(
    ...rows.map((row) => {
      const value = h('button', { type: 'button', class: 'value', title: 'Kopírovat' }, row.value);
      value.addEventListener('click', () => {
        void copyText(row.value, `Zkopírováno: ${row.value}`);
      });
      // Display only: the kit rows keep plain spaces for the exports.
      const title = h('strong', {}, cz(row.title));
      const variant = row.code === '' ? [title] : [title, ' ', h('code', { class: 'name' }, row.code)];
      const expected = h('span', { class: row.expected === 'přijmout' ? 'mark ok' : 'mark bad' }, row.expected);
      return h(
        'tr',
        { class: `kit-${row.kind}` },
        h('td', { 'data-label': 'Hodnota' }, value),
        h('td', { 'data-label': 'Varianta' }, ...variant),
        h('td', { 'data-label': 'Co testuje', class: 'kit-text' }, cz(row.text)),
        h('td', { 'data-label': 'Očekáváno' }, expected),
      );
    }),
  );
}
