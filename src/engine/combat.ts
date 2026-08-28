import { createRng, type Rng } from "./rng";
import { computeStats } from "./stats";
import { chooseAction, fallbackAttack, hpPct } from "./tactics";
import { atbRate, holdsShield, modifiedStat, preventsAction, statusDef } from "./modifiers";
import type { ContentRegistry } from "./registry";
import type {
  BattleConfig,
  BattleResult,
  BattleSide,
  CharacterLoadout,
  Combatant,
  CombatEvent,
  PublicCombatant,
  SkillEffect,
  StatusId,
  TeamId,
  TickFrame,
} from "./types";

const ATB_MAX = 100;

function snapshot(unit: Combatant): PublicCombatant {
  return {
    id: unit.id,
    team: unit.team,
    name: unit.name,
    archetype: unit.archetype,
    hp: unit.hp,
    maxHp: unit.stats.maxHp,
    mp: unit.mp,
    maxMp: unit.stats.maxMp,
    atb: Math.min(ATB_MAX, unit.atb),
    shield: unit.shield,
    statuses: unit.statuses.map((s) => ({
      id: s.id,
      remaining: s.remaining,
      potency: s.potency,
    })),
    alive: unit.alive,
    lastAction: unit.lastAction,
    cooldowns: { ...unit.cooldowns },
  };
}

function toCombatant(
  loadout: CharacterLoadout,
  team: TeamId,
  registry: ContentRegistry,
): Combatant {
  const stats = computeStats(loadout, registry);
  return {
    id: loadout.id,
    team,
    name: loadout.name,
    archetype: loadout.archetype,
    stats,
    hp: Math.min(stats.maxHp, Math.max(0, loadout.openingHp ?? stats.maxHp)),
    mp: Math.min(stats.maxMp, Math.max(0, loadout.openingMp ?? stats.maxMp)),
    atb: 0,
    shield: 0,
    cooldowns: {},
    statuses: (loadout.openingStatuses ?? []).map((s) => ({ ...s })),
    skills: [...loadout.skills],
    tactics: loadout.tactics.map((t) => ({ ...t, condition: { ...t.condition } })),
    loadout: {
      ...loadout.loadout,
      consumables: loadout.loadout.consumables.map((c) => ({ ...c })),
    },
    alive: true,
    lastAction: "",
  };
}

function applyDamage(
  target: Combatant,
  raw: number,
  events: CombatEvent[],
  tick: number,
  actorId?: string,
): number {
  let remaining = Math.max(1, Math.round(raw));
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining);
    target.shield -= absorbed;
    remaining -= absorbed;
    events.push({
      tick,
      kind: "shield",
      actorId,
      targetId: target.id,
      amount: absorbed,
      text: `${target.name}'s barrier absorbs ${absorbed}.`,
    });
  }
  if (remaining <= 0) return 0;
  target.hp = Math.max(0, target.hp - remaining);
  events.push({
    tick,
    kind: "damage",
    actorId,
    targetId: target.id,
    amount: remaining,
    text: `${target.name} takes ${remaining} damage.`,
  });
  if (target.hp <= 0 && target.alive) {
    target.alive = false;
    target.hp = 0;
    target.atb = 0;
    target.statuses = [];
    target.shield = 0;
    events.push({
      tick,
      kind: "death",
      targetId: target.id,
      text: `${target.name} falls.`,
    });
  }
  return remaining;
}

function applyHeal(
  target: Combatant,
  amount: number,
  events: CombatEvent[],
  tick: number,
  actorId?: string,
): void {
  if (!target.alive) return;
  const healed = Math.min(target.stats.maxHp - target.hp, Math.max(1, Math.round(amount)));
  if (healed <= 0) return;
  target.hp += healed;
  events.push({
    tick,
    kind: "heal",
    actorId,
    targetId: target.id,
    amount: healed,
    text: `${target.name} recovers ${healed} HP.`,
  });
}

function applyStatus(
  target: Combatant,
  status: StatusId,
  duration: number,
  potency: number,
  sourceId: string,
  events: CombatEvent[],
  tick: number,
  registry: ContentRegistry,
): void {
  if (!target.alive) return;
  const existing = target.statuses.find((s) => s.id === status);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, duration);
    existing.potency = Math.max(existing.potency, potency);
  } else {
    target.statuses.push({ id: status, remaining: duration, potency, sourceId });
  }
  const label = statusDef(registry, status)?.name ?? status;
  events.push({
    tick,
    kind: "status",
    targetId: target.id,
    statusId: status,
    text: `${target.name} is afflicted with ${label}.`,
  });
}

function resolveEffect(
  effect: SkillEffect,
  actor: Combatant,
  target: Combatant,
  rng: Rng,
  events: CombatEvent[],
  tick: number,
  skillName: string,
  registry: ContentRegistry,
): void {
  switch (effect.type) {
    case "damage": {
      const offense =
        effect.damageType === "physical"
          ? modifiedStat(actor, "atk", registry)
          : modifiedStat(actor, "mag", registry);
      const defense =
        effect.damageType === "physical"
          ? modifiedStat(target, "def", registry)
          : modifiedStat(target, "res", registry);
      let power = effect.power;
      if (
        effect.executeBonus &&
        effect.executeBelowPct != null &&
        hpPct(target) < effect.executeBelowPct
      ) {
        power += effect.executeBonus;
      }
      const variance = 0.88 + rng() * 0.24;
      const crit = rng() * 100 < actor.stats.crt;
      const critMul = crit ? 1.5 : 1;
      const raw = Math.max(1, (offense * power - defense * 0.42) * variance * critMul);
      const dealt = applyDamage(target, raw, events, tick, actor.id);
      if (dealt > 0 && crit) {
        events.push({
          tick,
          kind: "action",
          actorId: actor.id,
          targetId: target.id,
          skillName,
          text: `Critical hit!`,
        });
      }
      break;
    }
    case "heal": {
      const amount = modifiedStat(actor, "mag", registry) * effect.power + 18;
      applyHeal(target, amount, events, tick, actor.id);
      break;
    }
    case "restoreMp": {
      const gained = Math.min(target.stats.maxMp - target.mp, effect.amount);
      if (gained > 0) {
        target.mp += gained;
        events.push({
          tick,
          kind: "mp",
          actorId: actor.id,
          targetId: target.id,
          amount: gained,
          text: `${target.name} restores ${gained} MP.`,
        });
      }
      break;
    }
    case "applyStatus": {
      if (rng() <= effect.chance) {
        applyStatus(
          target,
          effect.status,
          effect.duration,
          effect.potency,
          actor.id,
          events,
          tick,
          registry,
        );
      }
      break;
    }
    case "cleanse": {
      const before = target.statuses.length;
      target.statuses = target.statuses.filter((s) => !statusDef(registry, s.id)?.harmful);
      if (target.statuses.length < before) {
        events.push({
          tick,
          kind: "cleanse",
          actorId: actor.id,
          targetId: target.id,
          text: `${target.name} is cleansed.`,
        });
      }
      break;
    }
    case "shield": {
      target.shield += effect.amount;
      if (effect.statusId) {
        applyStatus(target, effect.statusId, 24, 1, actor.id, events, tick, registry);
      }
      events.push({
        tick,
        kind: "shield",
        actorId: actor.id,
        targetId: target.id,
        amount: effect.amount,
        text: `${target.name} gains a ${effect.amount} point barrier.`,
      });
      break;
    }
  }
}

function tickStatuses(
  units: Combatant[],
  tick: number,
  events: CombatEvent[],
  registry: ContentRegistry,
): void {
  for (const unit of units) {
    if (!unit.alive) continue;
    for (const status of [...unit.statuses]) {
      const def = statusDef(registry, status.id);
      if (def?.tick && tick % def.tick.every === 0) {
        if (def.tick.type === "damage") applyDamage(unit, status.potency, events, tick);
        if (def.tick.type === "heal") applyHeal(unit, status.potency, events, tick);
      }
      status.remaining -= 1;
    }
    unit.statuses = unit.statuses.filter((s) => s.remaining > 0);
    if (!holdsShield(unit, registry) && unit.shield > 0 && tick % 10 === 0) {
      unit.shield = Math.max(0, unit.shield - 4);
    }
  }
}

function tickCooldowns(units: Combatant[]): void {
  for (const unit of units) {
    for (const id of Object.keys(unit.cooldowns)) {
      unit.cooldowns[id] = Math.max(0, unit.cooldowns[id] - 1);
    }
  }
}

function livingTeams(units: Combatant[]): TeamId[] {
  return [...new Set(units.filter((u) => u.alive).map((u) => u.team))];
}

function decideWinner(units: Combatant[]): TeamId | "draw" {
  const alive = units.filter((u) => u.alive);
  const teams = [...new Set(alive.map((u) => u.team))];
  if (teams.length === 1) return teams[0];
  if (teams.length === 0) return "draw";
  const scores = teams.map((id) => ({
    id,
    hp: alive.filter((u) => u.team === id).reduce((s, u) => s + u.hp, 0),
  }));
  scores.sort((a, b) => b.hp - a.hp || a.id.localeCompare(b.id));
  if (scores.length > 1 && scores[0].hp === scores[1].hp) return "draw";
  return scores[0].id;
}

function consumeItem(actor: Combatant, itemId: string): void {
  const pack = actor.loadout.consumables.find((c) => c.itemId === itemId);
  if (pack) pack.charges = Math.max(0, pack.charges - 1);
}

function performAction(
  actor: Combatant,
  units: Combatant[],
  rng: Rng,
  tick: number,
  events: CombatEvent[],
  registry: ContentRegistry,
): void {
  let chosen = chooseAction(actor, units, rng, registry);
  if (!chosen) chosen = fallbackAttack(actor, units, rng, registry);
  if (!chosen) return;

  const { skill, targets, tactic } = chosen;
  actor.mp = Math.max(0, actor.mp - skill.mpCost);
  if (skill.cooldown > 0) actor.cooldowns[skill.id] = skill.cooldown;
  if (tactic.action.kind === "item") consumeItem(actor, tactic.action.itemId);

  const names = targets.map((t) => t.name).join(", ");
  actor.lastAction = skill.name;
  events.push({
    tick,
    kind: "action",
    actorId: actor.id,
    targetId: targets[0]?.id,
    skillName: skill.name,
    text: `${actor.name} uses ${skill.name}${names ? ` → ${names}` : ""}.`,
  });

  const onHit = registry.getItem(actor.loadout.weapon ?? "")?.onHit ?? [];
  for (const target of targets) {
    for (const effect of skill.effects) {
      resolveEffect(effect, actor, target, rng, events, tick, skill.name, registry);
    }
    if (skill.id === registry.basicAttack.id) {
      for (const extra of onHit) {
        resolveEffect(extra, actor, target, rng, events, tick, skill.name, registry);
      }
    }
  }
}

function endText(winner: TeamId | "draw", sides: BattleSide[]): string {
  if (winner === "draw") return "Neither side stands. A draw.";
  const name = sides.find((s) => s.id === winner)?.name ?? winner;
  return `${name} holds the field.`;
}

export function simulateBattle(config: BattleConfig, registry: ContentRegistry): BattleResult {
  const rng = createRng(config.seed);
  const maxTicks = config.maxTicks ?? 1800;
  const units: Combatant[] = config.sides.flatMap((side) =>
    side.combatants.map((c) => toCombatant(c, side.id, registry)),
  );
  const sideMeta = config.sides.map((s) => ({ id: s.id, name: s.name }));

  const frames: TickFrame[] = [
    {
      tick: 0,
      combatants: units.map(snapshot),
      events: [
        {
          tick: 0,
          kind: "action",
          text: "The table is set. Gauges begin to fill.",
        },
      ],
    },
  ];
  const allEvents: CombatEvent[] = [...frames[0].events];

  let winner: TeamId | "draw" = "draw";
  let lastTick = 0;

  const finish = (tick: number, events: CombatEvent[], reason: "wipe" | "time") => {
    winner = decideWinner(units);
    const prefix = reason === "time" ? "Time called. " : "";
    events.push({ tick, kind: "end", text: `${prefix}${endText(winner, config.sides)}` });
    frames.push({ tick, combatants: units.map(snapshot), events });
    allEvents.push(...events);
  };

  for (let tick = 1; tick <= maxTicks; tick++) {
    lastTick = tick;
    const events: CombatEvent[] = [];
    tickStatuses(units, tick, events, registry);
    tickCooldowns(units);

    if (livingTeams(units).length <= 1) {
      finish(tick, events, "wipe");
      break;
    }

    for (const unit of units) {
      if (!unit.alive) continue;
      if (preventsAction(unit, registry)) continue;
      unit.atb += atbRate(unit, registry);
    }

    const ready = units
      .filter((u) => u.alive && u.atb >= ATB_MAX && !preventsAction(u, registry))
      .sort(
        (a, b) =>
          modifiedStat(b, "spd", registry) - modifiedStat(a, "spd", registry) ||
          a.id.localeCompare(b.id),
      );

    for (const actor of ready) {
      if (!actor.alive) continue;
      actor.atb = 0;
      performAction(actor, units, rng, tick, events, registry);
      if (livingTeams(units).length <= 1) break;
    }

    if (livingTeams(units).length <= 1) {
      finish(tick, events, "wipe");
      break;
    }

    if (tick === maxTicks) {
      finish(tick, events, "time");
      break;
    }

    frames.push({ tick, combatants: units.map(snapshot), events });
    allEvents.push(...events);
  }

  return {
    winner,
    winnerName: winner === "draw" ? undefined : sideMeta.find((s) => s.id === winner)?.name,
    sides: sideMeta,
    ticks: lastTick,
    frames,
    events: allEvents,
  };
}
