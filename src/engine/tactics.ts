import type {
  Combatant,
  Prefer,
  Skill,
  Tactic,
  TacticAction,
  TacticCondition,
  TacticPredicate,
} from "./types";
import type { ContentRegistry } from "./registry";
import { pickIndex, type Rng } from "./rng";
import { isTaunting } from "./modifiers";

export function hpPct(unit: Combatant): number {
  return unit.stats.maxHp <= 0 ? 0 : (unit.hp / unit.stats.maxHp) * 100;
}

export function mpPct(unit: Combatant): number {
  return unit.stats.maxMp <= 0 ? 0 : (unit.mp / unit.stats.maxMp) * 100;
}

export function hasStatus(unit: Combatant, id: string): boolean {
  return unit.statuses.some((s) => s.id === id);
}

export function evalPredicate(
  unit: Combatant,
  pred: TacticPredicate,
  allies: Combatant[],
  enemies: Combatant[],
): boolean {
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

export function preferSort(
  units: Combatant[],
  prefer: Prefer,
  rng: Rng,
  registry: ContentRegistry,
): Combatant[] {
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
      const taunters = copy.filter((u) => isTaunting(u, registry));
      const rest = copy.filter((u) => !isTaunting(u, registry));
      return [
        ...preferSort(taunters, "highestHp", rng, registry),
        ...preferSort(rest, "lowestHp", rng, registry),
      ];
    }
    case "random": {
      const i = pickIndex(rng, copy.length);
      if (i > 0) [copy[0], copy[i]] = [copy[i], copy[0]];
      return copy;
    }
  }
}

export function skillForAction(action: TacticAction, registry: ContentRegistry): Skill | undefined {
  if (action.kind === "attack") return registry.basicAttack;
  if (action.kind === "skill") return registry.getSkill(action.skillId);
  const item = registry.getItem(action.itemId);
  if (!item?.skillId) return undefined;
  return registry.getSkill(item.skillId);
}

export function canUseAction(
  actor: Combatant,
  action: TacticAction,
  registry: ContentRegistry,
): boolean {
  if (action.kind === "item") {
    const pack = actor.loadout.consumables.find((c) => c.itemId === action.itemId);
    if (!pack || pack.charges <= 0) return false;
  } else if (action.kind === "skill") {
    if (!actor.skills.includes(action.skillId)) return false;
  }
  const skill = skillForAction(action, registry);
  if (!skill) return false;
  if (actor.mp < skill.mpCost) return false;
  if ((actor.cooldowns[skill.id] ?? 0) > 0) return false;
  return true;
}

export interface ChosenAction {
  tactic: Tactic;
  skill: Skill;
  targets: Combatant[];
}

export function chooseAction(
  actor: Combatant,
  all: Combatant[],
  rng: Rng,
  registry: ContentRegistry,
): ChosenAction | null {
  const allies = all.filter((u) => u.team === actor.team);
  const enemies = all.filter((u) => u.team !== actor.team);

  for (const tactic of actor.tactics) {
    if (!tactic.enabled) continue;
    if (!canUseAction(actor, tactic.action, registry)) continue;
    const skill = skillForAction(tactic.action, registry);
    if (!skill) continue;

    const conditionPool = poolFor(tactic.condition.who, actor, all);
    const matches = conditionPool.filter((u) =>
      evalPredicate(u, tactic.condition.predicate, allies, enemies),
    );
    if (matches.length === 0) continue;

    const targets = resolveSkillTargets(actor, skill, matches, all, tactic.prefer, rng, registry);
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
  registry: ContentRegistry,
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
      const sorted = preferSort(pool, prefer, rng, registry);
      return sorted[0] ? [sorted[0]] : [];
    }
    case "enemy": {
      const fromMatches = matches.filter((u) => u.team !== actor.team && u.alive);
      let pool = fromMatches.length > 0 ? fromMatches : enemies;
      if (prefer !== "taunting") {
        const taunters = pool.filter((u) => isTaunting(u, registry));
        if (taunters.length > 0 && fromMatches.length === 0) pool = taunters;
      }
      const sorted = preferSort(pool, prefer, rng, registry);
      return sorted[0] ? [sorted[0]] : [];
    }
  }
}

export function fallbackAttack(
  actor: Combatant,
  all: Combatant[],
  rng: Rng,
  registry: ContentRegistry,
): ChosenAction | null {
  const enemies = all.filter((u) => u.alive && u.team !== actor.team);
  if (enemies.length === 0) return null;
  const tactic: Tactic = {
    id: "fallback",
    enabled: true,
    condition: { who: "enemy", predicate: { kind: "always" } },
    prefer: "lowestHp",
    action: { kind: "attack" },
  };
  const skill = skillForAction(tactic.action, registry);
  if (!skill) return null;
  const targets = resolveSkillTargets(actor, skill, enemies, all, "lowestHp", rng, registry);
  if (targets.length === 0) return null;
  return { tactic, skill, targets };
}
