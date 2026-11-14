// Edge variants of the VIN (valid but unusual) – docs/rules/vin.md sections 4 and 9.
import type { IdentifierVariant } from '../core/types.js';
import { generate, generateSmallManufacturer, withCheck } from './generate.js';

/**
 * Names of the edge variants (okrajové případy VIN): `checkDigitX` has `X` as check digit, `smallManufacturer` has
 * a `9` in the third position and letters at positions 12–13, `noModelYear` has `0` in position 10.
 */
export type VinEdgeVariant = 'checkDigitX' | 'smallManufacturer' | 'noModelYear';

/** Edge variants by name. */
export const edge: Readonly<Record<VinEdgeVariant, IdentifierVariant>> = {
  // Catches validators that expect a digit at position 9; rejection sampling, 11 draws on average.
  checkDigitX: (random) => {
    let value = generate(random);
    while (value.charAt(8) !== 'X') {
      value = generate(random);
    }
    return value;
  },
  // Catches validators that require positions 12–17 numeric or reject a 9 in position 3.
  smallManufacturer: generateSmallManufacturer,
  // The shape of the EU's own example plates; catches validators that enforce US model year codes.
  noModelYear: (random) => {
    const value = generate(random);
    return withCheck(`${value.slice(0, 9)}0${value.slice(10)}`);
  },
};
