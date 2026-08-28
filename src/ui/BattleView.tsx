import { useEffect, useMemo, useState } from "react";
import type { BattleResult, PublicCombatant } from "../engine/types";
import { STATUS_LABELS } from "../engine/catalog";
import { pct, STATUS_SHORT, TEAM_LABELS } from "./format";

interface Props {
  result: BattleResult;
  onEdit: () => void;
  onRerun: (seed: number) => void;
  seed: number;
}

export function BattleView({ result, onEdit, onRerun, seed }: Props) {
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(4);

  const maxTick = result.ticks;
  const frame = result.frames[tick] ?? result.frames[result.frames.length - 1];

  const log = useMemo(() => {
    return result.events.filter((e) => e.tick <= tick).slice(-80);
  }, [result.events, tick]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setTick((t) => {
        if (t >= maxTick) {
          setPlaying(false);
          return maxTick;
        }
        return Math.min(maxTick, t + 1);
      });
    }, Math.max(16, 220 / speed));
    return () => window.clearInterval(id);
  }, [playing, speed, maxTick]);

  const teamA = frame.combatants.filter((c) => c.team === "a");
  const teamB = frame.combatants.filter((c) => c.team === "b");
  const finished = tick >= maxTick;

  return (
    <div className="battle">
      <header className="battle-top">
        <button type="button" className="ghost" onClick={onEdit}>
          ← Loadouts
        </button>
        <div className="verdict">
          <p className="kicker">Tick {tick} / {maxTick}</p>
          <h2>
            {finished
              ? result.winner === "draw"
                ? "Draw"
                : `${TEAM_LABELS[result.winner]} wins`
              : "Clash in progress"}
          </h2>
        </div>
        <div className="seed-row">
          <label>
            Seed
            <input
              type="number"
              defaultValue={seed}
              onBlur={(e) => onRerun(Number(e.target.value) || 1)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRerun(Number((e.target as HTMLInputElement).value) || 1);
              }}
            />
          </label>
        </div>
      </header>

      <div className="field">
        <TeamColumn team="a" units={teamA} />
        <div className="rift" aria-hidden>
          <span>VS</span>
        </div>
        <TeamColumn team="b" units={teamB} />
      </div>

      <div className="transport">
        <button type="button" onClick={() => { setTick(0); setPlaying(false); }}>
          Reset
        </button>
        <button
          type="button"
          onClick={() => setTick((t) => Math.max(0, t - 1))}
        >
          Step −
        </button>
        <button type="button" className="primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => setTick((t) => Math.min(maxTick, t + 1))}
        >
          Step +
        </button>
        <label className="speed">
          {speed}×
          <input
            type="range"
            min={1}
            max={12}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
        </label>
        <input
          className="scrub"
          type="range"
          min={0}
          max={maxTick}
          value={tick}
          onChange={(e) => {
            setPlaying(false);
            setTick(Number(e.target.value));
          }}
        />
      </div>

      <div className="log-wrap">
        <h3>Combat log</h3>
        <ol className="log">
          {log.map((e, i) => (
            <li key={`${e.tick}-${i}`} className={e.kind}>
              <span className="t">t{e.tick}</span>
              {e.text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function TeamColumn({ team, units }: { team: "a" | "b"; units: PublicCombatant[] }) {
  return (
    <section className={`column ${team}`}>
      <h3>{TEAM_LABELS[team]}</h3>
      {units.map((u) => (
        <FighterHud key={u.id} unit={u} />
      ))}
    </section>
  );
}

function FighterHud({ unit }: { unit: PublicCombatant }) {
  return (
    <div className={`hud ${unit.alive ? "" : "down"}`}>
      <div className="hud-top">
        <div className={`emblem ${unit.archetype.toLowerCase()}`}>{unit.archetype.slice(0, 1)}</div>
        <div>
          <strong>{unit.name}</strong>
          <p>{unit.archetype}{unit.lastAction ? ` · ${unit.lastAction}` : ""}</p>
        </div>
      </div>
      <div className="bars">
        <div className="bar hp">
          <span style={{ width: `${pct(unit.hp, unit.maxHp)}%` }} />
          <em>
            {unit.hp}/{unit.maxHp}
            {unit.shield > 0 ? ` +${unit.shield}` : ""}
          </em>
        </div>
        <div className="bar mp">
          <span style={{ width: `${pct(unit.mp, unit.maxMp)}%` }} />
          <em>
            {unit.mp}/{unit.maxMp}
          </em>
        </div>
        <div className="bar atb">
          <span style={{ width: `${unit.atb}%` }} />
        </div>
      </div>
      <ul className="pips">
        {unit.statuses.map((s) => (
          <li key={s.id} title={`${STATUS_LABELS[s.id]} (${s.remaining})`}>
            {STATUS_SHORT[s.id]}
          </li>
        ))}
      </ul>
    </div>
  );
}
