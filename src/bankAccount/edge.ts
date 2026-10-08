// Edge variants of the bank account (valid but unusual).
import type { IdentifierVariant } from '../core/types.js';
import { drawCode, generate, part } from './generate.js';

/**
 * Names of the edge variants (okrajové případy čísla účtu): `withPrefix` has a prefix, `maxLength` and
 * `minLength` the longest and shortest form, `withLeadingZeros` a zero-padded number, `zeroPrefix` the
 * explicit prefix `000000-`.
 */
export type BankAccountEdgeVariant = 'withPrefix' | 'maxLength' | 'minLength' | 'withLeadingZeros' | 'zeroPrefix';

/** Edge variants by name. */
export const edge: Readonly<Record<BankAccountEdgeVariant, IdentifierVariant>> = {
  withPrefix: (random) => generate(random, { withPrefix: true }),
  maxLength: (random) => `${part(random, 6)}-${part(random, 10)}/${drawCode(random)}`,
  minLength: (random) => `${part(random, 2)}/${drawCode(random)}`,
  // Leading zeros are insignificant (vyhláška 169/2011 Sb., § 5 odst. 1), e.g. in the 16-digit form.
  withLeadingZeros: (random) => `${part(random, random.int(2, 9)).padStart(10, '0')}/${drawCode(random)}`,
  zeroPrefix: (random) => `000000-${part(random, random.int(6, 10))}/${drawCode(random)}`,
};
