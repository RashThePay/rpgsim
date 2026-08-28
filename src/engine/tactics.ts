import { getSkill } from "./catalog";
import type {
  Combatant,
  Prefer,
  Skill,
  Tactic,
  TacticAction,
  TacticCondition,
  TacticPredicate,
} from "./types";
import { pickIndex, type Rng } from "./rng";

export function hpPct(unit: Combatant): number {
  return unit.stats.maxHp <= 0 ? 0 : (unit.hp / unit.stats.maxHp) * 100;
}

export function mpPct(unit: Combatant): number {
  return unit.stats.maxMp <= 0 ? 0 : (unit.mp / unit.stats.maxMp) * 100;
}

export function hasStatus(unit: Combatant, id: string): boolean {
  return unit.statuses.some((s) => s.id === id);
}

export function evalPredicate(unit: Combatant, pred: TacticPredicate, allies: Combatant[], enemies: Combatant[]): boolean {
  switch (pred.kind) {
    case "always":
      return true;
    case "hpBelow":
      return hpPct(unit) < pred.pct;
    case "hpAbove":
      return hpPct(unit) > pred.pct;
    case "mpBelow":
      return mpPct(unit) < pred.pct;
    case "mpAbove":
      return mpPct(unit) > pred.pct;
    case "hasStatus":
      return hasStatus(unit, pred.status);
    case "missingStatus":
      return !hasStatus(unit, pred.status);
    case "alliesAliveGte":
      return allies.filter((u) => u.alive).length >= pred.count;
    case "enemiesAliveGte":
      return enemies.filter((u) => u.alive).length >= pred.count;
  }
}

export function poolFor(who: TacticCondition["who"], actor: Combatant, all: Combatant[]): Combatant[] {
  if (who === "self") return actor.alive ? [actor] : [];
  if (who === "ally") return all.filter((u) => u.alive && u.team === actor.team);
  return all.filter((u) => u.alive && u.team !== actor.team);
}

export function preferSort(units: Combatant[], prefer: Prefer, rng: Rng): Combatant[] {
  const copy = [...units];
  switch (prefer) {
    case "lowestHp":
      return copy.sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id));
    case "highestHp":
      return copy.sort((a, b) => b.hp - a.hp || a.id.localeCompare(b.id));
    case "fastest":
      return copy.sort((a, b) => b.stats.spd - a.stats.spd || a.id.localeCompare(b.id));
    case "slowest":
      return copy.sort((a, b) => a.stats.spd - b.stats.spd || a.id.localeCompare(b.id));
    case "taunting": {
      const taunters = copy.filter((u) => hasStatus(u, "taunt"));
      const rest = copy.filter((u) => !hasStatus(u, "taunt"));
      return [...preferSort(taunters, "highestHp", rng), ...preferSort(rest, "lowestHp", rng)];
    }
    case "random": {
      const i = pickIndex(rng, copy.length);
      if (i > 0) [copy[0], copy[i]] = [copy[i], copy[0]];
      return copy;
    }
  }
}

export function canUseAction(actor: Combatant, action: TacticAction): boolean {
  if (action.kind === "attack") return true;
  if (action.kind === "item") {
    const pack = actor.loadout.consumables.find((c) => c.itemId === action.itemId);
    return !!pack && pack.charges > 0;
  }
  const skill = getSkill(action.skillId);
  if (!skill) return false;
  if (!actor.skills.includes(action.skillId) && action.skillId !== "potion" && action.skillId !== "ether") {
    return false;
  }
  if (actor.mp < skill.mpCost) return false;
  if ((actor.cooldowns[skill.id] ?? 0) > 0) return false;
  return true;
}

export function skillForAction(action: TacticAction): Skill | undefined {
  if (action.kind === "attack") {
    return {
      id: "attack",
      name: "Strike",
      description: "A basic attack.",
      mpCost: 0,
      cooldown: 0,
      target: "enemy",
      effects: [{ type: "damage", damageType: "physical", power: 1 }],
    };
  }
  if (action.kind === "item") {
    return getSkill(action.itemId);
  }
  return getSkill(action.skillId);
}

export interface ChosenAction {
  tactic: Tactic;
  skill: Skill;
  targets: Combatant[];
}

export function chooseAction(actor: Combatant, all: Combatant[], rng: Rng): ChosenAction | null {
  const allies = all.filter((u) => u.team === actor.team);
  const enemies = all.filter((u) => u.team !== actor.team);

  for (const tactic of actor.tactics) {
    if (!tactic.enabled) continue;
    if (!canUseAction(actor, tactic.action)) continue;
    const skill = skillForAction(tactic.action);
    if (!skill) continue;

    const conditionPool = poolFor(tactic.condition.who, actor, all);
    const matches = conditionPool.filter((u) => evalPredicate(u, tactic.condition.predicate, allies, enemies));
    if (matches.length === 0) continue;

    const targets = resolveSkillTargets(actor, skill, matches, all, tactic.prefer, rng);
    if (targets.length === 0) continue;
    return { tactic, skill, targets };
  }

  return null;
}

function resolveSkillTargets(
  actor: Combatant,
  skill: Skill,
  matches: Combatant[],
  all: Combatant[],
  prefer: Prefer,
  rng: Rng,
): Combatant[] {
  const allies = all.filter((u) => u.alive && u.team === actor.team);
  const enemies = all.filter((u) => u.alive && u.team !== actor.team);

  switch (skill.target) {
    case "self":
      return actor.alive ? [actor] : [];
    case "allAllies":
      return allies;
    case "allEnemies":
      return enemies;
    case "ally": {
      const fromMatches = matches.filter((u) => u.team === actor.team && u.alive);
      const pool = fromMatches.length > 0 ? fromMatches : allies;
      const sorted = preferSort(pool, prefer, rng);
      return sorted[0] ? [sorted[0]] : [];
    }
    case "enemy": {
      const fromMatches = matches.filter((u) => u.team !== actor.team && u.alive);
      let pool = fromMatches.length > 0 ? fromMatches : enemies;
      if (prefer !== "taunting") {
        const taunters = pool.filter((u) => hasStatus(u, "taunt"));
        if (taunters.length > 0 && fromMatches.length === 0) pool = taunters;
      }
      const sorted = preferSort(pool, prefer, rng);
      return sorted[0] ? [sorted[0]] : [];
    }
  }
}

export function fallbackAttack(actor: Combatant, all: Combatant[], rng: Rng): ChosenAction | null {
  const enemies = all.filter((u) => u.alive && u.team !== actor.team);
  if (enemies.length === 0) return null;
  const tactic: Tactic = {
    id: "fallback",
    enabled: true,
    condition: { who: "enemy", predicate: { kind: "always" } },
    prefer: "lowestHp",
    action: { kind: "attack" },
  };
  const skill = skillForAction(tactic.action)!;
  const targets = resolveSkillTargets(actor, skill, enemies, all, "lowestHp", rng);
  if (targets.length === 0) return null;
  return { tactic, skill, targets };
}
