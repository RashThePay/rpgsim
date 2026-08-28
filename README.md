# rpgsim

**Rift Table** is a tick-based RPG combat simulator. You kit each fighter with gear, skills, and a gambit list; the engine then fills action gauges every tick, fires the first ready rule, and writes a replay you can scrub.

## How a fight works

1. Every tick, status effects tick (poison, burn, regen, stun, haste, slow) and cooldowns decrement.
2. Living fighters fill an ATB gauge from SPD (haste/slow modify the rate; stun freezes it).
3. When a gauge hits 100, tactics are evaluated **top to bottom**. The first enabled rule whose condition matches and whose action is payable (MP, cooldown, item charges) executes.
4. If nothing matches, the fighter Strikes the lowest-HP enemy.
5. The whole battle is simulated up front with a seed, then played back so you can pause, step, and scrub.

Tactics are Final Fantasy XII-style gambits: `If [Self/Ally/Foe] [condition] → [skill/item/strike]`, with a preference for lowest HP, fastest, taunters, and so on.

## Develop

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:5173`. Use **Duel preset** or **3v3 preset**, edit a fighter's sheet, then **Simulate battle**.

## Deploy on Vercel

This is a Vite SPA. `vercel.json` pins the Vite preset, builds into `dist`, and rewrites unknown paths to `index.html` so the production URL does not 404.

Import the GitHub repo in Vercel (root directory `.`, production branch `main`) or run:

```bash
npx vercel --prod
```
