// Entry of the home page: the overview table and the form-check kit of one identifier. Seed, reference date and
// the open kit are in the URL, so a copied address gives the same values; "Nové hodnoty" draws a new seed.
import './style.css';
import { createCz } from 'czech-test-data';
import { IDENTIFIERS, infoOf } from './catalog.js';
import type { IdentifierId } from './catalog.js';
import { byId, copyText, downloadText, h } from './dom.js';
import { randomSeed } from './generate.js';
import { buildKit, kitFileName, toCsv, toJson, toTsv } from './kit.js';
import type { KitRow } from './kit.js';
import { buildOverview } from './overview.js';
import { renderKit } from './results.js';
import { parseState } from './state.js';
import type { State } from './state.js';
import { cz } from './typography.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const params = new URLSearchParams(location.search);
const seedParam = Number(params.get('seed'));
let seed = Number.isInteger(seedParam) && seedParam > 0 && seedParam <= 0xffffffff ? seedParam : randomSeed();
const dateParam = params.get('date') ?? '';
const referenceDate = DATE.test(dateParam) ? dateParam : createCz().referenceDate;
let kitId: IdentifierId | undefined = IDENTIFIERS.find((info) => info.id === params.get('kit'))?.id;
let kitRows: readonly KitRow[] = [];

/** The kit's state: the identifier's defaults with the page's seed and reference date. */
function kitState(id: IdentifierId): State {
  return { ...parseState('', { seed, referenceDate }, id), kit: true };
}

function writeUrl(): void {
  const query = new URLSearchParams({ seed: String(seed), date: referenceDate });
  if (kitId !== undefined) {
    query.set('kit', kitId);
  }
  history.replaceState(null, '', `?${query.toString()}`);
}

function renderTable(): void {
  for (const row of buildOverview(seed, referenceDate)) {
    for (const item of row.cells) {
      // Same markup as the HTML written at build time (cellHtml in build/pages.ts).
      const value = h('button', { type: 'button', class: 'cell-value', title: 'Kliknutím zkopírujete' }, h('code', {}, item.value || '—'));
      value.addEventListener('click', () => {
        if (item.value !== '') {
          void copyText(item.value, `Zkopírováno: ${item.value}`);
        }
      });
      const title = item.title === '' ? [] : [h('span', { class: 'cell-title' }, cz(item.title))];
      byId(`cell-${row.id}-${item.kind}`).replaceChildren(value, ...title);
    }
  }
}

function renderKitSection(): void {
  const section = byId('kit');
  section.hidden = kitId === undefined;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-kit]')) {
    button.setAttribute('aria-pressed', String(button.dataset.kit === kitId));
  }
  if (kitId === undefined) {
    return;
  }
  byId('kit-title').textContent = `Sada pro ověření formuláře: ${infoOf(kitId).label}`;
  const outcome = buildKit(kitState(kitId));
  kitRows = 'error' in outcome ? [] : outcome.rows;
  renderKit(byId('kit-rows'), kitRows);
  // The values stay folded until asked for: the exports above are what most visitors want.
  byId('kit-toggle').textContent = `Zobrazit hodnoty (${String(kitRows.length)})`;
  const accept = kitRows.filter((row) => row.expected === 'přijmout').length;
  byId('kit-summary').textContent = `${String(kitRows.length)} hodnot: ${String(accept)} přijmout, ${String(kitRows.length - accept)} odmítnout`;
}

function render(): void {
  writeUrl();
  renderTable();
  renderKitSection();
}

byId('new-values').addEventListener('click', () => {
  seed = randomSeed();
  render();
});
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-kit]')) {
  button.addEventListener('click', () => {
    kitId = IDENTIFIERS.find((info) => info.id === button.dataset.kit)?.id;
    render();
    byId('kit').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}
byId('kit-copy').addEventListener('click', () => {
  void copyText(toTsv(kitRows), `Tabulka zkopírována (${String(kitRows.length)} hodnot), vložte ji do Excelu nebo Jiry`);
});
byId('kit-csv').addEventListener('click', () => {
  if (kitId !== undefined) {
    downloadText(kitFileName(kitState(kitId), 'csv'), toCsv(kitRows), 'text/csv;charset=utf-8');
  }
});
byId('kit-json-copy').addEventListener('click', () => {
  if (kitId !== undefined) {
    void copyText(toJson(kitState(kitId), kitRows), `JSON zkopírován (${String(kitRows.length)} případů)`);
  }
});
byId('kit-json').addEventListener('click', () => {
  if (kitId !== undefined) {
    downloadText(kitFileName(kitState(kitId), 'json'), toJson(kitState(kitId), kitRows), 'application/json');
  }
});
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
  button.addEventListener('click', () => {
    void copyText(byId(button.dataset.copy ?? '').textContent);
  });
}
render();
