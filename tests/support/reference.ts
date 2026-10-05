// Independent reference implementations of the algorithms fixed in docs/rules/core.md.
// They are the test oracle: written from the rules document only, never from src/.
// The literal values pinned in the tests were computed with these functions and cross-checked
// against a C build of the reference code from the gist (native uint32 arithmetic) and a Python
// implementation with arbitrary-precision integers (int / pick / digits).

/** Upper bound (inclusive) of a valid seed: 2^32 − 1. */
export const MAX_UINT32 = 0xffffffff;

/**
 * SplitMix32 variant, docs/rules/core.md section 1.
 * Source: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c (comment of 10 Nov 2022)
 */
function createSplitMix32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z ^= z >>> 16;
    z = Math.imul(z, 0x21f0aaad);
    z ^= z >>> 15;
    z = Math.imul(z, 0x735a2d97);
    z ^= z >>> 15;
    return z >>> 0;
  };
}

/** The first `count` raw outputs of the SplitMix32 stream with initial state `seed`. */
export function referenceUint32s(seed: number, count: number): number[] {
  const next = createSplitMix32(seed);
  return Array.from({ length: count }, next);
}

const TWO_POW_32 = 2 ** 32;

/** The reference counterpart of the internal `Random` interface (docs/rules/core.md section 1). */
export interface ReferenceRandom {
  uint32(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  digits(length: number): string;
}

/**
 * Reference `int` / `pick` / `digits` with the frozen algorithms of docs/rules/core.md section 1.
 * Valid arguments only: the oracle computes expected values, it does not check errors.
 */
export function createReferenceRandom(seed: number): ReferenceRandom {
  const uint32 = createSplitMix32(seed);
  const int = (min: number, max: number): number => {
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
  return {
    uint32,
    int,
    pick<T>(items: readonly T[]): T {
      const item = items[int(0, items.length - 1)];
      if (item === undefined) {
        throw new Error('reference pick: index out of range');
      }
      return item;
    },
    digits(length: number): string {
      let result = '';
      for (let i = 0; i < length; i += 1) {
        result += String(int(0, 9));
      }
      return result;
    },
  };
}

/**
 * 32-bit FNV-1a over UTF-16 code units, docs/rules/core.md section 2.
 * Source: http://www.isthe.com/chongo/tech/comp/fnv/index.html#FNV-1a
 */
export function referenceFnv1a32(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/** `streamSeed = (seed XOR fnv1a32(id)) >>> 0`, docs/rules/core.md section 2. */
export function referenceStreamSeed(seed: number, id: string): number {
  return (seed ^ referenceFnv1a32(id)) >>> 0;
}

/** Zero-pads a uint32 to its maximum width of 10 decimal digits. */
export function pad10(value: number): string {
  return String(value).padStart(10, '0');
}
