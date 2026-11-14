// Invalid variants of the VIN (one fault each) – docs/rules/vin.md sections 4 and 9.
// Each variant name is the reason code the validator returns for its values.
import { replaceDigitWithLetter } from '../core/letters.js';
import { intExcept } from '../core/random.js';
import type { IdentifierVariant } from '../core/types.js';
import { CHECK, FORBIDDEN, LETTERS, generate, withCheck } from './generate.js';

/** Names of the invalid variants (neplatné varianty VIN); each is also a reason code of the validator. */
export type VinInvalidVariant = 'badChecksum' | 'wrongLength' | 'forbiddenLetter' | 'nonNumericSerial';

// Order frozen: replaceDigitWithLetter draws among these positions (determinism contract).
const ALL_POSITIONS: readonly number[] = Array.from({ length: 17 }, (_, index) => index);
const SERIAL_POSITIONS: readonly number[] = [13, 14, 15, 16];

/** Invalid variants by name. */
export const invalid: Readonly<Record<VinInvalidVariant, IdentifierVariant>> = {
  badChecksum: (random) => {
    const value = generate(random);
    const wrong = intExcept(random, 0, CHECK.length - 1, CHECK.indexOf(value.charAt(8)));
    return `${value.slice(0, 8)}${CHECK.charAt(wrong)}${value.slice(9)}`;
  },
  // 16 characters (last one dropped) or 18.
  wrongLength: (random) => {
    const value = generate(random);
    return random.int(0, 1) === 0 ? value.slice(0, 16) : `${value}${random.digits(1)}`;
  },
  // The classic O/0 and I/1 typo, anywhere in the VIN.
  forbiddenLetter: (random) => replaceDigitWithLetter(random, generate(random), ALL_POSITIONS, FORBIDDEN),
  // Check digit recomputed, so no pure check-digit validator notices it.
  nonNumericSerial: (random) =>
    withCheck(replaceDigitWithLetter(random, generate(random), SERIAL_POSITIONS, LETTERS)),
};
