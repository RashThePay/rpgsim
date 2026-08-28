import { describe, expect, it } from "vitest";
import { riftRegistry } from "../content";
import { createCharacter } from "./templates";
import { decodeBuild, encodeBuild } from "./codec";
import { BUDGET_CAP, scoreLoadout } from "./budget";

describe("build codec", () => {
  it("round-trips a character", () => {
    const original = createCharacter("Ser Aldric", "Knight");
    const code = encodeBuild(original);
    expect(code.startsWith("R1.")).toBe(true);
    const back = decodeBuild(code, riftRegistry);
    expect(back.name).toBe("Ser Aldric");
    expect(back.archetype).toBe("Knight");
    expect(back.loadout.weapon).toBe(original.loadout.weapon);
    expect(back.skills).toEqual(original.skills);
    expect(back.tactics).toHaveLength(original.tactics.length);
    expect(back.baseStats).toEqual(original.baseStats);
  });

  it("rejects junk", () => {
    expect(() => decodeBuild("nope", riftRegistry)).toThrow(/R1/);
    expect(() => decodeBuild("R1.%%%%", riftRegistry)).toThrow(/damaged/);
  });
});

describe("budget", () => {
  it("keeps a stock knight under the cap", () => {
    const knight = createCharacter("Aldric", "Knight");
    const score = scoreLoadout(knight, riftRegistry);
    expect(score.total).toBeGreaterThan(0);
    expect(score.over).toBe(false);
    expect(score.total).toBeLessThanOrEqual(BUDGET_CAP);
    expect(score.categories.arms).toBeGreaterThan(0);
    expect(score.categories.arts).toBeGreaterThan(0);
    expect(score.categories.stats).toBe(0);
  });

  it("flags a kit that stacks every skill", () => {
    const greedy = createCharacter("Greedy", "Mage");
    greedy.skills = riftRegistry.skills().filter((s) => s.id !== "potion" && s.id !== "ether").map((s) => s.id);
    const score = scoreLoadout(greedy, riftRegistry);
    expect(score.over).toBe(true);
  });
});
