import { Link } from "react-router-dom";
import { NavIcons } from "./icons";

export function HubPage() {
  const Forge = NavIcons.forge;
  const Arena = NavIcons.arena;

  return (
    <div className="hub">
      <p className="kicker">A table of blades and gambits</p>
      <h1>Rift Table</h1>
      <p className="lede">
        Forge a fighter under tribute, seal the kit into a share code, then drop codes into the arena — duel, team
        fight, or a free-for-all.
      </p>
      <div className="doors">
        <Link to="/build" className="door forge">
          <Forge />
          <span>The Forge</span>
          <em>Build a fighter. Copy the seal.</em>
        </Link>
        <Link to="/battle" className="door arena">
          <Arena />
          <span>The Arena</span>
          <em>Paste codes. Watch the ticks.</em>
        </Link>
      </div>
    </div>
  );
}
