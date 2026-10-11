// Edge variants of the EIC (valid but unusual) – docs/rules/eic.md section 4.
import type { IdentifierVariant } from '../core/types.js';
import { generate } from './generate.js';

/**
 * Names of the edge variants (okrajové případy EIC): `checkCharacterDigit` has a digit as check character,
 * `lds` is a point of a local distribution system.
 */
export type EicEdgeVariant = 'checkCharacterDigit' | 'lds';

/** Edge variants by name. */
export const edge: Readonly<Record<EicEdgeVariant, IdentifierVariant>> = {
  // Catches validators that require a letter at position 16; rejection sampling, 3.6 draws on average.
  checkCharacterDigit: (random) => {
    let value = generate(random);
    while (!/\d$/.test(value)) {
      value = generate(random);
    }
    return value;
  },
  // Positions 5–7 are not 100, 200, …: catches whitelists of the big distributors.
  lds: (random) => generate(random, true),
};
