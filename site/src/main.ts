// Entry of every identifier page: holds the state, keeps it in the URL and renders from it. The page names its
// identifier with <body data-id>, so its URL has no `id`. The home page has its own entry (src/home.ts).
// No web fonts: system fonts render Czech well, load instantly and keep the page free of extra requests.
import './style.css';
import { createCz } from 'czech-test-data';
import { IDENTIFIERS, infoOf } from './catalog.js';
import type { IdentifierId } from './catalog.js';
import { renderControls, renderModes, syncDisabled } from './controls.js';
import type { Scope } from './controls.js';
import { byId, byTypedId, copyText, downloadText, h, optionalById, revealInRow } from './dom.js';
import { generateRows, randomSeed, validateLines } from './generate.js';
import type { Row } from './generate.js';
import { buildKit, kitFileName, toCsv, toJson, toTsv } from './kit.js';
import type { KitRow } from './kit.js';
import { explain, renderKit, renderList, renderVerdicts } from './results.js';
import { codeSnippet, cliSnippet, oneCall } from './snippet.js';
import { MAX_COUNT, parseState, serializeState, variantPosition } from './state.js';
import { cz } from './typography.js';
import type { State } from './state.js';

const pageId: IdentifierId | undefined = IDENTIFIERS.find((info) => info.id === document.body.dataset.id)?.id;
// "Today" in UTC exactly as the library computes it, so the page and a fresh createCz() agree.
const today = createCz().referenceDate;
let state = parseState(location.search, { seed: randomSeed(), referenceDate: today }, pageId);
let rows: readonly Row[] = [];
let kitRows: readonly KitRow[] = [];

function query(): string {
  return serializeState(state, pageId === undefined);
}

function renderBig(): void {
  const info = infoOf(state.id);
  const index = Math.min(state.index, rows.length - 1);
  const row = rows[index];
  const value = byId('big-value');
  const verdict = byId('big-verdict');
  if (row === undefined) {
    value.textContent = '';
    verdict.textContent = '';
    byId('big-text').textContent = '';
    byId('big-code').textContent = '';
    return;
  }
  byId('big-code').textContent = oneCall(state, row.variant);
  value.textContent = row.value;
  value.style.setProperty('--len', String(Math.max(row.value.length, 8)));
  value.setAttribute('aria-label', `${row.value}, kliknutím zkopírujete`);
  verdict.className = row.valid ? 'verdict ok' : 'verdict bad';
  verdict.textContent = row.valid ? '✓ Projde validací' : '✗ Neprojde validací';
  const { name, title, text, disputed } = explain(info, state.mode, row);
  const head =
    name === undefined
      ? []
      : [
          h('span', { class: 'variant-head' }, h('strong', {}, title), ' ', h('code', { class: 'name' }, name),
            ...(disputed ? [' ', h('span', { class: 'tag' }, 'sporné')] : [])),
        ];
  byId('big-text').replaceChildren(...head, h('span', {}, text));
  byId('big-pos').textContent = variantPosition(state, rows.length);
}

function renderOutput(): void {
  const outcome = generateRows(state);
  const error = byId('error');
  error.hidden = !('error' in outcome);
  error.textContent = 'error' in outcome ? `Tohle nejde vygenerovat: ${outcome.error}` : '';
  rows = 'error' in outcome ? [] : outcome.rows;
  renderBig();
  const list = optionalById('results');
  if (list !== null) {
    renderList(list, infoOf(state.id), state.mode, rows);
    byTypedId('count', HTMLInputElement).value = String(state.count);
    // In edge and invalid mode the count applies to every variant: "1" may well show six values.
    byId('count-label').textContent = state.mode === 'valid' ? 'Počet' : 'Hodnot od každé varianty';
    byId('code').textContent = codeSnippet(state);
    byId('cli').textContent = cliSnippet(state);
    renderValidation();
  }
  renderKitSection();
}

function renderKitSection(): void {
  const section = byId('kit');
  section.hidden = !state.kit;
  // Once the kit is open, the offer above it has done its job.
  byId('kit-callout').hidden = state.kit;
  if (!state.kit) {
    return;
  }
  const outcome = buildKit(state);
  kitRows = 'error' in outcome ? [] : outcome.rows;
  renderKit(byId('kit-rows'), kitRows);
  // The values stay folded until asked for: the exports above are what most visitors want.
  byId('kit-toggle').textContent = `Zobrazit hodnoty (${String(kitRows.length)})`;
  const accept = kitRows.filter((row) => row.expected === 'přijmout').length;
  byId('kit-summary').textContent = `${String(kitRows.length)} hodnot: ${String(accept)} přijmout, ${String(kitRows.length - accept)} odmítnout`;
}

function renderValidation(): void {
  const input = optionalById('validate-input');
  if (!(input instanceof HTMLTextAreaElement)) {
    return;
  }
  const info = infoOf(state.id);
  input.placeholder = `např. ${info.sample}`;
  const result = validateLines(state, input.value);
  renderVerdicts(byId('validate-results'), info, Array.isArray(result) ? result : []);
}

function renderControlsAll(): void {
  const info = infoOf(state.id);
  renderModes(byId('modes'), state, update);
  const warning = byId('warning');
  // The warning is about real people behind valid values; an invalid value cannot belong to anyone.
  warning.textContent = cz(info.warning ?? '');
  warning.hidden = info.warning === undefined || state.mode === 'invalid';
  renderControls(byId('picker'), byId('advanced'), state, update);
}

function update(change: (current: State) => State, scope: Scope): void {
  state = change(state);
  history.replaceState(null, '', `?${query()}`);
  if (scope === 'controls') {
    renderControlsAll();
  } else {
    syncDisabled(byId('picker'), state);
  }
  renderOutput();
}

/** The next value of the list; after the last one, a new seed. */
function next(): void {
  update((current) => (current.index + 1 < rows.length ? { ...current, index: current.index + 1 } : { ...current, seed: randomSeed(), index: 0 }), 'output');
  byTypedId('seed', HTMLInputElement).value = String(state.seed);
}

function wireListActions(): void {
  const count = optionalById('count');
  if (!(count instanceof HTMLInputElement)) {
    return;
  }
  count.max = String(MAX_COUNT);
  count.addEventListener('input', () => {
    if (count.validity.valid && count.value !== '') {
      update((current) => ({ ...current, count: Number(count.value), index: 0 }), 'output');
    }
  });
  byId('copy-all').addEventListener('click', () => {
    void copyText(rows.map((row) => row.value).join('\n'), `Zkopírováno hodnot: ${String(rows.length)}`);
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    button.addEventListener('click', () => {
      void copyText(byId(button.dataset.copy ?? '').textContent);
    });
  }
  byId('validate-input').addEventListener('input', renderValidation);
}

function wireKitActions(): void {
  byId('kit-open').addEventListener('click', () => {
    update((current) => ({ ...current, kit: true }), 'output');
    byId('kit').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  byId('kit-copy').addEventListener('click', () => {
    void copyText(toTsv(kitRows), `Tabulka zkopírována (${String(kitRows.length)} hodnot), vložte ji do Excelu nebo Jiry`);
  });
  byId('kit-csv').addEventListener('click', () => {
    downloadText(kitFileName(state, 'csv'), toCsv(kitRows), 'text/csv;charset=utf-8');
  });
  byId('kit-json-copy').addEventListener('click', () => {
    void copyText(toJson(state, kitRows), `JSON zkopírován (${String(kitRows.length)} případů)`);
  });
  byId('kit-json').addEventListener('click', () => {
    downloadText(kitFileName(state, 'json'), toJson(state, kitRows), 'application/json');
  });
}

function wireActions(): void {
  byId('next').addEventListener('click', next);
  byId('big-value').addEventListener('click', () => {
    const value = rows[Math.min(state.index, rows.length - 1)]?.value;
    if (value !== undefined) {
      void copyText(value, `Zkopírováno: ${value}`);
    }
  });
  wireListActions();
  wireKitActions();
}

wireActions();
revealInRow(document.querySelector('.nav [aria-current="page"]'));
// The address bar carries the state from the start, so copying it always reproduces the values shown.
history.replaceState(null, '', `?${query()}`);
renderControlsAll();
renderOutput();
