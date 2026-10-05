// Specification of settings resolution and the clock – docs/rules/core.md section 3, amendment A1.
// resolveSettings is shared by createCz and every create<Id>; todayUtc is the only clock read in src/.
// The clock tests move the process into a time zone where the local date differs from the UTC date and
// first assert that difference, so they cannot pass by accident on a machine that runs in UTC.
import fc from 'fast-check';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { resolveSettings, todayUtc } from '../src/core/settings.js';
import type { Settings } from '../src/core/types.js';
import {
  IMPOSSIBLE_DATES,
  MALFORMED_DATES,
  calendarDateArb,
  localDateOf,
  restoreClock,
  seedArb,
  setClock,
} from './support/helpers.js';

/** Replaces the whole global `crypto` object; every byte of each request is filled with the next value. */
function stubCrypto(...bytes: number[]) {
  let call = 0;
  const getRandomValues = vi.fn(<T extends ArrayBufferView>(array: T): T => {
    const byte = bytes[Math.min(call, bytes.length - 1)] ?? 0;
    call += 1;
    new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(byte);
    return array;
  });
  vi.stubGlobal('crypto', { getRandomValues });
  return getRandomValues;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  restoreClock();
});

// Instants just before / after UTC midnight in zones where the local date is the other day.
// Local dates computed by hand: CEST = UTC+2, PDT = UTC−7, JST = UTC+9, EST = UTC−5, LINT = UTC+14,
// SST = UTC−11.
const AROUND_MIDNIGHT = [
  { instant: '2026-10-04T23:30:00Z', timeZone: 'Europe/Prague', utc: '2026-10-04', local: '2026-10-05' },
  { instant: '2026-10-05T00:30:00Z', timeZone: 'America/Los_Angeles', utc: '2026-10-05', local: '2026-10-04' },
  { instant: '2026-12-31T23:59:59.999Z', timeZone: 'Asia/Tokyo', utc: '2026-12-31', local: '2027-01-01' },
  { instant: '2027-01-01T00:00:00.000Z', timeZone: 'America/New_York', utc: '2027-01-01', local: '2026-12-31' },
  { instant: '2024-02-29T23:00:00Z', timeZone: 'Pacific/Kiritimati', utc: '2024-02-29', local: '2024-03-01' },
  { instant: '2024-03-01T05:00:00Z', timeZone: 'Pacific/Pago_Pago', utc: '2024-03-01', local: '2024-02-29' },
];

describe('todayUtc()', () => {
  it.each(AROUND_MIDNIGHT)(
    'returns the UTC date $utc at $instant in $timeZone, where the local date is $local',
    ({ instant, timeZone, utc, local }) => {
      setClock(instant, timeZone);
      expect(localDateOf(new Date())).toBe(local);
      expect(todayUtc()).toBe(utc);
    },
  );

  it('returns the UTC calendar date of any instant in any time zone', () => {
    const instantArb = fc.date({
      min: new Date('1970-01-01T00:00:00Z'),
      max: new Date('2099-12-31T23:59:59Z'),
      noInvalidDate: true,
    });
    const timeZoneArb = fc.constantFrom('UTC', 'Europe/Prague', 'America/Los_Angeles', 'Pacific/Kiritimati');
    fc.assert(
      fc.property(instantArb, timeZoneArb, (instant, timeZone) => {
        setClock(instant.toISOString(), timeZone);
        expect(todayUtc()).toBe(instant.toISOString().slice(0, 10));
      }),
      { numRuns: 300 },
    );
  });

  it('formats the date as zero-padded YYYY-MM-DD', () => {
    setClock('2026-01-05T08:00:00Z', 'UTC');
    expect(todayUtc()).toBe('2026-01-05');
  });
});

describe('resolveSettings(options?)', () => {
  it('returns the given seed and reference date unchanged', () => {
    expect(resolveSettings({ seed: 42, referenceDate: '2026-10-05' })).toEqual({
      seed: 42,
      referenceDate: '2026-10-05',
    });
  });

  it('returns any valid seed and calendar date unchanged', () => {
    fc.assert(
      fc.property(seedArb, calendarDateArb, (seed, referenceDate) => {
        expect(resolveSettings({ seed, referenceDate })).toEqual({ seed, referenceDate });
      }),
      { numRuns: 500 },
    );
  });

  it('fills both defaults: a seed from crypto.getRandomValues and the current UTC date', () => {
    stubCrypto(0xab);
    setClock('2026-10-04T23:30:00Z', 'Europe/Prague');
    // Every byte is 0xAB, so the uint32 is the same whatever array type or byte order is used.
    expect(resolveSettings()).toEqual({ seed: 0xabababab, referenceDate: '2026-10-04' });
    expect(resolveSettings({})).toEqual({ seed: 0xabababab, referenceDate: '2026-10-04' });
  });

  it('fills only the missing setting', () => {
    stubCrypto(0x01);
    setClock('2026-10-05T00:30:00Z', 'America/Los_Angeles');
    expect(resolveSettings({ seed: 42 })).toEqual({ seed: 42, referenceDate: '2026-10-05' });
    expect(resolveSettings({ referenceDate: '2000-02-29' })).toEqual({ seed: 0x01010101, referenceDate: '2000-02-29' });
  });

  it('looks up the global crypto object at call time and draws a fresh seed for every call', () => {
    const getRandomValues = stubCrypto(0xab, 0x01);
    expect(resolveSettings({ referenceDate: '2026-10-05' }).seed).toBe(0xabababab);
    expect(resolveSettings({ referenceDate: '2026-10-05' }).seed).toBe(0x01010101);
    expect(getRandomValues).toHaveBeenCalledTimes(2);
  });

  it('exposes a valid uint32 seed with the real crypto', () => {
    const { seed } = resolveSettings();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });

  it('never uses Math.random', () => {
    const mathRandom = vi.spyOn(Math, 'random');
    resolveSettings();
    resolveSettings({ referenceDate: '2026-10-05' });
    expect(mathRandom).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'a negative seed', seed: -1 },
    { name: 'a fractional seed', seed: 1.5 },
    { name: 'NaN', seed: Number.NaN },
    { name: '2^32', seed: 2 ** 32 },
  ])('throws RangeError naming the seed option for $name', ({ seed }) => {
    expect(() => resolveSettings({ seed })).toThrow(RangeError);
    expect(() => resolveSettings({ seed })).toThrow(/seed/);
  });

  it.each(MALFORMED_DATES)('throws RangeError naming the referenceDate option for %j', (referenceDate) => {
    expect(() => resolveSettings({ seed: 42, referenceDate })).toThrow(RangeError);
    expect(() => resolveSettings({ seed: 42, referenceDate })).toThrow(/referenceDate/);
  });

  it.each(IMPOSSIBLE_DATES)('throws RangeError naming the referenceDate option for $date ($why)', ({ date }) => {
    expect(() => resolveSettings({ seed: 42, referenceDate: date })).toThrow(RangeError);
    expect(() => resolveSettings({ seed: 42, referenceDate: date })).toThrow(/referenceDate/);
  });

  it('returns Settings: { seed: number; referenceDate: string }', () => {
    expectTypeOf(resolveSettings).returns.toExtend<Settings>();
    expectTypeOf<Settings>().toExtend<{ seed: number; referenceDate: string }>();
    expectTypeOf<{ seed: number; referenceDate: string }>().toExtend<Settings>();
    expectTypeOf(resolveSettings).toBeCallableWith();
    expectTypeOf(resolveSettings).toBeCallableWith({ seed: 1 });
    expectTypeOf(resolveSettings).toBeCallableWith({ referenceDate: '2026-10-05' });
  });
});
