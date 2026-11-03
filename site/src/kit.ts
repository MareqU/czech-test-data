// The form-check kit ("Sada pro ověření formuláře"): everything a tester should try in one form field, as a
// table. Plain valid values, then every edge and every invalid variant once; disputed variants are left out, so
// every row has one clear expected outcome. Deterministic: one createCz for the state's seed and reference date.
import { infoOf } from './catalog.js';
import type { IdentifierInfo } from './catalog.js';
import { parts } from './generate.js';
import type { State } from './state.js';

export type Expected = 'přijmout' | 'odmítnout';

export interface KitRow {
  readonly value: string;
  readonly kind: 'valid' | 'edge' | 'invalid';
  /** Czech name of the variant, or of the plain valid value. */
  readonly title: string;
  /** Variant code; empty for plain valid values. */
  readonly code: string;
  /** What the row tests. */
  readonly text: string;
  readonly expected: Expected;
  /** What the library's validator says, for the page's own consistency check. */
  readonly valid: boolean;
}

export type KitOutcome = { readonly rows: readonly KitRow[] } | { readonly error: string };

function variantRows(info: IdentifierInfo, kind: 'edge' | 'invalid', make: (name: string) => string): Omit<KitRow, 'valid'>[] {
  const texts = kind === 'edge' ? info.edge : info.invalid;
  return Object.keys(texts)
    .filter((name) => !info.disputed.includes(name))
    .map((name) => ({
      value: make(name),
      kind,
      title: info.titles[name] ?? name,
      code: name,
      text: texts[name] ?? '',
      expected: kind === 'edge' ? 'přijmout' : 'odmítnout',
    }));
}

/** The kit for the state's identifier, seed and reference date; a library error becomes `error`. */
export function buildKit(state: State): KitOutcome {
  const info = infoOf(state.id);
  try {
    const { generator, validate } = parts(state.id, state);
    const plain = info.kit.map(
      (valid): Omit<KitRow, 'valid'> => ({
        value: Object.keys(valid.options).length > 0 ? generator(valid.options) : generator(),
        kind: 'valid',
        title: valid.title,
        code: '',
        text: valid.text,
        expected: 'přijmout',
      }),
    );
    const rows = [
      ...plain,
      ...variantRows(info, 'edge', (name) => generator.edge(name)),
      ...variantRows(info, 'invalid', (name) => generator.invalid(name)),
    ].map((row) => ({ ...row, valid: validate(row.value).valid }));
    return { rows };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

const HEADER = ['Hodnota', 'Varianta', 'Kód', 'Co testuje', 'Očekáváno'];

function cells(row: KitRow): string[] {
  return [row.value, row.title, row.code, row.text, row.expected];
}

/** Tab-separated, for pasting into Excel, Google Sheets or a Jira table. Values stay exactly as generated. */
export function toTsv(rows: readonly KitRow[]): string {
  const clean = (cell: string): string => cell.replaceAll(/[\t\r\n]/gu, ' ');
  return [HEADER, ...rows.map(cells)].map((line) => line.map(clean).join('\t')).join('\n');
}

/** One CSV field: quoted, with doubled quotes, when it holds `;`, `"`, a line break or edge spaces. */
export function csvField(cell: string): string {
  return /[;"\r\n]|^\s|\s$/u.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

/**
 * A value as a CSV field: always the Excel text formula ="…", or Excel would reinterpret it. 06541186 would lose
 * its leading zero, an 18-digit EAN would become 8,59E+17, "+420 601 123 456" would start a formula and "110 00"
 * might turn into a number: the very bugs the kit is meant to find. Quotes inside double up in the formula, and
 * a field with `;` or `"` is quoted as a whole (e.g. a;b → "=""a;b""").
 */
export function csvValue(value: string): string {
  const formula = `="${value.replaceAll('"', '""')}"`;
  return /[;"\r\n]/u.test(value) ? `"${formula.replaceAll('"', '""')}"` : formula;
}

/** CSV for Excel with Czech settings: UTF-8 with BOM (diacritics), `;` as separator, CRLF line ends. */
export function toCsv(rows: readonly KitRow[]): string {
  const lines = [
    HEADER.map((cell) => csvField(cell)).join(';'),
    ...rows.map((row) => cells(row).map((cell, index) => (index === 0 ? csvValue(cell) : csvField(cell))).join(';')),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** One test case of the JSON export; keys and variant codes are the library's, so they stay stable. */
export interface KitCase {
  readonly id: string;
  readonly value: string;
  /** What the form should do: accept (`true`) or reject (`false`). */
  readonly valid: boolean;
  readonly kind: KitRow['kind'];
  /** Library variant code, `null` for a plain valid value. */
  readonly variant: string | null;
  /** Czech description of what the case tests. */
  readonly description: string;
}

/**
 * JSON for data-driven tests: an array of cases with the values exactly as generated, ready to load as a fixture
 * (`for (const c of cases) test(c.variant ?? 'valid', ...)`).
 */
export function toJson(state: State, rows: readonly KitRow[]): string {
  const cases = rows.map(
    (row): KitCase => ({
      id: state.id,
      value: row.value,
      valid: row.expected === 'přijmout',
      kind: row.kind,
      variant: row.code === '' ? null : row.code,
      description: row.text,
    }),
  );
  return `${JSON.stringify(cases, null, 2)}\n`;
}

/** File name of an export, e.g. `sada-ico-seed-42.csv`. */
export function kitFileName(state: State, extension: 'csv' | 'json'): string {
  return `sada-${infoOf(state.id).slug}-seed-${String(state.seed)}.${extension}`;
}
