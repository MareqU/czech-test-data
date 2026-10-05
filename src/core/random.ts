// Seeded PRNG and per-identifier stream seeds – docs/rules/core.md sections 1 and 2.
// Every output for a given seed is frozen: changing any line here is a breaking change.

const TWO_POW_32 = 0x1_0000_0000;
const MAX_UINT32 = 0xffff_ffff;

// SplitMix32 constants from the reference (docs/rules/core.md section 1):
// https://gist.github.com/tommyettinger/46a874533244883189143505d203312c (comment of 10 Nov 2022)
const GOLDEN_GAMMA = 0x9e37_79b9;
const MIX_1 = 0x21f0_aaad;
const MIX_2 = 0x735a_2d97;

// 32-bit FNV-1a parameters: http://www.isthe.com/chongo/tech/comp/fnv/index.html#FNV-1a
const FNV_OFFSET_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;

/**
 * Seeded source of randomness shared by all generators (internal, not part of the public API).
 *
 * All methods use integer arithmetic only, so the same seed gives the same values in every JS engine.
 */
export interface Random {
  /** Next raw SplitMix32 output, an integer from 0 to 2^32 − 1. */
  uint32(): number;
  /**
   * Uniform integer from `min` to `max`, both inclusive.
   *
   * @throws RangeError if a bound is not a safe integer, `min > max`, or the range has more than 2^32 values.
   */
  int(min: number, max: number): number;
  /**
   * Uniformly chosen element of `items`, exactly `items[int(0, items.length − 1)]`.
   *
   * @throws RangeError for an empty list.
   */
  pick<T>(items: readonly T[]): T;
  /**
   * String of `length` random decimal digits (leading zeros allowed), one `int(0, 9)` per digit.
   *
   * @throws RangeError for a negative or non-integer length.
   */
  digits(length: number): string;
}

/**
 * Checks that `seed` is an integer from 0 to 2^32 − 1 (docs/rules/core.md section 1).
 *
 * @throws RangeError naming the seed otherwise.
 */
export function assertSeed(seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_UINT32) {
    throw new RangeError(`seed must be an integer from 0 to ${String(MAX_UINT32)}, got ${String(seed)}`);
  }
}

function assertRange(min: number, max: number): void {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
    throw new RangeError(`int(min, max) needs safe integers with min <= max, got ${String(min)}, ${String(max)}`);
  }
  // Checked before the rejection loop: for n > 2^32 the limit below would be 0 and the loop would never end.
  if (max - min + 1 > TWO_POW_32) {
    throw new RangeError(`int(min, max) supports at most 2^32 values, got ${String(min)}, ${String(max)}`);
  }
}

/**
 * Creates the SplitMix32 PRNG with initial state `seed` (docs/rules/core.md section 1).
 *
 * @param seed - Integer from 0 to 2^32 − 1.
 * @throws RangeError for any other seed.
 */
export function createRandom(seed: number): Random {
  assertSeed(seed);
  let state = seed;

  const uint32 = (): number => {
    state = (state + GOLDEN_GAMMA) >>> 0;
    let z = state;
    z ^= z >>> 16;
    z = Math.imul(z, MIX_1);
    z ^= z >>> 15;
    z = Math.imul(z, MIX_2);
    z ^= z >>> 15;
    return z >>> 0;
  };

  // Frozen algorithm (docs/rules/core.md section 1): rejection sampling removes the `% n` modulo bias.
  const int = (min: number, max: number): number => {
    assertRange(min, max);
    const n = max - min + 1;
    if (n === TWO_POW_32) {
      return min + uint32();
    }
    const limit = TWO_POW_32 - (TWO_POW_32 % n);
    let u = uint32();
    while (u >= limit) {
      u = uint32();
    }
    return min + (u % n);
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new RangeError('pick(items) needs a non-empty list');
    }
    // The index is within bounds, so the element exists even though the index type says T | undefined.
    return items[int(0, items.length - 1)] as T;
  };

  const digits = (length: number): string => {
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new RangeError(`digits(length) needs a non-negative integer, got ${String(length)}`);
    }
    let result = '';
    for (let i = 0; i < length; i += 1) {
      result += String(int(0, 9));
    }
    return result;
  };

  return { uint32, int, pick, digits };
}

/** 32-bit FNV-1a over the UTF-16 code units of `text` (docs/rules/core.md section 2). */
function fnv1a32(text: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), FNV_PRIME) >>> 0;
  }
  return hash;
}

/**
 * Initial PRNG state of the stream of identifier `id`: `(seed XOR fnv1a32(id)) >>> 0`.
 *
 * One stream per identifier (docs/rules/core.md section 2, decision Q3) means calls of one identifier
 * never shift the values of another.
 *
 * @param seed - Integer from 0 to 2^32 − 1.
 * @param id - camelCase identifier id, e.g. `birthNumber`.
 * @throws RangeError for an invalid seed.
 */
export function streamSeed(seed: number, id: string): number {
  assertSeed(seed);
  return (seed ^ fnv1a32(id)) >>> 0;
}
