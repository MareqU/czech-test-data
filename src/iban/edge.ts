// Edge variants of the IBAN (valid but unusual) – iban rules, sections 4 and 9.
import type { IdentifierVariant } from '../core/types.js';
import { generate } from './generate.js';

/**
 * Names of the edge variants (okrajové případy IBAN): `withSpaces` is the written form, `lowercase` lower
 * case (disputed: official sources require upper case), `withPrefix` has a prefix, `checkDigitsLeadingZero`
 * check digits 02–09.
 */
export type IbanEdgeVariant = 'withSpaces' | 'lowercase' | 'withPrefix' | 'checkDigitsLeadingZero';

/** Edge variants by name. */
export const edge: Readonly<Record<IbanEdgeVariant, IdentifierVariant>> = {
  // Groups of 4 separated by a space (EBS204 § 5.2).
  withSpaces: (random) => generate(random, {}).replace(/(.{4})(?=.)/g, '$1 '),
  lowercase: (random) => generate(random, {}).toLowerCase(),
  withPrefix: (random) => generate(random, { withPrefix: true }),
  checkDigitsLeadingZero: (random) => {
    for (;;) {
      const value = generate(random, {});
      if (value.charAt(2) === '0') {
        return value;
      }
    }
  },
};
