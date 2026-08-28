export type Team = "heroes" | "enemies";

export interface ClassPreset {
  id: string;
  name: string;
  description: string;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  critChance: number;
  healPower?: number;
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
