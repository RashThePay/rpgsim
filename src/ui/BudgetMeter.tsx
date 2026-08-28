import type { BudgetBreakdown } from "../game";
import { NavIcons } from "./icons";

export function BudgetMeter({ score, warn }: { score: BudgetBreakdown; warn?: boolean }) {
  const Gold = NavIcons.gold;
  const pct = Math.min(100, (score.total / score.cap) * 100);
  const tone = score.over ? "over" : score.total >= score.cap * 0.85 ? "tight" : "ok";

  return (
    <div className={`budget ${tone}`}>
      <div className="budget-head">
        <Gold className="budget-ico" aria-hidden />
        <strong>Tribute</strong>
        <span>
          {score.total} / {score.cap}
        </span>
      </div>
      <div className="budget-bar" role="meter" aria-valuenow={score.total} aria-valuemax={score.cap}>
        <span style={{ width: `${pct}%` }} />
      </div>
      {score.over && (
        <p className="budget-warn">Over tribute. This kit cannot enter the arena until you cut weight.</p>
      )}
      {!score.over && warn && <p className="budget-hint">{score.remaining} tribute left.</p>}
    </div>
  );
}
