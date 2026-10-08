// Specification of the DIČ validator – docs/rules/dic.md section 2 (steps, assigned numbers), section 5 (known
// samples, reference date 2026-10-07) and section 9 (decisions 2 to 6, 10). Expected values come from the
// independent oracle in tests/support/dic.ts and from the fixed samples of the rules.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createDic, validateDic } from '../src/dic/index.js';
import type { DicReason } from '../src/dic/index.js';
import { calendarDateArb } from './support/helpers.js';
import { assignedCheckDigit, assignedRemainder, oracleValidate } from './support/dic.js';

const PROPERTY_RUNS = 400;
const REFERENCE_DATE = '2026-10-07';

function validate(value: string, referenceDate = REFERENCE_DATE): unknown {
  return validateDic(value, { referenceDate });
}

const invalid = (reason: DicReason): { valid: false; reason: DicReason } => ({ valid: false, reason });

const VALID_SAMPLES: readonly string[] = [
  // real (ARES, VIES)
  'CZ00177041', 'CZ00064581', 'CZ26450691', 'CZ68407700', 'CZ45274649', 'CZ61673048', 'CZ24227757',
  'CZ699000797', 'CZ699007433', 'CZ699003634', 'CZ699003219', 'CZ699007986', 'CZ699007330', 'CZ699004029', 'CZ699004959',
  // constructed
  'CZ9055011251', 'CZ500715123', 'CZ905501125', 'CZ6006150140', 'CZ1023151239', 'CZ2452291237',
  'CZ699000001', 'CZ699000013', 'CZ699000048', 'CZ699000128', 'CZ600000008', 'CZ600101008', 'CZ90000005',
  // decision 2: the prefix is case-insensitive
  'cz00177041', 'Cz00177041', 'cZ00177041', 'cz699000797', 'cz9055011251',
];

const INVALID_SAMPLES: readonly (readonly [string, DicReason])[] = [
  ['00177041', 'missingPrefix'],
  ['9055011251', 'missingPrefix'],
  ['001-00177041', 'missingPrefix'],
  ['', 'missingPrefix'],
  ['SK00177041', 'foreignPrefix'],
  ['DE45274649', 'foreignPrefix'],
  ['EL00177041', 'foreignPrefix'],
  ['ČZ00177041', 'foreignPrefix'],
  ['sk00177041', 'foreignPrefix'],
  [' CZ00177041', 'badFormat'],
  ['C Z00177041', 'badFormat'],
  ['C00177041', 'badFormat'],
  ['C', 'badFormat'],
  ['-CZ00177041', 'badFormat'],
  ['CZ 00177041', 'badFormat'],
  ['CZ00177041 ', 'badFormat'],
  ['CZ-00177041', 'badFormat'],
  ['CZ905501/1251', 'badFormat'],
  ['CZ\u00a000177041', 'badFormat'],
  ['CZ００１７７０４１', 'badFormat'],
  ['CZⅫ177041', 'badFormat'],
  ['CZ0O177041', 'letters'],
  ['CZE00177041', 'letters'],
  ['CZ0O17704', 'letters'],
  ['CZ', 'wrongLength'],
  ['CZ177041', 'wrongLength'],
  ['CZ1569651', 'wrongLength'],
  ['CZ12345678901', 'wrongLength'],
  ['CZ00177040', 'badInnerChecksum'],
  ['CZ12345678', 'badInnerChecksum'],
  ['CZ9055011234', 'badInnerChecksum'],
  ['CZ8601010100', 'badInnerChecksum'],
  ['CZ699000798', 'badInnerChecksum'],
  ['CZ600101001', 'badInnerChecksum'],
  ['CZ9013010061', 'impossibleDate'],
  ['CZ000229123', 'impossibleDate'],
  ['CZ3001010111', 'futureDate'],
];

describe('known samples (section 5, reference date 2026-10-07)', () => {
  it.each(VALID_SAMPLES)('accepts %s', (value) => {
    expect(validate(value)).toEqual({ valid: true });
  });

  it.each(INVALID_SAMPLES)('rejects %j with %s', (value, reason) => {
    expect(validate(value)).toEqual(invalid(reason));
  });

  it('agrees with the independent oracle on every known sample', () => {
    for (const value of VALID_SAMPLES) {
      expect(oracleValidate(value, REFERENCE_DATE), value).toEqual({ valid: true });
    }
    for (const [value, reason] of INVALID_SAMPLES) {
      expect(oracleValidate(value, REFERENCE_DATE), value).toEqual(invalid(reason));
    }
  });
});

describe('prefix (section 2.1 step 1, decisions 2 and 6)', () => {
  it.each(['CZ', 'cz', 'Cz', 'cZ'])('accepts the prefix %s in any letter case', (prefix) => {
    expect(validate(`${prefix}45274649`)).toEqual({ valid: true });
  });

  it.each(['AT', 'BE', 'DE', 'SK', 'GB', 'EL', 'ČZ', 'CS', 'CE', 'ZC', 'XX'])(
    'rejects the two letters %s that are not CZ as foreignPrefix, whatever follows',
    (prefix) => {
      expect(validate(`${prefix}45274649`)).toEqual(invalid('foreignPrefix'));
      expect(validate(`${prefix}O`)).toEqual(invalid('foreignPrefix'));
      expect(validate(prefix)).toEqual(invalid('foreignPrefix'));
    },
  );

  it.each(['', '0', '1', '9X', '00177041', '0O177041', '12345678901234'])(
    'gives missingPrefix when the value is empty or starts with a digit: %j',
    (value) => {
      expect(validate(value)).toEqual(invalid('missingPrefix'));
    },
  );

  it.each([' ', ' CZ', 'C', 'Z', 'C1', 'C-', 'C Z', '-1', '.CZ00177041', '/', 'Č1'])(
    'gives badFormat for anything else, such as %j',
    (value) => {
      expect(validate(value)).toEqual(invalid('badFormat'));
    },
  );
});

describe('reason precedence (decision 6): prefix, letters, badFormat, wrongLength, impossibleDate, badInnerChecksum, futureDate', () => {
  it.each<readonly [string, DicReason, string]>([
    ['0O177041', 'missingPrefix', 'missingPrefix beats letters'],
    ['SK0O177041', 'foreignPrefix', 'foreignPrefix beats letters'],
    ['SK 177', 'foreignPrefix', 'foreignPrefix beats badFormat and wrongLength'],
    ['CZ0O 17704', 'letters', 'letters beat badFormat'],
    ['CZ0O17704', 'letters', 'letters beat wrongLength'],
    ['CZ 0017704', 'badFormat', 'badFormat beats wrongLength'],
    ['CZ9013010 1', 'badFormat', 'badFormat beats impossibleDate'],
    ['CZ90130101111', 'wrongLength', 'wrongLength beats impossibleDate'],
    ['CZ9013010062', 'impossibleDate', 'impossibleDate beats badInnerChecksum'],
    ['CZ3001010112', 'badInnerChecksum', 'badInnerChecksum beats futureDate'],
    ['CZ3001010111', 'futureDate', 'futureDate is reported last'],
  ])('%j gives %s (%s)', (value, reason) => {
    expect(validate(value)).toEqual(invalid(reason));
  });
});

describe('inner part by shape (section 2.1 step 5, decisions 3, 4, 5, 10)', () => {
  it('checks 8 digits as an IČO, including IČO starting with 6 or 9 (decision 10)', () => {
    expect(validate('CZ68407700')).toEqual({ valid: true });
    expect(validate('CZ90000005')).toEqual({ valid: true });
    expect(validate('CZ68407701')).toEqual(invalid('badInnerChecksum'));
    expect(validate('CZ90000004')).toEqual(invalid('badInnerChecksum'));
  });

  it('reads 9 digits starting with 6 only as an assigned number, never as a birth number (decisions 3 and 4)', () => {
    expect(validate('CZ600101001')).toEqual(invalid('badInnerChecksum')); // a valid birth number of 1860-01-01
    expect(validate('CZ600101008')).toEqual({ valid: true });
    expect(validate('CZ600000008')).toEqual({ valid: true }); // month 00 would be impossibleDate
    expect(validate('CZ613010103')).toEqual(oracleValidate('CZ613010103', REFERENCE_DATE));
  });

  it('never gives impossibleDate or futureDate for an assigned number, whatever the reference date', () => {
    expect(validate('CZ699000797', '1900-01-01')).toEqual({ valid: true });
    expect(validate('CZ600101008', '1900-01-01')).toEqual({ valid: true });
    expect(validate('CZ600000009', '1900-01-01')).toEqual(invalid('badInnerChecksum'));
  });

  it('reads 10 digits starting with 6 as a birth number (mod11Exception of 1960)', () => {
    expect(validate('CZ6006150140')).toEqual({ valid: true });
    expect(validate('CZ6006150141')).toEqual(invalid('badInnerChecksum'));
  });

  it('reads other 9 digits as a pre-1954 birth number (ČSSZ century mapping, no check digit)', () => {
    expect(validate('CZ500715123')).toEqual({ valid: true });
    expect(validate('CZ000229123')).toEqual(invalid('impossibleDate'));
    expect(validate('CZ545501123')).toEqual({ valid: true });
  });

  it('applies futureDate of the birth number against referenceDate, boundary inclusive', () => {
    expect(validate('CZ2610050091', '2026-10-05')).toEqual({ valid: true });
    expect(validate('CZ2610050091', '2026-10-04')).toEqual(invalid('futureDate'));
    expect(validate('CZ2610040081', '2026-10-04')).toEqual({ valid: true });
  });

  it('does not depend on referenceDate for IČO and assigned numbers', () => {
    fc.assert(
      fc.property(calendarDateArb, (referenceDate) => {
        expect(validate('CZ00177041', referenceDate)).toEqual({ valid: true });
        expect(validate('CZ699000797', referenceDate)).toEqual({ valid: true });
        expect(validate('CZ00177040', referenceDate)).toEqual(invalid('badInnerChecksum'));
      }),
      { numRuns: 50 },
    );
  });

  it('uses the current UTC date when referenceDate is omitted', () => {
    expect(validateDic('CZ00177041')).toEqual({ valid: true });
    expect(validateDic('CZ6006150140')).toEqual({ valid: true });
  });

  it('throws RangeError naming referenceDate for a date that is not YYYY-MM-DD', () => {
    expect(() => validateDic('CZ00177041', { referenceDate: '2026-02-30' })).toThrow(RangeError);
    expect(() => validateDic('CZ00177041', { referenceDate: '2026-02-30' })).toThrow(/referenceDate/);
  });
});

describe('assigned number check digit (section 2.4): d9 = (a + 8) mod 10 over d2…d8 with weights 8…2', () => {
  it('matches the table of section 2.4 for every remainder a = 0 … 10', () => {
    const expected = [8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8];
    const seen = new Set<number>();
    for (let n = 0; n < 1000; n += 1) {
      const first8 = `699${String(n).padStart(5, '0')}`;
      const a = assignedRemainder(first8);
      seen.add(a);
      expect(assignedCheckDigit(first8)).toBe(expected[a]);
      expect(validate(`CZ${first8}${String(expected[a])}`)).toEqual({ valid: true });
      expect(validate(`CZ${first8}${String(((expected[a] ?? 0) + 1) % 10)}`)).toEqual(invalid('badInnerChecksum'));
    }
    expect([...seen].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('accepts exactly one last digit for any 6xxxxxxx base, not the IČO mapping (11 − a) mod 10', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^6[0-9]{7}$/), (first8) => {
        const good = assignedCheckDigit(first8);
        for (let digit = 0; digit <= 9; digit += 1) {
          expect(validate(`CZ${first8}${String(digit)}`)).toEqual(
            digit === good ? { valid: true } : invalid('badInnerChecksum'),
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe('the validator agrees with the independent oracle', () => {
  const generated = (seed: number): string[] => {
    const generator = createDic({ seed, referenceDate: REFERENCE_DATE });
    return [generator(), generator.edge(), generator.invalid(), generator({ from: 'ico' })];
  };

  const mutatedArb = fc
    .record({
      seed: fc.integer({ min: 0, max: 0xffffffff }),
      index: fc.nat({ max: 3 }),
      position: fc.nat({ max: 12 }),
      char: fc.constantFrom('0', '1', '6', '9', 'O', 'x', ' ', '/', '-', 'Z', 'c', 'S', 'Č'),
      op: fc.constantFrom('replace', 'insert', 'delete', 'none'),
    })
    .map(({ seed, index, position, char, op }) => {
      const value = generated(seed)[index] ?? '';
      const at = Math.min(position, value.length);
      if (op === 'replace') {
        return `${value.slice(0, at)}${char}${value.slice(at + 1)}`;
      }
      if (op === 'insert') {
        return `${value.slice(0, at)}${char}${value.slice(at)}`;
      }
      return op === 'delete' ? `${value.slice(0, at)}${value.slice(at + 1)}` : value;
    });

  it('gives the oracle result for arbitrary strings, prefixed digit strings and mutated generated values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ maxLength: 14 }),
          fc.stringMatching(/^[CcSsZz]{1,2}[0-9]{6,12}$/),
          fc.stringMatching(/^[Cc][Zz]6[0-9]{8}$/),
          fc.stringMatching(/^[Cc][Zz][0-9]{8,10}$/),
          mutatedArb,
        ),
        calendarDateArb,
        (value, referenceDate) => {
          expect(validateDic(value, { referenceDate })).toEqual(oracleValidate(value, referenceDate));
        },
      ),
      { numRuns: PROPERTY_RUNS * 2 },
    );
  });
});
