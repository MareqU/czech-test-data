// Specification of generator options – docs/rules/core.md section 5, "Options typing" (amendment A2).
// Type-level rules are asserted with expectTypeOf on the parameter tuple of the generator, because the
// ESLint config bans TypeScript error-suppression comments. "Cannot be omitted" means: the empty argument list `[]`
// is not assignable to the generator's parameters.
import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineIdentifier } from '../src/core/identifier.js';
import type { Random } from '../src/core/random.js';
import type { NoOptions, ValidationResult } from '../src/core/types.js';

const SETTINGS = { seed: 42, referenceDate: '2026-10-05' } as const;

const alwaysValid = (): ValidationResult<'empty'> => ({ valid: true });
const variants = { edge: { one: (): string => '1' }, invalid: { empty: (): string => '' } };

interface OptionalOptions {
  readonly prefix?: string;
}

interface RequiredOptions {
  readonly bankCode: string;
  readonly withPrefix?: boolean;
}

/** A generate function that records the options object it receives; callers annotate the options type. */
function recordingGenerate(received: unknown[]): (random: Random, options: unknown) => string {
  return (random, options) => {
    received.push(options);
    return String(random.uint32());
  };
}

function optionalOptionsGenerator(received: unknown[] = []) {
  const generate: (random: Random, options: OptionalOptions) => string = recordingGenerate(received);
  const identifier = defineIdentifier({
    id: 'optionalOptions',
    generate,
    validate: alwaysValid,
    ...variants,
  });
  return identifier.create(SETTINGS);
}

function requiredOptionsGenerator(received: unknown[] = []) {
  const generate: (random: Random, options: RequiredOptions) => string = recordingGenerate(received);
  const identifier = defineIdentifier({
    id: 'requiredOptions',
    generate,
    validate: alwaysValid,
    ...variants,
  });
  return identifier.create(SETTINGS);
}

function noOptionsGenerator(received: unknown[] = []) {
  const generate: (random: Random, options: NoOptions) => string = recordingGenerate(received);
  const identifier = defineIdentifier({
    id: 'noOptions',
    generate,
    validate: alwaysValid,
    ...variants,
  });
  return identifier.create(SETTINGS);
}

/** A generate that declares no options parameter at all: Options defaults to NoOptions. */
function omittedOptionsGenerator() {
  const identifier = defineIdentifier({
    id: 'omittedOptions',
    generate: (random: Random): string => String(random.uint32()),
    validate: alwaysValid,
    ...variants,
  });
  return identifier.create(SETTINGS);
}

describe('options at runtime', () => {
  it('passes {} to generate when the caller passes no options, never undefined', () => {
    const received: unknown[] = [];
    const generator = optionalOptionsGenerator(received);
    generator();
    generator({ prefix: 'X' });
    generator({});
    expect(received).toStrictEqual([{}, { prefix: 'X' }, {}]);
  });

  it('passes {} to generate of an identifier without options', () => {
    const received: unknown[] = [];
    const generator = noOptionsGenerator(received);
    generator();
    expect(received).toStrictEqual([{}]);
  });

  it('passes required options through unchanged', () => {
    const received: unknown[] = [];
    const generator = requiredOptionsGenerator(received);
    generator({ bankCode: '0800' });
    generator({ bankCode: '0100', withPrefix: true });
    expect(received).toStrictEqual([{ bankCode: '0800' }, { bankCode: '0100', withPrefix: true }]);
  });
});

describe('options typing (A2)', () => {
  it('makes the argument optional when every option is optional', () => {
    const generator = optionalOptionsGenerator();
    expectTypeOf<[]>().toExtend<Parameters<typeof generator>>();
    expectTypeOf<[{ prefix: string }]>().toExtend<Parameters<typeof generator>>();
    expectTypeOf(generator).toBeCallableWith();
    expectTypeOf(generator).toBeCallableWith({ prefix: 'X' });
    expectTypeOf<[{ prefix: number }]>().not.toExtend<Parameters<typeof generator>>();
    // Declared options are not widened to `object`: unknown keys are still rejected.
    expectTypeOf<[{ typo: true }]>().not.toExtend<Parameters<typeof generator>>();
  });

  it('makes the argument required when any option is required', () => {
    const generator = requiredOptionsGenerator();
    expectTypeOf<[]>().not.toExtend<Parameters<typeof generator>>();
    expectTypeOf<[undefined]>().not.toExtend<Parameters<typeof generator>>();
    expectTypeOf<[{ withPrefix: true }]>().not.toExtend<Parameters<typeof generator>>();
    expectTypeOf<[{ bankCode: string }]>().toExtend<Parameters<typeof generator>>();
    expectTypeOf(generator).toBeCallableWith({ bankCode: '0800' });
    expectTypeOf(generator).toBeCallableWith({ bankCode: '0800', withPrefix: true });
  });

  it('defines NoOptions as Readonly<Record<string, never>>', () => {
    expectTypeOf<NoOptions>().toEqualTypeOf<Readonly<Record<string, never>>>();
  });

  it('lets NoOptions identifiers be called without options and rejects any option key', () => {
    const generator = noOptionsGenerator();
    expectTypeOf<[]>().toExtend<Parameters<typeof generator>>();
    expectTypeOf(generator).toBeCallableWith();
    expectTypeOf<[{ typo: true }]>().not.toExtend<Parameters<typeof generator>>();
    expectTypeOf<[{ seed: number }]>().not.toExtend<Parameters<typeof generator>>();
  });

  it('treats a generate without an options parameter like NoOptions, not like object', () => {
    const generator = omittedOptionsGenerator();
    expectTypeOf<[]>().toExtend<Parameters<typeof generator>>();
    expectTypeOf(generator).toBeCallableWith();
    expectTypeOf<[{ typo: true }]>().not.toExtend<Parameters<typeof generator>>();
    expectTypeOf<Parameters<typeof generator>>().toEqualTypeOf<Parameters<ReturnType<typeof noOptionsGenerator>>>();
    expect(generator()).toMatch(/^[0-9]+$/);
  });
});
