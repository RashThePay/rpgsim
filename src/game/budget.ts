import type { CharacterLoadout } from "../engine/types";
import type { ContentRegistry } from "../engine/registry";

export const BUDGET_CAP = 100;

export const ITEM_COST: Record<string, number> = {
  "iron-longsword": 12,
  "war-axe": 16,
  "twin-daggers": 18,
  "flame-staff": 16,
  longbow: 14,
  "blessed-mace": 14,
  "plate-mail": 18,
  leather: 10,
  "mage-robes": 14,
  chain: 12,
  "cleric-vestments": 12,
  "swift-ring": 14,
  "brutal-charm": 12,
  "sage-bead": 12,
  "lifeblood-band": 10,
  "warding-amulet": 12,
  potion: 4,
  ether: 5,
};

export const SKILL_COST: Record<string, number> = {
  "power-strike": 8,
  bash: 10,
  taunt: 8,
  "shield-wall": 12,
  "poison-stab": 10,
  backstab: 12,
  haste: 10,
  fireball: 12,
  blizzard: 16,
  "arcane-bolt": 6,
  ignite: 10,
  heal: 10,
  "mass-heal": 16,
  bless: 8,
  cleanse: 8,
  regenerate: 10,
  "aimed-shot": 10,
  "pin-down": 8,
  execute: 14,
  rage: 10,
  cleave: 14,
  shatter: 10,
};

export interface CostLine {
  id: string;
  label: string;
  cost: number;
}

export interface BudgetBreakdown {
  total: number;
  cap: number;
  over: boolean;
  remaining: number;
  lines: CostLine[];
}

export function itemCost(id: string, charges = 1): number {
  return (ITEM_COST[id] ?? 0) * charges;
}

export function skillCost(id: string): number {
  return SKILL_COST[id] ?? 0;
}

export function scoreLoadout(loadout: CharacterLoadout, registry: ContentRegistry): BudgetBreakdown {
  const lines: CostLine[] = [];
  const gear = [loadout.loadout.weapon, loadout.loadout.armor, loadout.loadout.accessory];
  for (const id of gear) {
    if (!id) continue;
    const item = registry.getItem(id);
    const cost = itemCost(id);
    if (cost > 0) lines.push({ id, label: item?.name ?? id, cost });
  }
  for (const pack of loadout.loadout.consumables) {
    if (pack.charges <= 0) continue;
    const item = registry.getItem(pack.itemId);
    const cost = itemCost(pack.itemId, pack.charges);
    lines.push({
      id: `${pack.itemId}x${pack.charges}`,
      label: `${item?.name ?? pack.itemId} ×${pack.charges}`,
      cost,
    });
  }
  for (const id of loadout.skills) {
    const skill = registry.getSkill(id);
    const cost = skillCost(id);
    if (cost > 0) lines.push({ id, label: skill?.name ?? id, cost });
  }
  const total = lines.reduce((s, l) => s + l.cost, 0);
  return {
    total,
    cap: BUDGET_CAP,
    over: total > BUDGET_CAP,
    remaining: BUDGET_CAP - total,
    lines,
  };
}
