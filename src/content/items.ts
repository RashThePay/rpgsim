import type { Item } from "../engine/types";

export const ITEMS: Item[] = [
  {
    id: "iron-longsword",
    name: "Iron Longsword",
    slot: "weapon",
    description: "Honest steel. +12 ATK.",
    bonuses: { atk: 12 },
  },
  {
    id: "war-axe",
    name: "War Axe",
    slot: "weapon",
    description: "Heavy and mean. +18 ATK, −5 SPD.",
    bonuses: { atk: 18, spd: -5 },
  },
  {
    id: "twin-daggers",
    name: "Twin Daggers",
    slot: "weapon",
    description: "Quick knives. +8 ATK, +10 SPD, +8 CRT.",
    bonuses: { atk: 8, spd: 10, crt: 8 },
  },
  {
    id: "flame-staff",
    name: "Ember Staff",
    slot: "weapon",
    description: "A cinder at the tip. +14 MAG, +6 MP.",
    bonuses: { mag: 14, maxMp: 6 },
  },
  {
    id: "longbow",
    name: "Ash Longbow",
    slot: "weapon",
    description: "Far and fair. +11 ATK, +6 SPD.",
    bonuses: { atk: 11, spd: 6 },
  },
  {
    id: "blessed-mace",
    name: "Blessed Mace",
    slot: "weapon",
    description: "Warm to the touch. +8 ATK, +8 MAG.",
    bonuses: { atk: 8, mag: 8 },
  },
  {
    id: "plate-mail",
    name: "Plate Mail",
    slot: "armor",
    description: "Slow fortress. +28 HP, +14 DEF, −6 SPD.",
    bonuses: { maxHp: 28, def: 14, spd: -6 },
  },
  {
    id: "leather",
    name: "Leather Jack",
    slot: "armor",
    description: "Light and quiet. +10 HP, +6 DEF, +5 SPD.",
    bonuses: { maxHp: 10, def: 6, spd: 5 },
  },
  {
    id: "mage-robes",
    name: "Ashen Robes",
    slot: "armor",
    description: "Wards and weave. +12 MP, +10 RES, +4 MAG.",
    bonuses: { maxMp: 12, res: 10, mag: 4 },
  },
  {
    id: "chain",
    name: "Chain Hauberk",
    slot: "armor",
    description: "A middle path. +16 HP, +10 DEF.",
    bonuses: { maxHp: 16, def: 10 },
  },
  {
    id: "cleric-vestments",
    name: "Vestments",
    slot: "armor",
    description: "Soft cloth, hard faith. +14 HP, +8 RES, +4 MAG.",
    bonuses: { maxHp: 14, res: 8, mag: 4 },
  },
  {
    id: "swift-ring",
    name: "Swift Ring",
    slot: "accessory",
    description: "The world drags behind you. +14 SPD.",
    bonuses: { spd: 14 },
  },
  {
    id: "brutal-charm",
    name: "Brutal Charm",
    slot: "accessory",
    description: "A tooth on a cord. +10 CRT, +4 ATK.",
    bonuses: { crt: 10, atk: 4 },
  },
  {
    id: "sage-bead",
    name: "Sage Bead",
    slot: "accessory",
    description: "A quiet mind. +14 MP, +5 MAG.",
    bonuses: { maxMp: 14, mag: 5 },
  },
  {
    id: "lifeblood-band",
    name: "Lifeblood Band",
    slot: "accessory",
    description: "Thrums with pulse. +20 HP.",
    bonuses: { maxHp: 20 },
  },
  {
    id: "warding-amulet",
    name: "Warding Amulet",
    slot: "accessory",
    description: "Turns blades and hexes. +8 DEF, +8 RES.",
    bonuses: { def: 8, res: 8 },
  },
  {
    id: "potion",
    name: "Potion",
    slot: "consumable",
    description: "Drink when the line breaks. Heals self.",
    charges: 2,
    skillId: "potion",
  },
  {
    id: "ether",
    name: "Ether",
    slot: "consumable",
    description: "A sip of the weave.",
    charges: 1,
    skillId: "ether",
  },
];

export const WEAPONS = ITEMS.filter((i) => i.slot === "weapon");
export const ARMORS = ITEMS.filter((i) => i.slot === "armor");
export const ACCESSORIES = ITEMS.filter((i) => i.slot === "accessory");
export const CONSUMABLES = ITEMS.filter((i) => i.slot === "consumable");
export const SKILL_LIST_EXCLUDE = new Set(["potion", "ether", "share-ether"]);
