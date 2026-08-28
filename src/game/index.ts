import type { BattleConfig, BattleSide, CharacterLoadout } from "../engine/types";
import {
  ARCHETYPE_LOADOUT,
  ARCHETYPE_SKILLS,
  ARCHETYPE_STATS,
  ARCHETYPES,
  cloneCharacter,
  createCharacter,
  defaultTactics,
  makeTactic,
  SAMPLE_NAMES,
  sampleEncounter,
  sampleSkirmish,
} from "./templates";

export {
  ARCHETYPE_LOADOUT,
  ARCHETYPE_SKILLS,
  ARCHETYPE_STATS,
  ARCHETYPES,
  cloneCharacter,
  createCharacter,
  defaultTactics,
  makeTactic,
  SAMPLE_NAMES,
  sampleEncounter,
  sampleSkirmish,
};

export const DUEL_SIDES = {
  a: { id: "a", name: "Ashen Line" },
  b: { id: "b", name: "Cinder Host" },
} as const;

export function duelConfig(
  teamA: CharacterLoadout[],
  teamB: CharacterLoadout[],
  seed: number,
  extra?: { maxTicks?: number },
): BattleConfig {
  return {
    sides: [
      { ...DUEL_SIDES.a, combatants: teamA },
      { ...DUEL_SIDES.b, combatants: teamB },
    ],
    seed,
    ...extra,
  };
}

export function toSides(teamA: CharacterLoadout[], teamB: CharacterLoadout[]): BattleSide[] {
  return [
    { ...DUEL_SIDES.a, combatants: teamA },
    { ...DUEL_SIDES.b, combatants: teamB },
  ];
}

export { encodeBuild, decodeBuild, tryDecodeBuild, BuildCodeError } from "./codec";
export { scoreLoadout, BUDGET_CAP, itemCost, skillCost } from "./budget";
export { describeMode, modeSlots } from "./modes";
export type { ArenaMode, ModeSlot } from "./modes";
export type { BudgetBreakdown } from "./budget";
