import type { CharacterLoadout, Prefer, Tactic, TacticAction, TacticPredicate } from "../engine/types";
import { riftRegistry } from "../content";
import { makeTactic } from "../game";
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

  return (
    <section className="panel tactics-panel">
      <div className="row-head">
        <h3>Gambits</h3>
        <button
          type="button"
          className="ghost"
          onClick={() =>
            onChange({
              ...character,
              tactics: [
                ...character.tactics,
                makeTactic({ who: "enemy", predicate: { kind: "always" } }, { kind: "attack" }),
              ],
            })
          }
        >
          Add rule
        </button>
      </div>
      <p className="hint">Top to bottom. First ready rule fires.</p>
      <ol className="tactic-list">
        {character.tactics.map((tactic, index) => (
          <li key={tactic.id} className={tactic.enabled ? "" : "off"}>
            <div className="tactic-tools">
              <button type="button" onClick={() => moveTactic(index, -1)} aria-label="Move up">
                ↑
              </button>
              <button type="button" onClick={() => moveTactic(index, 1)} aria-label="Move down">
                ↓
              </button>
              <label className="enable">
                <input
                  type="checkbox"
                  checked={tactic.enabled}
                  onChange={(e) => setTactic(tactic.id, { ...tactic, enabled: e.target.checked })}
                />
              </label>
              <button
                type="button"
                className="danger"
                onClick={() => onChange({ ...character, tactics: character.tactics.filter((t) => t.id !== tactic.id) })}
              >
                Remove
              </button>
            </div>
            <div className="tactic-grid">
              <label>
                If
                <select
                  value={tactic.condition.who}
                  onChange={(e) =>
                    setTactic(tactic.id, {
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
                    setTactic(tactic.id, {
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
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              {"pct" in tactic.condition.predicate && (
                <label>
                  %
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={tactic.condition.predicate.pct}
                    onChange={(e) =>
                      setTactic(tactic.id, {
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
                      setTactic(tactic.id, {
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
                      setTactic(tactic.id, {
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
                    setTactic(tactic.id, { ...tactic, action });
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
                <select
                  value={tactic.prefer}
                  onChange={(e) => setTactic(tactic.id, { ...tactic, prefer: e.target.value as Prefer })}
                >
                  {Object.entries(PREFER_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
