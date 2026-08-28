import type { Item, Skill, StatusDef } from "./types";

export const DEFAULT_BASIC_ATTACK: Skill = {
  id: "attack",
  name: "Strike",
  description: "A basic attack.",
  mpCost: 0,
  cooldown: 0,
  target: "enemy",
  effects: [{ type: "damage", damageType: "physical", power: 1 }],
};

export interface ContentPack {
  skills: Skill[];
  items: Item[];
  statuses: StatusDef[];
  basicAttack?: Skill;
}

export interface ContentRegistry {
  basicAttack: Skill;
  getSkill(id: string): Skill | undefined;
  getItem(id: string): Item | undefined;
  getStatus(id: string): StatusDef | undefined;
  skills(): Skill[];
  items(): Item[];
  statuses(): StatusDef[];
}

export function createRegistry(pack: ContentPack): ContentRegistry {
  const skills = Object.fromEntries(pack.skills.map((s) => [s.id, s]));
  const items = Object.fromEntries(pack.items.map((i) => [i.id, i]));
  const statuses = Object.fromEntries(pack.statuses.map((s) => [s.id, s]));
  const basicAttack = pack.basicAttack ?? DEFAULT_BASIC_ATTACK;
  return {
    basicAttack,
    getSkill: (id) => skills[id],
    getItem: (id) => items[id],
    getStatus: (id) => statuses[id],
    skills: () => Object.values(skills),
    items: () => Object.values(items),
    statuses: () => Object.values(statuses),
  };
}
