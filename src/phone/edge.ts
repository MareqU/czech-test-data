// Edge variants of the phone number (telefonní číslo): valid but unusual – docs/rules/phone.md section 4.
// Forms of the international prefix: § 4 odst. 2 and 3 of vyhláška č. 117/2007 Sb.
// (https://www.zakonyprolidi.cz/cs/2007-117); E.164 form: ITU-T E.164.
import type { Random } from '../core/random.js';
import type { IdentifierVariant } from '../core/types.js';
import { drawMobile, formatPhone, group } from './generate.js';

/**
 * Names of the edge variants (okrajové případy telefonního čísla): valid numbers in unusual forms or ranges.
 */
export type PhoneEdgeVariant = 'withoutSpaces' | 'withoutCountryCode' | 'digitsOnly' | 'prefix00' | 'newMobileRange' | 'voip';

// 706–719 became public mobile on 4. 2. 2022 (vyhláška č. 22/2022 Sb.,
// https://www.epravo.cz/top/zakony/sbirka-zakonu/sb/2022/22).
const NEW_MOBILE_FIRST = 706;
const NEW_MOBILE_LAST = 719;
// 910–919 is designated for VoIP (vyhláška č. 267/2009 Sb.,
// https://www.epravo.cz/top/zakony/sbirka-zakonu/sb/2009/267); 910 is the one valid here (decision 3).
const VOIP_PREFIX = '910';

/** Edge variants by name; each value passes the validator. */
export const edge: Readonly<Record<PhoneEdgeVariant, IdentifierVariant>> = {
  withoutSpaces: (random: Random) => `+420${drawMobile(random)}`,
  withoutCountryCode: (random: Random) => group(drawMobile(random)),
  digitsOnly: (random: Random) => drawMobile(random),
  prefix00: (random: Random) => `00420 ${group(drawMobile(random))}`,
  newMobileRange: (random: Random) => formatPhone(String(random.int(NEW_MOBILE_FIRST, NEW_MOBILE_LAST)) + random.digits(6)),
  voip: (random: Random) => formatPhone(VOIP_PREFIX + random.digits(6)),
};
