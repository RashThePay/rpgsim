import { getPreset } from "./presets.js";
import { Rng, seedFromString } from "./rng.js";
import type {
  Combatant,
  CombatantInput,
  LogEntry,
  SimulationRequest,
  SimulationResult,
  Team,
} from "./types.js";

const DEFAULT_MAX_ROUNDS = 50;
const DAMAGE_VARIANCE = 0.15;
const CRIT_MULTIPLIER = 2;
/** A class heals instead of attacking when an ally drops below this HP fraction. */
const HEAL_THRESHOLD = 0.6;

export class SimulationError extends Error {}

function buildCombatants(inputs: CombatantInput[], team: Team): Combatant[] {
  return inputs.map((input, index) => {
    const preset = getPreset(input.classId);
    if (!preset) {
      throw new SimulationError(`Unknown class "${input.classId}"`);
    }
    const suffix = inputs.length > 1 ? ` ${index + 1}` : "";
    return {
      id: `${team}-${preset.id}-${index}`,
      name: input.name?.trim() || `${preset.name}${suffix}`,
      classId: preset.id,
      team,
      maxHp: preset.maxHp,
      hp: preset.maxHp,
      attack: preset.attack,
      defense: preset.defense,
      speed: preset.speed,
      critChance: preset.critChance,
      healPower: preset.healPower ?? 0,
    };
  });
}

function normalizeSeed(seed: SimulationRequest["seed"]): number {
  if (seed === undefined) {
    return Math.floor(Math.random() * 0xffffffff);
  }
  if (typeof seed === "number") {
    return seed >>> 0;
  }
  return seedFromString(seed);
}

function livingMembers(combatants: Combatant[], team: Team): Combatant[] {
  return combatants.filter((c) => c.team === team && c.hp > 0);
}

function computeDamage(attacker: Combatant, target: Combatant, rng: Rng): { amount: number; crit: boolean } {
  const base = Math.max(1, attacker.attack - Math.floor(target.defense / 2));
  const variance = 1 + (rng.next() * 2 - 1) * DAMAGE_VARIANCE;
  const crit = rng.chance(attacker.critChance);
  const raw = base * variance * (crit ? CRIT_MULTIPLIER : 1);
  return { amount: Math.max(1, Math.round(raw)), crit };
}

/** Picks the enemy with the lowest current HP so a party focuses fire. */
function pickTarget(combatants: Combatant[], attacker: Combatant): Combatant | undefined {
  const enemyTeam: Team = attacker.team === "heroes" ? "enemies" : "heroes";
  const enemies = livingMembers(combatants, enemyTeam);
  if (enemies.length === 0) {
    return undefined;
  }
  return enemies.reduce((weakest, current) => (current.hp < weakest.hp ? current : weakest));
}

/** Finds the most-wounded living ally (including self) below the heal threshold. */
function pickHealTarget(combatants: Combatant[], healer: Combatant): Combatant | undefined {
  const allies = livingMembers(combatants, healer.team).filter(
    (ally) => ally.hp < ally.maxHp * HEAL_THRESHOLD,
  );
  if (allies.length === 0) {
    return undefined;
  }
  return allies.reduce((lowest, current) => (current.hp / current.maxHp < lowest.hp / lowest.maxHp ? current : lowest));
}

function teamDefeated(combatants: Combatant[], team: Team): boolean {
  return livingMembers(combatants, team).length === 0;
}

function totalHp(combatants: Combatant[], team: Team): number {
  return combatants.filter((c) => c.team === team).reduce((sum, c) => sum + Math.max(0, c.hp), 0);
}

/**
 * Runs a full deterministic turn-based battle between two parties and returns a
 * detailed, replayable combat log plus the final outcome.
 */
export function simulateBattle(request: SimulationRequest): SimulationResult {
  const heroes = buildCombatants(request.heroes ?? [], "heroes");
  const enemies = buildCombatants(request.enemies ?? [], "enemies");

  if (heroes.length === 0 || enemies.length === 0) {
    throw new SimulationError("Both parties need at least one combatant.");
  }

  const maxRounds = request.maxRounds && request.maxRounds > 0 ? request.maxRounds : DEFAULT_MAX_ROUNDS;
  const seed = normalizeSeed(request.seed);
  const rng = new Rng(seed);
  const combatants = [...heroes, ...enemies];
  const log: LogEntry[] = [];

  log.push({
    round: 0,
    kind: "start",
    message: `Battle begins: ${heroes.length} hero(es) vs ${enemies.length} enemy(ies).`,
  });

  let winner: Team | "draw" = "draw";
  let round = 0;

  for (round = 1; round <= maxRounds; round += 1) {
    log.push({ round, kind: "round", message: `-- Round ${round} --` });

    // Recompute initiative each round; ties broken deterministically by the RNG.
    const order = combatants
      .filter((c) => c.hp > 0)
      .map((c) => ({ c, roll: rng.next() }))
      .sort((a, b) => b.c.speed - a.c.speed || b.roll - a.roll)
      .map((entry) => entry.c);

    for (const actor of order) {
      if (actor.hp <= 0) {
        continue;
      }

      const healTarget = actor.healPower > 0 ? pickHealTarget(combatants, actor) : undefined;
      if (healTarget) {
        const healed = Math.min(healTarget.maxHp, healTarget.hp + actor.healPower);
        const amount = healed - healTarget.hp;
        healTarget.hp = healed;
        log.push({
          round,
          kind: "heal",
          message: `${actor.name} heals ${healTarget.name} for ${amount} HP.`,
          actorId: actor.id,
          targetId: healTarget.id,
          amount,
          targetHp: healTarget.hp,
          targetMaxHp: healTarget.maxHp,
        });
        continue;
      }

      const target = pickTarget(combatants, actor);
      if (!target) {
        break;
      }

      const { amount, crit } = computeDamage(actor, target, rng);
      target.hp = Math.max(0, target.hp - amount);
      log.push({
        round,
        kind: "attack",
        message: `${actor.name} hits ${target.name} for ${amount}${crit ? " (CRIT!)" : ""}.`,
        actorId: actor.id,
        targetId: target.id,
        amount,
        crit,
        targetHp: target.hp,
        targetMaxHp: target.maxHp,
      });

      if (target.hp <= 0) {
        log.push({
          round,
          kind: "defeat",
          message: `${target.name} is defeated!`,
          actorId: actor.id,
          targetId: target.id,
        });
      }

      if (teamDefeated(combatants, "heroes") || teamDefeated(combatants, "enemies")) {
        break;
      }
    }

    if (teamDefeated(combatants, "enemies")) {
      winner = "heroes";
      break;
    }
    if (teamDefeated(combatants, "heroes")) {
      winner = "enemies";
      break;
    }
  }

  if (winner === "draw") {
    // Round limit reached: award the win to the party with more remaining HP.
    const heroHp = totalHp(combatants, "heroes");
    const enemyHp = totalHp(combatants, "enemies");
    if (heroHp > enemyHp) {
      winner = "heroes";
    } else if (enemyHp > heroHp) {
      winner = "enemies";
    }
  }

  const resolvedRounds = Math.min(round, maxRounds);
  const outcomeMessage =
    winner === "draw"
      ? `Battle ends in a draw after ${resolvedRounds} rounds.`
      : `${winner === "heroes" ? "Heroes" : "Enemies"} win after ${resolvedRounds} rounds!`;
  log.push({ round: resolvedRounds, kind: "end", message: outcomeMessage });

  return {
    seed,
    winner,
    rounds: resolvedRounds,
    log,
    combatants: combatants.map((c) => ({
      id: c.id,
      name: c.name,
      team: c.team,
      hp: c.hp,
      maxHp: c.maxHp,
      alive: c.hp > 0,
    })),
  };
}
