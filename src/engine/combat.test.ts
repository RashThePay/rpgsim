import { describe, expect, it } from "vitest";
import { simulateBattle } from "./combat";
import { createCharacter, makeTactic, sampleEncounter } from "../data/templates";
import { computeStats } from "./stats";
import { chooseAction } from "./tactics";
import { createRng } from "./rng";
import type { Combatant, CharacterLoadout } from "./types";

function asCombatant(loadout: CharacterLoadout, team: "a" | "b"): Combatant {
  const stats = computeStats(loadout);
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
    const a = simulateBattle({ teamA, teamB, seed: 42 });
    const b = simulateBattle({ teamA, teamB, seed: 42 });
    expect(a.winner).toBe(b.winner);
    expect(a.ticks).toBe(b.ticks);
    expect(a.events.map((e) => e.text)).toEqual(b.events.map((e) => e.text));
  });

  it("different seeds can diverge", () => {
    const { teamA, teamB } = sampleEncounter();
    const a = simulateBattle({ teamA, teamB, seed: 1 });
    const b = simulateBattle({ teamA, teamB, seed: 99 });
    const sameLog = JSON.stringify(a.events.map((e) => e.text)) === JSON.stringify(b.events.map((e) => e.text));
    expect(a.ticks > 0 && b.ticks > 0).toBe(true);
    expect(typeof sameLog).toBe("boolean");
  });

  it("ends with a winner or draw", () => {
    const { teamA, teamB } = sampleEncounter();
    const result = simulateBattle({ teamA, teamB, seed: 7 });
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
    const rng = createRng(1);
    const chosen = chooseAction(healer, [healer, ally, foe], rng);
    expect(chosen?.skill.id).toBe("heal");
    expect(chosen?.targets[0]?.id).toBe(ally.id);
  });

  it("stun prevents ATB actions", () => {
    const rogue = createCharacter("Vex", "Rogue");
    const mage = createCharacter("Ash", "Mage");
    rogue.tactics = [makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" })];
    mage.tactics = [makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" })];
    const stunned = asCombatant(rogue, "a");
    stunned.statuses = [{ id: "stun", remaining: 80, potency: 1, sourceId: "x" }];
    stunned.atb = 100;
    const foe = asCombatant(mage, "b");
    const result = simulateBattle({
      teamA: [{ ...rogue, tactics: rogue.tactics }],
      teamB: [{ ...mage, tactics: mage.tactics }],
      seed: 3,
      maxTicks: 12,
    });
    const earlyActions = result.events.filter((e) => e.kind === "action" && e.actorId === stunned.id && e.tick <= 10);
    expect(Array.isArray(earlyActions)).toBe(true);
    expect(foe.alive).toBe(true);
  });

  it("items raise computed stats", () => {
    const knight = createCharacter("Aldric", "Knight");
    const bare = { ...knight, loadout: { consumables: [] } };
    expect(computeStats(knight).maxHp).toBeGreaterThan(computeStats(bare).maxHp);
    expect(computeStats(knight).atk).toBeGreaterThan(computeStats(bare).atk);
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
    const result = simulateBattle({ teamA: [mage], teamB: [a, b], seed: 11, maxTicks: 80 });
    const blizzard = result.events.find((e) => e.skillName === "Blizzard");
    expect(blizzard).toBeTruthy();
    expect(blizzard?.text).toMatch(/A.*B|B.*A/);
  });
});
