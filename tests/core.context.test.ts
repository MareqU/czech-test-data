// Specification of the identifier context and the public validator – docs/rules/core.md sections 3 and 5,
// amendment A1. A dummy date-dependent identifier ("eventDate") records every context it receives, so the
// tests can see that generate, the variants and the inner validator all get { referenceDate }.
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defineIdentifier } from '../src/core/identifier.js';
import type { Random } from '../src/core/random.js';
import type { IdentifierContext, NoOptions, ValidationResult } from '../src/core/types.js';
import {
  IMPOSSIBLE_DATES,
  MALFORMED_DATES,
  addDays,
  draw,
  localDateOf,
  restoreClock,
  seedArb,
  setClock,
  utcDateOf,
} from './support/helpers.js';

const PROPERTY_RUNS = 300;

// --- Dummy identifier "eventDate": a past date as YYYY-MM-DD; a date after the reference date is invalid. ---

type EventDateReason = 'wrongFormat' | 'futureDate';

interface Seen {
  readonly where: string;
  readonly context: IdentifierContext;
}

const seen: Seen[] = [];

function record(where: string, context: IdentifierContext): void {
  seen.push({ where, context });
}

function validateEventDate(value: string, context: IdentifierContext): ValidationResult<EventDateReason> {
  record('validate', context);
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) {
    return { valid: false, reason: 'wrongFormat' };
  }
  if (value > context.referenceDate) {
    return { valid: false, reason: 'futureDate' };
  }
  return { valid: true };
}

/** Valid values never depend on the reference date: 1990-01-01 … 2000-01-01 from the stream only. */
function generateEventDate(random: Random, _options: NoOptions, context: IdentifierContext): string {
  record('generate', context);
  return addDays('1990-01-01', random.int(0, 3652));
}

const eventDate = defineIdentifier({
  id: 'eventDate',
  generate: generateEventDate,
  validate: validateEventDate,
  edge: {
    referenceDay: (_random: Random, context: IdentifierContext): string => {
      record('edge:referenceDay', context);
      return context.referenceDate;
    },
    firstDay: (_random: Random, context: IdentifierContext): string => {
      record('edge:firstDay', context);
      return '1990-01-01';
    },
  },
  invalid: {
    futureDate: (_random: Random, context: IdentifierContext): string => {
      record('invalid:futureDate', context);
      return addDays(context.referenceDate, 1);
    },
    wrongFormat: (random: Random, context: IdentifierContext): string => {
      record('invalid:wrongFormat', context);
      return random.digits(8);
    },
  },
});

/** Reference dates on or after the newest value generate() can return. */
const laterDateArb = fc
  .date({ min: new Date('2000-01-01T00:00:00Z'), max: new Date('2099-12-31T00:00:00Z'), noInvalidDate: true })
  .map(utcDateOf);

beforeEach(() => {
  seen.length = 0;
});

afterEach(() => {
  restoreClock();
});

describe('IdentifierContext – what generate, the variants and the inner validator receive', () => {
  it('passes { referenceDate } of the settings to generate and to every named variant', () => {
    const generator = eventDate.create({ seed: 42, referenceDate: '2026-10-05' });
    generator();
    generator.edge('referenceDay');
    generator.edge('firstDay');
    generator.invalid('futureDate');
    generator.invalid('wrongFormat');
    expect(seen.map(({ where }) => where)).toEqual([
      'generate',
      'edge:referenceDay',
      'edge:firstDay',
      'invalid:futureDate',
      'invalid:wrongFormat',
    ]);
    for (const { context } of seen) {
      expect(context).toEqual({ referenceDate: '2026-10-05' });
    }
  });

  it('passes the same context to randomly chosen variants', () => {
    const generator = eventDate.create({ seed: 7, referenceDate: '2030-01-31' });
    draw(20, () => generator.edge());
    draw(20, () => generator.invalid());
    expect(seen).toHaveLength(40);
    for (const { context } of seen) {
      expect(context).toEqual({ referenceDate: '2030-01-31' });
    }
  });

  it('uses the reference date of the settings, not the clock', () => {
    setClock('1999-06-15T12:00:00Z', 'Europe/Prague');
    const generator = eventDate.create({ seed: 42, referenceDate: '2026-10-05' });
    expect(generator.edge('referenceDay')).toBe('2026-10-05');
    expect(generator.invalid('futureDate')).toBe('2026-10-06');
  });

  it('keeps date-dependent variants and the validator in agreement for the same reference date', () => {
    fc.assert(
      fc.property(seedArb, laterDateArb, (seed, referenceDate) => {
        const generator = eventDate.create({ seed, referenceDate });
        const options = { referenceDate };
        expect(eventDate.validate(generator(), options)).toEqual({ valid: true });
        expect(eventDate.validate(generator.edge('referenceDay'), options)).toEqual({ valid: true });
        expect(eventDate.validate(generator.invalid('futureDate'), options)).toEqual({
          valid: false,
          reason: 'futureDate',
        });
        expect(eventDate.validate(generator.invalid('wrongFormat'), options)).toEqual({
          valid: false,
          reason: 'wrongFormat',
        });
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('defineIdentifier – public validate(value, options?)', () => {
  it('passes the referenceDate option to the inner validator as context', () => {
    expect(eventDate.validate('2026-10-06', { referenceDate: '2026-10-05' })).toEqual({
      valid: false,
      reason: 'futureDate',
    });
    expect(eventDate.validate('2026-10-06', { referenceDate: '2026-10-06' })).toEqual({ valid: true });
    expect(seen).toEqual([
      { where: 'validate', context: { referenceDate: '2026-10-05' } },
      { where: 'validate', context: { referenceDate: '2026-10-06' } },
    ]);
  });

  it('uses the current UTC date when referenceDate is omitted, also when the local date is already tomorrow', () => {
    setClock('2026-10-04T23:30:00Z', 'Europe/Prague');
    expect(localDateOf(new Date())).toBe('2026-10-05');
    expect(eventDate.validate('2026-10-05')).toEqual({ valid: false, reason: 'futureDate' });
    expect(eventDate.validate('2026-10-04')).toEqual({ valid: true });
    expect(seen.map(({ context }) => context.referenceDate)).toEqual(['2026-10-04', '2026-10-04']);
  });

  it('uses the current UTC date when referenceDate is omitted, also when the local date is still yesterday', () => {
    setClock('2026-10-05T00:30:00Z', 'America/Los_Angeles');
    expect(localDateOf(new Date())).toBe('2026-10-04');
    expect(eventDate.validate('2026-10-05')).toEqual({ valid: true });
    expect(eventDate.validate('2026-10-06')).toEqual({ valid: false, reason: 'futureDate' });
    expect(seen.map(({ context }) => context.referenceDate)).toEqual(['2026-10-05', '2026-10-05']);
  });

  it('uses the same UTC date as an empty options object', () => {
    setClock('2026-10-04T23:30:00Z', 'Europe/Prague');
    expect(eventDate.validate('2026-10-05', {})).toEqual({ valid: false, reason: 'futureDate' });
    expect(seen.map(({ context }) => context.referenceDate)).toEqual(['2026-10-04']);
  });

  it.each(MALFORMED_DATES)('throws RangeError naming the malformed referenceDate option %j', (referenceDate) => {
    expect(() => eventDate.validate('2026-10-05', { referenceDate })).toThrow(RangeError);
    expect(() => eventDate.validate('2026-10-05', { referenceDate })).toThrow(/referenceDate/);
    expect(() => eventDate.validate('not a date at all', { referenceDate })).toThrow(RangeError);
  });

  it.each(IMPOSSIBLE_DATES)('throws RangeError naming the impossible referenceDate option $date ($why)', ({ date }) => {
    expect(() => eventDate.validate('2026-10-05', { referenceDate: date })).toThrow(RangeError);
    expect(() => eventDate.validate('2026-10-05', { referenceDate: date })).toThrow(/referenceDate/);
  });

  it('never throws for any value, with or without a referenceDate', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 20 }), (value) => {
        expect(typeof eventDate.validate(value).valid).toBe('boolean');
        expect(typeof eventDate.validate(value, { referenceDate: '2026-10-05' }).valid).toBe('boolean');
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});
