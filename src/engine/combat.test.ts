import { describe, expect, it } from "vitest";
import { simulateBattle } from "./combat";
import { computeStats } from "./stats";
import { chooseAction } from "./tactics";
import { createRng } from "./rng";
import { createRegistry } from "./registry";
import type { Combatant, CharacterLoadout, Item, Skill } from "./types";
import { ITEMS, SKILLS, STATUSES, riftRegistry } from "../content";
import { createCharacter, duelConfig, makeTactic, sampleEncounter } from "../game";

const registry = riftRegistry;

function duel(teamA: CharacterLoadout[], teamB: CharacterLoadout[], seed: number, maxTicks?: number) {
  return simulateBattle(duelConfig(teamA, teamB, seed, maxTicks != null ? { maxTicks } : undefined), registry);
}

function asCombatant(loadout: CharacterLoadout, team: string): Combatant {
  const stats = computeStats(loadout, registry);
  return {
    id: loadout.id,
    team,
    name: loadout.name,
    archetype: loadout.archetype,
    stats,
    hp: stats.maxHp,
    mp: stats.maxMp,
    atb: 100,
    shield: 0,
    cooldowns: {},
    statuses: [],
    skills: [...loadout.skills],
    tactics: loadout.tactics,
    loadout: structuredClone(loadout.loadout),
    alive: true,
    lastAction: "",
  };
}

describe("simulateBattle", () => {
  it("is deterministic for a given seed", () => {
    const { teamA, teamB } = sampleEncounter();
    const a = duel(teamA, teamB, 42);
    const b = duel(teamA, teamB, 42);
    expect(a.winner).toBe(b.winner);
    expect(a.ticks).toBe(b.ticks);
    expect(a.events.map((e) => e.text)).toEqual(b.events.map((e) => e.text));
  });

  it("different seeds can diverge", () => {
    const { teamA, teamB } = sampleEncounter();
    const logs = new Set(
      [1, 7, 11, 19, 42, 99, 128, 256, 512, 777].map((seed) =>
        JSON.stringify(duel(teamA, teamB, seed).events.map((e) => e.text)),
      ),
    );
    expect(logs.size).toBeGreaterThan(1);
  });

  it("ends with a winner or draw", () => {
    const { teamA, teamB } = sampleEncounter();
    const result = duel(teamA, teamB, 7);
    expect(["a", "b", "draw"]).toContain(result.winner);
    expect(result.frames.length).toBeGreaterThan(1);
    const last = result.frames[result.frames.length - 1];
    expect(last.events.some((e) => e.kind === "end")).toBe(true);
  });

  it("healer spends a mend when an ally is wounded", () => {
    const cleric = createCharacter("Mira", "Cleric");
    cleric.tactics = [
      makeTactic({ who: "ally", predicate: { kind: "hpBelow", pct: 80 } }, { kind: "skill", skillId: "heal" }),
      makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" }),
    ];
    const dummy = createCharacter("Dummy", "Knight");
    dummy.tactics = [makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" })];
    dummy.skills = [];

    const healer = asCombatant(cleric, "a");
    const ally = asCombatant(createCharacter("Aldric", "Knight"), "a");
    ally.hp = Math.floor(ally.stats.maxHp * 0.4);
    const foe = asCombatant(dummy, "b");
    const chosen = chooseAction(healer, [healer, ally, foe], createRng(1), registry);
    expect(chosen?.skill.id).toBe("heal");
    expect(chosen?.targets[0]?.id).toBe(ally.id);
  });

  it("stun prevents ATB actions", () => {
    const rogue = createCharacter("Vex", "Rogue");
    const mage = createCharacter("Ash", "Mage");
    rogue.tactics = [makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" })];
    mage.tactics = [makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" })];
    rogue.baseStats = { ...rogue.baseStats, maxHp: 800 };
    rogue.openingStatuses = [{ id: "stun", remaining: 80, potency: 1, sourceId: "test" }];
    const result = duel([rogue], [mage], 3, 20);
    const rogueActions = result.events.filter((e) => e.kind === "action" && e.actorId === rogue.id);
    expect(rogueActions).toHaveLength(0);
    const last = result.frames[result.frames.length - 1];
    const vex = last.combatants.find((c) => c.id === rogue.id);
    expect(vex).toBeTruthy();
  });

  it("items raise computed stats", () => {
    const knight = createCharacter("Aldric", "Knight");
    const bare = { ...knight, loadout: { consumables: [] } };
    expect(computeStats(knight, registry).maxHp).toBeGreaterThan(computeStats(bare, registry).maxHp);
    expect(computeStats(knight, registry).atk).toBeGreaterThan(computeStats(bare, registry).atk);
  });

  it("blizzard can hit every living enemy", () => {
    const mage = createCharacter("Ash", "Mage");
    mage.tactics = [
      makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "skill", skillId: "blizzard" }),
    ];
    const a = createCharacter("A", "Knight");
    const b = createCharacter("B", "Knight");
    a.tactics = [makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" })];
    b.tactics = [makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" })];
    const result = duel([mage], [a, b], 11, 80);
    const blizzard = result.events.find((e) => e.skillName === "Blizzard");
    expect(blizzard).toBeTruthy();
    expect(blizzard?.text).toMatch(/A.*B|B.*A/);
  });

  it("uses item.skillId rather than the item id", () => {
    const detonate: Skill = {
      id: "detonate",
      name: "Detonate",
      description: "Boom.",
      mpCost: 0,
      cooldown: 0,
      target: "enemy",
      effects: [{ type: "damage", damageType: "magical", power: 3 }],
    };
    const bomb: Item = {
      id: "bomb",
      name: "Bomb",
      slot: "consumable",
      description: "Not named detonate.",
      charges: 1,
      skillId: "detonate",
    };
    const pack = createRegistry({
      skills: [...SKILLS, detonate],
      items: [...ITEMS, bomb],
      statuses: STATUSES,
    });
    const thrower = createCharacter("Nim", "Rogue");
    thrower.skills = [];
    thrower.loadout = { consumables: [{ itemId: "bomb", charges: 1 }] };
    thrower.tactics = [
      makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "item", itemId: "bomb" }),
    ];
    const dummy = createCharacter("Dummy", "Knight");
    dummy.tactics = [makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" })];
    const result = simulateBattle(duelConfig([thrower], [dummy], 4, { maxTicks: 40 }), pack);
    expect(result.events.some((e) => e.skillName === "Detonate")).toBe(true);
    expect(result.events.some((e) => e.skillName === "bomb")).toBe(false);
  });

  it("restores MP on the target, not the actor", () => {
    const donor = createCharacter("Quin", "Cleric");
    donor.skills = ["share-ether"];
    donor.tactics = [
      makeTactic({ who: "ally", predicate: { kind: "mpBelow", pct: 50 } }, { kind: "skill", skillId: "share-ether" }),
    ];
    const ally = createCharacter("Aldric", "Knight");
    ally.openingMp = 0;
    ally.tactics = [makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" })];
    const foe = createCharacter("Vex", "Rogue");
    foe.tactics = [makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" })];
    const result = duel([donor, ally], [foe], 2, 40);
    const mpEvent = result.events.find((e) => e.kind === "mp" && e.targetId === ally.id);
    expect(mpEvent).toBeTruthy();
    expect(mpEvent?.amount).toBeGreaterThan(0);
    const frame = result.frames.find((f) => f.tick === mpEvent?.tick);
    const donorAfter = frame?.combatants.find((c) => c.id === donor.id);
    const allyAfter = frame?.combatants.find((c) => c.id === ally.id);
    expect(allyAfter && allyAfter.mp).toBeGreaterThan(0);
    expect(donorAfter?.mp).toBe(donorAfter?.maxMp);
  });

  it("applies executeBonus only below executeBelowPct", () => {
    const finish: Skill = {
      id: "finish",
      name: "Finish",
      description: "Bonus under 40.",
      mpCost: 0,
      cooldown: 0,
      target: "enemy",
      effects: [
        {
          type: "damage",
          damageType: "physical",
          power: 1,
          executeBonus: 4,
          executeBelowPct: 40,
        },
      ],
    };
    const pack = createRegistry({
      skills: [...SKILLS, finish],
      items: ITEMS,
      statuses: STATUSES,
    });
    const striker = createCharacter("Lyn", "Ranger");
    striker.skills = ["finish"];
    striker.tactics = [
      makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "skill", skillId: "finish" }),
    ];
    const healthy = createCharacter("Tank", "Knight");
    healthy.tactics = [makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" })];
    const wounded = { ...healthy, id: "wounded", openingHp: Math.floor(computeStats(healthy, pack).maxHp * 0.3) };

    const high = simulateBattle(duelConfig([striker], [healthy], 8, { maxTicks: 25 }), pack);
    const low = simulateBattle(duelConfig([{ ...striker, id: "striker-2" }], [wounded], 8, { maxTicks: 25 }), pack);
    const highHit = high.events.find((e) => e.kind === "damage" && e.actorId === striker.id);
    const lowHit = low.events.find((e) => e.kind === "damage" && e.actorId === "striker-2");
    expect(highHit?.amount).toBeTruthy();
    expect(lowHit?.amount).toBeTruthy();
    expect((lowHit?.amount ?? 0) > (highHit?.amount ?? 0)).toBe(true);
  });

  it("resolves a free-for-all among more than two sides", () => {
    const a = createCharacter("One", "Knight");
    const b = createCharacter("Two", "Rogue");
    const c = createCharacter("Three", "Mage");
    for (const unit of [a, b, c]) {
      unit.tactics = [makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" })];
    }
    const result = simulateBattle(
      {
        sides: [
          { id: "wolf", name: "Wolf", combatants: [a] },
          { id: "raven", name: "Raven", combatants: [b] },
          { id: "boar", name: "Boar", combatants: [c] },
        ],
        seed: 21,
        maxTicks: 400,
      },
      registry,
    );
    expect(["wolf", "raven", "boar", "draw"]).toContain(result.winner);
    expect(result.sides).toHaveLength(3);
    if (result.winner !== "draw") {
      const last = result.frames[result.frames.length - 1];
      const livingTeams = new Set(last.combatants.filter((u) => u.alive).map((u) => u.team));
      expect([...livingTeams]).toEqual([result.winner]);
    }
  });
});
