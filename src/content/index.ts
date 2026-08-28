import { createRegistry } from "../engine/registry";
import { ITEMS, SKILL_LIST_EXCLUDE } from "./items";
import { SKILLS } from "./skills";
import { STATUSES } from "./statuses";

export { ITEMS, WEAPONS, ARMORS, ACCESSORIES, CONSUMABLES } from "./items";
export { SKILLS } from "./skills";
export { STATUSES } from "./statuses";
export { MONSTERS } from "./monsters";

export const riftRegistry = createRegistry({
  skills: SKILLS,
  items: ITEMS,
  statuses: STATUSES,
});

export const SKILL_LIST = SKILLS.filter((s) => !SKILL_LIST_EXCLUDE.has(s.id));
