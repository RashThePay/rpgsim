# rpgsim

A small, self-contained **turn-based RPG battle simulator**.

Assemble two parties from a roster of character classes (Knight, Mage, Rogue,
Cleric, Goblin, Ogre, Dragon), optionally pick a seed, and watch a deterministic
fight play out turn by turn with a full combat log.

- **`server/`** — TypeScript [Express](https://expressjs.com/) API that exposes
  the simulation engine. The engine (`server/src/engine`) is deterministic:
  the same parties + seed always produce the same battle.
- **`web/`** — [React](https://react.dev/) + [Vite](https://vite.dev/) frontend
  for building parties and viewing results, with HP bars and a scrollable log.

## Requirements

- Node.js `>= 20` (the repo is developed on Node 22)
- npm `>= 10`

## Getting started

```bash
npm install          # installs all workspaces
npm run dev          # runs the API (:4000) and the web app (:5173) together
```

Then open http://localhost:5173. The Vite dev server proxies `/api/*` requests
to the API on port 4000.

## Useful scripts

Run from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Run the API and web dev servers concurrently |
| `npm run dev:server` | Run only the API (`http://localhost:4000`) |
| `npm run dev:web` | Run only the web app (`http://localhost:5173`) |
| `npm test` | Run the simulation engine unit tests (Vitest) |
| `npm run typecheck` | Type-check both workspaces |
| `npm run build` | Build the server and the production web bundle |

## API

- `GET /api/health` — service health check.
- `GET /api/classes` — the roster of available character classes.
- `POST /api/simulate` — run a battle.

Example:

```bash
curl -s http://localhost:4000/api/simulate \
  -H 'Content-Type: application/json' \
  -d '{
        "heroes": [{"classId": "knight"}, {"classId": "cleric"}],
        "enemies": [{"classId": "ogre"}, {"classId": "goblin"}],
        "seed": "demo-1"
      }'
```

The response contains the winner, number of rounds, the final state of every
combatant, and a turn-by-turn `log`.

## Cloud Agent environment

`.cursor/environment.json` configures the Cursor Cloud Agent environment: it
installs dependencies with `npm install` and launches the API and web dev
servers as named terminals on ports 4000 and 5173.
