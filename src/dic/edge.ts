// Edge variants of the DIČ (valid but unusual), rules for dic section 4.
import { pre1954 } from '../birthNumber/edge.js';
import type { IdentifierVariant } from '../core/types.js';
import { generate as generateIco } from '../ico/generate.js';
import { PREFIX, plainBirthNumber, plainInner, withAssignedCheckDigit, withoutSlash } from './generate.js';

/**
 * Names of the edge variants (okrajové případy DIČ): `fromIco` is `CZ` + IČO, `fromBirthNumber` `CZ` + a
 * 10-digit birth number, `lowercasePrefix` (disputed: VIES accepts it, the law writes capitals) starts with
 * `cz`, `pre1954` has a 9-digit birth number, `vatGroup` is the assigned number `CZ699nnnnnk` of a VAT group.
 */
export type DicEdgeVariant = 'fromIco' | 'fromBirthNumber' | 'lowercasePrefix' | 'pre1954' | 'vatGroup';

/** Edge variants by name, in definition order. */
export const edge: Readonly<Record<DicEdgeVariant, IdentifierVariant>> = {
  fromIco: (random) => `${PREFIX}${generateIco(random)}`,
  fromBirthNumber: (random, context) => `${PREFIX}${plainBirthNumber(random, context)}`,
  lowercasePrefix: (random, context) => `${PREFIX.toLowerCase()}${plainInner(random, context)}`,
  pre1954: (random, context) => `${PREFIX}${withoutSlash(pre1954(random, context))}`,
  // 699 + sequence number: the only shape confirmed by ARES `dicSkDph` records.
  vatGroup: (random) => `${PREFIX}${withAssignedCheckDigit(`699${random.digits(5)}`)}`,
};
