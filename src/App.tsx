import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/home/HomePage";
import { StrategiesPage } from "./pages/StrategiesPage";
import { StrategyReportPage } from "./pages/strategy-report/StrategyReportPage";

export default function App(): JSX.Element {
    return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/strategies" element={<StrategiesPage />} />
        <Route path="/strategies/:strategyId" element={<StrategiesPage />} />
        <Route path="/strategy-reports/:strategySlug" element={<StrategyReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}
