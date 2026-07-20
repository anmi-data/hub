import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import { DEFAULT_LOCALE, isSupportedLocale, LocaleProvider, localizedPath } from "./i18n/locale";
import HomePage from "./pages/home/HomePage";
import { StrategiesPage } from "./pages/StrategiesPage";
import { StrategyReportPage } from "./pages/strategy-report/StrategyReportPage";

function LocaleLayout(): JSX.Element {
  const { locale: routeLocale } = useParams<{ locale: string }>();
  const normalizedLocale = routeLocale?.toLowerCase();
  if (!isSupportedLocale(normalizedLocale)) {
    return <Navigate to={localizedPath(DEFAULT_LOCALE)} replace />;
  }

  return (
    <LocaleProvider locale={normalizedLocale}>
      <Outlet />
    </LocaleProvider>
  );
}

function LegacyStrategyRedirect(): JSX.Element {
  const { strategyId } = useParams<{ strategyId: string }>();
  const suffix = strategyId ? `/strategies/${encodeURIComponent(strategyId)}` : "/strategies";
  return <Navigate to={localizedPath(DEFAULT_LOCALE, suffix)} replace />;
}

function LegacyReportRedirect(): JSX.Element {
  const { strategySlug } = useParams<{ strategySlug: string }>();
  return (
    <Navigate
      to={localizedPath(DEFAULT_LOCALE, `/strategy-reports/${encodeURIComponent(strategySlug ?? "")}`)}
      replace
    />
  );
}

export default function App(): JSX.Element {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Navigate to={localizedPath(DEFAULT_LOCALE)} replace />} />
        <Route path="/strategies" element={<LegacyStrategyRedirect />} />
        <Route path="/strategies/:strategyId" element={<LegacyStrategyRedirect />} />
        <Route path="/strategy-reports/:strategySlug" element={<LegacyReportRedirect />} />

        <Route path="/:locale" element={<LocaleLayout />}>
          <Route index element={<HomePage />} />
          <Route path="strategies" element={<StrategiesPage />} />
          <Route path="strategies/:strategyId" element={<StrategiesPage />} />
          <Route path="strategy-reports/:strategySlug" element={<StrategyReportPage />} />
        </Route>

        <Route path="*" element={<Navigate to={localizedPath(DEFAULT_LOCALE)} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
