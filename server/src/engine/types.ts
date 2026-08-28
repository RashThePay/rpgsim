export type Team = "heroes" | "enemies";

/** A character class preset used to build combatants. */
export interface ClassPreset {
  id: string;
  name: string;
  description: string;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  critChance: number;
  /** Amount healed to the most-wounded ally when the class acts as a healer. */
  healPower?: number;
}

/** A concrete fighter instance participating in a simulation. */
export interface Combatant {
  id: string;
  name: string;
  classId: string;
  team: Team;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  critChance: number;
  healPower: number;
}

export type LogKind = "attack" | "heal" | "defeat" | "round" | "start" | "end";

export interface LogEntry {
  round: number;
  kind: LogKind;
  message: string;
  actorId?: string;
  targetId?: string;
  amount?: number;
  crit?: boolean;
  targetHp?: number;
  targetMaxHp?: number;
}

export interface CombatantResult {
  id: string;
  name: string;
  team: Team;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface SimulationResult {
  seed: number;
  winner: Team | "draw";
  rounds: number;
  log: LogEntry[];
  combatants: CombatantResult[];
}

export interface CombatantInput {
  name?: string;
  classId: string;
}

export interface SimulationRequest {
  heroes: CombatantInput[];
  enemies: CombatantInput[];
  seed?: number | string;
  maxRounds?: number;
}
