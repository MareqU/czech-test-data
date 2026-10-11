// Invalid variants of the IBAN (one fault each) – docs/rules/iban.md sections 4 and 9.
// Each variant name is the reason code the validator returns for its values.
import { generate as generateAccount } from '../bankAccount/generate.js';
import { badChecksumNumber, badChecksumPrefix, unknownBankCode, zeroNumber } from '../bankAccount/invalid.js';
import { replaceDigitWithLetter } from '../core/letters.js';
import { intExcept } from '../core/random.js';
import type { IdentifierVariant } from '../core/types.js';
import { generate, toIban } from './generate.js';
import type { IbanReason } from './validate.js';

/** Names of the invalid variants (neplatné varianty IBAN); each is also a reason code of the validator. */
export type IbanInvalidVariant = Exclude<IbanReason, 'badFormat'>;

// Positions 3–24: everything after the country code.
const POSITIONS: readonly number[] = Array.from({ length: 22 }, (_, i) => i + 2);

// These pass a pure ISO 13616 check; only the embedded account is wrong.
function ofAccount(variant: IdentifierVariant): IdentifierVariant {
  return (random, context) => toIban(variant(random, context), 'CZ');
}

/** Invalid variants by name. */
export const invalid: Readonly<Record<IbanInvalidVariant, IdentifierVariant>> = {
  badChecksum: (random) => {
    const value = generate(random, {});
    const correct = Number(value.slice(2, 4));
    return `CZ${String(intExcept(random, 2, 98, correct)).padStart(2, '0')}${value.slice(4)}`;
  },
  // A valid Slovak IBAN of the same account: same structure, only the country differs.
  wrongCountry: (random) => toIban(generateAccount(random, {}), 'SK'),
  // The converter bug: no zero padding, check digits still correct for that string.
  wrongLength: (random) => toIban(generateAccount(random, {}), 'CZ', false),
  letters: (random) => replaceDigitWithLetter(random, generate(random, {}), POSITIONS),
  badChecksumPrefix: ofAccount(badChecksumPrefix),
  badChecksumNumber: ofAccount(badChecksumNumber),
  zeroNumber: ofAccount(zeroNumber),
  unknownBankCode: ofAccount(unknownBankCode),
};
