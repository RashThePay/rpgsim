export type TeamId = string;
export type Slot = "weapon" | "armor" | "accessory";
export type DamageType = "physical" | "magical";
export type SkillTarget = "self" | "ally" | "enemy" | "allAllies" | "allEnemies";
export type StatusId = string;
export type StatKey = "atk" | "def" | "mag" | "res" | "spd";

export type SubjectPool = "self" | "ally" | "enemy";
export type Prefer =
  | "lowestHp"
  | "highestHp"
  | "random"
  | "fastest"
  | "slowest"
  | "taunting";

export interface Stats {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  spd: number;
  crt: number;
}

export type SkillEffect =
  | {
      type: "damage";
      damageType: DamageType;
      power: number;
      executeBonus?: number;
      executeBelowPct?: number;
    }
  | { type: "heal"; power: number }
  | { type: "restoreMp"; amount: number }
  | {
      type: "applyStatus";
      status: StatusId;
      duration: number;
      potency: number;
      chance: number;
    }
  | { type: "cleanse" }
  | { type: "shield"; amount: number; statusId?: StatusId };

export interface Skill {
  id: string;
  name: string;
  description: string;
  mpCost: number;
  cooldown: number;
  target: SkillTarget;
  effects: SkillEffect[];
}

export interface Item {
  id: string;
  name: string;
  slot: Slot | "consumable";
  description: string;
  bonuses?: Partial<Stats>;
  charges?: number;
  skillId?: string;
  onHit?: SkillEffect[];
}

export type StatusTick = { type: "damage" | "heal"; every: number };

export type StatusModifier =
  | { type: "statMul"; stat: StatKey; mode: "addPct" | "subPct" }
  | { type: "atbMul"; factor: number }
  | { type: "preventAction" }
  | { type: "taunt" }
  | { type: "holdShield" };

export interface StatusDef {
  id: StatusId;
  name: string;
  short: string;
  harmful: boolean;
  tick?: StatusTick;
  modifiers?: StatusModifier[];
}

export type TacticPredicate =
  | { kind: "always" }
  | { kind: "hpBelow"; pct: number }
  | { kind: "hpAbove"; pct: number }
  | { kind: "mpBelow"; pct: number }
  | { kind: "mpAbove"; pct: number }
  | { kind: "hasStatus"; status: StatusId }
  | { kind: "missingStatus"; status: StatusId }
  | { kind: "alliesAliveGte"; count: number }
  | { kind: "enemiesAliveGte"; count: number };

export interface TacticCondition {
  who: SubjectPool;
  predicate: TacticPredicate;
}

export type TacticAction =
  | { kind: "attack" }
  | { kind: "skill"; skillId: string }
  | { kind: "item"; itemId: string };

export interface Tactic {
  id: string;
  enabled: boolean;
  condition: TacticCondition;
  prefer: Prefer;
  action: TacticAction;
}

export interface Loadout {
  weapon?: string;
  armor?: string;
  accessory?: string;
  consumables: { itemId: string; charges: number }[];
}

export interface CharacterLoadout {
  id: string;
  name: string;
  archetype: string;
  baseStats: Stats;
  loadout: Loadout;
  skills: string[];
  tactics: Tactic[];
  openingStatuses?: StatusInstance[];
  openingHp?: number;
  openingMp?: number;
}

export interface StatusInstance {
  id: StatusId;
  remaining: number;
  potency: number;
  sourceId: string;
}

export interface Combatant {
  id: string;
  team: TeamId;
  name: string;
  archetype: string;
  stats: Stats;
  hp: number;
  mp: number;
  atb: number;
  shield: number;
  cooldowns: Record<string, number>;
  statuses: StatusInstance[];
  skills: string[];
  tactics: Tactic[];
  loadout: Loadout;
  alive: boolean;
  lastAction: string;
}

export interface CombatEvent {
  tick: number;
  kind:
    | "action"
    | "damage"
    | "heal"
    | "mp"
    | "status"
    | "cleanse"
    | "shield"
    | "tick"
    | "death"
    | "end";
  actorId?: string;
  targetId?: string;
  skillName?: string;
  amount?: number;
  statusId?: StatusId;
  text: string;
}

export interface PublicCombatant {
  id: string;
  team: TeamId;
  name: string;
  archetype: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atb: number;
  shield: number;
  statuses: { id: StatusId; remaining: number; potency: number }[];
  alive: boolean;
  lastAction: string;
  cooldowns: Record<string, number>;
}

export interface TickFrame {
  tick: number;
  combatants: PublicCombatant[];
  events: CombatEvent[];
}

export interface BattleSide {
  id: TeamId;
  name: string;
  combatants: CharacterLoadout[];
}

export interface BattleConfig {
  sides: BattleSide[];
  seed: number;
  maxTicks?: number;
}

export interface BattleResult {
  winner: TeamId | "draw";
  winnerName?: string;
  sides: { id: TeamId; name: string }[];
  ticks: number;
  frames: TickFrame[];
  events: CombatEvent[];
}
