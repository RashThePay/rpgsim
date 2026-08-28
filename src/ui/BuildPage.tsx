import { useEffect, useMemo, useState } from "react";
import { ACCESSORIES, ARMORS, CONSUMABLES, SKILL_LIST, WEAPONS, riftRegistry } from "../content";
import {
  ARCHETYPE_SKILLS,
  ARCHETYPE_STATS,
  ARCHETYPES,
  createCharacter,
  defaultTactics,
  encodeBuild,
  scoreLoadout,
} from "../game";
import { computeStats } from "../engine/stats";
import type { CharacterLoadout } from "../engine/types";
import { BudgetMeter } from "./BudgetMeter";
import { TacticBoard } from "./TacticBoard";
import { archetypeIcon, itemIcon, skillIcon } from "./icons";
import { skillCost, itemCost } from "../game/budget";

const STORAGE = "rift.lastBuild";

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

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(character));
  }, [character]);

  const stats = useMemo(() => computeStats(character, riftRegistry), [character]);
  const score = useMemo(() => scoreLoadout(character, riftRegistry), [character]);
  const code = useMemo(() => encodeBuild(character), [character]);
  const ArchIco = archetypeIcon(character.archetype);

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

  return (
    <div className="forge">
      <header className="page-head">
        <div>
          <p className="kicker">The Forge</p>
          <h1>Seal a fighter</h1>
        </div>
        <BudgetMeter score={score} warn />
      </header>

      <div className="forge-grid">
        <section className="panel identity">
          <div className="portrait">
            <ArchIco />
          </div>
          <label>
            Name
            <input value={character.name} maxLength={24} onChange={(e) => setCharacter({ ...character, name: e.target.value })} />
          </label>
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

        <section className="panel">
          <h3>Arms</h3>
          <GearSelect
            label="Weapon"
            value={character.loadout.weapon ?? ""}
            options={WEAPONS}
            onChange={(weapon) => setCharacter({ ...character, loadout: { ...character.loadout, weapon } })}
          />
          <GearSelect
            label="Armor"
            value={character.loadout.armor ?? ""}
            options={ARMORS}
            onChange={(armor) => setCharacter({ ...character, loadout: { ...character.loadout, armor } })}
          />
          <GearSelect
            label="Charm"
            value={character.loadout.accessory ?? ""}
            options={ACCESSORIES}
            onChange={(accessory) => setCharacter({ ...character, loadout: { ...character.loadout, accessory } })}
          />
          <div className="consumable-row">
            {CONSUMABLES.map((item) => {
              const pack = character.loadout.consumables.find((c) => c.itemId === item.id);
              const Ico = itemIcon(item.id);
              return (
                <label key={item.id} className="charge-label">
                  <Ico />
                  {item.name} ({itemCost(item.id)}ea)
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={pack?.charges ?? 0}
                    onChange={(e) => {
                      const charges = Number(e.target.value);
                      const rest = character.loadout.consumables.filter((c) => c.itemId !== item.id);
                      setCharacter({
                        ...character,
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

        <section className="panel">
          <h3>Arts</h3>
          <p className="hint">Each art costs tribute. Unequipped arts cannot fire.</p>
          <div className="skill-picks">
            {SKILL_LIST.map((skill) => {
              const on = character.skills.includes(skill.id);
              const Ico = skillIcon(skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  className={`rune ${on ? "on" : ""}`}
                  title={skill.description}
                  onClick={() =>
                    setCharacter({
                      ...character,
                      skills: on ? character.skills.filter((id) => id !== skill.id) : [...character.skills, skill.id],
                    })
                  }
                >
                  <Ico />
                  <span>{skill.name}</span>
                  <em>{skillCost(skill.id)}</em>
                </button>
              );
            })}
          </div>
        </section>

        <TacticBoard character={character} onChange={setCharacter} />
      </div>

      <footer className="seal-bar">
        <label>
          Build seal
          <textarea readOnly rows={3} value={code} />
        </label>
        <button type="button" className="primary" onClick={() => void copySeal()}>
          {copied ? "Copied" : "Copy seal"}
        </button>
      </footer>
    </div>
  );
}

function GearSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (id: string | undefined) => void;
}) {
  return (
    <label className="gear-select">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">None</option>
        {options.map((item) => {
          return (
            <option key={item.id} value={item.id}>
              {item.name} · {itemCost(item.id)}
            </option>
          );
        })}
      </select>
    </label>
  );
}
