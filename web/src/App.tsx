import { useEffect, useMemo, useState } from "react";
import { fetchClasses, runSimulation } from "./api";
import type { ClassPreset, CombatantInput, LogEntry, SimulationResult, Team } from "./types";

interface PartyMember {
  key: string;
  classId: string;
}

let memberCounter = 0;
function makeMember(classId: string): PartyMember {
  memberCounter += 1;
  return { key: `m-${memberCounter}`, classId };
}

const DEFAULT_HEROES = ["knight", "cleric", "mage"];
const DEFAULT_ENEMIES = ["ogre", "goblin", "goblin"];

export function App() {
  const [classes, setClasses] = useState<ClassPreset[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [heroes, setHeroes] = useState<PartyMember[]>([]);
  const [enemies, setEnemies] = useState<PartyMember[]>([]);
  const [seed, setSeed] = useState("");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses()
      .then((data) => {
        setClasses(data);
        setHeroes(DEFAULT_HEROES.map(makeMember));
        setEnemies(DEFAULT_ENEMIES.map(makeMember));
      })
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  const classById = useMemo(() => {
    const map = new Map<string, ClassPreset>();
    for (const preset of classes) {
      map.set(preset.id, preset);
    }
    return map;
  }, [classes]);

  const canSimulate = classes.length > 0 && heroes.length > 0 && enemies.length > 0 && !running;

  async function handleSimulate() {
    if (!canSimulate) {
      return;
    }
    setRunning(true);
    setRunError(null);
    try {
      const payload = {
        heroes: heroes.map<CombatantInput>((m) => ({ classId: m.classId })),
        enemies: enemies.map<CombatantInput>((m) => ({ classId: m.classId })),
        seed: seed.trim() || undefined,
      };
      const data = await runSimulation(payload);
      setResult(data);
    } catch (error) {
      setRunError((error as Error).message);
    } finally {
      setRunning(false);
    }
  }

  if (loadError) {
    return (
      <div className="app">
        <div className="error-panel">
          <h2>Could not reach the rpgsim API</h2>
          <p>{loadError}</p>
          <p className="hint">Is the API server running on port 4000?</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hero-header">
        <h1>
          <span className="crossed">⚔️</span> rpgsim
        </h1>
        <p>Assemble two parties, pick a seed, and watch a deterministic turn-based battle unfold.</p>
      </header>

      <div className="arena">
        <PartyColumn
          team="heroes"
          title="Heroes"
          members={heroes}
          classes={classes}
          classById={classById}
          onAdd={(id) => setHeroes((prev) => [...prev, makeMember(id)])}
          onRemove={(key) => setHeroes((prev) => prev.filter((m) => m.key !== key))}
        />
        <PartyColumn
          team="enemies"
          title="Enemies"
          members={enemies}
          classes={classes}
          classById={classById}
          onAdd={(id) => setEnemies((prev) => [...prev, makeMember(id)])}
          onRemove={(key) => setEnemies((prev) => prev.filter((m) => m.key !== key))}
        />
      </div>

      <div className="controls">
        <label className="seed-field">
          Seed
          <input
            type="text"
            value={seed}
            placeholder="random"
            onChange={(event) => setSeed(event.target.value)}
          />
        </label>
        <button type="button" className="simulate-btn" disabled={!canSimulate} onClick={handleSimulate}>
          {running ? "Simulating…" : "Simulate Battle"}
        </button>
      </div>

      {runError && <p className="run-error">{runError}</p>}

      {result && <ResultView result={result} />}
    </div>
  );
}

interface PartyColumnProps {
  team: Team;
  title: string;
  members: PartyMember[];
  classes: ClassPreset[];
  classById: Map<string, ClassPreset>;
  onAdd: (classId: string) => void;
  onRemove: (key: string) => void;
}

function PartyColumn({ team, title, members, classes, classById, onAdd, onRemove }: PartyColumnProps) {
  const [pending, setPending] = useState(classes[0]?.id ?? "");

  useEffect(() => {
    if (!pending && classes.length > 0) {
      setPending(classes[0].id);
    }
  }, [classes, pending]);

  return (
    <section className={`party party-${team}`}>
      <h2>{title}</h2>
      <ul className="member-list">
        {members.map((member) => {
          const preset = classById.get(member.classId);
          return (
            <li key={member.key} className="member-card">
              <div className="member-info">
                <strong>{preset?.name ?? member.classId}</strong>
                <div className="member-stats">
                  <span title="Health">❤ {preset?.maxHp}</span>
                  <span title="Attack">🗡 {preset?.attack}</span>
                  <span title="Defense">🛡 {preset?.defense}</span>
                  <span title="Speed">⚡ {preset?.speed}</span>
                </div>
              </div>
              <button type="button" className="remove-btn" onClick={() => onRemove(member.key)} aria-label="Remove">
                ✕
              </button>
            </li>
          );
        })}
        {members.length === 0 && <li className="empty-hint">Add a combatant to this party.</li>}
      </ul>
      <div className="add-row">
        <select value={pending} onChange={(event) => setPending(event.target.value)}>
          {classes.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <button type="button" className="add-btn" onClick={() => pending && onAdd(pending)}>
          + Add
        </button>
      </div>
    </section>
  );
}

function ResultView({ result }: { result: SimulationResult }) {
  const winnerLabel =
    result.winner === "draw" ? "Draw" : result.winner === "heroes" ? "Heroes win!" : "Enemies win!";

  return (
    <section className="result">
      <div className={`banner banner-${result.winner}`}>
        <h2>{winnerLabel}</h2>
        <p>
          Resolved in {result.rounds} round(s) · seed <code>{result.seed}</code>
        </p>
      </div>

      <div className="final-state">
        {(["heroes", "enemies"] as Team[]).map((team) => (
          <div key={team} className="final-team">
            <h3>{team === "heroes" ? "Heroes" : "Enemies"}</h3>
            {result.combatants
              .filter((c) => c.team === team)
              .map((c) => (
                <div key={c.id} className={`hp-row ${c.alive ? "" : "defeated"}`}>
                  <span className="hp-name">
                    {c.name} {c.alive ? "" : "💀"}
                  </span>
                  <span className="hp-bar">
                    <span
                      className="hp-fill"
                      style={{ width: `${Math.round((c.hp / c.maxHp) * 100)}%` }}
                    />
                  </span>
                  <span className="hp-num">
                    {c.hp}/{c.maxHp}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>

      <div className="log">
        <h3>Combat log</h3>
        <ol>
          {result.log.map((entry, index) => (
            <li key={index} className={`log-${entry.kind}`}>
              {renderLogLine(entry)}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function renderLogLine(entry: LogEntry) {
  return <span>{entry.message}</span>;
}
