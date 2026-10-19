// Code and CLI equivalents of a state; both produce exactly the values shown on the page (see generate.ts).
import { infoOf } from './catalog.js';
import type { IdentifierInfo } from './catalog.js';
import { libraryOptions } from './generate.js';
import type { State } from './state.js';
import { activeOptions } from './state.js';

function tsString(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function tsOptions(info: IdentifierInfo, state: State): string {
  const entries = Object.entries(libraryOptions(info, state.options));
  if (entries.length === 0) {
    return '';
  }
  const fields = entries.map(([key, value]) => `${key}: ${typeof value === 'boolean' ? String(value) : tsString(value)}`);
  return `{ ${fields.join(', ')} }`;
}

function repeated(call: string, count: number): string {
  return count === 1 ? call : `Array.from({ length: ${String(count)} }, () => ${call})`;
}

function tsCall(info: IdentifierInfo, state: State): string {
  const generator = `cz.${info.id}`;
  if (state.mode === 'valid') {
    return repeated(`${generator}(${tsOptions(info, state)})`, state.count);
  }
  const method = `${generator}.${state.mode}`;
  if (state.variant === 'random') {
    return repeated(`${method}()`, state.count);
  }
  if (state.variant === 'all') {
    const list = `${generator}.${state.mode}Variants`;
    return state.count === 1
      ? `${list}.map((variant) => ${method}(variant))`
      : `${list}.flatMap((variant) => ${repeated(`${method}(variant)`, state.count)})`;
  }
  return repeated(`${method}(${tsString(state.variant)})`, state.count);
}

/** TypeScript (or JavaScript) that returns the values of the page. */
export function codeSnippet(state: State): string {
  const info = infoOf(state.id);
  const date = info.dateDependent ? `, referenceDate: ${tsString(state.referenceDate)}` : '';
  return [
    "import { createCz } from 'czech-test-data';",
    '',
    `const cz = createCz({ seed: ${String(state.seed)}${date} });`,
    `${tsCall(info, state)};`,
  ].join('\n');
}

function shellWord(value: string): string {
  return /^[\w./:+-]+$/u.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`;
}

function cliOptions(info: IdentifierInfo, state: State): string[] {
  const options = activeOptions(info, state.options);
  return info.options.flatMap((option) => {
    const value = options[option.key];
    if (value === undefined) {
      return [];
    }
    if (option.kind === 'checkbox') {
      return value === 'true' ? [`--${option.cli}`] : [];
    }
    return [`--${option.cli}`, shellWord(value)];
  });
}

/** The CLI command that prints the values of the page. */
export function cliSnippet(state: State): string {
  const info = infoOf(state.id);
  const words = ['npx', 'czech-test-data', info.cli];
  if (state.mode === 'valid') {
    words.push(...cliOptions(info, state));
  } else {
    words.push(`--${state.mode}`, shellWord(state.variant));
  }
  if (state.count !== 1) {
    words.push('--count', String(state.count));
  }
  words.push('--seed', String(state.seed));
  if (info.dateDependent) {
    words.push('--reference-date', state.referenceDate);
  }
  return words.join(' ');
}
