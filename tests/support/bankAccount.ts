// Independent oracle for bankAccount, written from docs/rules/bankAccount.md only (sections 1, 2, 8.1 and 9),
// never from src/.

export type OracleReason =
  | 'letters'
  | 'badFormat'
  | 'wrongLength'
  | 'badChecksumPrefix'
  | 'badChecksumNumber'
  | 'zeroNumber'
  | 'unknownBankCode';

export type OracleResult = { readonly valid: true } | { readonly valid: false; readonly reason: OracleReason };

/** The 47 codes of ČKPS version 255 (section 8.1). */
export const BANK_CODES: readonly string[] = (
  '0100 0300 0600 0710 0800 2010 2060 2070 2100 2200 2220 2250 2600 2700 3030 3060 3500 4300 5500 5800 ' +
  '6000 6200 6210 6300 6363 6600 6700 6800 7910 7950 7960 7970 7990 8030 8040 8060 8090 8150 8198 8220 ' +
  '8250 8255 8265 8500 8610 8620 8660'
).split(' ');

/** Frozen `GENERATOR_BANK_CODES` (section 9), in order. */
export const GENERATOR_BANK_CODES: readonly string[] = [
  '0100',
  '0300',
  '0600',
  '0800',
  '2010',
  '2700',
  '3030',
  '5500',
  '6210',
];

/** Frozen `UNKNOWN_BANK_CODES` (section 9). */
export const UNKNOWN_BANK_CODES: readonly string[] = ['0000', '2020', '4000', '6100', '9999'];

const WEIGHTS = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1];

/** `S` of the Příloha with the weights right-aligned to the digits (a shorter part is left-padded with zeros). */
export function sumOf(part: string): number {
  const padded = part.padStart(10, '0');
  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(padded.charAt(i)) * (WEIGHTS[i] ?? 0);
  }
  return sum;
}

/** A part passes when `S mod 11 = 0`. */
export function partPasses(part: string): boolean {
  return sumOf(part) % 11 === 0;
}

/** The digit that makes `head + digit` pass, or `undefined` when only 10 would (not a digit). */
export function correctLastDigit(head: string): number | undefined {
  const digit = (11 - (sumOf(`${head}0`) % 11)) % 11;
  return digit < 10 ? digit : undefined;
}

function lengthsOk(prefix: string | undefined, number: string, code: string): boolean {
  const prefixOk = prefix === undefined || prefix.length <= 6;
  return prefixOk && number.length >= 2 && number.length <= 10 && code.length === 4;
}

function checksumReason(prefix: string | undefined, number: string): OracleReason | undefined {
  if (prefix !== undefined && !partPasses(prefix)) {
    return 'badChecksumPrefix';
  }
  if (!partPasses(number)) {
    return 'badChecksumNumber';
  }
  return /^0+$/.test(number) ? 'zeroNumber' : undefined;
}

/** The whole algorithm of section 2 with the precedence of decision 5. */
export function oracleValidate(value: string): OracleResult {
  if (/\p{L}/u.test(value)) {
    return { valid: false, reason: 'letters' };
  }
  const match = /^(?:([0-9]+)-)?([0-9]+)\/([0-9]+)$/.exec(value);
  if (!match) {
    return { valid: false, reason: 'badFormat' };
  }
  const [, prefix, number = '', code = ''] = match;
  if (!lengthsOk(prefix, number, code)) {
    return { valid: false, reason: 'wrongLength' };
  }
  const reason = checksumReason(prefix, number) ?? (BANK_CODES.includes(code) ? undefined : 'unknownBankCode');
  return reason === undefined ? { valid: true } : { valid: false, reason };
}

/** Splits a written account into its parts (prefix is `undefined` when absent). */
export function partsOf(value: string): {
  prefix: string | undefined;
  number: string;
  code: string;
} {
  const match = /^(?:([0-9]+)-)?([0-9]+)\/([0-9]+)$/.exec(value);
  return {
    prefix: match?.[1],
    number: match?.[2] ?? '',
    code: match?.[3] ?? '',
  };
}
