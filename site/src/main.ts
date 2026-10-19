// Entry of the page: holds the state, keeps it in the URL and renders everything from it.
// Fonts are bundled (no request to a font service), in line with "nothing leaves the browser".
// Only the Latin subsets: Czech needs latin-ext, and the other scripts would only grow the CSS.
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-ext-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-ext-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-ext-600.css';
import '@fontsource/ibm-plex-sans-condensed/latin-500.css';
import '@fontsource/ibm-plex-sans-condensed/latin-ext-500.css';
import '@fontsource/ibm-plex-sans-condensed/latin-600.css';
import '@fontsource/ibm-plex-sans-condensed/latin-ext-600.css';
import '@fontsource/ibm-plex-sans-condensed/latin-700.css';
import '@fontsource/ibm-plex-sans-condensed/latin-ext-700.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-ext-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-ext-600.css';
import './style.css';
import { createCz } from 'czech-test-data';
import { infoOf } from './catalog.js';
import { MODES, renderControls, renderIdentifiers, renderModes, syncDisabled } from './controls.js';
import type { Scope } from './controls.js';
import { byId, byTypedId, copyText } from './dom.js';
import { renderExamples } from './examples.js';
import { generateRows, randomSeed, validateLines } from './generate.js';
import type { Row } from './generate.js';
import { renderResults, renderVerdicts } from './results.js';
import { codeSnippet, cliSnippet } from './snippet.js';
import { parseState, serializeState, withMode } from './state.js';
import type { State } from './state.js';

// "Today" in UTC exactly as the library computes it, so the page and a fresh createCz() agree.
const today = createCz().referenceDate;
let state = parseState(location.search, { seed: randomSeed(), referenceDate: today });
let lastRows: readonly Row[] = [];

function renderOutput(): void {
  const info = infoOf(state.id);
  const outcome = generateRows(state);
  const error = byId('error');
  if ('error' in outcome) {
    error.textContent = `Hodnoty nejde vygenerovat: ${outcome.error}`;
    error.hidden = false;
    lastRows = [];
  } else {
    error.hidden = true;
    lastRows = outcome.rows;
  }
  renderResults(byId('results'), info, state.mode, lastRows);
  byId('code').textContent = codeSnippet(state);
  byId('cli').textContent = cliSnippet(state);
  renderValidation();
}

function renderValidation(): void {
  const input = byTypedId('validate-input', HTMLTextAreaElement);
  const info = infoOf(state.id);
  input.placeholder = `např. ${info.sample}`;
  const result = validateLines(state, input.value);
  renderVerdicts(byId('validate-results'), info, Array.isArray(result) ? result : []);
}

function renderControlsAll(): void {
  const info = infoOf(state.id);
  renderIdentifiers(byId('identifiers'), state, update);
  renderModes(byId('modes'), state, update);
  byId('hint').textContent = info.hint;
  const warning = byId('warning');
  warning.textContent = info.warning ?? '';
  warning.hidden = info.warning === undefined;
  byId('mode-hint').textContent = MODES[state.mode].hint;
  renderControls(byId('controls'), state, update);
}

function update(change: (current: State) => State, scope: Scope): void {
  state = change(state);
  history.replaceState(null, '', `?${serializeState(state)}`);
  if (scope === 'controls') {
    renderControlsAll();
  } else {
    syncDisabled(byId('controls'), state);
  }
  renderOutput();
}

function newValues(): void {
  update((current) => ({ ...current, seed: randomSeed() }), 'output');
  const seed = byTypedId('seed', HTMLInputElement);
  seed.value = String(state.seed);
}

function wireActions(): void {
  byId('regenerate').addEventListener('click', newValues);
  byId('copy-all').addEventListener('click', () => {
    void copyText(lastRows.map((row) => row.value).join('\n'), `Zkopírováno hodnot: ${String(lastRows.length)}`);
  });
  byId('copy-link').addEventListener('click', () => {
    void copyText(`${location.origin}${location.pathname}?${serializeState(state)}`, 'Odkaz zkopírován – vrátí stejné hodnoty');
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    button.addEventListener('click', () => {
      void copyText(byId(button.dataset.copy ?? '').textContent);
    });
  }
  byId('validate-input').addEventListener('input', renderValidation);
}

renderExamples(byId('examples'), (patch) => {
  update((current) => ({ ...withMode({ ...current, id: patch.id, options: {} }, patch.mode), variant: patch.variant }), 'controls');
  byId('tool').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
wireActions();
// The URL changes only after the first change, so a plain visit keeps a clean address.
renderControlsAll();
renderOutput();
