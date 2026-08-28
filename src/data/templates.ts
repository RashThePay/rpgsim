import type { CharacterLoadout, Stats, Tactic } from "../engine/types";

let seq = 0;
function nid(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}-${Math.random().toString(36).slice(2, 7)}`;
}

export function makeTactic(
  condition: Tactic["condition"],
  action: Tactic["action"],
  prefer: Tactic["prefer"] = "lowestHp",
): Tactic {
  return { id: nid("tac"), enabled: true, condition, prefer, action };
}

export const ARCHETYPE_STATS: Record<string, Stats> = {
  Knight: { maxHp: 168, maxMp: 42, atk: 22, def: 18, mag: 8, res: 12, spd: 28, crt: 6 },
  Rogue: { maxHp: 118, maxMp: 38, atk: 24, def: 10, mag: 10, res: 10, spd: 46, crt: 18 },
  Mage: { maxHp: 96, maxMp: 78, atk: 8, def: 7, mag: 32, res: 16, spd: 30, crt: 8 },
  Cleric: { maxHp: 124, maxMp: 70, atk: 12, def: 11, mag: 26, res: 18, spd: 27, crt: 5 },
  Ranger: { maxHp: 126, maxMp: 44, atk: 23, def: 11, mag: 12, res: 11, spd: 40, crt: 14 },
  Berserker: { maxHp: 150, maxMp: 32, atk: 30, def: 12, mag: 6, res: 8, spd: 34, crt: 12 },
};

export const ARCHETYPE_SKILLS: Record<string, string[]> = {
  Knight: ["power-strike", "bash", "taunt", "shield-wall"],
  Rogue: ["poison-stab", "backstab", "haste", "execute"],
  Mage: ["fireball", "blizzard", "arcane-bolt", "ignite"],
  Cleric: ["heal", "mass-heal", "bless", "cleanse", "regenerate"],
  Ranger: ["aimed-shot", "pin-down", "execute", "cleanse"],
  Berserker: ["cleave", "rage", "power-strike", "shatter"],
};

export const ARCHETYPE_LOADOUT: Record<
  string,
  CharacterLoadout["loadout"]
> = {
  Knight: {
    weapon: "iron-longsword",
    armor: "plate-mail",
    accessory: "warding-amulet",
    consumables: [{ itemId: "potion", charges: 2 }],
  },
  Rogue: {
    weapon: "twin-daggers",
    armor: "leather",
    accessory: "brutal-charm",
    consumables: [{ itemId: "potion", charges: 1 }],
  },
  Mage: {
    weapon: "flame-staff",
    armor: "mage-robes",
    accessory: "sage-bead",
    consumables: [{ itemId: "ether", charges: 1 }],
  },
  Cleric: {
    weapon: "blessed-mace",
    armor: "cleric-vestments",
    accessory: "lifeblood-band",
    consumables: [{ itemId: "potion", charges: 2 }],
  },
  Ranger: {
    weapon: "longbow",
    armor: "leather",
    accessory: "swift-ring",
    consumables: [{ itemId: "potion", charges: 1 }],
  },
  Berserker: {
    weapon: "war-axe",
    armor: "chain",
    accessory: "brutal-charm",
    consumables: [{ itemId: "potion", charges: 1 }],
  },
};

export function defaultTactics(archetype: string): Tactic[] {
  switch (archetype) {
    case "Knight":
      return [
        makeTactic({ who: "self", predicate: { kind: "hpBelow", pct: 35 } }, { kind: "skill", skillId: "shield-wall" }, "lowestHp"),
        makeTactic({ who: "self", predicate: { kind: "missingStatus", status: "taunt" } }, { kind: "skill", skillId: "taunt" }),
        makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "skill", skillId: "bash" }, "fastest"),
        makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "skill", skillId: "power-strike" }, "taunting"),
        makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" }, "taunting"),
      ];
    case "Rogue":
      return [
        makeTactic({ who: "self", predicate: { kind: "hpBelow", pct: 28 } }, { kind: "item", itemId: "potion" }),
        makeTactic({ who: "enemy", predicate: { kind: "hpBelow", pct: 40 } }, { kind: "skill", skillId: "execute" }, "lowestHp"),
        makeTactic({ who: "enemy", predicate: { kind: "missingStatus", status: "poison" } }, { kind: "skill", skillId: "poison-stab" }, "highestHp"),
        makeTactic({ who: "self", predicate: { kind: "missingStatus", status: "haste" } }, { kind: "skill", skillId: "haste" }),
        makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "skill", skillId: "backstab" }, "lowestHp"),
        makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" }, "lowestHp"),
      ];
    case "Mage":
      return [
        makeTactic({ who: "self", predicate: { kind: "mpBelow", pct: 18 } }, { kind: "item", itemId: "ether" }),
        makeTactic({ who: "enemy", predicate: { kind: "enemiesAliveGte", count: 2 } }, { kind: "skill", skillId: "blizzard" }, "highestHp"),
        makeTactic({ who: "enemy", predicate: { kind: "missingStatus", status: "burn" } }, { kind: "skill", skillId: "ignite" }, "highestHp"),
        makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "skill", skillId: "fireball" }, "lowestHp"),
        makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "skill", skillId: "arcane-bolt" }, "lowestHp"),
        makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" }, "lowestHp"),
      ];
    case "Cleric":
      return [
        makeTactic({ who: "ally", predicate: { kind: "hpBelow", pct: 42 } }, { kind: "skill", skillId: "heal" }, "lowestHp"),
        makeTactic({ who: "ally", predicate: { kind: "hasStatus", status: "poison" } }, { kind: "skill", skillId: "cleanse" }, "lowestHp"),
        makeTactic({ who: "ally", predicate: { kind: "hasStatus", status: "burn" } }, { kind: "skill", skillId: "cleanse" }, "lowestHp"),
        makeTactic({ who: "ally", predicate: { kind: "missingStatus", status: "regen" } }, { kind: "skill", skillId: "regenerate" }, "lowestHp"),
        makeTactic({ who: "ally", predicate: { kind: "missingStatus", status: "atkUp" } }, { kind: "skill", skillId: "bless" }, "fastest"),
        makeTactic({ who: "ally", predicate: { kind: "hpBelow", pct: 70 } }, { kind: "skill", skillId: "mass-heal" }, "lowestHp"),
        makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" }, "lowestHp"),
      ];
    case "Ranger":
      return [
        makeTactic({ who: "enemy", predicate: { kind: "hpBelow", pct: 35 } }, { kind: "skill", skillId: "execute" }, "lowestHp"),
        makeTactic({ who: "enemy", predicate: { kind: "missingStatus", status: "slow" } }, { kind: "skill", skillId: "pin-down" }, "fastest"),
        makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "skill", skillId: "aimed-shot" }, "lowestHp"),
        makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" }, "lowestHp"),
      ];
    case "Berserker":
      return [
        makeTactic({ who: "self", predicate: { kind: "hpBelow", pct: 30 } }, { kind: "item", itemId: "potion" }),
        makeTactic({ who: "self", predicate: { kind: "missingStatus", status: "atkUp" } }, { kind: "skill", skillId: "rage" }),
        makeTactic({ who: "enemy", predicate: { kind: "missingStatus", status: "defDown" } }, { kind: "skill", skillId: "shatter" }, "highestHp"),
        makeTactic({ who: "enemy", predicate: { kind: "enemiesAliveGte", count: 2 } }, { kind: "skill", skillId: "cleave" }, "lowestHp"),
        makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "skill", skillId: "power-strike" }, "lowestHp"),
        makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" }, "lowestHp"),
      ];
    default:
      return [makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" })];
  }
}

export const ARCHETYPES = Object.keys(ARCHETYPE_STATS);

export function createCharacter(name: string, archetype: string): CharacterLoadout {
  const stats = ARCHETYPE_STATS[archetype] ?? ARCHETYPE_STATS.Knight;
  const loadout = ARCHETYPE_LOADOUT[archetype] ?? ARCHETYPE_LOADOUT.Knight;
  return {
    id: nid("char"),
    name,
    archetype,
    baseStats: { ...stats },
    loadout: {
      ...loadout,
      consumables: loadout.consumables.map((c) => ({ ...c })),
    },
    skills: [...(ARCHETYPE_SKILLS[archetype] ?? ARCHETYPE_SKILLS.Knight)],
    tactics: defaultTactics(archetype),
  };
}

export function cloneCharacter(c: CharacterLoadout): CharacterLoadout {
  return structuredClone(c);
}

export const SAMPLE_NAMES: Record<string, string[]> = {
  Knight: ["Ser Aldric", "Helene Ward", "Torren Pike"],
  Rogue: ["Vex", "Nim Shadow", "Kess"],
  Mage: ["Ash Calder", "Iri Voss", "Mael"],
  Cleric: ["Mira Sol", "Brother Quin", "Sera Vale"],
  Ranger: ["Lyn Arrow", "Rowan", "Pell"],
  Berserker: ["Ghrun", "Haska", "Red Fen"],
};

export function sampleEncounter(): { teamA: CharacterLoadout[]; teamB: CharacterLoadout[] } {
  return {
    teamA: [createCharacter("Ser Aldric", "Knight"), createCharacter("Mira Sol", "Cleric")],
    teamB: [createCharacter("Vex", "Rogue"), createCharacter("Ash Calder", "Mage")],
  };
}

export function sampleSkirmish(): { teamA: CharacterLoadout[]; teamB: CharacterLoadout[] } {
  return {
    teamA: [
      createCharacter("Helene Ward", "Knight"),
      createCharacter("Lyn Arrow", "Ranger"),
      createCharacter("Brother Quin", "Cleric"),
    ],
    teamB: [
      createCharacter("Ghrun", "Berserker"),
      createCharacter("Iri Voss", "Mage"),
      createCharacter("Nim Shadow", "Rogue"),
    ],
  };
}
