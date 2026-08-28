/**
 * Deterministic pseudo-random number generator.
 *
 * A seeded PRNG keeps battle simulations reproducible: the same seed and inputs
 * always yield the same fight, which is what makes the engine testable.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Normalize into a non-zero 32-bit integer.
    this.state = (seed >>> 0) || 0x9e3779b9;
  }

  /** Returns a float in the half-open interval [0, 1). */
  next(): number {
    // mulberry32
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in the inclusive range [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns true with the given probability (0..1). */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

/** Derives a stable numeric seed from an arbitrary string. */
export function seedFromString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
