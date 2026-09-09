import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import { DEFAULT_LOCALE, isSupportedLocale, LocaleProvider, localizedPath } from "./i18n/locale";
import HomePage from "./pages/home/HomePage";

const StrategiesPage = lazy(async () => {
  const module = await import("./pages/StrategiesPage");
  return { default: module.StrategiesPage };
});
const StrategyReportPage = lazy(async () => {
  const module = await import("./pages/strategy-report/StrategyReportPage");
  return { default: module.StrategyReportPage };
});

const deferred = (page: JSX.Element): JSX.Element => (
  <Suspense fallback={<main className="min-h-screen bg-slate-950" aria-busy="true" />}>
    {page}
  </Suspense>
);

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
          <Route path="strategies" element={deferred(<StrategiesPage />)} />
          <Route path="strategies/:strategyId" element={deferred(<StrategiesPage />)} />
          <Route path="strategy-reports/:strategySlug" element={deferred(<StrategyReportPage />)} />
        </Route>

        <Route path="*" element={<Navigate to={localizedPath(DEFAULT_LOCALE)} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
