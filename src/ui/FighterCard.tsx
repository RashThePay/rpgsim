import type { CharacterLoadout } from "../engine/types";
import { computeStats } from "../engine/stats";
import { riftRegistry } from "../content";
import { formatTactic } from "./format";

interface Props {
  character: CharacterLoadout;
  team: string;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export function FighterCard({ character, team, selected, onSelect, onRemove }: Props) {
  const stats = computeStats(character, riftRegistry);
  const weapon = character.loadout.weapon ? riftRegistry.getItem(character.loadout.weapon) : undefined;

  return (
    <article className={`card ${team} ${selected ? "selected" : ""}`}>
      <button type="button" className="card-hit" onClick={onSelect}>
        <div className={`emblem ${character.archetype.toLowerCase()}`} aria-hidden>
          {character.archetype.slice(0, 1)}
        </div>
        <div className="card-body">
          <header>
            <h3>{character.name}</h3>
            <p>{character.archetype}</p>
          </header>
          <dl className="mini-stats">
            <div>
              <dt>HP</dt>
              <dd>{stats.maxHp}</dd>
            </div>
            <div>
              <dt>ATK</dt>
              <dd>{stats.atk}</dd>
            </div>
            <div>
              <dt>MAG</dt>
              <dd>{stats.mag}</dd>
            </div>
            <div>
              <dt>SPD</dt>
              <dd>{stats.spd}</dd>
            </div>
          </dl>
          <p className="gear">{weapon?.name ?? "Unarmed"} · {character.skills.length} skills</p>
          <ol className="tactic-preview">
            {character.tactics.filter((t) => t.enabled).slice(0, 3).map((t) => (
              <li key={t.id}>{formatTactic(t, character)}</li>
            ))}
          </ol>
        </div>
      </button>
      <button type="button" className="remove" onClick={onRemove} aria-label={`Remove ${character.name}`}>
        ×
      </button>
    </article>
  );
}
