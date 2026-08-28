import type { IconType } from "react-icons";
import {
  GiAxeSword,
  GiBattleAxe,
  GiBowArrow,
  GiBreastplate,
  GiBroadsword,
  GiChainMail,
  GiCrossedSwords,
  GiCrystalWand,
  GiDaggers,
  GiFireball,
  GiHealthPotion,
  GiHelmet,
  GiHoodedAssassin,
  GiIceBolt,
  GiLeatherArmor,
  GiMagicAxe,
  GiMagicPotion,
  GiPocketBow,
  GiPointyHat,
  GiRing,
  GiRobe,
  GiScrollUnfurled,
  GiShieldBash,
  GiSkullRing,
  GiSpikedMace,
  GiSunPriest,
  GiSwordman,
  GiTwoCoins,
  GiWolfHead,
  GiAnvil,
  GiArena,
  GiCastle,
} from "react-icons/gi";

const SKILL_ICONS: Record<string, IconType> = {
  "power-strike": GiBroadsword,
  bash: GiShieldBash,
  taunt: GiCastle,
  "shield-wall": GiBreastplate,
  "poison-stab": GiDaggers,
  backstab: GiHoodedAssassin,
  haste: GiPocketBow,
  fireball: GiFireball,
  blizzard: GiIceBolt,
  "arcane-bolt": GiCrystalWand,
  ignite: GiFireball,
  heal: GiHealthPotion,
  "mass-heal": GiSunPriest,
  bless: GiSunPriest,
  cleanse: GiMagicPotion,
  regenerate: GiHealthPotion,
  "aimed-shot": GiBowArrow,
  "pin-down": GiPocketBow,
  execute: GiAxeSword,
  rage: GiMagicAxe,
  cleave: GiBattleAxe,
  shatter: GiShieldBash,
};

const ITEM_ICONS: Record<string, IconType> = {
  "iron-longsword": GiBroadsword,
  "war-axe": GiBattleAxe,
  "twin-daggers": GiDaggers,
  "flame-staff": GiCrystalWand,
  longbow: GiBowArrow,
  "blessed-mace": GiSpikedMace,
  "plate-mail": GiBreastplate,
  leather: GiLeatherArmor,
  "mage-robes": GiRobe,
  chain: GiChainMail,
  "cleric-vestments": GiRobe,
  "swift-ring": GiRing,
  "brutal-charm": GiSkullRing,
  "sage-bead": GiCrystalWand,
  "lifeblood-band": GiRing,
  "warding-amulet": GiRing,
  potion: GiHealthPotion,
  ether: GiMagicPotion,
};

const ARCHETYPE_ICONS: Record<string, IconType> = {
  Knight: GiHelmet,
  Rogue: GiHoodedAssassin,
  Mage: GiPointyHat,
  Cleric: GiSunPriest,
  Ranger: GiBowArrow,
  Berserker: GiAxeSword,
};

export const NavIcons = {
  forge: GiAnvil,
  arena: GiArena,
  home: GiCrossedSwords,
  gold: GiTwoCoins,
  scroll: GiScrollUnfurled,
  wolf: GiWolfHead,
  fighter: GiSwordman,
};

export function skillIcon(id: string): IconType {
  return SKILL_ICONS[id] ?? GiScrollUnfurled;
}

export function itemIcon(id: string): IconType {
  return ITEM_ICONS[id] ?? GiBroadsword;
}

export function archetypeIcon(name: string): IconType {
  return ARCHETYPE_ICONS[name] ?? GiSwordman;
}
