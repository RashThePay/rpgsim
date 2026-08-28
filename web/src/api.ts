import type { ClassPreset, CombatantInput, SimulationResult } from "./types";

async function parseError(response: Response): Promise<never> {
  let message = `Request failed (${response.status})`;
  try {
    const data = await response.json();
    if (data?.error) {
      message = data.error;
    }
  } catch {
    // Ignore JSON parse failures and fall back to the status message.
  }
  throw new Error(message);
}

export async function fetchClasses(): Promise<ClassPreset[]> {
  const response = await fetch("/api/classes");
  if (!response.ok) {
    return parseError(response);
  }
  const data = await response.json();
  return data.classes as ClassPreset[];
}

export async function runSimulation(payload: {
  heroes: CombatantInput[];
  enemies: CombatantInput[];
  seed?: string;
}): Promise<SimulationResult> {
  const response = await fetch("/api/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    return parseError(response);
  }
  return (await response.json()) as SimulationResult;
}
