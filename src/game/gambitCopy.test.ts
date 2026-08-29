import { describe, expect, it } from "vitest";
import { riftRegistry } from "../content";
import { createCharacter } from "./templates";
import { buildWarnings, gambitSentence, playstyleLines } from "./gambitCopy";
import { scoreLoadout } from "./budget";

describe("gambit sentences", () => {
  it("reads a cleric kit as natural-language rules", () => {
    const cleric = createCharacter("Mira", "Cleric");
    const lines = cleric.tactics.map((t) => gambitSentence(t, riftRegistry));
    expect(lines[0]).toBe("If ally HP is below 42% → Mend the lowest-HP ally");
    expect(lines[1]).toBe("If ally has Poison → Cleanse the lowest-HP ally");
    expect(lines[3]).toBe("If ally has no Regen → Regenerate the lowest-HP ally");
    expect(lines.at(-1)).toBe("Always → Strike the lowest-HP foe");
  });

  it("summarizes cleric playstyle and leaves no strike warning", () => {
    const cleric = createCharacter("Mira", "Cleric");
    const score = scoreLoadout(cleric, riftRegistry);
    const style = playstyleLines(cleric, riftRegistry);
    expect(style.some((line) => /wounded allies/i.test(line))).toBe(true);
    expect(style.some((line) => /strike/i.test(line))).toBe(true);
    expect(buildWarnings(cleric, score.remaining, riftRegistry).some((w) => /no strike fallback/i.test(w))).toBe(false);
  });
});
