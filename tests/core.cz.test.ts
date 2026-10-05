// Specification of createCz in M1 – docs/rules/core.md sections 2, 3 and 6, amendment A1.
// In M1 createCz exposes `seed`, `referenceDate` and an empty `validate`; identifiers plug in from M2, so
// nothing identifier-specific is tested here. Where the contract speaks of "the output" of a seed, a dummy
// identifier built with defineIdentifier and created from the cz settings stands in for M2 identifiers.
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineIdentifier } from '../src/core/identifier.js';
import type { Random } from '../src/core/random.js';
import type { NoOptions, ValidationResult } from '../src/core/types.js';
import { createCz } from '../src/index.js';
import {
  IMPOSSIBLE_DATES,
  MALFORMED_DATES,
  calendarDateArb,
  draw,
  localDateOf,
  restoreClock,
  seedArb,
  setClock,
} from './support/helpers.js';
import { MAX_UINT32, referenceStreamSeed, referenceUint32s } from './support/reference.js';

const generateEcho: (random: Random, options: NoOptions) => string = (random) => String(random.uint32());

const echo = defineIdentifier({
  id: 'echo',
  generate: generateEcho,
  validate: (value: string): ValidationResult<'empty'> =>
    value === '' ? { valid: false, reason: 'empty' } : { valid: true },
  edge: { zero: (): string => '0' },
  invalid: { empty: (): string => '' },
});

/** The first five echo values of an echo generator created from the resolved settings of `cz`. */
function firstEchoValues(cz: { readonly seed: number; readonly referenceDate: string }): string[] {
  const generator = echo.create({ seed: cz.seed, referenceDate: cz.referenceDate });
  return draw(5, () => generator());
}

function expectUint32(value: number): void {
  expect(Number.isInteger(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThanOrEqual(MAX_UINT32);
}

/** Makes crypto.getRandomValues fill every byte with the next value of `bytes`. */
function stubRandomBytes(...bytes: number[]) {
  let call = 0;
  return vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
    const byte = bytes[Math.min(call, bytes.length - 1)] ?? 0;
    call += 1;
    new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(byte);
    return array;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  restoreClock();
});

describe('createCz – explicit seed', () => {
  it.each([0, 1, 42, MAX_UINT32])('echoes seed %d as cz.seed', (seed) => {
    expect(createCz({ seed }).seed).toBe(seed);
  });

  it('echoes every valid seed as cz.seed', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(createCz({ seed }).seed).toBe(seed);
      }),
      { numRuns: 1000 },
    );
  });

  it.each([
    { name: 'a negative seed', seed: -1 },
    { name: 'a fractional seed', seed: 1.5 },
    { name: 'NaN', seed: Number.NaN },
    { name: '2^32', seed: 2 ** 32 },
  ])('throws RangeError naming the seed option for $name', ({ seed }) => {
    expect(() => createCz({ seed })).toThrow(RangeError);
    expect(() => createCz({ seed })).toThrow(/seed/);
  });

  it('exposes a validate namespace', () => {
    expect(createCz({ seed: 42 }).validate).toBeTypeOf('object');
  });
});

describe('createCz – default seed', () => {
  it('exposes a valid uint32 seed when called without options or without a seed', () => {
    expectUint32(createCz().seed);
    expectUint32(createCz({}).seed);
  });

  it('reproduces the output when the exposed seed of two seedless createCz() calls is passed back', () => {
    for (const cz of [createCz(), createCz()]) {
      expectUint32(cz.seed);
      const again = createCz({ seed: cz.seed, referenceDate: cz.referenceDate });
      expect(again.seed).toBe(cz.seed);
      expect(again.referenceDate).toBe(cz.referenceDate);
      const expected = referenceUint32s(referenceStreamSeed(cz.seed, 'echo'), 5).map(String);
      expect(firstEchoValues(cz)).toEqual(expected);
      expect(firstEchoValues(again)).toEqual(expected);
    }
  });

  it('takes the seed from crypto.getRandomValues, freshly for every call', () => {
    const getRandomValues = stubRandomBytes(0xab, 0x01);
    // Every byte is 0xAB (then 0x01), so the uint32 is the same whatever array type or byte order is used.
    expect(createCz().seed).toBe(0xabababab);
    expect(createCz().seed).toBe(0x01010101);
    expect(getRandomValues).toHaveBeenCalled();
  });

  it('never uses Math.random', () => {
    const mathRandom = vi.spyOn(Math, 'random');
    createCz();
    createCz({ referenceDate: '2026-10-04' });
    expect(mathRandom).not.toHaveBeenCalled();
  });
});

describe('createCz – referenceDate', () => {
  it.each(['2026-10-04', '2024-02-29', '2000-02-29', '1999-12-31', '2026-01-01', '2026-12-31', '1954-01-01'])(
    'accepts the calendar date %s and echoes it as cz.referenceDate',
    (referenceDate) => {
      expect(createCz({ seed: 42, referenceDate }).referenceDate).toBe(referenceDate);
    },
  );

  it('accepts a referenceDate without a seed', () => {
    expect(createCz({ referenceDate: '2026-10-04' }).referenceDate).toBe('2026-10-04');
  });

  it('accepts and echoes every real calendar date written as YYYY-MM-DD', () => {
    fc.assert(
      fc.property(calendarDateArb, (referenceDate) => {
        expect(createCz({ seed: 42, referenceDate }).referenceDate).toBe(referenceDate);
      }),
      { numRuns: 1000 },
    );
  });

  it('defaults cz.referenceDate to the current UTC date when the local date is already tomorrow', () => {
    setClock('2026-10-04T23:30:00Z', 'Europe/Prague');
    expect(localDateOf(new Date())).toBe('2026-10-05');
    expect(createCz({ seed: 42 }).referenceDate).toBe('2026-10-04');
    expect(createCz().referenceDate).toBe('2026-10-04');
  });

  it('defaults cz.referenceDate to the current UTC date when the local date is still yesterday', () => {
    setClock('2026-10-05T00:30:00Z', 'America/Los_Angeles');
    expect(localDateOf(new Date())).toBe('2026-10-04');
    expect(createCz({ seed: 42 }).referenceDate).toBe('2026-10-05');
  });

  it.each(MALFORMED_DATES)('throws RangeError naming the referenceDate option for the malformed date %j', (referenceDate) => {
    expect(() => createCz({ seed: 42, referenceDate })).toThrow(RangeError);
    expect(() => createCz({ seed: 42, referenceDate })).toThrow(/referenceDate/);
  });

  it.each(IMPOSSIBLE_DATES)('throws RangeError for the impossible date $date ($why)', ({ date }) => {
    expect(() => createCz({ seed: 42, referenceDate: date })).toThrow(RangeError);
    expect(() => createCz({ seed: 42, referenceDate: date })).toThrow(/referenceDate/);
  });

  it('throws RangeError for every string that is not shaped YYYY-MM-DD', () => {
    const malformed = fc.string({ maxLength: 12 }).filter((value) => !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value));
    fc.assert(
      fc.property(malformed, (referenceDate) => {
        expect(() => createCz({ seed: 42, referenceDate })).toThrow(RangeError);
      }),
      { numRuns: 1000 },
    );
  });
});
