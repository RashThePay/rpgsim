import { useMemo, useState } from "react";
import { simulateBattle, type BattleResult, type CharacterLoadout } from "../engine";
import { riftRegistry } from "../content";
import {
  createCharacter,
  describeMode,
  encodeBuild,
  modeSlots,
  scoreLoadout,
  tryDecodeBuild,
  type ArenaMode,
} from "../game";
import { BattleView } from "./BattleView";
import { BudgetMeter } from "./BudgetMeter";
import { archetypeIcon } from "./icons";
import { NavIcons } from "./icons";

interface Seat {
  code: string;
}

export function BattlePage() {
  const [mode, setMode] = useState<ArenaMode>({ kind: "duel" });
  const [seats, setSeats] = useState<Record<string, Seat>>({});
  const [seed, setSeed] = useState(42);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BattleResult | null>(null);
  const [battleId, setBattleId] = useState(0);

  const slots = useMemo(() => modeSlots(mode), [mode]);

  function setModeAndReset(next: ArenaMode) {
    setMode(next);
    setSeats({});
    setError("");
    setResult(null);
  }

  function fillDemo() {
    const next: Record<string, Seat> = {};
    const demo = slots.map((_, i) => {
      const arch = ["Knight", "Cleric", "Ranger", "Rogue", "Mage", "Berserker"][i % 6];
      const names = ["Aldric", "Mira", "Lyn", "Vex", "Ash", "Ghrun"];
      return encodeBuild(createCharacter(names[i % names.length], arch));
    });
    slots.forEach((slot, i) => {
      next[slot.id] = { code: demo[i] };
    });
    setSeats(next);
    setError("");
  }

  function run(nextSeed = seed) {
    setError("");
    const sides = new Map<string, { name: string; combatants: CharacterLoadout[] }>();
    for (const slot of slots) {
      const code = seats[slot.id]?.code ?? "";
      const parsed = tryDecodeBuild(code, riftRegistry);
      if (!parsed.ok) {
        setError(`${slot.label}: ${parsed.error}`);
        return;
      }
      const score = scoreLoadout(parsed.build, riftRegistry);
      if (score.over) {
        setError(`${slot.label} is over tribute (${score.total}/${score.cap}) and cannot enter.`);
        return;
      }
      const side = sides.get(slot.sideId) ?? { name: slot.sideName, combatants: [] };
      side.combatants.push(parsed.build);
      sides.set(slot.sideId, side);
    }
    const battle = simulateBattle(
      {
        sides: [...sides.entries()].map(([id, s]) => ({ id, name: s.name, combatants: s.combatants })),
        seed: nextSeed,
      },
      riftRegistry,
    );
    setSeed(nextSeed);
    setResult(battle);
    setBattleId((n) => n + 1);
  }

  if (result) {
    return (
      <BattleView
        key={battleId}
        result={result}
        seed={seed}
        onEdit={() => setResult(null)}
        onRerun={(s) => run(s)}
      />
    );
  }

  const grouped = new Map<string, typeof slots>();
  for (const slot of slots) {
    const list = grouped.get(slot.sideId) ?? [];
    list.push(slot);
    grouped.set(slot.sideId, list);
  }

  return (
    <div className="arena-page">
      <header className="page-head">
        <div>
          <p className="kicker">The Arena</p>
          <h1>{describeMode(mode)}</h1>
        </div>
      </header>

      <div className="mode-row">
        <button type="button" className={mode.kind === "duel" ? "on" : ""} onClick={() => setModeAndReset({ kind: "duel" })}>
          Duel
        </button>
        <button
          type="button"
          className={mode.kind === "team" && mode.size === 2 ? "on" : ""}
          onClick={() => setModeAndReset({ kind: "team", size: 2 })}
        >
          2v2
        </button>
        <button
          type="button"
          className={mode.kind === "team" && mode.size === 3 ? "on" : ""}
          onClick={() => setModeAndReset({ kind: "team", size: 3 })}
        >
          3v3
        </button>
        <button
          type="button"
          className={mode.kind === "royale" ? "on" : ""}
          onClick={() => setModeAndReset({ kind: "royale", count: 4 })}
        >
          Royale
        </button>
        {mode.kind === "royale" && (
          <label className="count">
            Fighters
            <input
              type="number"
              min={3}
              max={8}
              value={mode.count}
              onChange={(e) => setModeAndReset({ kind: "royale", count: Number(e.target.value) || 4 })}
            />
          </label>
        )}
      </div>

      <div className={`summon-board ${mode.kind}`}>
        {[...grouped.entries()].map(([sideId, sideSlots]) => (
          <section key={sideId} className="side-col">
            <h2>{sideSlots[0]?.sideName}</h2>
            {sideSlots.map((slot) => (
              <SeatWell
                key={slot.id}
                label={slot.label}
                code={seats[slot.id]?.code ?? ""}
                onChange={(code) => setSeats((prev) => ({ ...prev, [slot.id]: { code } }))}
              />
            ))}
          </section>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="arena-actions">
        <label>
          Seed
          <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 1)} />
        </label>
        <button type="button" onClick={fillDemo}>
          Fill demo seals
        </button>
        <button type="button" className="primary" onClick={() => run(seed)}>
          Begin clash
        </button>
      </div>
    </div>
  );
}

function SeatWell({
  label,
  code,
  onChange,
}: {
  label: string;
  code: string;
  onChange: (code: string) => void;
}) {
  const parsed = tryDecodeBuild(code, riftRegistry);
  const Wolf = NavIcons.wolf;
  if (parsed.ok) {
    const score = scoreLoadout(parsed.build, riftRegistry);
    const Ico = archetypeIcon(parsed.build.archetype);
    return (
      <div className={`well ${score.over ? "illegal" : "ready"}`}>
        <div className="well-top">
          <Ico />
          <div>
            <strong>{parsed.build.name}</strong>
            <p>
              {parsed.build.archetype} · {label}
            </p>
          </div>
        </div>
        <BudgetMeter score={score} />
        {score.over && <p className="illegal-tag">Banned from the pit</p>}
        <textarea rows={2} value={code} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }

  return (
    <div className={`well empty ${code.trim() ? "bad" : ""}`}>
      <div className="well-top">
        <Wolf />
        <div>
          <strong>{label}</strong>
          <p>{code.trim() ? parsed.error : "Paste a seal"}</p>
        </div>
      </div>
      <textarea rows={2} value={code} onChange={(e) => onChange(e.target.value)} placeholder="R1...." />
    </div>
  );
}
