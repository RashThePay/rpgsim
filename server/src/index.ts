import cors from "cors";
import express from "express";
import { CLASS_PRESETS } from "./engine/presets.js";
import { simulateBattle, SimulationError } from "./engine/simulator.js";
import type { SimulationRequest } from "./engine/types.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "rpgsim", time: new Date().toISOString() });
});

app.get("/api/classes", (_req, res) => {
  res.json({ classes: CLASS_PRESETS });
});

app.post("/api/simulate", (req, res) => {
  const body = req.body as SimulationRequest;
  try {
    const result = simulateBattle(body);
    res.json(result);
  } catch (error) {
    if (error instanceof SimulationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error("Unexpected simulation error", error);
    res.status(500).json({ error: "Internal simulation error" });
  }
});

const PORT = Number(process.env.PORT ?? 4000);

// Only listen when run directly, so tests can import the app without a live port.
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`rpgsim API listening on http://localhost:${PORT}`);
  });
}

export { app };
