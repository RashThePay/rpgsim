import type { Combatant, StatKey, StatusDef } from "./types";
import type { ContentRegistry } from "./registry";

export function statusDef(registry: ContentRegistry, id: string): StatusDef | undefined {
  return registry.getStatus(id);
}

export function hasModifier(
  unit: Combatant,
  registry: ContentRegistry,
  type: NonNullable<StatusDef["modifiers"]>[number]["type"],
): boolean {
  return unit.statuses.some((inst) =>
    statusDef(registry, inst.id)?.modifiers?.some((m) => m.type === type),
  );
}

export function preventsAction(unit: Combatant, registry: ContentRegistry): boolean {
  return hasModifier(unit, registry, "preventAction");
}

export function isTaunting(unit: Combatant, registry: ContentRegistry): boolean {
  return hasModifier(unit, registry, "taunt");
}

export function holdsShield(unit: Combatant, registry: ContentRegistry): boolean {
  return hasModifier(unit, registry, "holdShield");
}

export function modifiedStat(
  unit: Combatant,
  key: StatKey,
  registry: ContentRegistry,
): number {
  let value = unit.stats[key];
  for (const inst of unit.statuses) {
    const def = statusDef(registry, inst.id);
    for (const mod of def?.modifiers ?? []) {
      if (mod.type !== "statMul" || mod.stat !== key) continue;
      if (mod.mode === "addPct") value *= 1 + inst.potency / 100;
      if (mod.mode === "subPct") value *= 1 - inst.potency / 100;
    }
  }
  return Math.max(0, value);
}

export function atbRate(unit: Combatant, registry: ContentRegistry): number {
  let rate = 3.4 + modifiedStat(unit, "spd", registry) * 0.11;
  for (const inst of unit.statuses) {
    const def = statusDef(registry, inst.id);
    for (const mod of def?.modifiers ?? []) {
      if (mod.type === "atbMul") rate *= mod.factor;
    }
  }
  return rate;
}
