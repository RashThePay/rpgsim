import type { CharacterLoadout, Loadout, Stats } from "./types";
import type { ContentRegistry } from "./registry";

export const EMPTY_STATS: Stats = {
  maxHp: 0,
  maxMp: 0,
  atk: 0,
  def: 0,
  mag: 0,
  res: 0,
  spd: 0,
  crt: 0,
};

export function addStats(a: Stats, b: Partial<Stats>): Stats {
  return {
    maxHp: a.maxHp + (b.maxHp ?? 0),
    maxMp: a.maxMp + (b.maxMp ?? 0),
    atk: a.atk + (b.atk ?? 0),
    def: a.def + (b.def ?? 0),
    mag: a.mag + (b.mag ?? 0),
    res: a.res + (b.res ?? 0),
    spd: a.spd + (b.spd ?? 0),
    crt: a.crt + (b.crt ?? 0),
  };
}

export function clampStats(stats: Stats): Stats {
  return {
    maxHp: Math.max(1, stats.maxHp),
    maxMp: Math.max(0, stats.maxMp),
    atk: Math.max(1, stats.atk),
    def: Math.max(0, stats.def),
    mag: Math.max(1, stats.mag),
    res: Math.max(0, stats.res),
    spd: Math.max(1, stats.spd),
    crt: Math.max(0, Math.min(80, stats.crt)),
  };
}

export function computeStats(loadout: CharacterLoadout, registry: ContentRegistry): Stats {
  let stats = { ...loadout.baseStats };
  const slots: (keyof Loadout)[] = ["weapon", "armor", "accessory"];
  for (const slot of slots) {
    const id = loadout.loadout[slot];
    if (typeof id !== "string") continue;
    const item = registry.getItem(id);
    if (item?.bonuses) stats = addStats(stats, item.bonuses);
  }
  return clampStats(stats);
}
