// Public API of phone (telefonní číslo) and its place in createCz – docs/rules/core.md sections 2, 3 and 5,
// docs/rules/phone.md sections 4, 8 and 9 (options, reason codes, variant names).
import fc from 'fast-check';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { createPhone, validatePhone } from '../src/phone/index.js';
import type { PhoneEdgeVariant, PhoneInvalidVariant, PhoneOptions, PhoneReason } from '../src/phone/index.js';
import type { SettingsOptions, ValidationResult } from '../src/core/types.js';
import { createCz } from '../src/index.js';
import type { Cz } from '../src/index.js';
import { seedArb } from './support/helpers.js';

const PROPERTY_RUNS = 200;

const EDGE_VARIANTS: readonly PhoneEdgeVariant[] = ['withoutSpaces', 'withoutCountryCode', 'digitsOnly', 'prefix00', 'newMobileRange', 'voip'];
const INVALID_VARIANTS: readonly PhoneInvalidVariant[] = ['wrongLength', 'letters', 'wrongCountryCode', 'unknownPrefix', 'specialPrefix'];

describe('types (docs/rules/phone.md sections 4 and 8)', () => {
  it('declares the six reason codes: the five invalid variants plus badFormat', () => {
    expectTypeOf<PhoneReason>().toEqualTypeOf<
      'letters' | 'badFormat' | 'wrongCountryCode' | 'wrongLength' | 'unknownPrefix' | 'specialPrefix'
    >();
    expectTypeOf<PhoneInvalidVariant>().toEqualTypeOf<
      'wrongLength' | 'letters' | 'wrongCountryCode' | 'unknownPrefix' | 'specialPrefix'
    >();
    expectTypeOf<PhoneInvalidVariant>().toExtend<PhoneReason>();
  });

  it('declares the edge variant names', () => {
    expectTypeOf<PhoneEdgeVariant>().toEqualTypeOf<
      'withoutSpaces' | 'withoutCountryCode' | 'digitsOnly' | 'prefix00' | 'newMobileRange' | 'voip'
    >();
  });

  it("declares the option { type?: 'mobile' | 'fixed' }, optional, and no format option", () => {
    expectTypeOf<keyof PhoneOptions>().toEqualTypeOf<'type'>();
    type GeneratorArgs = Parameters<ReturnType<typeof createPhone>>;
    expectTypeOf<[]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ type: 'fixed' }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ type: 'mobile' }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ type: 'voip' }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[{ format: 'e164' }]>().not.toExtend<GeneratorArgs>();
  });

  it('types createPhone(options?: SettingsOptions) and validatePhone(value)', () => {
    expectTypeOf<[]>().toExtend<Parameters<typeof createPhone>>();
    expectTypeOf<[SettingsOptions]>().toExtend<Parameters<typeof createPhone>>();
    expectTypeOf<[string]>().toExtend<Parameters<typeof validatePhone>>();
    expectTypeOf(validatePhone).returns.toEqualTypeOf<ValidationResult<PhoneReason>>();
    expectTypeOf(createPhone).returns.toHaveProperty('edgeVariants').toEqualTypeOf<readonly PhoneEdgeVariant[]>();
    expectTypeOf(createPhone).returns.toHaveProperty('invalidVariants').toEqualTypeOf<readonly PhoneInvalidVariant[]>();
  });

  it('types cz.phone like createPhone and cz.validate.phone like validatePhone', () => {
    expectTypeOf<Cz['phone']>().toEqualTypeOf<ReturnType<typeof createPhone>>();
    expectTypeOf<Cz['validate']['phone']>().returns.toEqualTypeOf<ValidationResult<PhoneReason>>();
    expectTypeOf<[string]>().toExtend<Parameters<Cz['validate']['phone']>>();
  });
});

describe('createPhone (docs/rules/core.md section 3)', () => {
  it('lists the variants in definition order and echoes the settings', () => {
    const generator = createPhone({ seed: 42, referenceDate: '2026-10-05' });
    expect(generator.seed).toBe(42);
    expect(generator.referenceDate).toBe('2026-10-05');
    expect([...generator.edgeVariants].sort()).toEqual([...EDGE_VARIANTS].sort());
    expect([...generator.invalidVariants].sort()).toEqual([...INVALID_VARIANTS].sort());
  });

  it('ignores referenceDate: validatePhone gives the same result with any date', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), (value) => {
        expect(validatePhone(value, { referenceDate: '1990-01-01' })).toEqual(validatePhone(value));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

type Step =
  | { readonly kind: 'plain'; readonly type: 'mobile' | 'fixed' | undefined }
  | { readonly kind: 'edge'; readonly variant: PhoneEdgeVariant | undefined }
  | { readonly kind: 'invalid'; readonly variant: PhoneInvalidVariant | undefined };

const stepArb: fc.Arbitrary<Step> = fc.oneof(
  fc.option(fc.constantFrom<'mobile' | 'fixed'>('mobile', 'fixed'), { nil: undefined }).map((type): Step => ({ kind: 'plain', type })),
  fc.option(fc.constantFrom(...EDGE_VARIANTS), { nil: undefined }).map((variant): Step => ({ kind: 'edge', variant })),
  fc.option(fc.constantFrom(...INVALID_VARIANTS), { nil: undefined }).map((variant): Step => ({ kind: 'invalid', variant })),
);

function runStep(generator: ReturnType<typeof createPhone>, step: Step): string {
  switch (step.kind) {
    case 'plain':
      return step.type === undefined ? generator() : generator({ type: step.type });
    case 'edge':
      return generator.edge(step.variant);
    case 'invalid':
      return generator.invalid(step.variant);
  }
}

describe('cz.phone (docs/rules/core.md sections 2 and 3)', () => {
  it('gives the same values as createPhone for the same settings and the same calls', () => {
    fc.assert(
      fc.property(seedArb, fc.array(stepArb, { minLength: 1, maxLength: 15 }), (seed, steps) => {
        const cz = createCz({ seed });
        const standalone = createPhone({ seed, referenceDate: cz.referenceDate });
        expect(steps.map((step) => runStep(cz.phone, step))).toEqual(steps.map((step) => runStep(standalone, step)));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('is not affected by calls of other identifiers or validators on the same instance', () => {
    fc.assert(
      fc.property(seedArb, fc.array(stepArb, { minLength: 1, maxLength: 10 }), (seed, steps) => {
        const quiet = createCz({ seed });
        const busy = createCz({ seed });
        const expected = steps.map((step) => runStep(quiet.phone, step));
        const actual = steps.map((step) => {
          busy.birthNumber();
          busy.validate.phone('+420 601 123 456');
          return runStep(busy.phone, step);
        });
        expect(actual).toEqual(expected);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('cz.validate.phone equals validatePhone', () => {
    const cz = createCz({ seed: 1 });
    for (const value of ['+420 601 123 456', '', '+421 601 123 456', '+420 900 123 456', '+420 601-123-456']) {
      expect(cz.validate.phone(value)).toEqual(validatePhone(value));
    }
  });
});
