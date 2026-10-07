// Specification of validateBirthNumber (rodné číslo) – docs/rules/birthNumber.md sections 1, 2, 3, 5 and 8,
// docs/rules/core.md sections 3 and 4 (amendment A1).
// Every literal sample below was computed twice by the test-writer: with the oracle in
// tests/support/birthNumber.ts and with an independent BigInt `N mod 11` plus the alternating digit sum.
// The "why" column states the decisive arithmetic, so each case can be re-checked by hand.
import fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vitest';
import { validateBirthNumber } from '../src/birthNumber/index.js';
import type { BirthNumberReason } from '../src/birthNumber/index.js';
import {
  IMPOSSIBLE_DATES,
  MALFORMED_DATES,
  addDays,
  dateArb,
  localDateOf,
  restoreClock,
  setClock,
} from './support/helpers.js';
import { decodeBirthNumber, mod11, oracleValidate } from './support/birthNumber.js';

/** The reference date ("today") of every sample in section 5 of the rules. */
const REFERENCE_DATE = '2026-10-04';

const PROPERTY_RUNS = 3000;

function expectValid(value: string, referenceDate = REFERENCE_DATE): void {
  expect(validateBirthNumber(value, { referenceDate })).toEqual({ valid: true });
}

function expectReason(value: string, reason: BirthNumberReason, referenceDate = REFERENCE_DATE): void {
  expect(validateBirthNumber(value, { referenceDate })).toEqual({ valid: false, reason });
}

afterEach(() => {
  restoreClock();
});

describe('known samples (section 5) – valid, reference date 2026-10-04', () => {
  it.each([
    { value: '905501/1251', why: 'worked example: F 1990-05-01, N9=905501125 ≡ 1 → check digit 1' },
    { value: '9055011251', why: 'withoutSlash: the same number without the slash' },
    { value: '540101/0010', why: 'first 10-digit day: M 1954-01-01, N9 ≡ 0 → check digit 0' },
    { value: '500715/123', why: 'pre1954: M 1950-07-15, 9 digits, no checksum' },
    { value: '536231/001', why: 'pre1954, last day: F 1953-12-31 (month 62 − 50 = 12)' },
    { value: '040229/123', why: 'pre1954 + leapDay: M 1904-02-29, 1904 is a leap year' },
    { value: '000229/0013', why: 'leapDay: M 2000-02-29, 2000 is a leap year; N9 ≡ 3 → 3' },
    { value: '245229/1237', why: 'leapDay: F 2024-02-29; N9 ≡ 7 → 7' },
    { value: '600615/0140', why: 'mod11Exception: M 1960-06-15, N9 ≡ 10 → check digit 0, N10 ≡ 1' },
    { value: '850101/0090', why: 'mod11Exception, last year: M 1985-01-01, N9 ≡ 10' },
    { value: '102315/1239', why: 'month+20: M 2010-03-15; N9 ≡ 9 → 9' },
    { value: '158130/4582', why: 'month+70: F 2015-11-30; N9 ≡ 2 → 2' },
    { value: '261004/0081', why: 'birth date equal to the reference date: M 2026-10-04; N9 ≡ 1 → 1' },
  ])('accepts $value ($why)', ({ value }) => {
    expectValid(value);
  });

  it('decodes the worked example 905501/1251 as a woman born 1990-05-01 (oracle self-check)', () => {
    expect(decodeBirthNumber('905501/1251')).toMatchObject({ gender: 'female', date: '1990-05-01' });
  });
});

describe('known samples (section 5) – invalid, reference date 2026-10-04', () => {
  it.each<{ value: string; reason: BirthNumberReason; why: string }>([
    { value: '9055011234', reason: 'badChecksum', why: 'spec example; N10 ≡ 5' },
    { value: '905501/1252', reason: 'badChecksum', why: 'worked example with the last digit + 1; N10 ≡ 1, N9 ≡ 1 ≠ 10' },
    { value: '230229/1233', reason: 'impossibleDate', why: '2023 is not a leap year; checksum OK' },
    { value: '000229/123', reason: 'impossibleDate', why: '9 digits means 1900, which is not a leap year' },
    { value: '901301/0061', reason: 'impossibleDate', why: 'month 13; checksum OK' },
    { value: '900132/0031', reason: 'impossibleDate', why: 'day 32; checksum OK' },
    { value: '900431/0051', reason: 'impossibleDate', why: '31 April; checksum OK' },
    { value: '904001/0100', reason: 'impossibleDate', why: 'month 40; checksum OK' },
    { value: '902101/003', reason: 'impossibleDate', why: '+20 month on a 9-digit number' },
    { value: '90550112', reason: 'wrongLength', why: '8 digits' },
    { value: '90550112510', reason: 'wrongLength', why: '11 digits' },
    { value: '905501/12', reason: 'wrongLength', why: '8 digits with a slash' },
    { value: '905501/125A', reason: 'letters', why: 'letter A' },
    { value: '9O5501/1251', reason: 'letters', why: 'letter O instead of zero' },
    { value: '905501 1251', reason: 'badFormat', why: 'space as separator' },
    { value: '905501-1251', reason: 'badFormat', why: 'hyphen as separator' },
    { value: ' 9055011251', reason: 'badFormat', why: 'surrounding whitespace, not trimmed' },
    { value: '90550/11251', reason: 'badFormat', why: 'misplaced slash' },
    { value: '300101/0111', reason: 'futureDate', why: 'M 2030-01-01; checksum OK' },
    { value: '261005/0091', reason: 'futureDate', why: 'M 2026-10-05 = reference date + 1 day; checksum OK' },
  ])('rejects $value with $reason ($why)', ({ value, reason }) => {
    expectReason(value, reason);
  });
});

describe('formerly disputed samples – approved results (section 5, decisions 1, 2, 3 and 6)', () => {
  it('rejects 860101/0100 with badChecksum: the remainder-10 exception ends with birth year 1985 (decision 1)', () => {
    expectReason('860101/0100', 'badChecksum');
  });

  it('accepts 600615/0140 as a mod11Exception number born 1960 (decision 1)', () => {
    expectValid('600615/0140');
  });

  it('accepts 902101/0031: +20 for a man born 1990, not only from 2004 (decision 2)', () => {
    expectValid('902101/0031');
  });

  it('accepts the 9-digit 905501125 as a woman born 1890-05-01 (decision 3)', () => {
    expectValid('905501125');
  });

  it('accepts the 9-digit 540101/001 as a man born 1854-01-01 (decision 3)', () => {
    expectValid('540101/001');
  });

  it('accepts the zero ending 540111/0000 because 540111 = 11 × 49101 (decision 6)', () => {
    expectValid('540111/0000');
  });

  it('accepts the 9-digit zero ending 500715/000 (decision 6)', () => {
    expectValid('500715/000');
  });
});

describe('step 1 – characters and separator (decision 4)', () => {
  it.each(['A', 'a', 'O', 'l', 'e', 'x', 'č', 'Ž', 'ß', 'Ж', 'Ω', '中', 'ª'])(
    'rejects a number containing the letter %j with letters',
    (letter) => {
      expectReason(`905501/125${letter}`, 'letters');
      expectReason(`${letter}055011251`, 'letters');
    },
  );

  it.each([
    { value: 'abc', why: 'letters only' },
    { value: '1e10', why: 'exponent notation' },
    { value: '0x1F', why: 'hexadecimal notation' },
    { value: 'RČ 905501/1251', why: 'a label in front' },
  ])('rejects $value with letters ($why)', ({ value }) => {
    expectReason(value, 'letters');
  });

  it.each([
    { value: '905501 1251', why: 'space as separator' },
    { value: '905501-1251', why: 'hyphen as separator' },
    { value: '905501.1251', why: 'dot as separator' },
    { value: '905501\\1251', why: 'backslash as separator' },
    { value: '905501_1251', why: 'underscore as separator' },
    { value: '905501\t1251', why: 'tab as separator' },
    { value: '905501 1251', why: 'no-break space as separator' },
    { value: ' 9055011251', why: 'leading space, not trimmed' },
    { value: '9055011251 ', why: 'trailing space, not trimmed' },
    { value: '9055011251\n', why: 'trailing newline, not trimmed' },
    { value: '+9055011251', why: 'plus sign' },
    { value: '-9055011251', why: 'minus sign' },
    { value: '905501/125😀', why: 'an emoji is not a letter' },
    { value: '９０５５０１/１２５１', why: 'full-width digits are not 0-9' },
    { value: '٩٠٥٥٠١/١٢٥١', why: 'Arabic-Indic digits are not 0-9' },
    { value: '905501/125Ⅻ', why: 'a Roman numeral is a number (Nl), not a letter (L)' },
    { value: '905501/1251́', why: 'a combining mark is not a letter' },
  ])('rejects $value with badFormat ($why)', ({ value }) => {
    expectReason(value, 'badFormat');
  });

  it.each([
    { value: '90550/11251', why: 'after the 5th digit' },
    { value: '9055011/251', why: 'after the 7th digit' },
    { value: '/9055011251', why: 'in front' },
    { value: '9055011251/', why: 'at the end' },
    { value: '905501//1251', why: 'twice' },
    { value: '905501/1251/', why: 'a second slash at the end' },
    { value: '905501/125/1', why: 'a second slash inside the ending' },
    { value: '/', why: 'a lone slash' },
    { value: '12345/6', why: 'after the 5th digit of a short value' },
    { value: '1234567/89', why: 'after the 7th digit of a short value' },
  ])('rejects a slash $why ($value) with badFormat', ({ value }) => {
    expectReason(value, 'badFormat');
  });

  it('accepts a slash right after the 6th digit and no slash at all', () => {
    expectValid('905501/1251');
    expectValid('9055011251');
    expectValid('500715/123');
    expectValid('500715123');
  });
});

describe('step 2 – length: the digit count without the slash must be 9 or 10', () => {
  const digits = '12345678901234567890';

  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 15, 20])('rejects %i digits without a slash with wrongLength', (length) => {
    expectReason(digits.slice(0, length), 'wrongLength');
  });

  it.each([6, 7, 8, 11, 12, 20])('rejects %i digits with a slash after the 6th digit with wrongLength', (length) => {
    const value = digits.slice(0, length);
    expectReason(`${value.slice(0, 6)}/${value.slice(6)}`, 'wrongLength');
  });

  it('rejects the empty string with wrongLength', () => {
    expectReason('', 'wrongLength');
  });

  it('does not count the slash: 905501/12 has 8 digits, 905501/12510 has 11', () => {
    expectReason('905501/12', 'wrongLength');
    expectReason('905501/12510', 'wrongLength');
  });
});

describe('step 4 – month and sex', () => {
  // 10 digits, 1990, day 01, each with a correct checksum (N10 ≡ 0), so the month is the only possible fault.
  it.each([
    { value: '900101/1239', month: '01', why: 'man, January' },
    { value: '901201/1239', month: '12', why: 'man, December' },
    { value: '905101/1233', month: '51', why: 'woman (+50), January' },
    { value: '906201/1233', month: '62', why: 'woman (+50), December' },
    { value: '902101/1230', month: '21', why: 'man, additional series (+20), January' },
    { value: '903201/1230', month: '32', why: 'man, additional series (+20), December' },
    { value: '907101/1235', month: '71', why: 'woman, additional series (+70), January' },
    { value: '908201/1235', month: '82', why: 'woman, additional series (+70), December' },
  ])('accepts the 10-digit month $month ($why)', ({ value }) => {
    expectValid(value);
  });

  it.each([
    { value: '900001/1240', month: '00' },
    { value: '901301/1238', month: '13' },
    { value: '902001/1231', month: '20' },
    { value: '903301/1240', month: '33' },
    { value: '905001/1234', month: '50' },
    { value: '906301/1232', month: '63' },
    { value: '907001/1236', month: '70' },
    { value: '908301/1234', month: '83' },
    { value: '909901/1240', month: '99' },
  ])('rejects the 10-digit month $month with impossibleDate although the checksum is correct', ({ value }) => {
    expect(mod11(value.replace('/', ''))).toBe(0);
    expectReason(value, 'impossibleDate');
  });

  it.each([
    { value: '500101/123', month: '01' },
    { value: '501201/123', month: '12' },
    { value: '505101/123', month: '51' },
    { value: '506201/123', month: '62' },
  ])('accepts the 9-digit month $month', ({ value }) => {
    expectValid(value);
  });

  it.each([
    { value: '500001/123', month: '00', why: 'no such month' },
    { value: '501301/123', month: '13', why: 'no such month' },
    { value: '502001/123', month: '20', why: 'no such month' },
    { value: '502101/123', month: '21', why: '+20 is 10-digit only (§ 13 odst. 5)' },
    { value: '503201/123', month: '32', why: '+20 is 10-digit only' },
    { value: '505001/123', month: '50', why: 'no such month' },
    { value: '506301/123', month: '63', why: 'no such month' },
    { value: '507101/123', month: '71', why: '+70 is 10-digit only' },
    { value: '508201/123', month: '82', why: '+70 is 10-digit only' },
    { value: '509901/123', month: '99', why: 'no such month' },
  ])('rejects the 9-digit month $month with impossibleDate ($why)', ({ value }) => {
    expectReason(value, 'impossibleDate');
  });

  it('rejects +20 on a 9-digit number from the 1854–1899 range too (542101/001)', () => {
    expectReason('542101/001', 'impossibleDate');
  });

  it('accepts +20 and +70 for the earliest 10-digit year 1954 (decision 2)', () => {
    // 542101 + 001: N9 = 542101001 ≡ 2 → check digit 2; 547101 + 001: N9 = 547101001 ≡ 7 → 7.
    expect(mod11('5421010012')).toBe(0);
    expect(mod11('5471010017')).toBe(0);
    expectValid('542101/0012');
    expectValid('547101/0017');
  });
});

describe('step 5 – century (section 1, decision 3)', () => {
  it('reads a 9-digit RR 00–53 as 1900–1953: 300101/123 is 1930, so not in the future', () => {
    expectValid('300101/123');
    expectValid('531231/123');
  });

  it('reads a 10-digit RR 00–53 as 2000–2053: 531231/1235 is 2053-12-31', () => {
    expectReason('531231/1235', 'futureDate');
    expectValid('531231/1235', '2053-12-31');
    expectReason('531231/1235', 'futureDate', '2053-12-30');
  });

  it('reads a 10-digit RR 54–99 as 1954–1999: 540101/0010 is 1954-01-01, not 2054', () => {
    expectValid('540101/0010');
    expectValid('540101/0010', '1954-01-01');
    expectReason('540101/0010', 'futureDate', '1953-12-31');
  });

  it('reads a 9-digit RR 54–99 as 1854–1899: 540101/001 is 1854-01-01', () => {
    expectValid('540101/001', '1854-01-01');
    expectReason('540101/001', 'futureDate', '1853-12-31');
  });

  it('reads the 9-digit 990101/123 as 1899-01-01, not 1999', () => {
    expectValid('990101/123', '1900-06-01');
    expectReason('990101/123', 'futureDate', '1898-12-31');
  });
});

describe('step 6 – calendar date', () => {
  it.each([
    { value: '900131/1231', why: '31 January' },
    { value: '900430/1240', why: '30 April' },
    { value: '900228/1233', why: '28 February 1990' },
    { value: '901231/1231', why: '31 December' },
    { value: '500131/123', why: '31 January, 9 digits' },
    { value: '505430/123', why: '30 April, woman, 9 digits' },
  ])('accepts the last day of the month: $value ($why)', ({ value }) => {
    expectValid(value);
  });

  it.each([
    { value: '900100/1240', why: 'day 00' },
    { value: '900132/0031', why: 'day 32' },
    { value: '900229/1232', why: '29 February 1990' },
    { value: '905431/1233', why: '31 April, woman' },
    { value: '902230/1233', why: '30 February, +20' },
    { value: '907431/1235', why: '31 April, +70' },
    { value: '902229/1234', why: '29 February 1990, +20' },
    { value: '905229/1237', why: '29 February 1990, woman' },
    { value: '907229/1239', why: '29 February 1990, +70' },
    { value: '500100/123', why: 'day 00, 9 digits' },
    { value: '500132/123', why: 'day 32, 9 digits' },
    { value: '500431/123', why: '31 April, 9 digits' },
  ])('rejects a day outside the month with impossibleDate: $value ($why)', ({ value }) => {
    expectReason(value, 'impossibleDate');
  });

  it.each([
    { value: '000229/0013', year: 2000, why: 'divisible by 400' },
    { value: '920229/1230', year: 1992, why: 'divisible by 4' },
    { value: '960229/1237', year: 1996, why: 'divisible by 4' },
    { value: '040229/1230', year: 2004, why: 'divisible by 4' },
    { value: '245229/1237', year: 2024, why: 'divisible by 4' },
    { value: '520229/123', year: 1952, why: 'divisible by 4, 9 digits' },
    { value: '040229/123', year: 1904, why: 'divisible by 4, 9 digits' },
    { value: '960229/123', year: 1896, why: 'divisible by 4, 9 digits in the 1854–1899 range' },
  ])('accepts 29 February $year ($why): $value', ({ value }) => {
    expectValid(value);
  });

  it.each([
    { value: '000229/123', year: 1900, why: 'divisible by 100 but not by 400' },
    { value: '530229/123', year: 1953, why: 'not divisible by 4' },
    { value: '970229/123', year: 1897, why: 'not divisible by 4' },
    { value: '970229/1236', year: 1997, why: 'not divisible by 4' },
    { value: '230229/1233', year: 2023, why: 'not divisible by 4' },
    { value: '300229/1237', year: 2030, why: 'not divisible by 4' },
  ])('rejects 29 February $year with impossibleDate ($why): $value', ({ value }) => {
    expectReason(value, 'impossibleDate');
  });
});

describe('step 7 – checksum, 10 digits only', () => {
  it('accepts every 10-digit number divisible by 11 whose date is real and not in the future', () => {
    expectValid('905501/1251');
    expectValid('9055011251');
  });

  it('rejects every other last digit of the worked example with badChecksum', () => {
    for (const last of ['0', '2', '3', '4', '5', '6', '7', '8', '9']) {
      expectReason(`905501/125${last}`, 'badChecksum');
    }
  });

  it('accepts a 9-digit number whatever its remainder modulo 11 (no checksum before 1954)', () => {
    // 500715123 ≡ 7, 505430123 ≡ 0, 505101123 ≡ 10.
    expectValid('500715/123');
    expectValid('505430/123');
    expectValid('505101/123');
  });

  describe('the remainder-10 exception (mod11Exception, decision 1)', () => {
    it.each([
      { value: '540101/0110', why: 'first day of 1954' },
      { value: '600615/0140', why: 'man, 1960' },
      { value: '605615/0090', why: 'woman, 1960' },
      { value: '850101/0090', why: 'first day of 1985' },
      { value: '851231/0060', why: 'last day of 1985' },
      { value: '702101/0030', why: 'man, +20, 1970 (decisions 1 and 2 together)' },
      { value: '757101/0030', why: 'woman, +70, 1975 (decisions 1 and 2 together)' },
      { value: '540101/0000', why: 'zero ending: 540101000 ≡ 10' },
    ])('accepts N9 ≡ 10 with check digit 0 for a birth year 1954–1985: $value ($why)', ({ value }) => {
      const digits = value.replace('/', '');
      expect(mod11(digits.slice(0, 9))).toBe(10);
      expect(mod11(digits)).toBe(1);
      expectValid(value);
    });

    it.each([
      { value: '860101/0100', why: 'first day of 1986' },
      { value: '990101/0010', why: '1999' },
      { value: '870101/0000', why: 'zero ending, 1987' },
      { value: '100101/0110', why: '10-digit RR 10 is 2010, not 1910' },
      { value: '535101/0050', why: 'woman, 2053' },
    ])('rejects N9 ≡ 10 with check digit 0 outside 1954–1985 with badChecksum: $value ($why)', ({ value }) => {
      expect(mod11(value.replace('/', '').slice(0, 9))).toBe(10);
      expectReason(value, 'badChecksum');
    });

    it('rejects N9 ≡ 10 with a last digit other than 0 in 1960 (600615/0141)', () => {
      expectReason('600615/0141', 'badChecksum');
    });

    it('rejects a last digit 0 in 1960 when N9 is not ≡ 10 (600615/0130, N9 ≡ 9)', () => {
      expect(mod11('600615013')).toBe(9);
      expectReason('600615/0130', 'badChecksum');
    });
  });

  describe('zero endings (decision 6)', () => {
    it('accepts /0000 when RRMMDD itself is divisible by 11 (540111/0000)', () => {
      expectValid('540111/0000');
    });

    it('rejects /0000 with badChecksum when the number is not divisible by 11 (905501/0000 ≡ 3)', () => {
      expectReason('905501/0000', 'badChecksum');
    });

    it('accepts the 9-digit /000 in both centuries (500715/000, 540101/000, 990101/000)', () => {
      expectValid('500715/000');
      expectValid('540101/000');
      expectValid('990101/000');
    });
  });
});

describe('step 8 – future date', () => {
  it('accepts a birth date equal to the reference date and rejects the next day with futureDate', () => {
    expectValid('261004/0081', '2026-10-04');
    expectReason('261005/0091', 'futureDate', '2026-10-04');
    expectValid('261005/0091', '2026-10-05');
  });

  it('compares across a month end and a year end', () => {
    expectValid('261031/1231', '2026-10-31');
    expectReason('261101/1238', 'futureDate', '2026-10-31');
    expectValid('261231/1240', '2026-12-31');
    expectReason('270101/1236', 'futureDate', '2026-12-31');
  });

  it('decodes +20 and +70 before comparing: 263105/1236 is 2026-11-05, 268205/1240 is 2026-12-05', () => {
    expectReason('263105/1236', 'futureDate');
    expectReason('268205/1240', 'futureDate');
    expectValid('262105/1235');
    expectValid('267105/1240');
  });

  it('never rejects a 9-digit number as future after 1953 (they map to 1854–1953)', () => {
    expectValid('531231/123', '1954-01-01');
    expectValid('991231/123', '1954-01-01');
  });
});

describe('reason precedence (decision 7): letters → badFormat → wrongLength → impossibleDate → badChecksum → futureDate', () => {
  it.each<{ value: string; reason: BirthNumberReason; faults: string }>([
    { value: '9O5501 1251', reason: 'letters', faults: 'letter + space' },
    { value: '905501-125A', reason: 'letters', faults: 'letter + hyphen' },
    { value: '905501/12A', reason: 'letters', faults: 'letter + 8 characters' },
    { value: '9055/0112A', reason: 'letters', faults: 'letter + misplaced slash' },
    { value: '300101/011A', reason: 'letters', faults: 'letter + future year 2030' },
    { value: '905501 12', reason: 'badFormat', faults: 'space + 8 digits' },
    { value: '1234567/89', reason: 'badFormat', faults: 'misplaced slash + 9 digits' },
    { value: '901301 0061', reason: 'badFormat', faults: 'space + month 13' },
    { value: '905501 1252', reason: 'badFormat', faults: 'space + bad checksum' },
    { value: '300101 0111', reason: 'badFormat', faults: 'space + future date' },
    { value: '90130100', reason: 'wrongLength', faults: '8 digits + month 13' },
    { value: '90130100610', reason: 'wrongLength', faults: '11 digits + month 13' },
    { value: '30010101110', reason: 'wrongLength', faults: '11 digits + future year' },
    { value: '901301/0060', reason: 'impossibleDate', faults: 'month 13 + bad checksum (N10 ≡ 10)' },
    { value: '300229/1237', reason: 'impossibleDate', faults: '29 February 2030 + future year' },
    { value: '301332/0001', reason: 'impossibleDate', faults: 'month 13 + day 32 + bad checksum + future year' },
    { value: '300101/0110', reason: 'badChecksum', faults: 'bad checksum (N10 ≡ 10) + 2030-01-01 in the future' },
    { value: '261005/0090', reason: 'badChecksum', faults: 'bad checksum + the day after the reference date' },
  ])('returns $reason for $value ($faults)', ({ value, reason }) => {
    expectReason(value, reason);
  });
});

describe('referenceDate option (docs/rules/core.md section 3, amendment A1)', () => {
  it('uses the current UTC date when the option is omitted, also when the local date is already tomorrow', () => {
    setClock('2026-10-04T23:30:00Z', 'Europe/Prague');
    expect(localDateOf(new Date())).toBe('2026-10-05');
    expect(validateBirthNumber('261004/0081')).toEqual({ valid: true });
    expect(validateBirthNumber('261005/0091')).toEqual({ valid: false, reason: 'futureDate' });
    expect(validateBirthNumber('261005/0091', {})).toEqual({ valid: false, reason: 'futureDate' });
  });

  it('uses the current UTC date when the option is omitted, also when the local date is still yesterday', () => {
    setClock('2026-10-05T00:30:00Z', 'America/Los_Angeles');
    expect(localDateOf(new Date())).toBe('2026-10-04');
    expect(validateBirthNumber('261005/0091')).toEqual({ valid: true });
    expect(validateBirthNumber('261006/0101')).toEqual({ valid: false, reason: 'futureDate' });
  });

  it('prefers the referenceDate option over the clock', () => {
    setClock('2030-06-15T12:00:00Z', 'UTC');
    expect(validateBirthNumber('261005/0091', { referenceDate: '2026-10-04' })).toEqual({
      valid: false,
      reason: 'futureDate',
    });
  });

  it.each(MALFORMED_DATES)('throws RangeError naming referenceDate for the malformed option %j', (referenceDate) => {
    expect(() => validateBirthNumber('905501/1251', { referenceDate })).toThrow(RangeError);
    expect(() => validateBirthNumber('905501/1251', { referenceDate })).toThrow(/referenceDate/);
    expect(() => validateBirthNumber('not a birth number', { referenceDate })).toThrow(RangeError);
  });

  it.each(IMPOSSIBLE_DATES)('throws RangeError naming referenceDate for the impossible option $date ($why)', ({ date }) => {
    expect(() => validateBirthNumber('905501/1251', { referenceDate: date })).toThrow(/referenceDate/);
  });
});

// --- Property-based tests against the oracle ----------------------------------------------------------

const pad2 = (value: number): string => String(value).padStart(2, '0');

/** Months and days around every boundary of section 2, plus anything 00–99. */
const monthArb = fc
  .oneof(fc.constantFrom(0, 1, 12, 13, 20, 21, 32, 33, 50, 51, 62, 63, 70, 71, 82, 83, 99), fc.integer({ min: 0, max: 99 }))
  .map(pad2);
const dayArb = fc.oneof(fc.constantFrom(0, 1, 28, 29, 30, 31, 32), fc.integer({ min: 0, max: 99 })).map(pad2);
const digitsArb = (length: number): fc.Arbitrary<string> =>
  fc.array(fc.integer({ min: 0, max: 9 }), { minLength: length, maxLength: length }).map((list) => list.join(''));

/** 9 digits, 10 random digits, or 10 digits whose check digit is `N9 mod 11 mod 10` (normal or exception). */
const numberArb = fc
  .tuple(fc.integer({ min: 0, max: 99 }).map(pad2), monthArb, dayArb, digitsArb(3), fc.constantFrom('nine', 'random', 'check'), digitsArb(1))
  .map(([yy, mm, dd, sequence, kind, randomLast]) => {
    const prefix = `${yy}${mm}${dd}${sequence}`;
    if (kind === 'nine') {
      return prefix;
    }
    return kind === 'random' ? `${prefix}${randomLast}` : `${prefix}${String(mod11(prefix) % 10)}`;
  });

const noiseArb = fc.constantFrom('/', '/', ' ', '-', '.', 'A', 'O', 'č', '0', '9', '\t', '１');

/** A number with or without the slash, sometimes with one character inserted or removed. */
const candidateArb = fc
  .tuple(numberArb, fc.boolean(), fc.constantFrom('none', 'none', 'none', 'insert', 'remove'), fc.nat(), noiseArb)
  .map(([digits, slash, mutation, position, noise]) => {
    const value = slash ? `${digits.slice(0, 6)}/${digits.slice(6)}` : digits;
    const at = position % (value.length + 1);
    if (mutation === 'insert') {
      return `${value.slice(0, at)}${noise}${value.slice(at)}`;
    }
    return mutation === 'remove' ? `${value.slice(0, at)}${value.slice(at + 1)}` : value;
  });

/** A reference date anywhere 1850–2099, or within two days of the decoded birth date. */
function referenceDateFor(value: string, choice: { readonly fixed: string; readonly offset: number; readonly near: boolean }): string {
  const decoded = decodeBirthNumber(value);
  return choice.near && decoded !== undefined ? addDays(decoded.date, choice.offset) : choice.fixed;
}

const referenceChoiceArb = fc.record({
  fixed: dateArb('1850-01-01', '2099-12-31'),
  offset: fc.integer({ min: -2, max: 2 }),
  near: fc.boolean(),
});

describe('properties', () => {
  it('agrees with the rules oracle on structured inputs around every boundary', () => {
    fc.assert(
      fc.property(candidateArb, referenceChoiceArb, (value, choice) => {
        const referenceDate = referenceDateFor(value, choice);
        expect(validateBirthNumber(value, { referenceDate })).toEqual(oracleValidate(value, referenceDate));
      }),
      { numRuns: PROPERTY_RUNS * 3 },
    );
  });

  it('agrees with the rules oracle on arbitrary short strings', () => {
    const shortStringArb = fc.oneof(
      fc.string({ maxLength: 13 }),
      fc.string({ unit: fc.constantFrom('0', '1', '5', '9', '/', ' ', 'a'), maxLength: 13 }),
    );
    fc.assert(
      fc.property(shortStringArb, (value) => {
        expect(validateBirthNumber(value, { referenceDate: REFERENCE_DATE })).toEqual(
          oracleValidate(value, REFERENCE_DATE),
        );
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('gives the same result with and without the slash after the 6th digit', () => {
    fc.assert(
      fc.property(numberArb, (digits) => {
        const withSlash = `${digits.slice(0, 6)}/${digits.slice(6)}`;
        const options = { referenceDate: REFERENCE_DATE };
        expect(validateBirthNumber(withSlash, options)).toEqual(validateBirthNumber(digits, options));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('never throws and always returns a result of the documented shape, for any string', () => {
    const reasons = new Set<string>(['letters', 'badFormat', 'wrongLength', 'impossibleDate', 'badChecksum', 'futureDate']);
    fc.assert(
      fc.property(fc.oneof(fc.string({ unit: 'binary', maxLength: 20 }), fc.string({ unit: 'grapheme', maxLength: 12 })), (value) => {
        const result = validateBirthNumber(value, { referenceDate: REFERENCE_DATE });
        if (result.valid) {
          expect(result).toEqual({ valid: true });
        } else {
          expect(reasons.has(result.reason)).toBe(true);
          expect(Object.keys(result).sort()).toEqual(['reason', 'valid']);
        }
        expect(() => validateBirthNumber(value)).not.toThrow();
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});
