export const ART_MAX = 6;

export type ArtRole = "offense" | "control" | "support" | "sustain" | "finisher";

export const ART_ROLE_LABELS: Record<ArtRole, string> = {
  offense: "Offense",
  control: "Control",
  support: "Support",
  sustain: "Sustain",
  finisher: "Finisher",
};

export const ART_ROLES: Record<string, ArtRole> = {
  "power-strike": "offense",
  "aimed-shot": "offense",
  fireball: "offense",
  "arcane-bolt": "offense",
  cleave: "offense",
  "poison-stab": "offense",
  bash: "control",
  taunt: "control",
  "pin-down": "control",
  blizzard: "control",
  ignite: "control",
  shatter: "control",
  haste: "support",
  bless: "support",
  cleanse: "support",
  heal: "sustain",
  "mass-heal": "sustain",
  regenerate: "sustain",
  "shield-wall": "sustain",
  backstab: "finisher",
  execute: "finisher",
  rage: "finisher",
};

export function artRole(id: string): ArtRole {
  return ART_ROLES[id] ?? "offense";
}

export function artPurpose(description: string): string {
  const cut = description.split(".")[0] ?? description;
  return cut.length > 42 ? `${cut.slice(0, 40)}…` : cut;
}

export function kitRoleSummary(skillIds: string[]): string {
  const counts: Record<ArtRole, number> = {
    offense: 0,
    control: 0,
    support: 0,
    sustain: 0,
    finisher: 0,
  };
  for (const id of skillIds) counts[artRole(id)] += 1;
  const ranked = (Object.entries(counts) as [ArtRole, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return "unarmed";
  return ranked
    .slice(0, 2)
    .map(([role]) => role)
    .join("/");
}
