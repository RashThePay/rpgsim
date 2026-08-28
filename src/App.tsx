import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Shell } from "./ui/Shell";
import { HubPage } from "./ui/HubPage";
import { BuildPage } from "./ui/BuildPage";
import { BattlePage } from "./ui/BattlePage";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<HubPage />} />
          <Route path="/build" element={<BuildPage />} />
          <Route path="/battle" element={<BattlePage />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
