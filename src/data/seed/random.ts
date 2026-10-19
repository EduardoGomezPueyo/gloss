/** Small deterministic PRNG (mulberry32) so the demo data is the same on every seed. */
export function createRandom(seed: number) {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min: number, max: number): number {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('Cannot pick from an empty list');
      return items[Math.floor(next() * items.length)]!;
    },
    /** Picks a key with probability proportional to its weight. */
    weighted<K extends string>(weights: Readonly<Record<K, number>>): K {
      const entries = Object.entries(weights) as [K, number][];
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [key, weight] of entries) {
        roll -= weight;
        if (roll < 0) return key;
      }
      return entries[entries.length - 1]![0];
    },
  };
}

export type Random = ReturnType<typeof createRandom>;
