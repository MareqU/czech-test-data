// Specification of validatePhone (telefonní číslo) – docs/rules/phone.md sections 1, 2, 3 and 5 and the
// decisions of section 9; docs/rules/core.md section 4. Every sample is copied from section 5 of the rules.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { validatePhone } from '../src/phone/index.js';
import type { PhoneReason } from '../src/phone/index.js';
import { acceptedShapes, classify, grouped, validNationalArb } from './support/phone.js';

const PROPERTY_RUNS = 1000;

function expectReason(value: string, reason: PhoneReason): void {
  expect(validatePhone(value)).toEqual({ valid: false, reason });
}

describe('known valid samples (section 5)', () => {
  it.each([
    ['+420 224 004 111', 'fixed, Praha (real, ČTÚ)'],
    ['+420 601 123 456', 'mobile, default format'],
    ['+420601123456', 'withoutSpaces'],
    ['601 123 456', 'withoutCountryCode'],
    ['601123456', 'digitsOnly'],
    ['00420 601 123 456', 'prefix00'],
    ['00420601123456', '00, no spaces'],
    ['+420 601123456', 'space only after the country code'],
    ['+420601 123 456', 'no space after the country code, grouped'],
    ['00420 601123456', '00, space only after the country code'],
    ['00420601 123 456', '00, no space after the country code, grouped'],
    ['+420 799 123 456', 'mobile 79'],
    ['+420 702 123 456', 'mobile 702'],
    ['+420 712 345 678', 'newMobileRange'],
    ['+420 311 123 456', 'fixed, Středočeský'],
    ['+420 591 123 456', 'fixed, Moravskoslezský'],
    ['+420 720 000 113', 'neighbour of the emergency SMS number'],
    ['+420 739 123 456', 'worked example'],
    ['+420 910 123 456', 'voip'],
  ])('accepts %j (%s)', (value) => {
    expect(validatePhone(value)).toEqual({ valid: true });
  });
});

describe('known invalid samples (section 5)', () => {
  it.each<[string, PhoneReason, string]>([
    ['+42060112345', 'wrongLength', '8 digits'],
    ['+420 6011234567', 'wrongLength', '10 digits'],
    ['+420 601 123 45', 'wrongLength', 'length is checked before grouping'],
    ['0601 123 456', 'wrongLength', 'old trunk 0, 10 digits'],
    ['420 601 123 456', 'wrongLength', 'country code without + or 00 gives 12 digits'],
    ['112', 'wrongLength', 'short number'],
    ['+420', 'wrongLength', 'no national part'],
    ['00420', 'wrongLength', 'no national part, 00 form'],
    ['', 'wrongLength', '0 digits'],
    ['+4200601123456', 'wrongLength', 'G starts with 420, national part has 10 digits'],
    ['+421 601 123 456', 'wrongCountryCode', 'Slovakia'],
    ['00421601123456', 'wrongCountryCode', '00 form'],
    ['+42 0601 123 456', 'wrongCountryCode', 'G is 42'],
    ['+42', 'wrongCountryCode', 'G is 42, nothing else'],
    ['0049 601 123 456', 'wrongCountryCode', 'Germany, 00 form'],
    ['+421 60', 'wrongCountryCode', 'country code is checked before length'],
    ['+420 601 12A 456', 'letters', 'letter'],
    ['+420 6O1 123 456', 'letters', 'letter O for zero'],
    ['+420 601 123 45Ž', 'letters', 'non-ASCII letter'],
    ['+421 601 12A 456', 'letters', 'letters come before the country code'],
    ['+420 601-123-A56', 'letters', 'letters come before characters'],
    ['+420 601-123-456', 'badFormat', 'hyphen'],
    ['+420.601.123.456', 'badFormat', 'dots'],
    ['+420/601123456', 'badFormat', 'slash'],
    ['(+420) 601 123 456', 'badFormat', 'parentheses'],
    [' +420 601 123 456', 'badFormat', 'leading space, not trimmed'],
    ['+420 601 123 456 ', 'badFormat', 'trailing space, not trimmed'],
    ['+420  601 123 456', 'badFormat', 'double space'],
    ['+420\t601 123 456', 'badFormat', 'tab'],
    ['+420 601 123 456', 'badFormat', 'non-breaking space'],
    ['+420 601 123 456', 'badFormat', 'non-breaking space inside the number'],
    ['+ 420 601 123 456', 'badFormat', 'G is empty after +'],
    ['00 420 601 123 456', 'badFormat', 'G is empty after 00'],
    ['+', 'badFormat', 'only the plus'],
    ['00', 'badFormat', 'only the 00 prefix'],
    ['+420 60 1123 456', 'badFormat', '9 digits, irregular grouping'],
    ['601 123456', 'badFormat', 'grouping 3 + 6'],
    ['601123 456', 'badFormat', 'grouping 6 + 3'],
    ['++420601123456', 'badFormat', 'second plus'],
    ['420+601123456', 'badFormat', 'plus not first'],
    ['601123456+', 'badFormat', 'plus at the end'],
    ['+420 609 123 456', 'unknownPrefix', 'reserved'],
    ['+420 600 123 456', 'unknownPrefix', 'reserved'],
    ['+420 650 123 456', 'unknownPrefix', 'reserved (62-69)'],
    ['+420 701 123 456', 'unknownPrefix', 'not a subscriber range'],
    ['+420 745 123 456', 'unknownPrefix', 'reserved (74)'],
    ['+420 781 123 456', 'unknownPrefix', 'reserved (78)'],
    ['+420 201 234 567', 'unknownPrefix', '20 is reserved (decision 9)'],
    ['+420 123 456 789', 'unknownPrefix', '1 = short numbers'],
    ['012 345 678', 'unknownPrefix', '0x reserved'],
    ['+420 800 123 456', 'specialPrefix', 'freephone'],
    ['+420 900 123 456', 'specialPrefix', 'premium rate'],
    ['+420 610 123 456', 'specialPrefix', 'M2M (decision 3)'],
    ['+420 700 123 456', 'specialPrefix', 'UPT'],
    ['+420 720 000 112', 'specialPrefix', 'emergency SMS (decision 6)'],
    ['+420720000112', 'specialPrefix', 'emergency SMS, E.164'],
    ['720000112', 'specialPrefix', 'emergency SMS, digits only'],
  ])('rejects %j with %s (%s)', (value, reason) => {
    expectReason(value, reason);
  });
});

describe('the first failing step gives the reason (section 8 precedence)', () => {
  it('letters beat every other fault', () => {
    expectReason('++421 A', 'letters');
  });

  it('badFormat in the characters beats the country code and the length', () => {
    expectReason('+421-601', 'badFormat');
  });

  it('wrongCountryCode beats the length', () => {
    expectReason('+49 1', 'wrongCountryCode');
  });

  it('wrongLength beats irregular grouping and the prefix range', () => {
    expectReason('+420 60 112 3456 7', 'wrongLength');
    expectReason('+420 900 12 456', 'wrongLength');
  });

  it('badFormat in the grouping beats the prefix range', () => {
    expectReason('+420 90 0123 456', 'badFormat');
  });
});

describe('validator properties', () => {
  it('accepts every valid range in all accepted shapes', () => {
    fc.assert(
      fc.property(validNationalArb, (national) => {
        for (const value of acceptedShapes(national)) {
          expect(validatePhone(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('classifies every three-digit prefix as the numbering plan says (sections 3.1 to 3.3)', () => {
    const mismatches: string[] = [];
    for (let prefix = 0; prefix < 1000; prefix += 1) {
      const national = `${String(prefix).padStart(3, '0')}456789`;
      const expected = classify(national);
      for (const value of [national, `+420 ${grouped(national)}`]) {
        const actual = validatePhone(value);
        // Without a country code, a leading 00 is read as the international prefix (step 3 of section 2).
        const outcome = value === national && national.startsWith('00') ? 'wrongCountryCode' : expected;
        const wanted = outcome === 'valid' ? { valid: true } : { valid: false, reason: outcome };
        if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
          mismatches.push(`${value}: ${JSON.stringify(actual)} instead of ${JSON.stringify(wanted)}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('treats only the full number 720000112 as the emergency SMS number', () => {
    expect(validatePhone('720000111')).toEqual({ valid: true });
    expect(validatePhone('720000113')).toEqual({ valid: true });
    expect(validatePhone('720100112')).toEqual({ valid: true });
    expect(validatePhone('720 000 112')).toEqual({ valid: false, reason: 'specialPrefix' });
  });

  it('rejects any national part of another length with wrongLength, for any digits', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 14 }).filter((length) => length !== 9),
        fc.stringMatching(/^[0-9]{14}$/),
        fc.constantFrom('+420', '00420'),
        (length, digits, prefix) => {
          expectReason(prefix + digits.slice(0, length), 'wrongLength');
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('rejects any other country code with wrongCountryCode, whatever follows', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-9]{1,4}$/).filter((code) => !code.startsWith('420')),
        fc.constantFrom('+', '00'),
        validNationalArb,
        fc.constantFrom('', ' '),
        (code, prefix, national, separator) => {
          expectReason(`${prefix}${code}${separator}${grouped(national)}`, 'wrongCountryCode');
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('rejects a national part of another length without any prefix with wrongLength', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[1-9][0-9]{0,13}$/).filter((digits) => digits.length !== 9), (digits) => {
        expectReason(digits, 'wrongLength');
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('rejects a letter anywhere with letters', () => {
    fc.assert(
      fc.property(
        validNationalArb,
        fc.nat(9),
        fc.integer({ min: 0, max: 100 }),
        fc.constantFrom('A', 'z', 'O', 'é', 'Ř'),
        (national, shapeIndex, at, letter) => {
          const shape = acceptedShapes(national)[shapeIndex] ?? national;
          const index = at % (shape.length + 1);
          expectReason(shape.slice(0, index) + letter + shape.slice(index), 'letters');
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('rejects a forbidden character anywhere in a valid number with badFormat', () => {
    fc.assert(
      fc.property(
        validNationalArb,
        fc.integer({ min: 0, max: 100 }),
        fc.constantFrom('-', '.', '/', '(', ')', '\t', ' ', '\n', '_', '*', '+'),
        (national, at, character) => {
          const value = `+420 ${grouped(national)}`;
          const index = 1 + (at % value.length);
          expectReason(value.slice(0, index) + character + value.slice(index), 'badFormat');
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('never throws and gives one of the six reason codes for any string', () => {
    const reasons = ['letters', 'badFormat', 'wrongCountryCode', 'wrongLength', 'unknownPrefix', 'specialPrefix'];
    fc.assert(
      fc.property(fc.oneof(fc.string({ maxLength: 20 }), fc.stringMatching(/^(\+|00)?[0-9 ]{0,18}$/)), (value) => {
        const result = validatePhone(value);
        if (!result.valid) {
          expect(reasons).toContain(result.reason);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});
