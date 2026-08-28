import type { StatusDef } from "../engine/types";

export const STATUSES: StatusDef[] = [
  {
    id: "poison",
    name: "Poison",
    short: "PSN",
    harmful: true,
    tick: { type: "damage", every: 8 },
  },
  {
    id: "burn",
    name: "Burn",
    short: "BRN",
    harmful: true,
    tick: { type: "damage", every: 6 },
  },
  {
    id: "stun",
    name: "Stun",
    short: "STN",
    harmful: true,
    modifiers: [{ type: "preventAction" }],
  },
  {
    id: "haste",
    name: "Haste",
    short: "HST",
    harmful: false,
    modifiers: [{ type: "atbMul", factor: 1.45 }],
  },
  {
    id: "slow",
    name: "Slow",
    short: "SLW",
    harmful: true,
    modifiers: [{ type: "atbMul", factor: 0.62 }],
  },
  {
    id: "regen",
    name: "Regen",
    short: "RGN",
    harmful: false,
    tick: { type: "heal", every: 8 },
  },
  {
    id: "atkUp",
    name: "Might",
    short: "ATK",
    harmful: false,
    modifiers: [{ type: "statMul", stat: "atk", mode: "addPct" }],
  },
  {
    id: "defDown",
    name: "Shatter",
    short: "BRK",
    harmful: true,
    modifiers: [{ type: "statMul", stat: "def", mode: "subPct" }],
  },
  {
    id: "taunt",
    name: "Taunt",
    short: "TNT",
    harmful: false,
    modifiers: [{ type: "taunt" }],
  },
  {
    id: "shielded",
    name: "Aegis",
    short: "AEG",
    harmful: false,
    modifiers: [{ type: "holdShield" }],
  },
];
