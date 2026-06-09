import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, ArrowRight, BarChart3, ChevronDown, LineChart, Loader2, ShieldCheck, TrendingUp } from "lucide-react";
import anmiLogo from "./home/assets/anmi_logo_header.webp";
import { cn } from "./home/utils/cn";

type StrategySummary = {
  id: string;
  name: string;
  description?: string;
  status?: string;
  apy?: number | null;
  maxDrawdown?: number | null;
  currentDrawdown?: number | null;
  unitPrice?: number | null;
  navUsd?: number | null;
  updatedAt?: string | null;
};

type StrategyNavPoint = {
  timestamp: string;
  navUsd: number | null;
  unitPrice: number | null;
};

type BenchmarkId = "btc" | "sp500" | "gold" | "crude" | "eth" | "nasdaq";
type NavMode = "real" | "indexed";

type ChartPoint = {
  date: string;
  strategy?: number;
  benchmark?: number;
};

type Metric = {
  label: string;
  value: string;
  hint: string;
};

const benchmarks: Array<{ id: BenchmarkId; label: string; drift: number; wave: number }> = [
  { id: "btc", label: "BTC", drift: 0.0028, wave: 0.028 },
  { id: "sp500", label: "S&P 500", drift: 0.0011, wave: 0.011 },
  { id: "gold", label: "Gold", drift: 0.0007, wave: 0.008 },
  { id: "crude", label: "Crude Oil", drift: 0.0004, wave: 0.017 },
  { id: "eth", label: "ETH", drift: 0.0031, wave: 0.032 },
  { id: "nasdaq", label: "Nasdaq 100", drift: 0.0014, wave: 0.014 },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  const candidates = [value.items, value.data, value.results, value.strategies, value.strategyGroups, value.groups];
  const match = candidates.find(Array.isArray);
  return Array.isArray(match) ? match : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = asNumber(value);
    if (parsed !== undefined) return parsed;
  }
  return null;
}

function parseJsonText(value: unknown): string | undefined {
  const raw = asString(value);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string") return parsed.trim() || undefined;
    if (isRecord(parsed)) {
      return asString(parsed.en) ?? asString(parsed.default) ?? asString(Object.values(parsed).find((item) => typeof item === "string"));
    }
  } catch {
    return raw;
  }
  return undefined;
}

function normalizeStrategies(payload: unknown): StrategySummary[] {
  return asArray(payload)
    .map((item): StrategySummary | undefined => {
      if (!isRecord(item)) return undefined;
      const id = asString(item.group_id) ?? asString(item.groupId) ?? asString(item.id);
      if (!id) return undefined;
      const strategy: StrategySummary = {
        id,
        name: parseJsonText(item.group_name_json) ?? asString(item.displayName) ?? asString(item.name) ?? id,
      };
      const description = parseJsonText(item.group_description_json) ?? asString(item.description);
      const status = asString(item.status);
      if (description) strategy.description = description;
      if (status) strategy.status = status;
      strategy.apy = firstNumber(item.cagr, item.apy, item.total_return);
      strategy.maxDrawdown = firstNumber(item.max_drawdown, item.maxDrawdown);
      strategy.currentDrawdown = firstNumber(item.current_drawdown, item.currentDrawdown);
      strategy.unitPrice = firstNumber(item.unit_price, item.unitPrice);
      strategy.navUsd = firstNumber(item.nav_usd, item.navUsd);
      strategy.updatedAt = asString(item.updated_at) ?? asString(item.updatedAt) ?? asString(item.snapshot_at) ?? null;
      return strategy;
    })
    .filter((item): item is StrategySummary => Boolean(item));
}

function normalizeNavPoints(payload: unknown): StrategyNavPoint[] {
  const rawPoints = isRecord(payload) && Array.isArray(payload.points) ? payload.points : asArray(payload);
  return rawPoints
    .map((item): StrategyNavPoint | undefined => {
      if (!isRecord(item)) return undefined;
      const timestamp = asString(item.timestamp) ?? asString(item.created_at) ?? asString(item.snapshot_at) ?? asString(item.time);
      const navUsd = firstNumber(item.nav_usd, item.navUsd, item.value_usd, item.value);
      const unitPrice = firstNumber(item.unit_price, item.unitPrice);
      if (!timestamp || (navUsd === null && unitPrice === null)) return undefined;
      return { timestamp, navUsd, unitPrice };
    })
    .filter((item): item is StrategyNavPoint => Boolean(item))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

function getRealNavValue(point: StrategyNavPoint): number {
  return point.navUsd ?? point.unitPrice ?? 0;
}

function getIndexedBaseValue(point: StrategyNavPoint): number {
  return point.unitPrice ?? point.navUsd ?? 0;
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toReturns(values: number[]): number[] {
  const returns: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (previous > 0 && current > 0) returns.push(current / previous - 1);
  }
  return returns;
}

function indexValues(values: number[], start = 100): number[] {
  const first = values.find((value) => value > 0);
  if (!first) return values.map(() => start);
  return values.map((value) => (value / first) * start);
}

function maxDrawdown(values: number[]): number {
  let peak = values[0] ?? 0;
  let drawdown = 0;
  values.forEach((value) => {
    peak = Math.max(peak, value);
    if (peak > 0) drawdown = Math.min(drawdown, value / peak - 1);
  });
  return drawdown;
}

function pearson(left: number[], right: number[]): number {
  const count = Math.min(left.length, right.length);
  if (count < 2) return 0;
  const leftValues = left.slice(0, count);
  const rightValues = right.slice(0, count);
  const leftMean = leftValues.reduce((sum, value) => sum + value, 0) / count;
  const rightMean = rightValues.reduce((sum, value) => sum + value, 0) / count;
  let covariance = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < count; index += 1) {
    const leftDelta = leftValues[index] - leftMean;
    const rightDelta = rightValues[index] - rightMean;
    covariance += leftDelta * rightDelta;
    leftVariance += leftDelta * leftDelta;
    rightVariance += rightDelta * rightDelta;
  }
  const denominator = Math.sqrt(leftVariance * rightVariance);
  return denominator === 0 ? 0 : covariance / denominator;
}

function optimalF(returns: number[]): number {
  if (returns.length === 0) return 0;
  let bestFraction = 0;
  let bestGrowth = Number.NEGATIVE_INFINITY;
  for (let step = 0; step <= 100; step += 1) {
    const fraction = step / 100;
    const growth = returns.reduce((sum, value) => {
      const period = 1 + fraction * value;
      return period > 0 ? sum + Math.log(period) : Number.NEGATIVE_INFINITY;
    }, 0);
    if (growth > bestGrowth) {
      bestGrowth = growth;
      bestFraction = fraction;
    }
  }
  return bestFraction;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatNullablePercent(value: number | null | undefined): string {
  return value === null || value === undefined ? "N/A" : formatPercent(value);
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
}

function generateBenchmarkValues(length: number, benchmarkId: BenchmarkId): number[] {
  const config = benchmarks.find((item) => item.id === benchmarkId) ?? benchmarks[0];
  return Array.from({ length }, (_, index) => {
    const cycle = Math.sin(index * 0.86 + config.wave * 20) * config.wave;
    const secondCycle = Math.cos(index * 0.31) * config.wave * 0.42;
    return 100 * (1 + config.drift * index + cycle + secondCycle);
  });
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<unknown>;
}

async function fetchFirstJson(urls: string[]): Promise<unknown> {
  let lastError: unknown;
  for (const url of urls) {
    try {
      return await fetchJson(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

function MetricCard({ metric }: { metric: Metric }): JSX.Element {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-slate-950/20">
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{metric.label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-white">{metric.value}</div>
      <div className="mt-2 text-xs leading-5 text-slate-500">{metric.hint}</div>
    </div>
  );
}

export function StrategiesPage(): JSX.Element {
  const { strategyId } = useParams<{ strategyId: string }>();
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<StrategySummary[]>([]);
  const [navPoints, setNavPoints] = useState<StrategyNavPoint[]>([]);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);
  const [isLoadingNav, setIsLoadingNav] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navError, setNavError] = useState<string | null>(null);
  const [navMode, setNavMode] = useState<NavMode>("indexed");
  const [benchmarkId, setBenchmarkId] = useState<BenchmarkId>("btc");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const strategyMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoadingStrategies(true);
    fetchJson("/api/v1/strategy-groups")
      .then((payload) => {
        if (!active) return;
        const normalized = normalizeStrategies(payload);
        setStrategies(normalized);
        setError(normalized.length === 0 ? "No strategies were returned by the API." : null);
      })
      .catch(() => {
        if (!active) return;
        setStrategies([]);
        setError("Unable to load strategies from ANMI API right now.");
      })
      .finally(() => {
        if (active) setIsLoadingStrategies(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedStrategy = useMemo(() => {
    if (strategies.length === 0) return undefined;
    if (!strategyId) return strategies[0];
    return strategies.find((strategy) => strategy.id === strategyId);
  }, [strategies, strategyId]);

  const firstStrategy = strategies[0];
  const isStrategyNotFound = Boolean(strategyId && !isLoadingStrategies && strategies.length > 0 && !selectedStrategy);

  useEffect(() => {
    if (!isLoadingStrategies && !strategyId && selectedStrategy) {
      navigate(`/strategies/${selectedStrategy.id}`, { replace: true });
    }
  }, [isLoadingStrategies, navigate, selectedStrategy, strategyId]);

  useEffect(() => {
    if (!isSelectorOpen) return;

    function handlePointerDown(event: MouseEvent): void {
      if (!strategyMenuRef.current) return;
      if (!strategyMenuRef.current.contains(event.target as Node)) {
        setIsSelectorOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isSelectorOpen]);

  useEffect(() => {
    if (!isSelectorOpen) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsSelectorOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSelectorOpen]);

  useEffect(() => {
    if (!selectedStrategy) {
      setNavPoints([]);
      return;
    }
    let active = true;
    setIsLoadingNav(true);
    setNavError(null);
    const baseUrl = `/api/v1/strategy-groups/${encodeURIComponent(selectedStrategy.id)}`;
    fetchFirstJson([`${baseUrl}/nav`, `${baseUrl}/snapshots`])
      .then((payload) => {
        if (!active) return;
        const normalized = normalizeNavPoints(payload);
        setNavPoints(normalized);
        setNavError(normalized.length === 0 ? "No track record points are available for this strategy yet." : null);
      })
      .catch(() => {
        if (!active) return;
        setNavPoints([]);
        setNavError("Unable to load this strategy track record from ANMI API right now.");
      })
      .finally(() => {
        if (active) setIsLoadingNav(false);
      });
    return () => {
      active = false;
    };
  }, [selectedStrategy]);

  const analytics = useMemo(() => {
    const realValues = navPoints.map(getRealNavValue).filter((value) => value > 0);
    const indexedBaseValues = navPoints.map(getIndexedBaseValue).filter((value) => value > 0);
    const values = navMode === "indexed" ? indexedBaseValues : realValues;
    const strategyReturns = toReturns(values);
    const benchmarkValues = generateBenchmarkValues(values.length, benchmarkId);
    const benchmarkReturns = toReturns(benchmarkValues);
    const displayedStrategy = navMode === "indexed" ? indexValues(values) : values;
    const chartData: ChartPoint[] = navPoints.map((point, index) => ({
      date: formatDate(point.timestamp),
      strategy: displayedStrategy[index],
      benchmark: benchmarkValues[index],
    }));
    const first = values[0] ?? 0;
    const last = values[values.length - 1] ?? first;
    const benchmarkLabel = benchmarks.find((item) => item.id === benchmarkId)?.label ?? "Benchmark";
    const marketCorrelations = benchmarks.map((item) => {
      const marketReturns = toReturns(generateBenchmarkValues(values.length, item.id));
      return `${item.label} ${pearson(strategyReturns, marketReturns).toFixed(2)}`;
    });
    const metrics: Metric[] = [
      {
        label: "Net return",
        value: first > 0 ? formatPercent(last / first - 1) : "N/A",
        hint: "Final NAV divided by initial NAV minus 1.",
      },
      {
        label: "Max drawdown",
        value: selectedStrategy?.maxDrawdown !== null && selectedStrategy?.maxDrawdown !== undefined ? formatPercent(selectedStrategy.maxDrawdown) : values.length > 0 ? formatPercent(maxDrawdown(values)) : "N/A",
        hint: "Largest fall from a previous NAV peak.",
      },
      {
        label: `Correlation to ${benchmarkLabel}`,
        value: pearson(strategyReturns, benchmarkReturns).toFixed(2),
        hint: "Pearson correlation of periodic returns.",
      },
      {
        label: "Autocorrelation",
        value: pearson(strategyReturns.slice(1), strategyReturns.slice(0, -1)).toFixed(2),
        hint: "Lag-1 autocorrelation of strategy returns.",
      },
      {
        label: "Optimal-F",
        value: formatPercent(optimalF(strategyReturns)),
        hint: "Prototype estimate based on NAV returns.",
      },
      {
        label: "Market correlation list",
        value: marketCorrelations.slice(0, 3).join(" | "),
        hint: marketCorrelations.slice(3).join(" | "),
      },
    ];
    return { chartData, metrics };
  }, [benchmarkId, navMode, navPoints, selectedStrategy?.maxDrawdown]);

  function handleStrategyChange(nextId: string): void {
    setIsSelectorOpen(false);
    navigate(`/strategies/${nextId}`);
  }

  return (
    <main className="min-h-screen bg-[#050b14] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_90%_8%,rgba(14,165,233,0.12),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0),rgba(2,6,23,0.88))]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:56px_56px]" />

      <header className="relative z-50 border-b border-white/10 bg-[#07111f]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 py-5 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="group inline-flex items-center gap-4">
              <ArrowLeft className="h-4 w-4 text-slate-400 transition group-hover:text-white" />
              <div className="flex flex-col items-start leading-none">
                <img
                  src={anmiLogo}
                  alt="ANMI"
                  className="h-9 w-auto object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.16)] sm:h-10 md:h-12"
                />
                <div className="mt-1 pl-3 text-[8px] font-medium uppercase tracking-[0.34em] text-slate-400 sm:text-[9px]">
                  STRATEGIES
                </div>
              </div>
            </Link>
            <div
              className="hidden items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-100 sm:flex"
              title="Real strategy data is continuously tracked by ANMI Track. This page shows an actual verified track record, not manually uploaded performance."
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Live track record by ANMI Track
            </div>
          </div>

          <div className="relative z-40 mt-8">
            <div>
              <div ref={strategyMenuRef} className="relative z-50 mt-3 inline-flex max-w-full flex-wrap items-center gap-4">
                <h1 className="max-w-[calc(100vw-6rem)] truncate text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                  {selectedStrategy?.name ?? (isLoadingStrategies ? "Loading strategies" : "Strategy profile")}
                </h1>
                {strategies.length > 0 ? (
                  <button
                    type="button"
                    aria-expanded={isSelectorOpen}
                    aria-label="Select strategy"
                    onClick={() => setIsSelectorOpen((isOpen) => !isOpen)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/10"
                  >
                    <ChevronDown className={cn("h-4 w-4 transition", isSelectorOpen ? "rotate-180" : null)} />
                  </button>
                ) : null}
                {isSelectorOpen ? (
                  <StrategySelectorGrid strategies={strategies} selectedId={selectedStrategy?.id} onSelect={handleStrategyChange} />
                ) : null}
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
                Investor-ready strategy profile with verified NAV history, benchmark comparison, risk metrics and market correlation.
              </p>
              {selectedStrategy?.description ? (
                <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-500">{selectedStrategy.description}</p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-0 mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {isLoadingStrategies || isLoadingNav ? (
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <StatusPill active label={isLoadingStrategies ? "Loading strategies" : "Loading track record"} />
          </div>
        ) : null}

        {error ? <StateCard title="API error" message={error} /> : null}
        {!error && !isLoadingStrategies && strategies.length === 0 ? (
          <StateCard title="No strategies available" message="ANMI API returned no available strategies." />
        ) : null}
        {isStrategyNotFound ? (
          <StateCard
            title="Strategy not found"
            message="The requested strategy is not available in the current ANMI strategy list."
            action={firstStrategy ? { label: `Open ${firstStrategy.name}`, onClick: () => navigate(`/strategies/${firstStrategy.id}`, { replace: true }) } : undefined}
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 rounded-2xl border border-white/10 bg-[#081421]/90 p-4 shadow-2xl shadow-slate-950/30 sm:p-6">
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  <LineChart className="h-4 w-4 text-cyan-200" />
                  Strategy NAV chart
                </div>
                <p className="mt-2 text-sm text-slate-500">Benchmark comparison is displayed as an indexed reference series.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SegmentedControl
                  value={navMode}
                  options={[
                    { value: "real", label: "Real NAV" },
                    { value: "indexed", label: "Indexed NAV" },
                  ]}
                  onChange={(value) => setNavMode(value as NavMode)}
                />
                <select
                  value={benchmarkId}
                  onChange={(event) => setBenchmarkId(event.target.value as BenchmarkId)}
                  className="h-10 rounded-lg border border-white/10 bg-[#07111f] px-3 text-xs font-medium text-slate-200 outline-none transition focus:border-cyan-200/50"
                >
                  {benchmarks.map((benchmark) => (
                    <option key={benchmark.id} value={benchmark.id}>
                      {benchmark.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="h-[420px] min-h-[320px]">
              {analytics.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analytics.chartData} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={66} />
                    <Tooltip
                      contentStyle={{ background: "#07111f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#e2e8f0" }}
                      labelStyle={{ color: "#bae6fd" }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="strategy" name={navMode === "indexed" ? "Strategy indexed" : "Strategy NAV"} stroke="#67e8f9" fill="rgba(103,232,249,0.14)" strokeWidth={2.4} />
                    <Line type="monotone" dataKey="benchmark" name="Benchmark indexed" stroke="#a7f3d0" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center rounded-xl border border-white/10 bg-white/[0.025] text-sm text-slate-500">
                  {isLoadingNav ? "Loading selected strategy track record..." : navError ?? "No NAV points available."}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100">
                <BarChart3 className="h-4 w-4" />
                Risk metrics
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Metrics are calculated from normalized NAV points returned by the ANMI API for the selected strategy.
              </p>
            </div>
            <MetricCard metric={analytics.metrics[0] ?? { label: "Net return", value: "N/A", hint: "Waiting for NAV data." }} />
            <MetricCard metric={analytics.metrics[1] ?? { label: "Max drawdown", value: "N/A", hint: "Waiting for NAV data." }} />
          </aside>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {analytics.metrics.slice(2).map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>

        <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.025] p-4 text-xs leading-5 text-slate-500">
          Optimal-F note: Prototype estimate based on NAV returns. Production calculation should use trade-level returns or risk-normalized R-multiples.
        </p>
      </section>
    </main>
  );
}

function StatusPill({ active, label }: { active: boolean; label: string }): JSX.Element {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs text-slate-300">
      {active ? <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-200" /> : <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />}
      {label}
    </div>
  );
}

function StateCard({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}): JSX.Element {
  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="text-sm font-semibold text-white">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex h-10 items-center rounded-full bg-cyan-200 px-4 text-xs font-semibold text-slate-950 transition hover:bg-white"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

function StrategySelectorGrid({
  strategies,
  selectedId,
  onSelect,
}: {
  strategies: StrategySummary[];
  selectedId?: string;
  onSelect: (strategyId: string) => void;
}): JSX.Element {
  return (
    <div className="pointer-events-auto absolute left-0 top-full z-[100] mt-4 w-[min(760px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/70">
      <div className="grid grid-cols-[1.4fr_0.55fr_0.55fr_0.75fr] gap-4 bg-slate-900 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        <div>Strategy</div>
        <div>APY</div>
        <div>DD</div>
        <div>UnitPrice</div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {strategies.map((strategy) => {
          const selected = strategy.id === selectedId;

          return (
            <button
              key={strategy.id}
              type="button"
              onClick={() => onSelect(strategy.id)}
              className={cn(
                "group grid w-full cursor-pointer grid-cols-[1.4fr_0.55fr_0.55fr_0.75fr] items-center gap-4 border-t border-white/10 px-5 py-4 text-left text-sm transition-all duration-200",
                "hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:shadow-lg hover:shadow-cyan-950/25",
                selected ? "border-l-2 border-l-cyan-300 bg-slate-950 text-slate-300" : "bg-slate-950 text-slate-300",
              )}
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="truncate font-semibold text-white transition group-hover:text-cyan-50">{strategy.name}</div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-cyan-100 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500 transition group-hover:text-slate-300">{strategy.status || "Tracked"}</div>
              </div>
              <div className="font-medium tabular-nums text-cyan-200 transition group-hover:text-cyan-100">{formatNullablePercent(strategy.apy)}</div>
              <div className="font-medium tabular-nums text-amber-200 transition group-hover:text-amber-100">{formatNullablePercent(strategy.maxDrawdown)}</div>
              <div className="font-medium tabular-nums text-slate-100 transition group-hover:text-white">{formatNumber(strategy.unitPrice)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <div className="inline-flex h-10 rounded-lg border border-white/10 bg-white/[0.035] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-3 text-xs font-medium transition",
            option.value === value ? "bg-cyan-200 text-slate-950" : "text-slate-400 hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
