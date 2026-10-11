// Invalid variants of the EIC (one fault each) – docs/rules/eic.md section 4.
// Each variant name is the reason code the validator returns for its values.
import { intExcept } from '../core/random.js';
import type { IdentifierVariant } from '../core/types.js';
import { ALPHABET, DASH, checkValue, drawBody, generate, withCheck } from './generate.js';

/** Names of the invalid variants (neplatné varianty EIC); each is also a reason code of the validator. */
export type EicInvalidVariant = 'badChecksum' | 'wrongLength' | 'wrongPrefix' | 'dashCheckCharacter';

// ENTSO-E object types other than Z, in Reference Manual § 4.2 order. Order frozen.
const OTHER_TYPES: readonly string[] = ['X', 'Y', 'W', 'T', 'V', 'A'];

/** Invalid variants by name. */
export const invalid: Readonly<Record<EicInvalidVariant, IdentifierVariant>> = {
  badChecksum: (random) => {
    const value = generate(random);
    const correct = ALPHABET.indexOf(value.charAt(15));
    return `${value.slice(0, 15)}${ALPHABET.charAt(intExcept(random, 0, 35, correct))}`;
  },
  // 15 characters (check character forgotten) or 17.
  wrongLength: (random) => {
    const value = generate(random);
    return random.int(0, 1) === 0 ? value.slice(0, 15) : `${value}${random.digits(1)}`;
  },
  // A valid ENTSO-E EIC of another object type (27XG… is the real NET4GAS series); check recomputed.
  wrongPrefix: (random) => {
    let body: string;
    do {
      const value = generate(random);
      body = `27${random.pick(OTHER_TYPES)}${value.slice(3, 15)}`;
    } while (checkValue(body) === DASH);
    return withCheck(body);
  },
  // Passes every naive mod-37 check; only the forbidden "-" is wrong (ERÚ appendix: the DSO skips that number).
  dashCheckCharacter: (random) => {
    let body = drawBody(random, false);
    while (checkValue(body) !== DASH) {
      body = drawBody(random, false);
    }
    return `${body}-`;
  },
};
