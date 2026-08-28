import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { NavIcons } from "./icons";

export function Shell({ children }: { children: ReactNode }) {
  const Home = NavIcons.home;
  const Forge = NavIcons.forge;
  const Arena = NavIcons.arena;

  return (
    <div className="shell">
      <header className="belt">
        <NavLink to="/" className="brand">
          <Home />
          <span>Rift Table</span>
        </NavLink>
        <nav>
          <NavLink to="/build">
            <Forge />
            Forge
          </NavLink>
          <NavLink to="/battle">
            <Arena />
            Arena
          </NavLink>
        </nav>
      </header>
      <main className="stage">{children}</main>
    </div>
  );
}
