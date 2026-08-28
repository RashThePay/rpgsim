import { useEffect, useState } from "react";
import type { CharacterLoadout, Prefer, Tactic, TacticAction, TacticPredicate } from "../engine/types";
import { riftRegistry } from "../content";
import { gambitSentence, makeTactic } from "../game";
import { PREFER_LABELS } from "./format";

const PREDICATES: TacticPredicate["kind"][] = [
  "always",
  "hpBelow",
  "hpAbove",
  "mpBelow",
  "mpAbove",
  "hasStatus",
  "missingStatus",
  "alliesAliveGte",
  "enemiesAliveGte",
];

const PREDICATE_LABELS: Record<TacticPredicate["kind"], string> = {
  always: "Always",
  hpBelow: "HP below",
  hpAbove: "HP above",
  mpBelow: "MP below",
  mpAbove: "MP above",
  hasStatus: "Has status",
  missingStatus: "Missing status",
  alliesAliveGte: "Allies standing",
  enemiesAliveGte: "Foes standing",
};

function withPredicate(pred: TacticPredicate, kind: TacticPredicate["kind"]): TacticPredicate {
  switch (kind) {
    case "always":
      return { kind };
    case "hpBelow":
    case "hpAbove":
    case "mpBelow":
    case "mpAbove":
      return { kind, pct: "pct" in pred ? pred.pct : 50 };
    case "hasStatus":
    case "missingStatus":
      return { kind, status: "status" in pred ? pred.status : "poison" };
    case "alliesAliveGte":
    case "enemiesAliveGte":
      return { kind, count: "count" in pred ? pred.count : 2 };
  }
}

export function TacticBoard({
  character,
  onChange,
}: {
  character: CharacterLoadout;
  onChange: (next: CharacterLoadout) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = character.tactics.find((t) => t.id === editingId) ?? null;

  useEffect(() => {
    if (!editingId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setEditingId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId]);

  function setTactic(id: string, next: Tactic) {
    onChange({ ...character, tactics: character.tactics.map((t) => (t.id === id ? next : t)) });
  }

  function moveTactic(index: number, dir: -1 | 1) {
    const next = [...character.tactics];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    onChange({ ...character, tactics: next });
  }

  function duplicateTactic(index: number) {
    const src = character.tactics[index];
    const copy = makeTactic(src.condition, src.action, src.prefer);
    copy.enabled = src.enabled;
    const next = [...character.tactics];
    next.splice(index + 1, 0, copy);
    onChange({ ...character, tactics: next });
  }

  function addGambit() {
    const fresh = makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" });
    onChange({ ...character, tactics: [...character.tactics, fresh] });
    setEditingId(fresh.id);
  }

  return (
    <section className="panel gambit-panel">
      <header className="section-head">
        <div>
          <p className="kicker">Step 5</p>
          <h3>Gambits</h3>
        </div>
        <button type="button" className="ghost" onClick={addGambit}>
          Add gambit
        </button>
      </header>
      <p className="hint">Read top to bottom. The first ready rule fires.</p>
      <ol className="gambit-list">
        {character.tactics.map((tactic, index) => (
          <li key={tactic.id} className={`gambit-card ${tactic.enabled ? "" : "off"} ${editingId === tactic.id ? "editing" : ""}`}>
            <span className="gambit-prio" aria-hidden>
              {index + 1}
            </span>
            <button type="button" className="gambit-sentence" onClick={() => setEditingId(tactic.id)}>
              {gambitSentence(tactic, riftRegistry)}
            </button>
            <div className="gambit-tools">
              <button type="button" onClick={() => moveTactic(index, -1)} aria-label="Move up" disabled={index === 0}>
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveTactic(index, 1)}
                aria-label="Move down"
                disabled={index === character.tactics.length - 1}
              >
                ↓
              </button>
              <button
                type="button"
                className={tactic.enabled ? "ghost" : ""}
                onClick={() => setTactic(tactic.id, { ...tactic, enabled: !tactic.enabled })}
                aria-pressed={tactic.enabled}
              >
                {tactic.enabled ? "On" : "Off"}
              </button>
              <button type="button" className="ghost" onClick={() => duplicateTactic(index)} aria-label="Duplicate">
                Copy
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (editingId === tactic.id) setEditingId(null);
                  onChange({ ...character, tactics: character.tactics.filter((t) => t.id !== tactic.id) });
                }}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ol>
      {editing && (
        <div className="forge-overlay" onClick={() => setEditingId(null)}>
          <div
            className="forge-modal"
            role="dialog"
            aria-labelledby="gambit-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="section-head">
              <div>
                <p className="kicker">Rewrite rule</p>
                <h3 id="gambit-edit-title">Gambit</h3>
              </div>
              <button type="button" className="primary" onClick={() => setEditingId(null)}>
                Done
              </button>
            </header>
            <p className="gambit-live">{gambitSentence(editing, riftRegistry)}</p>
            <GambitFields tactic={editing} character={character} onChange={(next) => setTactic(editing.id, next)} />
          </div>
        </div>
      )}
    </section>
  );
}

function GambitFields({
  tactic,
  character,
  onChange,
}: {
  tactic: Tactic;
  character: CharacterLoadout;
  onChange: (next: Tactic) => void;
}) {
  return (
    <div className="gambit-fields">
      <label>
        If
        <select
          value={tactic.condition.who}
          onChange={(e) =>
            onChange({
              ...tactic,
              condition: { ...tactic.condition, who: e.target.value as Tactic["condition"]["who"] },
            })
          }
        >
          <option value="self">Self</option>
          <option value="ally">Ally</option>
          <option value="enemy">Foe</option>
        </select>
      </label>
      <label>
        Check
        <select
          value={tactic.condition.predicate.kind}
          onChange={(e) =>
            onChange({
              ...tactic,
              condition: {
                ...tactic.condition,
                predicate: withPredicate(tactic.condition.predicate, e.target.value as TacticPredicate["kind"]),
              },
            })
          }
        >
          {PREDICATES.map((k) => (
            <option key={k} value={k}>
              {PREDICATE_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      {"pct" in tactic.condition.predicate && (
        <label>
          Threshold
          <input
            type="number"
            min={1}
            max={99}
            value={tactic.condition.predicate.pct}
            onChange={(e) =>
              onChange({
                ...tactic,
                condition: {
                  ...tactic.condition,
                  predicate: { ...tactic.condition.predicate, pct: Number(e.target.value) } as TacticPredicate,
                },
              })
            }
          />
        </label>
      )}
      {"status" in tactic.condition.predicate && (
        <label>
          Status
          <select
            value={tactic.condition.predicate.status}
            onChange={(e) =>
              onChange({
                ...tactic,
                condition: {
                  ...tactic.condition,
                  predicate: { ...tactic.condition.predicate, status: e.target.value } as TacticPredicate,
                },
              })
            }
          >
            {riftRegistry.statuses().map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {"count" in tactic.condition.predicate && (
        <label>
          Count
          <input
            type="number"
            min={1}
            max={4}
            value={tactic.condition.predicate.count}
            onChange={(e) =>
              onChange({
                ...tactic,
                condition: {
                  ...tactic.condition,
                  predicate: { ...tactic.condition.predicate, count: Number(e.target.value) } as TacticPredicate,
                },
              })
            }
          />
        </label>
      )}
      <label>
        Then
        <select
          value={
            tactic.action.kind === "attack"
              ? "attack"
              : tactic.action.kind === "item"
                ? `item:${tactic.action.itemId}`
                : `skill:${tactic.action.skillId}`
          }
          onChange={(e) => {
            const v = e.target.value;
            let action: TacticAction = { kind: "attack" };
            if (v.startsWith("skill:")) action = { kind: "skill", skillId: v.slice(6) };
            if (v.startsWith("item:")) action = { kind: "item", itemId: v.slice(5) };
            onChange({ ...tactic, action });
          }}
        >
          <option value="attack">Strike</option>
          {character.skills.map((id) => (
            <option key={id} value={`skill:${id}`}>
              {riftRegistry.getSkill(id)?.name ?? id}
            </option>
          ))}
          {character.loadout.consumables.map((c) => (
            <option key={c.itemId} value={`item:${c.itemId}`}>
              Use {riftRegistry.getItem(c.itemId)?.name ?? c.itemId}
            </option>
          ))}
        </select>
      </label>
      <label>
        Prefer
        <select value={tactic.prefer} onChange={(e) => onChange({ ...tactic, prefer: e.target.value as Prefer })}>
          {Object.entries(PREFER_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
