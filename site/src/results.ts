// Filled-in values (one character per box), stamps and notes, for the generator and the validator.
import type { IdentifierInfo } from './catalog.js';
import { copyText, h } from './dom.js';
import type { Row } from './generate.js';
import type { Mode } from './state.js';

const graphemes = new Intl.Segmenter('cs', { granularity: 'grapheme' });

/** A value written into boxes, one character each; a button copies it. Spaces stay visible as empty boxes. */
export function boxes(value: string, copyable: boolean): HTMLElement {
  const style = `--n: ${String(Array.from(graphemes.segment(value)).length)}`;
  if (!copyable) {
    return h('span', { class: 'box-scroll' }, h('span', { class: 'boxes', style }, value));
  }
  const button = h('button', { type: 'button', class: 'boxes', style, title: 'Kopírovat', 'aria-label': `${value}, kopírovat` }, value);
  button.addEventListener('click', () => {
    void copyText(value, `Zkopírováno: ${value}`);
  });
  return h('span', { class: 'box-scroll' }, button);
}

/** The stamp of a validator verdict. */
export function stamp(valid: boolean): HTMLElement {
  return h('span', { class: valid ? 'stamp' : 'stamp bad' }, valid ? 'Platné' : 'Neplatné');
}

function note(info: IdentifierInfo, mode: Mode, row: Row): HTMLElement {
  // A random invalid variant is reported by the validator: its reason has the variant's name (core contract).
  const name = row.variant ?? (mode === 'invalid' ? row.reason : undefined);
  if (name === undefined) {
    return h('span', { class: 'note muted' }, mode === 'edge' ? 'Náhodná hraniční varianta.' : '');
  }
  const texts = mode === 'edge' ? info.edge : info.invalid;
  const parts: (Node | string)[] = [h('code', { class: 'variant' }, name)];
  if (info.disputed.includes(name)) {
    parts.push(h('span', { class: 'disputed', title: 'Platné jen podle některých výkladů pravidel.' }, 'sporné'));
  }
  parts.push(h('span', {}, texts[name] ?? ''));
  return h('span', { class: 'note' }, ...parts);
}

/** The generated values; clicking a value copies it. */
export function renderResults(list: HTMLElement, info: IdentifierInfo, mode: Mode, rows: readonly Row[]): void {
  list.replaceChildren(
    ...rows.map((row) => h('li', { class: `entry kind-${mode}` }, h('span', { class: 'filled' }, boxes(row.value, true), stamp(row.valid)), note(info, mode, row))),
  );
}

/** Validator verdicts, one per input line, with the Czech meaning of the reason. */
export function renderVerdicts(list: HTMLElement, info: IdentifierInfo, rows: readonly Row[]): void {
  list.replaceChildren(
    ...rows.map((row) => {
      const reason = row.reason ?? '';
      const text = row.valid
        ? h('span', { class: 'note muted' }, 'Odpovídá pravidlům.')
        : h('span', { class: 'note' }, h('code', { class: 'variant' }, reason), h('span', {}, info.reasons[reason] ?? ''));
      return h('li', { class: 'entry kind-invalid' }, h('span', { class: 'filled' }, boxes(row.value, false), stamp(row.valid)), text);
    }),
  );
}
