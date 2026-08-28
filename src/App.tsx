import { useMemo, useState } from "react";
import { simulateBattle, type BattleResult, type CharacterLoadout } from "./engine";
import { ARCHETYPES, createCharacter, sampleEncounter, sampleSkirmish } from "./data/templates";
import { CharacterEditor } from "./ui/CharacterEditor";
import { FighterCard } from "./ui/FighterCard";
import { BattleView } from "./ui/BattleView";
import { TEAM_LABELS } from "./ui/format";
import "./App.css";

type View = "setup" | "battle";

const starter = sampleEncounter();

export default function App() {
  const [teamA, setTeamA] = useState<CharacterLoadout[]>(starter.teamA);
  const [teamB, setTeamB] = useState<CharacterLoadout[]>(starter.teamB);
  const [selected, setSelected] = useState<{ team: "a" | "b"; id: string } | null>({
    team: "a",
    id: starter.teamA[0].id,
  });
  const [seed, setSeed] = useState(42);
  const [view, setView] = useState<View>("setup");
  const [result, setResult] = useState<BattleResult | null>(null);
  const [battleId, setBattleId] = useState(0);
  const [error, setError] = useState("");

  const selectedChar = useMemo(() => {
    if (!selected) return null;
    const list = selected.team === "a" ? teamA : teamB;
    return list.find((c) => c.id === selected.id) ?? null;
  }, [selected, teamA, teamB]);

  function updateTeam(team: "a" | "b", next: CharacterLoadout[]) {
    if (team === "a") setTeamA(next);
    else setTeamB(next);
  }

  function replaceCharacter(team: "a" | "b", next: CharacterLoadout) {
    const list = team === "a" ? teamA : teamB;
    updateTeam(
      team,
      list.map((c) => (c.id === next.id ? next : c)),
    );
  }

  function addFighter(team: "a" | "b", archetype: string) {
    const list = team === "a" ? teamA : teamB;
    if (list.length >= 4) return;
    const names = ["Kael", "Rin", "Osa", "Thorn", "Wren", "Bram"];
    const fighter = createCharacter(`${names[list.length % names.length]}`, archetype);
    updateTeam(team, [...list, fighter]);
    setSelected({ team, id: fighter.id });
  }

  function runBattle(nextSeed = seed) {
    setError("");
    if (teamA.length === 0 || teamB.length === 0) {
      setError("Each side needs at least one fighter.");
      return;
    }
    const battle = simulateBattle({ teamA, teamB, seed: nextSeed });
    setSeed(nextSeed);
    setResult(battle);
    setBattleId((n) => n + 1);
    setView("battle");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ seed, teamA, teamB }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rift-table-encounter.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.teamA) || !Array.isArray(data.teamB)) throw new Error("Invalid file");
        setTeamA(data.teamA);
        setTeamB(data.teamB);
        if (typeof data.seed === "number") setSeed(data.seed);
        setSelected(data.teamA[0] ? { team: "a", id: data.teamA[0].id } : null);
        setError("");
      } catch {
        setError("Could not read that encounter file.");
      }
    };
    reader.readAsText(file);
  }

  if (view === "battle" && result) {
    return (
      <BattleView
        key={battleId}
        result={result}
        seed={seed}
        onEdit={() => setView("setup")}
        onRerun={(s) => runBattle(s)}
      />
    );
  }

  return (
    <div className={`app ${selectedChar ? "with-editor" : ""}`}>
      <header className="mast">
        <div>
          <p className="kicker">Tick combat laboratory</p>
          <h1>Rift Table</h1>
        </div>
        <p className="lede">
          Kit each fighter with gear, skills, and a gambit list. The engine then fills action gauges every tick,
          fires the first ready rule, and writes a replay you can scrub.
        </p>
      </header>

      <div className="toolbar">
        <label>
          Seed
          <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 1)} />
        </label>
        <button type="button" className="primary" onClick={() => runBattle(seed)}>
          Simulate battle
        </button>
        <button
          type="button"
          onClick={() => {
            const e = sampleEncounter();
            setTeamA(e.teamA);
            setTeamB(e.teamB);
            setSelected({ team: "a", id: e.teamA[0].id });
          }}
        >
          Duel preset
        </button>
        <button
          type="button"
          onClick={() => {
            const e = sampleSkirmish();
            setTeamA(e.teamA);
            setTeamB(e.teamB);
            setSelected({ team: "a", id: e.teamA[0].id });
          }}
        >
          3v3 preset
        </button>
        <button type="button" onClick={exportJson}>
          Export JSON
        </button>
        <label className="file">
          Import
          <input
            type="file"
            accept="application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importJson(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="boards">
        {(["a", "b"] as const).map((team) => {
          const list = team === "a" ? teamA : teamB;
          return (
            <section key={team} className={`board ${team}`}>
              <header>
                <h2>{TEAM_LABELS[team]}</h2>
                <div className="adders">
                  {ARCHETYPES.map((arch) => (
                    <button key={arch} type="button" disabled={list.length >= 4} onClick={() => addFighter(team, arch)}>
                      + {arch}
                    </button>
                  ))}
                </div>
              </header>
              <div className="cards">
                {list.map((c) => (
                  <FighterCard
                    key={c.id}
                    character={c}
                    team={team}
                    selected={selected?.id === c.id}
                    onSelect={() => setSelected({ team, id: c.id })}
                    onRemove={() => {
                      updateTeam(team, list.filter((x) => x.id !== c.id));
                      if (selected?.id === c.id) setSelected(null);
                    }}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {selected && selectedChar && (
        <CharacterEditor
          character={selectedChar}
          onClose={() => setSelected(null)}
          onChange={(next) => replaceCharacter(selected.team, next)}
        />
      )}
    </div>
  );
}
