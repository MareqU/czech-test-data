// Determinism of phone (telefonní číslo) – docs/rules/core.md section 2 (same seed + same calls = same
// output; snapshot seeds 0, 1, 42, 4294967295) and amendment A3 (shared check); docs/rules/phone.md section 8
// (no date dependence, referenceDate is ignored).
//
// The rules fix only the format and the ranges, not how phone spends its draws, so snapshot values cannot be
// derived from the rules. The four seed snapshots are filled by Marek after the implementation passed every
// other test. vitest.config.ts sets `update: 'none'`, so Vitest never writes a missing snapshot on its own.
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPhone } from '../src/phone/index.js';
import type { PhoneEdgeVariant, PhoneInvalidVariant } from '../src/phone/index.js';
import { expectSameOutputForLaterReferenceDates } from './support/determinism.js';
import { calendarDateArb, draw, restoreClock, seedArb, setClock } from './support/helpers.js';

const PROPERTY_RUNS = 200;
const SNAPSHOT_REFERENCE_DATE = '2026-10-05';

/** Variant order of section 4 of the rules, so named calls run in a fixed order. */
const EDGE_VARIANTS: readonly PhoneEdgeVariant[] = ['withoutSpaces', 'withoutCountryCode', 'digitsOnly', 'prefix00', 'newMobileRange', 'voip'];
const INVALID_VARIANTS: readonly PhoneInvalidVariant[] = ['wrongLength', 'letters', 'wrongCountryCode', 'unknownPrefix', 'specialPrefix'];

/** A fixed call sequence covering every kind of call, recorded in call order. */
function firstOutputs(seed: number, referenceDate = SNAPSHOT_REFERENCE_DATE): Record<string, readonly string[]> {
  const generator = createPhone({ seed, referenceDate });
  return {
    plain: draw(5, () => generator()),
    mobile: draw(2, () => generator({ type: 'mobile' })),
    fixed: draw(5, () => generator({ type: 'fixed' })),
    edge: EDGE_VARIANTS.map((variant) => `${variant}: ${generator.edge(variant)}`),
    randomEdge: draw(3, () => generator.edge()),
    invalid: INVALID_VARIANTS.map((variant) => `${variant}: ${generator.invalid(variant)}`),
    randomInvalid: draw(3, () => generator.invalid()),
    plainAgain: draw(2, () => generator()),
  };
}

afterEach(() => {
  restoreClock();
  vi.restoreAllMocks();
});

describe('same seed + same calls = same output (docs/rules/core.md section 2)', () => {
  it('repeats the whole call sequence for every seed', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(firstOutputs(seed)).toEqual(firstOutputs(seed));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('gives different values for different seeds', () => {
    const firstValues = new Set(Array.from({ length: 100 }, (_, seed) => createPhone({ seed })()));
    expect(firstValues.size).toBeGreaterThan(95);
  });

  it('does not read the clock when referenceDate is given, and never uses Math.random', () => {
    const mathRandom = vi.spyOn(Math, 'random');
    setClock('2026-10-05T12:00:00Z', 'Europe/Prague');
    const before = firstOutputs(42);
    setClock('2045-03-01T23:59:59Z', 'America/Los_Angeles');
    expect(firstOutputs(42)).toEqual(before);
    expect(mathRandom).not.toHaveBeenCalled();
  });
});

describe('phone does not depend on the date (docs/rules/phone.md section 8)', () => {
  it('gives the same output for any referenceDate', () => {
    expectSameOutputForLaterReferenceDates({
      create: createPhone,
      plain: (generator) => generator(),
      laterReferenceDates: calendarDateArb,
      fixedPair: ['1900-01-01', '2099-12-31'],
      dateDependentInvalidVariants: [],
    });
  });
});

describe('seed snapshots (docs/rules/core.md section 2: a change is a breaking change)', () => {
  it('seed 0', () => {
    expect(firstOutputs(0)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withoutSpaces: +420604403073",
          "withoutCountryCode: 606 769 407",
          "digitsOnly: 737280429",
          "prefix00: 00420 605 750 795",
          "newMobileRange: +420 717 212 750",
          "voip: +420 910 279 725",
        ],
        "fixed": [
          "+420 531 042 091",
          "+420 398 593 019",
          "+420 231 331 303",
          "+420 596 209 225",
          "+420 393 276 557",
        ],
        "invalid": [
          "wrongLength: +4206082322691",
          "letters: +420 703 97l 909",
          "wrongCountryCode: +1 608 875 339",
          "unknownPrefix: +420 202 802 258",
          "specialPrefix: +420 845 338 168",
        ],
        "mobile": [
          "+420 798 258 895",
          "+420 608 743 866",
        ],
        "plain": [
          "+420 605 895 646",
          "+420 730 526 777",
          "+420 603 508 865",
          "+420 608 180 435",
          "+420 603 256 521",
        ],
        "plainAgain": [
          "+420 605 842 781",
          "+420 702 297 854",
        ],
        "randomEdge": [
          "724 671 972",
          "+420 910 776 402",
          "603960382",
        ],
        "randomInvalid": [
          "+420 843 396 700",
          "+420 653 039 294",
          "+420 608 681 8A2",
        ],
      }
    `);
  });

  it('seed 1', () => {
    expect(firstOutputs(1)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withoutSpaces: +420605104510",
          "withoutCountryCode: 794 320 859",
          "digitsOnly: 602324396",
          "prefix00: 00420 606 718 422",
          "newMobileRange: +420 716 815 610",
          "voip: +420 910 018 646",
        ],
        "fixed": [
          "+420 475 749 722",
          "+420 479 653 149",
          "+420 410 549 599",
          "+420 567 344 558",
          "+420 216 960 556",
        ],
        "invalid": [
          "wrongLength: +42070391398",
          "letters: +420 l06 530 331",
          "wrongCountryCode: +1 606 504 830",
          "unknownPrefix: +420 600 667 841",
          "specialPrefix: +420 844 401 328",
        ],
        "mobile": [
          "+420 704 700 529",
          "+420 605 543 712",
        ],
        "plain": [
          "+420 608 249 758",
          "+420 736 704 732",
          "+420 705 065 493",
          "+420 602 141 053",
          "+420 796 030 295",
        ],
        "plainAgain": [
          "+420 606 211 122",
          "+420 605 948 998",
        ],
        "randomEdge": [
          "+420606658387",
          "+420 910 601 716",
          "00420 779 150 793",
        ],
        "randomInvalid": [
          "+420 6O1 628 332",
          "+420 760 471 956",
          "+49 704 215 279",
        ],
      }
    `);
  });

  it('seed 42', () => {
    expect(firstOutputs(42)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withoutSpaces: +420604474786",
          "withoutCountryCode: 601 393 979",
          "digitsOnly: 777432893",
          "prefix00: 00420 729 037 711",
          "newMobileRange: +420 715 790 626",
          "voip: +420 910 312 678",
        ],
        "fixed": [
          "+420 419 454 079",
          "+420 548 374 415",
          "+420 530 766 675",
          "+420 554 242 366",
          "+420 389 022 457",
        ],
        "invalid": [
          "wrongLength: +4207269466832",
          "letters: +420 705 968 O83",
          "wrongCountryCode: +43 737 624 303",
          "unknownPrefix: +420 745 388 939",
          "specialPrefix: +420 842 344 154",
        ],
        "mobile": [
          "+420 601 539 531",
          "+420 770 182 928",
        ],
        "plain": [
          "+420 606 367 819",
          "+420 703 584 625",
          "+420 702 953 043",
          "+420 702 899 025",
          "+420 705 299 507",
        ],
        "plainAgain": [
          "+420 778 777 587",
          "+420 730 006 064",
        ],
        "randomEdge": [
          "+420704750616",
          "+420 910 428 284",
          "+420602320136",
        ],
        "randomInvalid": [
          "+421 703 342 174",
          "+420 600 704 423",
          "+420 702 O51 313",
        ],
      }
    `);
  });

  it('seed 4294967295', () => {
    expect(firstOutputs(4294967295)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withoutSpaces: +420603766491",
          "withoutCountryCode: 606 348 793",
          "digitsOnly: 705339877",
          "prefix00: 00420 601 730 057",
          "newMobileRange: +420 711 749 707",
          "voip: +420 910 801 021",
        ],
        "fixed": [
          "+420 472 345 479",
          "+420 466 901 915",
          "+420 589 905 987",
          "+420 389 035 411",
          "+420 353 884 186",
        ],
        "invalid": [
          "wrongLength: +42070284064",
          "letters: +420 705 725 A21",
          "wrongCountryCode: +43 605 008 758",
          "unknownPrefix: +420 672 075 947",
          "specialPrefix: +420 810 867 266",
        ],
        "mobile": [
          "+420 604 715 096",
          "+420 608 074 333",
        ],
        "plain": [
          "+420 739 391 703",
          "+420 608 236 567",
          "+420 603 138 634",
          "+420 607 610 155",
          "+420 607 070 150",
        ],
        "plainAgain": [
          "+420 732 433 178",
          "+420 732 531 512",
        ],
        "randomEdge": [
          "+420606464449",
          "00420 779 432 632",
          "+420724386475",
        ],
        "randomInvalid": [
          "+420 842 024 870",
          "+420 603 l11 754",
          "+420 601 54A 714",
        ],
      }
    `);
  });
});
