// Specification of the shared letter helpers – docs/rules/core.md section 5 and amendment A4.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hasNonDigit, replaceDigitWithLetter } from '../src/core/letters.js';
import { createRandom } from '../src/core/random.js';
import { seedArb } from './support/helpers.js';

describe('hasNonDigit (amendment A4)', () => {
  it.each([
    ['', false],
    ['0123456789', false],
    ['12a45', true],
    [' 123', true],
    ['12-3', true],
    ['１２３', true],
    ['12\n', true],
  ])('hasNonDigit(%j) is %s', (value, expected) => {
    expect(hasNonDigit(value)).toBe(expected);
  });
});

describe('replaceDigitWithLetter default letters (amendment A4)', () => {
  it('uses AOl when letters are omitted, same output as passing AOl on the same seed', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const positions = [0, 2, 4, 5];
        const implicit = replaceDigitWithLetter(createRandom(seed), '1234567', positions);
        const explicit = replaceDigitWithLetter(createRandom(seed), '1234567', positions, 'AOl');
        expect(implicit).toBe(explicit);
        expect(implicit).toMatch(/^[1-7AOl]+$/);
      }),
      { numRuns: 200 },
    );
  });
});
