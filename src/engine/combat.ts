import { getItem, STATUS_LABELS } from "./catalog";
import { createRng, type Rng } from "./rng";
import { computeStats } from "./stats";
import { chooseAction, fallbackAttack, hasStatus, hpPct } from "./tactics";
import type {
  BattleConfig,
  BattleResult,
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

function toCombatant(loadout: BattleConfig["teamA"][number], team: TeamId): Combatant {
  const stats = computeStats(loadout);
  return {
    id: loadout.id,
    team,
    name: loadout.name,
    archetype: loadout.archetype,
    stats,
    hp: stats.maxHp,
    mp: stats.maxMp,
    atb: 0,
    shield: 0,
    cooldowns: {},
    statuses: [],
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

function modifiedStat(unit: Combatant, key: "atk" | "def" | "mag" | "res" | "spd"): number {
  let value = unit.stats[key];
  if (key === "atk" && hasStatus(unit, "atkUp")) {
    const pot = unit.statuses.find((s) => s.id === "atkUp")?.potency ?? 25;
    value *= 1 + pot / 100;
  }
  if (key === "def" && hasStatus(unit, "defDown")) {
    const pot = unit.statuses.find((s) => s.id === "defDown")?.potency ?? 25;
    value *= 1 - pot / 100;
  }
  return Math.max(0, value);
}

function atbRate(unit: Combatant): number {
  let rate = 3.4 + modifiedStat(unit, "spd") * 0.11;
  if (hasStatus(unit, "haste")) rate *= 1.45;
  if (hasStatus(unit, "slow")) rate *= 0.62;
  return rate;
}

function applyDamage(target: Combatant, raw: number, events: CombatEvent[], tick: number, actorId?: string): number {
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

function applyHeal(target: Combatant, amount: number, events: CombatEvent[], tick: number, actorId?: string): void {
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
): void {
  if (!target.alive) return;
  const existing = target.statuses.find((s) => s.id === status);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, duration);
    existing.potency = Math.max(existing.potency, potency);
  } else {
    target.statuses.push({ id: status, remaining: duration, potency, sourceId });
  }
  events.push({
    tick,
    kind: "status",
    targetId: target.id,
    statusId: status,
    text: `${target.name} is afflicted with ${STATUS_LABELS[status]}.`,
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
): void {
  switch (effect.type) {
    case "damage": {
      const offense = effect.damageType === "physical" ? modifiedStat(actor, "atk") : modifiedStat(actor, "mag");
      const defense = effect.damageType === "physical" ? modifiedStat(target, "def") : modifiedStat(target, "res");
      let power = effect.power;
      if (effect.executeBonus && hpPct(target) < 35) power += effect.executeBonus;
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
      const amount = modifiedStat(actor, "mag") * effect.power + 18;
      applyHeal(target, amount, events, tick, actor.id);
      break;
    }
    case "restoreMp": {
      const gained = Math.min(actor.stats.maxMp - actor.mp, effect.amount);
      if (gained > 0) {
        actor.mp += gained;
        events.push({
          tick,
          kind: "mp",
          actorId: actor.id,
          targetId: target.id,
          amount: gained,
          text: `${actor.name} restores ${gained} MP.`,
        });
      }
      break;
    }
    case "applyStatus": {
      if (rng() <= effect.chance) {
        applyStatus(target, effect.status, effect.duration, effect.potency, actor.id, events, tick);
      }
      break;
    }
    case "cleanse": {
      const before = target.statuses.length;
      target.statuses = target.statuses.filter(
        (s) => !["poison", "burn", "slow", "defDown", "stun"].includes(s.id),
      );
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
      applyStatus(target, "shielded", 24, 1, actor.id, events, tick);
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

function tickStatuses(units: Combatant[], tick: number, events: CombatEvent[]): void {
  for (const unit of units) {
    if (!unit.alive) continue;
    for (const status of [...unit.statuses]) {
      if (status.id === "poison" && tick % 8 === 0) {
        applyDamage(unit, status.potency, events, tick);
      }
      if (status.id === "burn" && tick % 6 === 0) {
        applyDamage(unit, status.potency, events, tick);
      }
      if (status.id === "regen" && tick % 8 === 0) {
        applyHeal(unit, status.potency, events, tick);
      }
      status.remaining -= 1;
    }
    unit.statuses = unit.statuses.filter((s) => s.remaining > 0);
    if (!hasStatus(unit, "shielded") && unit.shield > 0 && tick % 10 === 0) {
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

function living(team: TeamId, units: Combatant[]): Combatant[] {
  return units.filter((u) => u.team === team && u.alive);
}

function consumeItem(actor: Combatant, itemId: string): void {
  const pack = actor.loadout.consumables.find((c) => c.itemId === itemId);
  if (pack) pack.charges = Math.max(0, pack.charges - 1);
}

function performAction(actor: Combatant, units: Combatant[], rng: Rng, tick: number, events: CombatEvent[]): void {
  let chosen = chooseAction(actor, units, rng);
  if (!chosen) chosen = fallbackAttack(actor, units, rng);
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

  const onHit = getItem(actor.loadout.weapon ?? "")?.onHit ?? [];
  for (const target of targets) {
    for (const effect of skill.effects) {
      resolveEffect(effect, actor, target, rng, events, tick, skill.name);
    }
    if (skill.id === "attack") {
      for (const extra of onHit) {
        resolveEffect(extra, actor, target, rng, events, tick, skill.name);
      }
    }
  }
}

export function simulateBattle(config: BattleConfig): BattleResult {
  const rng = createRng(config.seed);
  const maxTicks = config.maxTicks ?? 1800;
  const units: Combatant[] = [
    ...config.teamA.map((c) => toCombatant(c, "a")),
    ...config.teamB.map((c) => toCombatant(c, "b")),
  ];

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

  for (let tick = 1; tick <= maxTicks; tick++) {
    lastTick = tick;
    const events: CombatEvent[] = [];
    tickStatuses(units, tick, events);
    tickCooldowns(units);

    if (living("a", units).length === 0 || living("b", units).length === 0) {
      winner = living("a", units).length > 0 ? "a" : living("b", units).length > 0 ? "b" : "draw";
      events.push({ tick, kind: "end", text: endText(winner) });
      frames.push({ tick, combatants: units.map(snapshot), events });
      allEvents.push(...events);
      break;
    }

    for (const unit of units) {
      if (!unit.alive) continue;
      if (hasStatus(unit, "stun")) continue;
      unit.atb += atbRate(unit);
    }

    const ready = units
      .filter((u) => u.alive && u.atb >= ATB_MAX && !hasStatus(u, "stun"))
      .sort((a, b) => modifiedStat(b, "spd") - modifiedStat(a, "spd") || a.id.localeCompare(b.id));

    for (const actor of ready) {
      if (!actor.alive) continue;
      actor.atb = 0;
      performAction(actor, units, rng, tick, events);
      if (living("a", units).length === 0 || living("b", units).length === 0) break;
    }

    if (living("a", units).length === 0 || living("b", units).length === 0) {
      winner = living("a", units).length > 0 ? "a" : living("b", units).length > 0 ? "b" : "draw";
      events.push({ tick, kind: "end", text: endText(winner) });
      frames.push({ tick, combatants: units.map(snapshot), events });
      allEvents.push(...events);
      break;
    }

    if (tick === maxTicks) {
      const aHp = living("a", units).reduce((s, u) => s + u.hp, 0);
      const bHp = living("b", units).reduce((s, u) => s + u.hp, 0);
      winner = aHp === bHp ? "draw" : aHp > bHp ? "a" : "b";
      const end: CombatEvent = { tick, kind: "end", text: `Time called. ${endText(winner)}` };
      events.push(end);
    }

    frames.push({ tick, combatants: units.map(snapshot), events });
    allEvents.push(...events);
  }

  return { winner, ticks: lastTick, frames, events: allEvents };
}

function endText(winner: TeamId | "draw"): string {
  if (winner === "draw") return "Neither side stands. A draw.";
  return winner === "a" ? "Ashen Line holds the field." : "Cinder Host holds the field.";
}
