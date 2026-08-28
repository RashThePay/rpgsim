export type ArenaMode =
  | { kind: "duel" }
  | { kind: "team"; size: 2 | 3 | 4 }
  | { kind: "royale"; count: number };

export interface ModeSlot {
  id: string;
  sideId: string;
  sideName: string;
  label: string;
}

const ROYALE_NAMES = ["Wolf", "Raven", "Boar", "Serpent", "Stag", "Fox", "Hawk", "Bear"];

export function describeMode(mode: ArenaMode): string {
  if (mode.kind === "duel") return "Duel · 1v1";
  if (mode.kind === "team") return `Team fight · ${mode.size}v${mode.size}`;
  return `Battle royale · ${mode.count} fighters`;
}

export function modeSlots(mode: ArenaMode): ModeSlot[] {
  if (mode.kind === "duel") {
    return [
      { id: "a-0", sideId: "a", sideName: "Ashen Line", label: "Ashen champion" },
      { id: "b-0", sideId: "b", sideName: "Cinder Host", label: "Cinder champion" },
    ];
  }
  if (mode.kind === "team") {
    const slots: ModeSlot[] = [];
    for (let i = 0; i < mode.size; i++) {
      slots.push({ id: `a-${i}`, sideId: "a", sideName: "Ashen Line", label: `Ashen ${i + 1}` });
    }
    for (let i = 0; i < mode.size; i++) {
      slots.push({ id: `b-${i}`, sideId: "b", sideName: "Cinder Host", label: `Cinder ${i + 1}` });
    }
    return slots;
  }
  const n = Math.max(3, Math.min(8, mode.count));
  return ROYALE_NAMES.slice(0, n).map((name, i) => ({
    id: `r-${i}`,
    sideId: name.toLowerCase(),
    sideName: name,
    label: name,
  }));
}
