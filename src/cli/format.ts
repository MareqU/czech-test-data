// Output formats (contract: cli.md sections 3 and 4). CSV follows RFC 4180 (https://www.rfc-editor.org/rfc/rfc4180).

/** Output format of `--format`. */
export type Format = 'text' | 'json' | 'csv';

/** Valid values of `--format`. */
export const FORMATS: readonly string[] = ['text', 'json', 'csv'];

/** A generated value. `variant` is absent when unknown (valid values, `random`). */
export interface GeneratedRecord {
  readonly value: string;
  readonly kind: 'valid' | 'edge' | 'invalid';
  readonly variant?: string;
}

/** The result of validating one value. */
export type ValidatedRecord =
  | { readonly value: string; readonly valid: true }
  | { readonly value: string; readonly valid: false; readonly reason: string };

function csvField(field: string): string {
  return /[",\r\n]/u.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
}

function csv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  return [header, ...rows].map((row) => `${row.map(csvField).join(',')}\n`).join('');
}

function json(records: readonly object[]): string {
  return `${JSON.stringify(records, null, 2)}\n`;
}

/** Renders generated values. */
export function renderGenerated(records: readonly GeneratedRecord[], format: Format): string {
  if (format === 'text') return records.map((r) => `${r.value}\n`).join('');
  if (format === 'json') return json(records);
  return csv(['value', 'kind', 'variant'], records.map((r) => [r.value, r.kind, r.variant ?? '']));
}

/** Renders validation results. */
export function renderValidated(records: readonly ValidatedRecord[], format: Format): string {
  if (format === 'text') {
    return records.map((r) => `${r.value}\t${r.valid ? 'valid' : `invalid\t${r.reason}`}\n`).join('');
  }
  if (format === 'json') return json(records);
  return csv(['value', 'valid', 'reason'], records.map((r) => [r.value, String(r.valid), r.valid ? '' : r.reason]));
}
