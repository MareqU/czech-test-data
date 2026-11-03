// The home page: every identifier at once, with one valid, one edge and one invalid value ready to copy. A visitor
// who came for data gets it without choosing anything; variants, options and the kit are on the identifier's page.
// Deterministic like the rest of the site: one createCz for the seed and reference date in the URL.
import { createCz } from 'czech-test-data';
import { IDENTIFIERS } from './catalog.js';
import type { IdentifierId, IdentifierInfo } from './catalog.js';
import type { LooseGenerator } from './generate.js';

export type Kind = 'valid' | 'edge' | 'invalid';

export interface Cell {
  readonly kind: Kind;
  /** Empty when the library cannot generate the value for this reference date. */
  readonly value: string;
  /** Czech name of the variant; empty for the valid value. */
  readonly title: string;
}

export interface OverviewRow {
  readonly id: IdentifierId;
  readonly cells: readonly [Cell, Cell, Cell];
}

/** A small integer mix, so the variant shown depends on the seed and differs between identifiers. */
function mix(seed: number, salt: number): number {
  let x = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/** One undisputed variant of `kind`, chosen by the seed. */
function variantOf(info: IdentifierInfo, kind: 'edge' | 'invalid', seed: number, salt: number): string {
  const names = Object.keys(kind === 'edge' ? info.edge : info.invalid).filter((name) => !info.disputed.includes(name));
  return names[mix(seed, salt) % names.length] ?? '';
}

function cell(info: IdentifierInfo, kind: Kind, variant: string, make: () => string): Cell {
  const title = kind === 'valid' ? '' : (info.titles[variant] ?? variant);
  try {
    return { kind, value: make(), title };
  } catch {
    return { kind, value: '', title };
  }
}

/** The table of the home page for a seed and reference date. */
export function buildOverview(seed: number, referenceDate: string): OverviewRow[] {
  const cz = createCz({ seed, referenceDate });
  return IDENTIFIERS.map((info, index) => {
    // The library types are precise per identifier; one loose path serves all nine.
    const generator = cz[info.id] as unknown as LooseGenerator;
    const edge = variantOf(info, 'edge', seed, index * 2);
    const invalid = variantOf(info, 'invalid', seed, index * 2 + 1);
    return {
      id: info.id,
      cells: [
        cell(info, 'valid', '', () => generator()),
        cell(info, 'edge', edge, () => generator.edge(edge)),
        cell(info, 'invalid', invalid, () => generator.invalid(invalid)),
      ],
    };
  });
}
