// Invalid variants of the DIČ (one fault each), rules for dic section 4.
// Each variant name is the reason code the validator returns for its values.
import { badChecksum as birthNumberBadChecksum } from '../birthNumber/generate.js';
import type { IdentifierVariant } from '../core/types.js';
import { badChecksum as icoBadChecksum } from '../ico/invalid.js';
import { PREFIX, plainInner, withoutSlash } from './generate.js';

/** Names of the invalid variants (neplatné varianty DIČ); each is also a reason code of the validator. */
export type DicInvalidVariant = 'missingPrefix' | 'foreignPrefix' | 'badInnerChecksum';

// VAT prefixes of the other EU member states, Greece as EL (Directive 2006/112/EC art. 215).
const FOREIGN_PREFIXES: readonly string[] =
  'AT BE BG CY DE DK EE EL ES FI FR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK'.split(' ');

/** Invalid variants by name. */
export const invalid: Readonly<Record<DicInvalidVariant, IdentifierVariant>> = {
  missingPrefix: plainInner,
  foreignPrefix: (random, context) => `${random.pick(FOREIGN_PREFIXES)}${plainInner(random, context)}`,
  badInnerChecksum: (random, context) =>
    `${PREFIX}${random.int(0, 1) === 0 ? icoBadChecksum(random) : withoutSlash(birthNumberBadChecksum(random, context))}`,
};
