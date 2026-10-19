// Result cards of the generator and verdicts of the validator.
import type { IdentifierInfo } from './catalog.js';
import { copyText, h } from './dom.js';
import type { Row } from './generate.js';
import type { Mode } from './state.js';

// The badge already names the fault (an invalid variant fails with the reason of the same name), so the verdict
// only says whether the value passes.
function verdict(row: Row): HTMLElement {
  return row.valid
    ? h('span', { class: 'verdict ok' }, h('span', { 'aria-hidden': 'true' }, '✓ '), 'projde validací')
    : h('span', { class: 'verdict bad' }, h('span', { 'aria-hidden': 'true' }, '✗ '), 'neprojde validací');
}

function description(info: IdentifierInfo, mode: Mode, row: Row): HTMLElement[] {
  if (row.variant !== undefined) {
    const texts = mode === 'edge' ? info.edge : info.invalid;
    const tags = [h('span', { class: 'badge' }, row.variant)];
    if (info.disputed.includes(row.variant)) {
      tags.push(h('span', { class: 'badge disputed', title: 'Platné jen podle některých výkladů pravidel.' }, 'sporné'));
    }
    return [...tags, h('span', { class: 'desc' }, texts[row.variant] ?? '')];
  }
  // A random invalid variant is reported by the validator: its reason has the variant's name (core contract).
  if (mode === 'invalid' && row.reason !== undefined) {
    return [h('span', { class: 'badge' }, row.reason), h('span', { class: 'desc' }, info.invalid[row.reason] ?? '')];
  }
  return mode === 'edge' ? [h('span', { class: 'desc muted' }, 'Náhodná hraniční varianta.')] : [];
}

/** The generated values as cards; clicking a value copies it. */
export function renderResults(list: HTMLElement, info: IdentifierInfo, mode: Mode, rows: readonly Row[]): void {
  list.replaceChildren(
    ...rows.map((row) => {
      const value = h('button', { type: 'button', class: 'value', title: 'Kopírovat' }, row.value);
      value.addEventListener('click', () => {
        void copyText(row.value, `Zkopírováno: ${row.value}`);
      });
      const meta = h('div', { class: 'meta' }, ...description(info, mode, row), verdict(row));
      return h('li', { class: `card kind-${mode}` }, value, meta);
    }),
  );
}

/** Validator verdicts, one per input line, with the Czech meaning of the reason. */
export function renderVerdicts(list: HTMLElement, info: IdentifierInfo, rows: readonly Row[]): void {
  list.replaceChildren(
    ...rows.map((row) => {
      // `white-space: pre` and a background in CSS make leading or trailing spaces visible.
      const shown = h('code', { class: 'input' }, row.value);
      if (row.valid) {
        return h('li', { class: 'verdict-row ok' }, shown, h('span', {}, '✓ platné'));
      }
      const reason = row.reason ?? '';
      return h(
        'li',
        { class: 'verdict-row bad' },
        shown,
        h('span', {}, '✗ ', h('code', {}, reason), ' – ', info.reasons[reason] ?? ''),
      );
    }),
  );
}
