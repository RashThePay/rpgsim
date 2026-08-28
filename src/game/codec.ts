import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { CharacterLoadout, Loadout, Tactic, TacticAction, TacticPredicate } from "../engine/types";
import type { ContentRegistry } from "../engine/registry";
import { ARCHETYPE_STATS, defaultTactics, makeTactic } from "./templates";

const PREFIX = "R1.";

interface WireBuild {
  v: 1;
  name: string;
  archetype: string;
  w?: string;
  a?: string;
  x?: string;
  c: { i: string; n: number }[];
  s: string[];
  t: WireTactic[];
}

interface WireTactic {
  on: boolean;
  who: Tactic["condition"]["who"];
  pred: TacticPredicate;
  act: TacticAction;
  prefer: Tactic["prefer"];
}

function toWire(loadout: CharacterLoadout): WireBuild {
  return {
    v: 1,
    name: loadout.name,
    archetype: loadout.archetype,
    w: loadout.loadout.weapon,
    a: loadout.loadout.armor,
    x: loadout.loadout.accessory,
    c: loadout.loadout.consumables.map((p) => ({ i: p.itemId, n: p.charges })),
    s: [...loadout.skills],
    t: loadout.tactics.map((t) => ({
      on: t.enabled,
      who: t.condition.who,
      pred: t.condition.predicate,
      act: t.action,
      prefer: t.prefer,
    })),
  };
}

function newId(): string {
  return `char-${Math.random().toString(36).slice(2, 10)}`;
}

export function encodeBuild(loadout: CharacterLoadout): string {
  const json = JSON.stringify(toWire(loadout));
  return PREFIX + compressToEncodedURIComponent(json);
}

export class BuildCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildCodeError";
  }
}

export function decodeBuild(code: string, registry: ContentRegistry): CharacterLoadout {
  const trimmed = code.trim();
  if (!trimmed) throw new BuildCodeError("Empty build code.");
  if (!trimmed.startsWith(PREFIX)) throw new BuildCodeError("Unknown build code. Need an R1 code from the Forge.");
  const raw = decompressFromEncodedURIComponent(trimmed.slice(PREFIX.length));
  if (!raw) throw new BuildCodeError("Build code is damaged.");
  let wire: WireBuild;
  try {
    wire = JSON.parse(raw) as WireBuild;
  } catch {
    throw new BuildCodeError("Build code is damaged.");
  }
  if (wire.v !== 1 || !wire.archetype || !wire.name) throw new BuildCodeError("Build code is incomplete.");
  if (!ARCHETYPE_STATS[wire.archetype]) throw new BuildCodeError(`Unknown archetype: ${wire.archetype}.`);

  const loadout: Loadout = {
    weapon: validItem(wire.w, "weapon", registry),
    armor: validItem(wire.a, "armor", registry),
    accessory: validItem(wire.x, "accessory", registry),
    consumables: (wire.c ?? [])
      .filter((p) => registry.getItem(p.i)?.slot === "consumable" && p.n > 0)
      .map((p) => ({ itemId: p.i, charges: Math.min(5, Math.floor(p.n)) })),
  };

  const skills = (wire.s ?? []).filter((id) => registry.getSkill(id) && id !== "potion" && id !== "ether");
  const tactics = parseTactics(wire.t, skills, loadout);

  return {
    id: newId(),
    name: String(wire.name).slice(0, 24),
    archetype: wire.archetype,
    baseStats: { ...ARCHETYPE_STATS[wire.archetype] },
    loadout,
    skills,
    tactics: tactics.length > 0 ? tactics : defaultTactics(wire.archetype),
  };
}

function validItem(id: string | undefined, slot: string, registry: ContentRegistry): string | undefined {
  if (!id) return undefined;
  const item = registry.getItem(id);
  if (!item || item.slot !== slot) return undefined;
  return id;
}

function parseTactics(wires: WireTactic[] | undefined, skills: string[], loadout: Loadout): Tactic[] {
  if (!wires) return [];
  return wires.slice(0, 12).map((t) => {
    const tactic = makeTactic(
      { who: t.who ?? "enemy", predicate: t.pred ?? { kind: "always" } },
      sanitizeAction(t.act, skills, loadout),
      t.prefer ?? "lowestHp",
    );
    tactic.enabled = t.on !== false;
    return tactic;
  });
}

function sanitizeAction(act: TacticAction | undefined, skills: string[], loadout: Loadout): TacticAction {
  if (!act || act.kind === "attack") return { kind: "attack" };
  if (act.kind === "skill" && skills.includes(act.skillId)) return act;
  if (act.kind === "item" && loadout.consumables.some((c) => c.itemId === act.itemId)) return act;
  return { kind: "attack" };
}

export function tryDecodeBuild(
  code: string,
  registry: ContentRegistry,
): { ok: true; build: CharacterLoadout } | { ok: false; error: string } {
  try {
    return { ok: true, build: decodeBuild(code, registry) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Invalid build code." };
  }
}
