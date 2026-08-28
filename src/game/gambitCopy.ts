import type { CharacterLoadout, Tactic } from "../engine/types";
import type { ContentRegistry } from "../engine/registry";

function statusName(id: string, registry: ContentRegistry): string {
  return registry.getStatus(id)?.name ?? id;
}

function whoLabel(who: Tactic["condition"]["who"]): string {
  if (who === "self") return "self";
  if (who === "ally") return "ally";
  return "foe";
}

function conditionClause(t: Tactic, registry: ContentRegistry): string {
  const pred = t.condition.predicate;
  const who = whoLabel(t.condition.who);
  switch (pred.kind) {
    case "always":
      return "Always";
    case "hpBelow":
      return `If ${who} HP is below ${pred.pct}%`;
    case "hpAbove":
      return `If ${who} HP is above ${pred.pct}%`;
    case "mpBelow":
      return `If ${who} MP is below ${pred.pct}%`;
    case "mpAbove":
      return `If ${who} MP is above ${pred.pct}%`;
    case "hasStatus":
      return `If ${who} has ${statusName(pred.status, registry)}`;
    case "missingStatus":
      return `If ${who} has no ${statusName(pred.status, registry)}`;
    case "alliesAliveGte":
      return `If ${pred.count}+ allies stand`;
    case "enemiesAliveGte":
      return `If ${pred.count}+ foes stand`;
  }
}

function preferPhrase(prefer: Tactic["prefer"], pool: "self" | "ally" | "enemy" | "none"): string {
  if (pool === "self" || pool === "none") return "";
  const target = pool === "ally" ? "ally" : "foe";
  switch (prefer) {
    case "lowestHp":
      return `the lowest-HP ${target}`;
    case "highestHp":
      return `the highest-HP ${target}`;
    case "fastest":
      return `the fastest ${target}`;
    case "slowest":
      return `the slowest ${target}`;
    case "taunting":
      return `the taunting ${target}`;
    case "random":
      return `a random ${target}`;
  }
}

function actionVerb(t: Tactic, registry: ContentRegistry): { name: string; pool: "self" | "ally" | "enemy" | "none" } {
  if (t.action.kind === "attack") return { name: "Strike", pool: "enemy" };
  if (t.action.kind === "item") {
    const item = registry.getItem(t.action.itemId);
    return { name: `use ${item?.name ?? t.action.itemId}`, pool: "self" };
  }
  const skill = registry.getSkill(t.action.skillId);
  const name = skill?.name ?? t.action.skillId;
  if (!skill) return { name, pool: "enemy" };
  if (skill.target === "self") return { name, pool: "self" };
  if (skill.target === "allAllies" || skill.target === "allEnemies") return { name, pool: "none" };
  if (skill.target === "ally") return { name, pool: "ally" };
  return { name, pool: "enemy" };
}

export function gambitSentence(t: Tactic, registry: ContentRegistry): string {
  const cond = conditionClause(t, registry);
  const act = actionVerb(t, registry);
  if (act.pool === "self") return `${cond} → ${act.name} on self`;
  if (act.pool === "none") {
    const spread =
      t.action.kind === "skill" && registry.getSkill(t.action.skillId)?.target === "allAllies"
        ? "all allies"
        : "all foes";
    return `${cond} → ${act.name} on ${spread}`;
  }
  const who = preferPhrase(t.prefer, act.pool);
  return `${cond} → ${act.name} ${who}`;
}

export function playstyleLines(loadout: CharacterLoadout, registry: ContentRegistry): string[] {
  const lines: string[] = [];
  const enabled = loadout.tactics.filter((t) => t.enabled);
  const texts = enabled.map((t) => gambitSentence(t, registry).toLowerCase());
  if (texts.some((s) => s.includes("hp is below") && (s.includes("mend") || s.includes("circle") || s.includes("regenerate")))) {
    lines.push("Prioritizes wounded allies");
  }
  if (texts.some((s) => s.includes("cleanse") || s.includes("poison") || s.includes("burn"))) {
    lines.push("Cleanses lingering hexes");
  }
  if (texts.some((s) => s.includes("bless") || s.includes("fleetfoot") || s.includes("fastest"))) {
    lines.push("Buffs a chosen ally");
  }
  if (texts.some((s) => s.includes("taunt") || s.includes("shield wall") || s.includes("aegis"))) {
    lines.push("Holds the line");
  }
  if (texts.some((s) => s.includes("execute") || s.includes("backstab") || s.includes("below 3") || s.includes("below 4"))) {
    lines.push("Hunts the wounded");
  }
  const fallback = enabled.some((t) => t.action.kind === "attack");
  const picked = lines.slice(0, fallback ? 3 : 4);
  if (fallback) picked.push("Falls back to Strike");
  return picked;
}

export function buildWarnings(loadout: CharacterLoadout, remaining: number, registry: ContentRegistry): string[] {
  const warnings: string[] = [];
  const enabled = loadout.tactics.filter((t) => t.enabled);
  if (!enabled.some((t) => t.action.kind === "attack")) {
    warnings.push("No Strike fallback — if arts fail, this fighter may idle.");
  }
  for (const t of enabled) {
    if (t.action.kind === "skill" && !loadout.skills.includes(t.action.skillId)) {
      warnings.push(`A gambit calls ${registry.getSkill(t.action.skillId)?.name ?? t.action.skillId}, which is not equipped.`);
    }
  }
  const used = new Set(
    enabled.filter((t) => t.action.kind === "skill").map((t) => (t.action.kind === "skill" ? t.action.skillId : "")),
  );
  const idle = loadout.skills.filter((id) => !used.has(id));
  if (idle.length > 0) {
    const names = idle
      .slice(0, 2)
      .map((id) => registry.getSkill(id)?.name ?? id)
      .join(", ");
    warnings.push(`Equipped but untriggered: ${names}.`);
  }
  if (remaining >= 15) {
    warnings.push(`${remaining} tribute left unspent.`);
  }
  const keys = enabled.map((t) => `${t.condition.who}:${JSON.stringify(t.condition.predicate)}:${JSON.stringify(t.action)}`);
  if (new Set(keys).size < keys.length) {
    warnings.push("Two gambits look the same and may fight each other.");
  }
  const sustain = loadout.skills.some((id) => ["heal", "mass-heal", "regenerate", "potion", "shield-wall"].includes(id));
  const drinks = loadout.loadout.consumables.some((c) => c.itemId === "potion" && c.charges > 0);
  if (!sustain && !drinks) {
    warnings.push("No self-sustain — no salve, shield, or flask.");
  }
  return warnings.slice(0, 4);
}
