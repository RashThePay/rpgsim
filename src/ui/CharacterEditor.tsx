import type { CharacterLoadout, Prefer, Tactic, TacticAction, TacticPredicate } from "../engine/types";
import {
  ACCESSORIES,
  ARMORS,
  CONSUMABLES,
  SKILL_LIST,
  WEAPONS,
  riftRegistry,
} from "../content";
import { computeStats } from "../engine/stats";
import { ARCHETYPES, ARCHETYPE_SKILLS, ARCHETYPE_STATS, defaultTactics, makeTactic } from "../game";
import { PREFER_LABELS } from "./format";

interface Props {
  character: CharacterLoadout;
  onChange: (next: CharacterLoadout) => void;
  onClose: () => void;
}

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

const STATUSES = riftRegistry.statuses();

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

export function CharacterEditor({ character, onChange, onClose }: Props) {
  const stats = computeStats(character, riftRegistry);

  function patch(partial: Partial<CharacterLoadout>) {
    onChange({ ...character, ...partial });
  }

  function setTactic(id: string, next: Tactic) {
    patch({ tactics: character.tactics.map((t) => (t.id === id ? next : t)) });
  }

  function moveTactic(index: number, dir: -1 | 1) {
    const next = [...character.tactics];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    patch({ tactics: next });
  }

  return (
    <aside className="editor" aria-label="Character sheet">
      <header className="editor-head">
        <div>
          <p className="kicker">Loadout</p>
          <h2>{character.name}</h2>
        </div>
        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </header>

      <section>
        <label>
          Name
          <input
            value={character.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </label>
        <label>
          Archetype
          <select
            value={character.archetype}
            onChange={(e) => {
              const archetype = e.target.value;
              patch({
                archetype,
                baseStats: { ...ARCHETYPE_STATS[archetype] },
                skills: [...(ARCHETYPE_SKILLS[archetype] ?? [])],
                tactics: defaultTactics(archetype),
              });
            }}
          >
            {ARCHETYPES.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
      </section>

      <section>
        <h3>Computed stats</h3>
        <p className="hint">Base values plus gear. SPD fills the action gauge; CRT is percent chance.</p>
        <div className="stat-grid">
          {(
            [
              ["maxHp", "HP"],
              ["maxMp", "MP"],
              ["atk", "ATK"],
              ["def", "DEF"],
              ["mag", "MAG"],
              ["res", "RES"],
              ["spd", "SPD"],
              ["crt", "CRT"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min={1}
                max={key === "crt" ? 80 : 400}
                value={character.baseStats[key]}
                onChange={(e) =>
                  patch({
                    baseStats: { ...character.baseStats, [key]: Number(e.target.value) },
                  })
                }
              />
              <span className="computed">{stats[key]}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3>Gear</h3>
        <label>
          Weapon
          <select
            value={character.loadout.weapon ?? ""}
            onChange={(e) =>
              patch({ loadout: { ...character.loadout, weapon: e.target.value || undefined } })
            }
          >
            <option value="">None</option>
            {WEAPONS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Armor
          <select
            value={character.loadout.armor ?? ""}
            onChange={(e) =>
              patch({ loadout: { ...character.loadout, armor: e.target.value || undefined } })
            }
          >
            <option value="">None</option>
            {ARMORS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Accessory
          <select
            value={character.loadout.accessory ?? ""}
            onChange={(e) =>
              patch({ loadout: { ...character.loadout, accessory: e.target.value || undefined } })
            }
          >
            <option value="">None</option>
            {ACCESSORIES.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <div className="consumable-row">
          {CONSUMABLES.map((item) => {
            const pack = character.loadout.consumables.find((c) => c.itemId === item.id);
            return (
              <label key={item.id}>
                {item.name} charges
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={pack?.charges ?? 0}
                  onChange={(e) => {
                    const charges = Number(e.target.value);
                    const rest = character.loadout.consumables.filter((c) => c.itemId !== item.id);
                    patch({
                      loadout: {
                        ...character.loadout,
                        consumables: charges > 0 ? [...rest, { itemId: item.id, charges }] : rest,
                      },
                    });
                  }}
                />
              </label>
            );
          })}
        </div>
      </section>

      <section>
        <h3>Skills</h3>
        <p className="hint">Tactics can only fire skills that are equipped here.</p>
        <div className="skill-picks">
          {SKILL_LIST.map((skill) => {
            const on = character.skills.includes(skill.id);
            return (
              <button
                key={skill.id}
                type="button"
                className={`chip ${on ? "on" : ""}`}
                title={skill.description}
                onClick={() => {
                  patch({
                    skills: on
                      ? character.skills.filter((id) => id !== skill.id)
                      : [...character.skills, skill.id],
                  });
                }}
              >
                {skill.name}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="row-head">
          <h3>Tactics</h3>
          <button
            type="button"
            className="ghost"
            onClick={() =>
              patch({
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
        <p className="hint">
          Evaluated top to bottom on every action. First matching rule that is ready (MP, cooldown, charges) fires.
        </p>
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
                  onClick={() => patch({ tactics: character.tactics.filter((t) => t.id !== tactic.id) })}
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
                            predicate: {
                              ...tactic.condition.predicate,
                              status: e.target.value,
                            } as TacticPredicate,
                          },
                        })
                      }
                    >
                      {STATUSES.map((s) => (
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
                        Use {c.itemId}
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
    </aside>
  );
}
