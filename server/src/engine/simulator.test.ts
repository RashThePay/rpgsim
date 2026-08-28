import { describe, expect, it } from "vitest";
import { CLASS_PRESETS } from "./presets.js";
import { simulateBattle, SimulationError } from "./simulator.js";

describe("simulateBattle", () => {
  it("is deterministic for a given seed", () => {
    const request = {
      heroes: [{ classId: "knight" }, { classId: "mage" }],
      enemies: [{ classId: "goblin" }, { classId: "goblin" }, { classId: "ogre" }],
      seed: "battle-42",
    };
    const a = simulateBattle(request);
    const b = simulateBattle(request);

    expect(a.winner).toBe(b.winner);
    expect(a.rounds).toBe(b.rounds);
    expect(a.log).toEqual(b.log);
    expect(a.seed).toBe(b.seed);
  });

  it("produces different fights for different seeds", () => {
    const base = {
      heroes: [{ classId: "rogue" }],
      enemies: [{ classId: "knight" }],
    };
    const a = simulateBattle({ ...base, seed: 1 });
    const b = simulateBattle({ ...base, seed: 2 });
    expect(a.log).not.toEqual(b.log);
  });

  it("lets an overwhelmingly strong party win", () => {
    const result = simulateBattle({
      heroes: [{ classId: "dragon" }],
      enemies: [{ classId: "goblin" }],
      seed: "dragon-vs-goblin",
    });
    expect(result.winner).toBe("heroes");
    expect(result.combatants.find((c) => c.team === "enemies")?.alive).toBe(false);
  });

  it("always resolves to a winner or an explicit draw", () => {
    const result = simulateBattle({
      heroes: [{ classId: "knight" }],
      enemies: [{ classId: "ogre" }],
      seed: "knight-vs-ogre",
    });
    expect(["heroes", "enemies", "draw"]).toContain(result.winner);
    expect(result.log[0].kind).toBe("start");
    expect(result.log.at(-1)?.kind).toBe("end");
  });

  it("records healing from a cleric", () => {
    const result = simulateBattle({
      heroes: [{ classId: "knight" }, { classId: "cleric" }],
      enemies: [{ classId: "ogre" }, { classId: "ogre" }],
      seed: "heal-check",
      maxRounds: 40,
    });
    const healedSomeone = result.log.some((entry) => entry.kind === "heal" && (entry.amount ?? 0) > 0);
    expect(healedSomeone).toBe(true);
  });

  it("honors custom combatant names", () => {
    const result = simulateBattle({
      heroes: [{ classId: "knight", name: "Sir Testalot" }],
      enemies: [{ classId: "goblin" }],
      seed: 7,
    });
    expect(result.combatants.some((c) => c.name === "Sir Testalot")).toBe(true);
  });

  it("rejects an unknown class", () => {
    expect(() =>
      simulateBattle({ heroes: [{ classId: "wizard" }], enemies: [{ classId: "goblin" }] }),
    ).toThrow(SimulationError);
  });

  it("rejects an empty party", () => {
    expect(() => simulateBattle({ heroes: [], enemies: [{ classId: "goblin" }] })).toThrow(
      SimulationError,
    );
  });

  it("never lets HP drop below zero in the final report", () => {
    const result = simulateBattle({
      heroes: [{ classId: "mage" }],
      enemies: [{ classId: "dragon" }],
      seed: "hp-floor",
    });
    for (const combatant of result.combatants) {
      expect(combatant.hp).toBeGreaterThanOrEqual(0);
    }
  });

  it("exposes a non-empty roster of class presets", () => {
    expect(CLASS_PRESETS.length).toBeGreaterThan(0);
    for (const preset of CLASS_PRESETS) {
      expect(preset.maxHp).toBeGreaterThan(0);
      expect(preset.attack).toBeGreaterThan(0);
    }
  });
});
