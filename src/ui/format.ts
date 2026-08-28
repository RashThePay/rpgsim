import type { CharacterLoadout, StatusId, Tactic, TacticPredicate } from "../engine/types";
import { STATUS_LABELS } from "../engine/catalog";

export const TEAM_LABELS = { a: "Ashen Line", b: "Cinder Host" } as const;

export function formatPredicate(pred: TacticPredicate): string {
  switch (pred.kind) {
    case "always":
      return "always";
    case "hpBelow":
      return `HP < ${pred.pct}%`;
    case "hpAbove":
      return `HP > ${pred.pct}%`;
    case "mpBelow":
      return `MP < ${pred.pct}%`;
    case "mpAbove":
      return `MP > ${pred.pct}%`;
    case "hasStatus":
      return `has ${STATUS_LABELS[pred.status]}`;
    case "missingStatus":
      return `no ${STATUS_LABELS[pred.status]}`;
    case "alliesAliveGte":
      return `${pred.count}+ allies up`;
    case "enemiesAliveGte":
      return `${pred.count}+ foes up`;
  }
}

export function formatTactic(t: Tactic, character: CharacterLoadout): string {
  const who = t.condition.who === "self" ? "Self" : t.condition.who === "ally" ? "Ally" : "Foe";
  let action = "Strike";
  if (t.action.kind === "skill") action = t.action.skillId;
  if (t.action.kind === "item") {
    const id = t.action.itemId;
    action = character.loadout.consumables.find((c) => c.itemId === id)?.itemId ?? id;
  }
  return `${who}: ${formatPredicate(t.condition.predicate)} → ${action}`;
}

export function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.max(0, Math.min(100, (n / d) * 100));
}

export const STATUS_SHORT: Record<StatusId, string> = {
  poison: "PSN",
  burn: "BRN",
  stun: "STN",
  haste: "HST",
  slow: "SLW",
  regen: "RGN",
  atkUp: "ATK",
  defDown: "BRK",
  taunt: "TNT",
  shielded: "AEG",
};

export const PREFER_LABELS = {
  lowestHp: "Lowest HP",
  highestHp: "Highest HP",
  random: "Random",
  fastest: "Fastest",
  slowest: "Slowest",
  taunting: "Taunting first",
} as const;
