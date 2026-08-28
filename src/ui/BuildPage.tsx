import { useEffect, useMemo, useState } from "react";
import { ACCESSORIES, ARMORS, CONSUMABLES, SKILL_LIST, WEAPONS, riftRegistry } from "../content";
import {
  ARCHETYPE_SKILLS,
  ARCHETYPE_STATS,
  ARCHETYPES,
  ART_MAX,
  ART_ROLE_LABELS,
  createCharacter,
  defaultTactics,
  encodeBuild,
  kitRoleSummary,
  playstyleLines,
  buildWarnings,
  scoreLoadout,
  tryDecodeBuild,
  artPurpose,
  artRole,
  itemCost,
  skillCost,
  type ArtRole,
  type BudgetBreakdown,
} from "../game";
import { computeStats } from "../engine/stats";
import type { CharacterLoadout, Item } from "../engine/types";
import { TacticBoard } from "./TacticBoard";
import { archetypeIcon, itemIcon, skillIcon } from "./icons";

const STORAGE = "rift.lastBuild";
const ART_FILTERS: Array<ArtRole | "all"> = ["all", "offense", "control", "support", "sustain", "finisher"];

export function BuildPage() {
  const [character, setCharacter] = useState<CharacterLoadout>(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) return JSON.parse(raw) as CharacterLoadout;
    } catch {
      /* ignore */
    }
    return createCharacter("Ser Aldric", "Knight");
  });
  const [copied, setCopied] = useState(false);
  const [browseArts, setBrowseArts] = useState(false);
  const [artFilter, setArtFilter] = useState<ArtRole | "all">("all");
  const [sealOpen, setSealOpen] = useState(false);
  const [importDraft, setImportDraft] = useState("");
  const [importError, setImportError] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(character));
  }, [character]);

  useEffect(() => {
    if (!sealOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSealOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sealOpen]);

  const stats = useMemo(() => computeStats(character, riftRegistry), [character]);
  const score = useMemo(() => scoreLoadout(character, riftRegistry), [character]);
  const code = useMemo(() => encodeBuild(character), [character]);
  const style = useMemo(() => playstyleLines(character, riftRegistry), [character]);
  const warnings = useMemo(() => buildWarnings(character, score.remaining, riftRegistry), [character, score.remaining]);
  const ArchIco = archetypeIcon(character.archetype);
  const showLibrary = browseArts || character.skills.length === 0;

  function setArchetype(archetype: string) {
    setCharacter({
      ...character,
      archetype,
      baseStats: { ...ARCHETYPE_STATS[archetype] },
      skills: [...(ARCHETYPE_SKILLS[archetype] ?? [])],
      tactics: defaultTactics(archetype),
    });
  }

  async function copySeal() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function openSeal(mode: "show" | "import") {
    setImportDraft(mode === "import" ? "" : code);
    setImportError("");
    setSealOpen(true);
  }

  function applyImport() {
    const parsed = tryDecodeBuild(importDraft, riftRegistry);
    if (!parsed.ok) {
      setImportError(parsed.error);
      return;
    }
    setCharacter(parsed.build);
    setImportError("");
    setSealOpen(false);
  }

  function toggleArt(id: string) {
    const on = character.skills.includes(id);
    if (on) {
      setCharacter({ ...character, skills: character.skills.filter((skillId) => skillId !== id) });
      return;
    }
    if (character.skills.length >= ART_MAX) return;
    setCharacter({ ...character, skills: [...character.skills, id] });
  }

  function setCharges(itemId: string, charges: number) {
    const rest = character.loadout.consumables.filter((c) => c.itemId !== itemId);
    setCharacter({
      ...character,
      loadout: {
        ...character.loadout,
        consumables: charges > 0 ? [...rest, { itemId, charges }] : rest,
      },
    });
  }

  return (
    <div className="forge">
      <header className="page-head">
        <div>
          <p className="kicker">The Forge</p>
          <h1>Compose a fighter</h1>
          <p className="lede">Pick a soul, spend tribute, arm them, then write how they fight.</p>
        </div>
      </header>

      <div className="forge-layout">
        <div className="forge-main">
          <section className="panel identity">
            <header className="section-head">
              <div>
                <p className="kicker">Step 1</p>
                <h3>Identity</h3>
              </div>
            </header>
            <div className="identity-row">
              <div className="portrait">
                <ArchIco />
              </div>
              <label className="name-field">
                Name
                <input
                  value={character.name}
                  maxLength={24}
                  onChange={(e) => setCharacter({ ...character, name: e.target.value })}
                />
              </label>
            </div>
            <div className="arch-row">
              {ARCHETYPES.map((arch) => {
                const Ico = archetypeIcon(arch);
                return (
                  <button
                    key={arch}
                    type="button"
                    className={`arch-btn ${character.archetype === arch ? "on" : ""}`}
                    onClick={() => setArchetype(arch)}
                  >
                    <Ico />
                    {arch}
                  </button>
                );
              })}
            </div>
            <dl className="stat-strip">
              {(
                [
                  ["HP", stats.maxHp],
                  ["MP", stats.maxMp],
                  ["ATK", stats.atk],
                  ["DEF", stats.def],
                  ["MAG", stats.mag],
                  ["RES", stats.res],
                  ["SPD", stats.spd],
                  ["CRT", stats.crt],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <TributeBoard score={score} />

          <section className="panel">
            <header className="section-head">
              <div>
                <p className="kicker">Step 2</p>
                <h3>Arms</h3>
              </div>
              <p className="meta-pill">Spent {score.categories.arms + score.categories.consumables}</p>
            </header>
            <GearRack
              title="Weapon"
              options={WEAPONS}
              value={character.loadout.weapon ?? ""}
              onChange={(weapon) => setCharacter({ ...character, loadout: { ...character.loadout, weapon } })}
            />
            <GearRack
              title="Armor"
              options={ARMORS}
              value={character.loadout.armor ?? ""}
              onChange={(armor) => setCharacter({ ...character, loadout: { ...character.loadout, armor } })}
            />
            <GearRack
              title="Charm"
              options={ACCESSORIES}
              value={character.loadout.accessory ?? ""}
              onChange={(accessory) => setCharacter({ ...character, loadout: { ...character.loadout, accessory } })}
            />
            <div className="flask-row">
              <h4>Flasks</h4>
              <div className="flask-cards">
                {CONSUMABLES.map((item) => {
                  const pack = character.loadout.consumables.find((c) => c.itemId === item.id);
                  const charges = pack?.charges ?? 0;
                  const Ico = itemIcon(item.id);
                  return (
                    <div key={item.id} className={`flask-card ${charges > 0 ? "on" : ""}`}>
                      <Ico />
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.description}</p>
                        <em>{itemCost(item.id)} each</em>
                      </div>
                      <div className="stepper">
                        <button type="button" onClick={() => setCharges(item.id, Math.max(0, charges - 1))} aria-label={`Fewer ${item.name}`}>
                          −
                        </button>
                        <span>{charges}</span>
                        <button type="button" onClick={() => setCharges(item.id, Math.min(5, charges + 1))} aria-label={`More ${item.name}`}>
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="panel arts-panel">
            <header className="section-head">
              <div>
                <p className="kicker">Step 3</p>
                <h3>Arts</h3>
              </div>
              <p className="meta-pill">
                {character.skills.length} / {ART_MAX} · {score.categories.arts} tribute
              </p>
            </header>
            <p className="hint">Equip a short loadout. Unequipped arts cannot fire.</p>
            {character.skills.length > 0 && (
              <div className="art-equipped">
                {character.skills.map((id) => {
                  const skill = riftRegistry.getSkill(id);
                  if (!skill) return null;
                  return (
                    <ArtTile
                      key={id}
                      id={id}
                      name={skill.name}
                      purpose={artPurpose(skill.description)}
                      cost={skillCost(id)}
                      state="equipped"
                      onToggle={() => toggleArt(id)}
                    />
                  );
                })}
              </div>
            )}
            {character.skills.length > 0 && (
              <button type="button" className="ghost browse-arts" onClick={() => setBrowseArts((v) => !v)}>
                {showLibrary && browseArts ? "Hide library" : "Browse all arts"}
              </button>
            )}
            {showLibrary && (
              <>
                <div className="art-filters">
                  {ART_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      className={`chip ${artFilter === filter ? "on" : ""}`}
                      onClick={() => setArtFilter(filter)}
                    >
                      {filter === "all" ? "All" : ART_ROLE_LABELS[filter]}
                    </button>
                  ))}
                </div>
                {(Object.keys(ART_ROLE_LABELS) as ArtRole[])
                  .filter((role) => artFilter === "all" || artFilter === role)
                  .map((role) => {
                    const arts = SKILL_LIST.filter((skill) => artRole(skill.id) === role);
                    if (arts.length === 0) return null;
                    return (
                      <div key={role} className="art-group">
                        <h4>{ART_ROLE_LABELS[role]}</h4>
                        <div className="art-grid">
                          {arts.map((skill) => {
                            const equipped = character.skills.includes(skill.id);
                            const cost = skillCost(skill.id);
                            const unaffordable = !equipped && cost > Math.max(0, score.remaining);
                            const full = !equipped && character.skills.length >= ART_MAX;
                            const state = equipped ? "equipped" : full || unaffordable ? "locked" : "available";
                            return (
                              <ArtTile
                                key={skill.id}
                                id={skill.id}
                                name={skill.name}
                                purpose={artPurpose(skill.description)}
                                cost={cost}
                                state={state}
                                disabled={full}
                                onToggle={() => toggleArt(skill.id)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </section>

          <TacticBoard character={character} onChange={setCharacter} />
        </div>

        <aside className="forge-rail">
          <section className="panel summary-card">
            <header className="section-head">
              <div>
                <p className="kicker">Kit</p>
                <h3>Build summary</h3>
              </div>
            </header>
            <div className="summary-id">
              <ArchIco />
              <div>
                <strong>{character.name || "Unnamed"}</strong>
                <p>
                  {character.archetype} · {kitRoleSummary(character.skills)}
                </p>
              </div>
            </div>
            <div className={`summary-tribute ${score.over ? "over" : ""}`}>
              <span>Tribute</span>
              <strong>
                {score.total} / {score.cap}
              </strong>
            </div>
            <dl className="stat-strip compact">
              {(
                [
                  ["HP", stats.maxHp],
                  ["MP", stats.maxMp],
                  ["ATK", stats.atk],
                  ["DEF", stats.def],
                  ["SPD", stats.spd],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="summary-block">
              <h4>Arts</h4>
              {character.skills.length === 0 ? (
                <p className="hint">None equipped.</p>
              ) : (
                <ul>
                  {character.skills.map((id) => (
                    <li key={id}>{riftRegistry.getSkill(id)?.name ?? id}</li>
                  ))}
                </ul>
              )}
            </div>
            <p className="summary-count">{character.tactics.filter((t) => t.enabled).length} gambits in order</p>
            {style.length > 0 && (
              <ul className="style-lines">
                {style.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            {warnings.length > 0 && (
              <ul className="warn-lines">
                {warnings.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            <div className="seal-actions">
              <button type="button" className="primary" onClick={() => void copySeal()}>
                {copied ? "Copied" : "Copy Build Seal"}
              </button>
              <button type="button" className="ghost" onClick={() => openSeal("show")}>
                Show code
              </button>
              <button type="button" className="ghost" onClick={() => openSeal("import")}>
                Import seal
              </button>
            </div>
          </section>
        </aside>
      </div>

      {sealOpen && (
        <div className="forge-overlay" onClick={() => setSealOpen(false)}>
          <div className="forge-modal" role="dialog" aria-labelledby="seal-title" onClick={(e) => e.stopPropagation()}>
            <header className="section-head">
              <div>
                <p className="kicker">Share</p>
                <h3 id="seal-title">Build seal</h3>
              </div>
              <button type="button" className="ghost" onClick={() => setSealOpen(false)}>
                Close
              </button>
            </header>
            <p className="hint">Paste an R1 seal to fork a kit, or copy this one into the Arena.</p>
            <textarea
              rows={6}
              value={importDraft}
              onChange={(e) => {
                setImportDraft(e.target.value);
                setImportError("");
              }}
            />
            {importError && <p className="error">{importError}</p>}
            <div className="seal-actions">
              <button type="button" className="primary" onClick={() => void copySeal()}>
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" onClick={applyImport}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TributeBoard({ score }: { score: BudgetBreakdown }) {
  const tone = score.over ? "over" : score.total >= score.cap * 0.85 ? "tight" : "ok";
  const pct = Math.min(100, (score.total / score.cap) * 100);
  const cats = [
    ["Arms", score.categories.arms],
    ["Arts", score.categories.arts],
    ["Stat tuning", score.categories.stats],
    ["Flasks", score.categories.consumables],
  ] as const;

  return (
    <section className={`panel tribute-board ${tone}`}>
      <header className="section-head">
        <div>
          <p className="kicker">Budget</p>
          <h3>Tribute</h3>
        </div>
        <p className="tribute-readout">
          <strong>
            {score.total} / {score.cap}
          </strong>
          <span>{score.over ? `${-score.remaining} over` : `${score.remaining} left`}</span>
        </p>
      </header>
      <div className="budget-bar" role="meter" aria-valuenow={score.total} aria-valuemax={score.cap}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <ul className="tribute-cats">
        {cats.map(([label, value]) => (
          <li key={label} className={value === 0 ? "zero" : ""}>
            <span>{label}</span>
            <strong>{value}</strong>
          </li>
        ))}
      </ul>
      {score.over && <p className="budget-warn">Over tribute. Cut weight before this kit can enter the Arena.</p>}
    </section>
  );
}

function GearRack({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Item[];
  value: string;
  onChange: (id: string | undefined) => void;
}) {
  return (
    <div className="gear-rack">
      <h4>{title}</h4>
      <div className="gear-cards">
        <button type="button" className={`gear-card none ${value ? "" : "on"}`} onClick={() => onChange(undefined)}>
          <strong>None</strong>
          <em>0</em>
        </button>
        {options.map((item) => {
          const Ico = itemIcon(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className={`gear-card ${value === item.id ? "on" : ""}`}
              onClick={() => onChange(item.id)}
            >
              <Ico />
              <strong>{item.name}</strong>
              <p>{item.description}</p>
              <em>{itemCost(item.id)}</em>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ArtTile({
  id,
  name,
  purpose,
  cost,
  state,
  disabled,
  onToggle,
}: {
  id: string;
  name: string;
  purpose: string;
  cost: number;
  state: "equipped" | "available" | "locked";
  disabled?: boolean;
  onToggle: () => void;
}) {
  const Ico = skillIcon(id);
  return (
    <button type="button" className={`art-tile ${state}`} disabled={disabled} onClick={onToggle}>
      <Ico />
      <span className="art-copy">
        <strong>{name}</strong>
        <em>{purpose}</em>
      </span>
      <span className="art-cost">{cost}</span>
    </button>
  );
}
