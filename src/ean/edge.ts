// Edge variants of the EAN (valid but unusual) – docs/rules/ean.md section 4.
import type { IdentifierVariant } from '../core/types.js';
import { generate } from './generate.js';

/**
 * Names of the edge variants (okrajové případy EAN): `checkDigitZero` has check digit 0, `lds` is a supply
 * point of a local distribution system.
 */
export type EanEdgeVariant = 'checkDigitZero' | 'lds';

/** Edge variants by name. */
export const edge: Readonly<Record<EanEdgeVariant, IdentifierVariant>> = {
  // Catches `10 - S % 10` without the final `% 10`; rejection sampling, 10 draws on average.
  checkDigitZero: (random) => {
    let value = generate(random, {});
    while (!value.endsWith('0')) {
      value = generate(random, {});
    }
    return value;
  },
  // Positions 8–9 are not `00`: catches validators that require 859182400.
  lds: (random) => generate(random, { distributor: 'lds' }),
};
