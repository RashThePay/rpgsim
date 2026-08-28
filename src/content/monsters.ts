export interface MonsterDef {
  id: string;
  name: string;
  archetype: string;
}

export const MONSTERS: MonsterDef[] = [
  { id: "ash-wretch", name: "Ash Wretch", archetype: "Rogue" },
  { id: "cinder-brute", name: "Cinder Brute", archetype: "Berserker" },
];
