import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/home/HomePage";
import { StrategyReportPage } from "./pages/strategy-report/StrategyReportPage";

export default function App(): JSX.Element {
    return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/strategies/:strategySlug" element={<StrategyReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}
