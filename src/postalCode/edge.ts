// Edge variants of the postal code (PSČ): valid but unusual – docs/rules/postalCode.md section 4.
import type { IdentifierVariant } from '../core/types.js';
import { drawDigits, formatPostalCode } from './generate.js';

/**
 * Names of the edge variants (okrajové případy PSČ): `withoutSpace` is the machine form `NNNNN`,
 * `nonGeographic` the range `20000`–`24999` that is not tied to a region.
 */
export type PostalCodeEdgeVariant = 'withoutSpace' | 'nonGeographic';

/** Edge variants by name. */
export const edge: Readonly<Record<PostalCodeEdgeVariant, IdentifierVariant>> = {
  // RÚIAN stores the PSČ as a 5-digit integer, without a space (ČÚZK VFR, section 3.3.20):
  // https://cuzk.gov.cz/ruian/Poskytovani-udaju-ISUI-RUIAN-VDP/Vymenny-format-RUIAN-(VFR)/DL058RR2-v5-0-Struktura-a-popis-VFR_final.aspx
  withoutSpace: (random) => drawDigits(random),
  // Česká pošta's own seat is 225 99; the official list has 174 codes in 20000–24999 (checked 2026-10-06),
  // https://www.ceskaposta.cz/documents/d/guest/csv_psc_a-zip
  nonGeographic: (random) => formatPostalCode(`2${String(random.int(0, 4))}${random.digits(3)}`),
};
