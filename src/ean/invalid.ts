// Invalid variants of the EAN (one fault each) – docs/rules/ean.md section 4.
// Each variant name is the reason code the validator returns for its values.
import { replaceDigitWithLetter } from '../core/letters.js';
import { intExcept } from '../core/random.js';
import type { IdentifierVariant } from '../core/types.js';
import { generate, withCheckDigit } from './generate.js';

/** Names of the invalid variants (neplatné varianty EAN); each is also a reason code of the validator. */
export type EanInvalidVariant = 'badChecksum' | 'wrongLength' | 'letters' | 'wrongPrefix';

const POSITIONS: readonly number[] = Array.from({ length: 18 }, (_, i) => i);

/** Invalid variants by name. */
export const invalid: Readonly<Record<EanInvalidVariant, IdentifierVariant>> = {
  badChecksum: (random) => {
    const value = generate(random, {});
    const correct = Number(value.charAt(17));
    return `${value.slice(0, 17)}${String(intExcept(random, 0, 9, correct))}`;
  },
  // 17 digits (check digit forgotten) or 19.
  wrongLength: (random) => {
    const value = generate(random, {});
    return random.int(0, 1) === 0 ? value.slice(0, 17) : `${value}${random.digits(1)}`;
  },
  letters: (random) => replaceDigitWithLetter(random, generate(random, {}), POSITIONS),
  // Another GS1 Czech block instead of OTE's 1824, check digit recomputed: passes every pure GS1 check.
  wrongPrefix: (random) => {
    const value = generate(random, {});
    const block = String(intExcept(random, 0, 9999, 1824)).padStart(4, '0');
    return withCheckDigit(`859${block}${value.slice(7, 17)}`);
  },
};
