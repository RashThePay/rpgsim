import type { ClassPreset } from "./types.js";

/** Built-in character classes players can pick for either side of a battle. */
export const CLASS_PRESETS: ClassPreset[] = [
  {
    id: "knight",
    name: "Knight",
    description: "Sturdy frontline fighter with heavy armor and reliable damage.",
    maxHp: 120,
    attack: 22,
    defense: 14,
    speed: 8,
    critChance: 0.1,
  },
  {
    id: "mage",
    name: "Mage",
    description: "Glass cannon that hits hard and crits often, but is fragile.",
    maxHp: 70,
    attack: 34,
    defense: 4,
    speed: 11,
    critChance: 0.28,
  },
  {
    id: "rogue",
    name: "Rogue",
    description: "Lightning-fast striker who acts first and lands frequent crits.",
    maxHp: 85,
    attack: 26,
    defense: 7,
    speed: 16,
    critChance: 0.35,
  },
  {
    id: "cleric",
    name: "Cleric",
    description: "Support healer that mends the most-wounded ally each turn.",
    maxHp: 95,
    attack: 14,
    defense: 9,
    speed: 10,
    critChance: 0.08,
    healPower: 26,
  },
  {
    id: "goblin",
    name: "Goblin",
    description: "Weak but numerous; dangerous when they swarm in a pack.",
    maxHp: 45,
    attack: 15,
    defense: 3,
    speed: 12,
    critChance: 0.12,
  },
  {
    id: "ogre",
    name: "Ogre",
    description: "Slow, hulking brute with a massive health pool and crushing blows.",
    maxHp: 200,
    attack: 30,
    defense: 10,
    speed: 5,
    critChance: 0.05,
  },
  {
    id: "dragon",
    name: "Dragon",
    description: "Apex boss with overwhelming stats across the board.",
    maxHp: 260,
    attack: 38,
    defense: 16,
    speed: 9,
    critChance: 0.2,
  },
];

const PRESETS_BY_ID = new Map(CLASS_PRESETS.map((preset) => [preset.id, preset]));

export function getPreset(classId: string): ClassPreset | undefined {
  return PRESETS_BY_ID.get(classId);
}
