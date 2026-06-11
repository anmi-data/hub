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
import { AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, LineChart, Loader2, ShieldCheck, TrendingUp } from "lucide-react";
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

type StrategyGroupHeader = {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  unitPrice?: number | null;
  navUsd?: number | null;
  totalReturn?: number | null;
  apy?: number | null;
  cagr?: number | null;
  volatility?: number | null;
  volatilityAnnualized?: number | null;
  sharpe?: number | null;
  sharpeRatio?: number | null;
  sortino?: number | null;
  sortinoRatio?: number | null;
  maxDrawdown?: number | null;
  currentDrawdown?: number | null;
  dataQuality?: string | number | boolean | null;
  updatedAt?: string | null;
  warnings?: string[];
  isLiveTrackRecord?: boolean;
};

type ExplorerTreeNode = {
  id: string;
  type: string;
  label: string;
  count?: number | null;
  status?: string | null;
  updatedAt?: string | null;
  children?: ExplorerTreeNode[];
};

type ExplorerDetails = {
  title: string;
  type?: string | null;
  status?: string | null;
  summary: Array<{ label: string; value: string }>;
};

type HistoryRecord = Record<string, string | number | boolean | null>;

type ChartMode = "nav_usd" | "unit_price";
type ApiStatus = "ok" | "nok";

type BenchmarkOption = {
  symbol: string;
  label: string;
  assetClass?: string | null;
  source?: string | null;
  status?: string | null;
};

type ApiChartSeriesPoint = {
  timestamp: string;
  rawValue?: number | null;
  normalizedValue?: number | null;
};

type ApiChartSeries = {
  id?: string;
  key?: string;
  symbol?: string;
  label?: string;
  kind?: string;
  type?: "primary" | "benchmark" | string;
  metric?: string;
  points?: ApiChartSeriesPoint[];
  warnings?: string[];
};

type NormalizedChartPoint = {
  timestamp: string;
  value: number | null;
  rawValue: number | null;
  normalizedValue: number | null;
};

type NormalizedChartSeries = {
  id: string;
  chartKey: string;
  label: string;
  type: "primary" | "benchmark";
  symbol?: string;
  points: NormalizedChartPoint[];
  warnings: string[];
};

type ChartRow = {
  timestamp: string;
  date: string;
} & Record<string, string | number>;

type Metric = {
  label: string;
  value: string;
  hint: string;
};

const DEFAULT_CHART_MODE: ChartMode = "unit_price";
const DEFAULT_BENCHMARK = "BTC";
const CHART_MODE_STORAGE_KEY = "anmi-hub:chart-mode:v1";
const SELECTED_BENCHMARK_STORAGE_KEY = "anmi-hub:selected-benchmark:v1";
const benchmarkLabelFallbacks: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SPX: "S&P 500",
  XAU: "Gold",
  XAG: "Silver",
  CL: "WTI Crude Oil",
  NDX: "Nasdaq 100",
};
const chartColors = ["#a78bfa", "#a7f3d0", "#fbbf24", "#f472b6", "#60a5fa", "#fb7185", "#c4b5fd"];

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

function getChartPointValue(
  chartMode: ChartMode,
  seriesType: "primary" | "benchmark",
  rawValue: number | null,
  normalizedValue: number | null,
  hasBenchmark: boolean,
): number | null {
  if (chartMode === "nav_usd") {
    return rawValue ?? normalizedValue ?? null;
  }

  if (seriesType === "benchmark" || hasBenchmark) {
    return normalizedValue ?? rawValue ?? null;
  }

  return rawValue ?? normalizedValue ?? null;
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

function normalizeStrategyRecord(item: unknown): StrategySummary | undefined {
  if (!isRecord(item)) return undefined;
  const metrics = isRecord(item.metrics) ? item.metrics : {};
  const id = asString(item.group_id) ?? asString(item.groupId) ?? asString(item.id);
  if (!id) return undefined;
  const strategy: StrategySummary = {
    id,
    name: parseJsonText(item.group_name_json) ?? asString(item.displayName) ?? asString(item.name) ?? asString(item.label) ?? id,
  };
  const description = parseJsonText(item.group_description_json) ?? asString(item.description);
  const status = asString(item.status);
  if (description) strategy.description = description;
  if (status) strategy.status = status;
  strategy.apy = firstNumber(metrics.apyPct, metrics.apy, metrics.cagrPct, metrics.cagr, item.apyPct, item.cagrPct, item.cagr, item.apy, item.total_return, item.totalReturn);
  strategy.maxDrawdown = firstNumber(metrics.maxDrawdownPct, metrics.maxDrawdown, metrics.max_drawdown, item.maxDrawdownPct, item.max_drawdown, item.maxDrawdown);
  strategy.currentDrawdown = firstNumber(metrics.currentDrawdownPct, metrics.currentDrawdown, metrics.current_drawdown, item.currentDrawdownPct, item.current_drawdown, item.currentDrawdown);
  strategy.unitPrice = firstNumber(item.unit_price, item.unitPrice);
  strategy.navUsd = firstNumber(item.nav_usd, item.navUsd);
  strategy.updatedAt = asString(item.updated_at) ?? asString(item.updatedAt) ?? asString(item.latestSnapshotAt) ?? asString(item.latest_snapshot_at) ?? asString(item.snapshot_at) ?? asString(item.timestamp) ?? null;
  return strategy;
}

function normalizeStrategies(payload: unknown): StrategySummary[] {
  return asArray(payload)
    .map(normalizeStrategyRecord)
    .filter((item): item is StrategySummary => Boolean(item));
}

function normalizeGroupHeader(raw: unknown, fallback?: StrategySummary): StrategyGroupHeader {
  const root = isRecord(raw) ? raw : {};
  const group = isRecord(root.group) ? root.group : {};
  const summary = isRecord(root.summary) ? root.summary : isRecord(group.summary) ? group.summary : {};
  const metrics = isRecord(root.metrics) ? root.metrics : isRecord(group.metrics) ? group.metrics : {};
  const dataQuality = isRecord(root.dataQuality) ? root.dataQuality : isRecord(root.data_quality) ? root.data_quality : {};
  const liveTrackRecord = isRecord(root.liveTrackRecord) ? root.liveTrackRecord : isRecord(root.live_track_record) ? root.live_track_record : {};
  const id = asString(group.id) ?? asString(root.id) ?? fallback?.id ?? "";
  const name = asString(group.name) ?? asString(root.name) ?? fallback?.name ?? id;
  const warnings = [
    ...(Array.isArray(root.warnings) ? root.warnings : []),
    ...(Array.isArray(dataQuality.warnings) ? dataQuality.warnings : []),
  ].map(asString).filter((item): item is string => Boolean(item));
  const normalized: StrategyGroupHeader = {
    id,
    name,
    description: parseJsonText(group.description) ?? parseJsonText(root.description) ?? fallback?.description ?? null,
    status: asString(group.status) ?? asString(root.status) ?? asString(liveTrackRecord.status) ?? fallback?.status ?? null,
    unitPrice: firstNumber(summary.unitPrice, summary.unit_price, group.unitPrice, group.unit_price, root.unitPrice, root.unit_price, fallback?.unitPrice),
    navUsd: firstNumber(summary.navUsd, summary.nav_usd, group.navUsd, group.nav_usd, root.navUsd, root.nav_usd, fallback?.navUsd),
    totalReturn: firstNumber(metrics.totalReturnPct, metrics.totalReturn, metrics.total_return, root.totalReturnPct, root.totalReturn, root.total_return),
    apy: firstNumber(metrics.apyPct, metrics.apy, root.apyPct, root.apy, fallback?.apy),
    cagr: firstNumber(metrics.cagrPct, metrics.cagr, root.cagrPct, root.cagr),
    volatility: firstNumber(metrics.volatilityAnnualizedPct, metrics.volatilityAnnualized, metrics.volatility, root.volatilityAnnualizedPct, root.volatility),
    volatilityAnnualized: firstNumber(metrics.volatilityAnnualizedPct, metrics.volatilityAnnualized, metrics.volatility_annualized, root.volatilityAnnualizedPct, root.volatilityAnnualized),
    sharpe: firstNumber(metrics.sharpeRatio, metrics.sharpe, root.sharpeRatio, root.sharpe),
    sharpeRatio: firstNumber(metrics.sharpeRatio, metrics.sharpe_ratio, metrics.sharpe, root.sharpeRatio, root.sharpe_ratio, root.sharpe),
    sortino: firstNumber(metrics.sortinoRatio, metrics.sortino, root.sortinoRatio, root.sortino),
    sortinoRatio: firstNumber(metrics.sortinoRatio, metrics.sortino_ratio, metrics.sortino, root.sortinoRatio, root.sortino_ratio, root.sortino),
    maxDrawdown: firstNumber(metrics.maxDrawdownPct, metrics.maxDrawdown, metrics.max_drawdown, root.maxDrawdownPct, root.maxDrawdown, root.max_drawdown, fallback?.maxDrawdown),
    currentDrawdown: firstNumber(metrics.currentDrawdownPct, metrics.currentDrawdown, metrics.current_drawdown, root.currentDrawdownPct, root.currentDrawdown, root.current_drawdown, fallback?.currentDrawdown),
    dataQuality: typeof dataQuality.metricsReliable === "boolean" ? dataQuality.metricsReliable : asString(root.dataQuality) ?? asNumber(root.dataQuality) ?? null,
    updatedAt: asString(root.updatedAt) ?? asString(root.updated_at) ?? asString(root.timestamp) ?? asString(summary.timestamp) ?? asString(summary.updatedAt) ?? asString(summary.updated_at) ?? asString(group.latestSnapshotAt) ?? asString(group.latest_snapshot_at) ?? asString(liveTrackRecord.latestSnapshotAt) ?? fallback?.updatedAt ?? null,
    warnings,
    isLiveTrackRecord: typeof liveTrackRecord.isLive === "boolean" ? liveTrackRecord.isLive : undefined,
  };

  if (import.meta.env.DEV) {
    console.debug("Strategy group header raw", raw);
    console.debug("Strategy group header normalized", normalized);
  }

  return normalized;
}

function normalizeTreeNode(item: unknown, fallbackId: string): ExplorerTreeNode | undefined {
  if (!isRecord(item)) return undefined;
  const id = asString(item.id) ?? asString(item.nodeId) ?? asString(item.key) ?? fallbackId;
  const type = asString(item.type) ?? asString(item.nodeType) ?? "node";
  const label = asString(item.label) ?? asString(item.name) ?? id;
  const children = asArray(item.children)
    .map((child, index) => normalizeTreeNode(child, `${id}-${index}`))
    .filter((node): node is ExplorerTreeNode => Boolean(node));
  const node: ExplorerTreeNode = { id, type, label };
  const count = firstNumber(item.count, item.rows, item.total);
  const status = asString(item.status);
  const updatedAt = asString(item.updatedAt) ?? asString(item.updated_at) ?? asString(item.timestamp);
  if (count !== null) node.count = count;
  if (status) node.status = status;
  if (updatedAt) node.updatedAt = updatedAt;
  if (children.length > 0) node.children = children;
  return node;
}

function normalizeTree(payload: unknown): ExplorerTreeNode[] {
  if (isRecord(payload) && isRecord(payload.root)) {
    const root = normalizeTreeNode(payload.root, "root");
    return root ? [root] : [];
  }
  const nodes = asArray(payload);
  if (nodes.length > 0) {
    return nodes.map((item, index) => normalizeTreeNode(item, `node-${index}`)).filter((node): node is ExplorerTreeNode => Boolean(node));
  }
  const single = normalizeTreeNode(payload, "root");
  return single ? [single] : [];
}

function findTreeNode(nodes: ExplorerTreeNode[], nodeId: string | null): ExplorerTreeNode | undefined {
  if (!nodeId) return undefined;
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const child = findTreeNode(node.children ?? [], nodeId);
    if (child) return child;
  }
  return undefined;
}

function getFirstTreeNode(nodes: ExplorerTreeNode[]): ExplorerTreeNode | undefined {
  return nodes[0];
}

function normalizeDetails(payload: unknown, node?: ExplorerTreeNode): ExplorerDetails {
  const source = isRecord(payload) ? payload : {};
  const rawSummary = Array.isArray(source.summary) ? source.summary : Array.isArray(source.cards) ? source.cards : [];
  const summary = rawSummary
    .map((item): { label: string; value: string } | undefined => {
      if (!isRecord(item)) return undefined;
      const label = asString(item.label) ?? asString(item.name) ?? asString(item.key);
      if (!label) return undefined;
      const rawValue = item.value ?? item.count ?? item.amount;
      return { label, value: formatValue(rawValue) };
    })
    .filter((item): item is { label: string; value: string } => Boolean(item));
  return {
    title: asString(source.title) ?? asString(source.label) ?? node?.label ?? "Node details",
    type: asString(source.type) ?? node?.type ?? null,
    status: asString(source.status) ?? node?.status ?? null,
    summary,
  };
}

function normalizeHistory(payload: unknown): HistoryRecord[] {
  return asArray(payload)
    .filter(isRecord)
    .map((record) => {
      const normalized: HistoryRecord = {};
      Object.entries(record).forEach(([key, value]) => {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
          normalized[key] = value;
        }
      });
      return normalized;
    })
    .sort((a, b) => Date.parse(String(b.timestamp ?? b.created_at ?? b.snapshot_at ?? 0)) - Date.parse(String(a.timestamp ?? a.created_at ?? a.snapshot_at ?? 0)));
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
  const percent = Math.abs(value) <= 1 ? value * 100 : value;
  return `${percent.toFixed(2)}%`;
}

function formatPercentOrNA(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? "N/A" : formatPercent(value);
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
}

function formatNumberOrNA(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function formatUsdOrNA(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatDataQuality(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "boolean") return value ? "Reliable" : "Review";
  return String(value);
}

function formatValue(value: unknown): string {
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value.trim().length > 0) return value;
  return "N/A";
}

function formatDateTimeOrNA(value: string | null | undefined): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<unknown>;
}

function normalizeApiStatus(payload: unknown): ApiStatus {
  if (typeof payload === "string") return payload.trim().toUpperCase() === "OK" ? "ok" : "nok";
  if (!isRecord(payload)) return "nok";
  if (payload.ok === true) return "ok";

  const status = asString(payload.status) ?? asString(payload.apiStatus) ?? asString(payload.health) ?? asString(payload.state);
  return status?.toLowerCase() === "ok" ? "ok" : "nok";
}

function getBenchmarkPayloadItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  const candidates = [payload.items, payload.data, payload.benchmarks];
  const match = candidates.find(Array.isArray);
  return Array.isArray(match) ? match : [];
}

function normalizeBenchmarkOption(item: unknown): BenchmarkOption | undefined {
  if (!isRecord(item)) return undefined;
  const symbol = (asString(item.symbol) ?? asString(item.id) ?? asString(item.key) ?? "").toUpperCase();
  if (!symbol) return undefined;
  return {
    symbol,
    label: asString(item.label) ?? asString(item.name) ?? benchmarkLabelFallbacks[symbol] ?? symbol,
    assetClass: asString(item.assetClass) ?? asString(item.asset_class) ?? null,
    source: asString(item.source) ?? null,
    status: asString(item.status) ?? null,
  };
}

function normalizeBenchmarkOptions(payload: unknown): BenchmarkOption[] {
  const seen = new Set<string>();
  return getBenchmarkPayloadItems(payload)
    .map(normalizeBenchmarkOption)
    .filter((item): item is BenchmarkOption => {
      if (!item || seen.has(item.symbol)) return false;
      seen.add(item.symbol);
      return true;
    });
}

function readSavedChartMode(): ChartMode {
  try {
    const value = window.localStorage.getItem(CHART_MODE_STORAGE_KEY);
    return value === "nav_usd" || value === "unit_price" ? value : DEFAULT_CHART_MODE;
  } catch {
    return DEFAULT_CHART_MODE;
  }
}

function persistChartMode(value: ChartMode): void {
  try {
    window.localStorage.setItem(CHART_MODE_STORAGE_KEY, value);
  } catch {
    // Ignore storage errors.
  }
}

function readSavedBenchmark(): string | null | undefined {
  try {
    const value = window.localStorage.getItem(SELECTED_BENCHMARK_STORAGE_KEY);
    if (value === null) return undefined;
    return value.trim().length > 0 ? value.trim().toUpperCase() : null;
  } catch {
    return undefined;
  }
}

function normalizeSelectedBenchmark(savedSymbol: string | null | undefined, availableSymbols: string[]): string | null {
  const available = new Set(availableSymbols);
  if (savedSymbol === null) return null;
  if (savedSymbol && available.has(savedSymbol)) return savedSymbol;
  if (available.has(DEFAULT_BENCHMARK)) return DEFAULT_BENCHMARK;
  return availableSymbols[0] ?? null;
}

function persistSelectedBenchmark(symbol: string | null): void {
  try {
    window.localStorage.setItem(SELECTED_BENCHMARK_STORAGE_KEY, symbol ?? "");
  } catch {
    // Ignore storage errors.
  }
}

function getChartSeriesPayloadItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.series)) return payload.series;
  if (isRecord(payload.data) && Array.isArray(payload.data.series)) return payload.data.series;
  return [];
}

function getPayloadWarnings(payload: unknown): string[] {
  if (!isRecord(payload)) return [];
  const rawWarnings = Array.isArray(payload.warnings)
    ? payload.warnings
    : isRecord(payload.dataQuality) && Array.isArray(payload.dataQuality.warnings)
      ? payload.dataQuality.warnings
      : isRecord(payload.data_quality) && Array.isArray(payload.data_quality.warnings)
        ? payload.data_quality.warnings
    : isRecord(payload.data) && Array.isArray(payload.data.warnings)
      ? payload.data.warnings
      : [];
  return rawWarnings.map(asString).filter((item): item is string => Boolean(item));
}

function normalizeChartPoint(item: unknown, chartMode: ChartMode, seriesType: "primary" | "benchmark", hasBenchmark: boolean): NormalizedChartPoint | undefined {
  if (!isRecord(item)) return undefined;
  const timestamp = asString(item.timestamp) ?? asString(item.created_at) ?? asString(item.snapshot_at) ?? asString(item.time);
  if (!timestamp) return undefined;
  const rawValue = firstNumber(item.rawValue, item.raw_value, item.value, item.nav_usd, item.navUsd, item.unit_price, item.unitPrice);
  const normalizedValue = firstNumber(item.normalizedValue, item.normalized_value, item.indexed_nav, item.indexedNav, item.indexed, item.index);
  const value = getChartPointValue(chartMode, seriesType, rawValue, normalizedValue, hasBenchmark);
  return {
    timestamp,
    value,
    rawValue,
    normalizedValue,
  };
}

function normalizeChartResponse(payload: unknown, chartMode: ChartMode, selectedBenchmark: string | null): { series: NormalizedChartSeries[]; warnings: string[] } {
  let primaryCount = 0;
  const usedKeys = new Set<string>();
  const series = getChartSeriesPayloadItems(payload)
    .map((item): NormalizedChartSeries | undefined => {
      if (!isRecord(item)) return undefined;
      const rawType = asString(item.type)?.toLowerCase();
      const rawKind = asString(item.kind)?.toLowerCase();
      const type: "primary" | "benchmark" = rawType === "benchmark" || rawKind === "benchmark" ? "benchmark" : "primary";
      const symbol = asString(item.symbol)?.toUpperCase();
      const fallbackId = type === "primary" ? (primaryCount === 0 ? "primary" : `primary-${primaryCount + 1}`) : symbol;
      if (type === "primary") primaryCount += 1;
      const id = asString(item.id) ?? asString(item.key) ?? fallbackId ?? `series-${primaryCount}`;
      let chartKey = type === "primary" ? "primary" : `benchmark_${(symbol ?? id).replace(/[^a-zA-Z0-9_]/g, "_")}`;
      while (usedKeys.has(chartKey)) chartKey = `${chartKey}_${usedKeys.size}`;
      usedKeys.add(chartKey);
      const defaultLabel = type === "primary" ? (chartMode === "unit_price" ? "Unit Price" : "NAV USD") : id;
      const label = asString(item.label) ?? symbol ?? defaultLabel;
      const points = asArray(item.points)
        .map((point) => normalizeChartPoint(point, chartMode, type, Boolean(selectedBenchmark)))
        .filter((point): point is NormalizedChartPoint => Boolean(point))
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
      const warnings = Array.isArray(item.warnings) ? item.warnings.map(asString).filter((warning): warning is string => Boolean(warning)) : [];

      return { id, chartKey, label, type, symbol, points, warnings };
    })
    .filter((item): item is NormalizedChartSeries => Boolean(item));

  return { series, warnings: getPayloadWarnings(payload) };
}

function buildChartRows(series: NormalizedChartSeries[]): ChartRow[] {
  const rowsByTimestamp = new Map<string, ChartRow>();
  series.forEach((chartSeries) => {
    chartSeries.points.forEach((point) => {
      if (point.value === null || !Number.isFinite(point.value)) return;
      const row = rowsByTimestamp.get(point.timestamp) ?? { timestamp: point.timestamp, date: formatDate(point.timestamp) };
      row[chartSeries.chartKey] = point.value;
      rowsByTimestamp.set(point.timestamp, row);
    });
  });
  return Array.from(rowsByTimestamp.values()).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

function getPaddedDomain(rows: Array<Record<string, unknown>>, keys: string[]): [number, number] {
  const values = rows.flatMap((row) => (
    keys
      .map((key) => row[key])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  ));

  if (values.length === 0) return [0, 1];

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    return [min - pad, max + pad];
  }

  const padding = (max - min) * 0.08;
  return [min - padding, max + padding];
}

function getDailyTicks(rows: Array<{ timestamp: string }>): string[] {
  const seen = new Set<string>();
  const ticks: string[] = [];

  rows.forEach((row) => {
    const date = new Date(row.timestamp);
    if (Number.isNaN(date.getTime())) return;
    const dayKey = date.toISOString().slice(0, 10);
    if (seen.has(dayKey)) return;
    seen.add(dayKey);
    ticks.push(row.timestamp);
  });

  return ticks;
}

function formatAxisDate(value: unknown): string {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatAxisNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

function formatAxisUsd(value: number): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatTooltipDateTime(value: unknown): string {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTooltipNumber(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function formatTooltipUsd(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function getFiniteSeriesValues(series?: NormalizedChartSeries): number[] {
  return (series?.points ?? [])
    .map((point) => point.value)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
}

function getReturnsByTimestamp(series: NormalizedChartSeries): Array<{ timestamp: string; value: number }> {
  const returns: Array<{ timestamp: string; value: number }> = [];
  const points = series.points.filter((point) => typeof point.value === "number" && Number.isFinite(point.value) && point.value > 0);
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1].value;
    const current = points[index].value;
    if (previous !== null && current !== null && previous > 0 && current > 0) {
      returns.push({ timestamp: points[index].timestamp, value: current / previous - 1 });
    }
  }
  return returns;
}

function pearsonAligned(left: NormalizedChartSeries, right: NormalizedChartSeries): number | null {
  const rightReturns = new Map(getReturnsByTimestamp(right).map((item) => [item.timestamp, item.value]));
  const leftValues: number[] = [];
  const rightValues: number[] = [];
  getReturnsByTimestamp(left).forEach((item) => {
    const rightValue = rightReturns.get(item.timestamp);
    if (rightValue === undefined) return;
    leftValues.push(item.value);
    rightValues.push(rightValue);
  });
  return leftValues.length >= 2 ? pearson(leftValues, rightValues) : null;
}

function MetricsTable({
  metrics,
  subtitle = "Collected by ANMI Track",
  title = "Strategy Metrics",
}: {
  metrics: Metric[];
  subtitle?: string;
  title?: string;
}): JSX.Element {
  return (
    <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-slate-950/20">
      <div className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.label} className="border-b border-white/10 last:border-b-0">
                <td className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{metric.label}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-white">{metric.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}

export function StrategiesPage(): JSX.Element {
  const { strategyId } = useParams<{ strategyId: string }>();
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<StrategySummary[]>([]);
  const [chartSeries, setChartSeries] = useState<NormalizedChartSeries[]>([]);
  const [chartWarnings, setChartWarnings] = useState<string[]>([]);
  const [benchmarkOptions, setBenchmarkOptions] = useState<BenchmarkOption[]>([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null);
  const [headerStrategy, setHeaderStrategy] = useState<StrategyGroupHeader | null>(null);
  const [treeNodes, setTreeNodes] = useState<ExplorerTreeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeDetails, setNodeDetails] = useState<ExplorerDetails | null>(null);
  const [historyRows, setHistoryRows] = useState<HistoryRecord[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);
  const [isLoadingBenchmarks, setIsLoadingBenchmarks] = useState(true);
  const [isLoadingHeader, setIsLoadingHeader] = useState(false);
  const [isLoadingNav, setIsLoadingNav] = useState(false);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [navError, setNavError] = useState<string | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>(() => readSavedChartMode());
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isBenchmarkMenuOpen, setIsBenchmarkMenuOpen] = useState(false);
  const [strategySearch, setStrategySearch] = useState("");
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const strategyMenuRef = useRef<HTMLDivElement | null>(null);
  const benchmarkMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    fetchJson("/api/v1/health")
      .then((payload) => {
        if (active) setApiStatus(normalizeApiStatus(payload));
      })
      .catch(() => {
        if (active) setApiStatus("nok");
      });
    return () => {
      active = false;
    };
  }, []);

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

  useEffect(() => {
    let active = true;
    setIsLoadingBenchmarks(true);
    setBenchmarkError(null);
    fetchJson("/api/v1/benchmarks")
      .then((payload) => {
        if (!active) return;
        const normalized = normalizeBenchmarkOptions(payload);
        const availableSymbols = normalized.map((benchmark) => benchmark.symbol);
        setBenchmarkOptions(normalized);
        setSelectedBenchmark(normalizeSelectedBenchmark(readSavedBenchmark(), availableSymbols));
        setBenchmarkError(normalized.length === 0 ? "Benchmark data unavailable for selected range." : null);
      })
      .catch(() => {
        if (!active) return;
        setBenchmarkOptions([]);
        setSelectedBenchmark(null);
        setBenchmarkError("Loading benchmarks failed.");
      })
      .finally(() => {
        if (active) setIsLoadingBenchmarks(false);
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
  const activeStrategy = headerStrategy ?? selectedStrategy;
  const selectedTreeNode = useMemo(() => findTreeNode(treeNodes, selectedNodeId), [selectedNodeId, treeNodes]);
  const filteredStrategies = useMemo(() => {
    const query = strategySearch.trim().toLowerCase();
    if (!query) return strategies;
    return strategies.filter((strategy) => (
      strategy.name.toLowerCase().includes(query) ||
      strategy.description?.toLowerCase().includes(query) ||
      strategy.id.toLowerCase().includes(query)
    ));
  }, [strategies, strategySearch]);
  const filteredHistoryRows = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    if (!query) return historyRows;
    return historyRows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query)));
  }, [historyRows, historySearch]);
  const primaryMetrics = useMemo((): Metric[] => {
    if (isLoadingHeader) {
      return [
        "UnitPrice",
        "NAV",
        "Total Return",
        "APY / CAGR",
        "Max DD",
        "Current DD",
        "Volatility",
        "Sharpe",
        "Sortino",
        "Updated",
      ].map((label) => ({ label, value: "Loading...", hint: "ANMI Track header" }));
    }

    const source = headerStrategy ?? selectedStrategy;
    const warningsCount = headerStrategy?.warnings?.length ?? 0;
    const metrics: Metric[] = [
      { label: "UnitPrice", value: formatNumberOrNA(source?.unitPrice), hint: "Header unit price" },
      { label: "NAV", value: formatUsdOrNA(source?.navUsd), hint: "Group net asset value" },
      { label: "Total Return", value: formatPercentOrNA(headerStrategy?.totalReturn), hint: "Header total return" },
      { label: "APY / CAGR", value: formatPercentOrNA(headerStrategy?.apy ?? headerStrategy?.cagr ?? selectedStrategy?.apy), hint: "Annualized return" },
      { label: "Max DD", value: formatPercentOrNA(headerStrategy?.maxDrawdown ?? selectedStrategy?.maxDrawdown), hint: "Maximum drawdown" },
      { label: "Current DD", value: formatPercentOrNA(headerStrategy?.currentDrawdown ?? selectedStrategy?.currentDrawdown), hint: "Current drawdown" },
      { label: "Volatility", value: formatPercentOrNA(headerStrategy?.volatility ?? headerStrategy?.volatilityAnnualized), hint: "Annualized where available" },
      { label: "Sharpe", value: formatNumberOrNA(headerStrategy?.sharpe ?? headerStrategy?.sharpeRatio, 2), hint: "Risk-adjusted return" },
      { label: "Sortino", value: formatNumberOrNA(headerStrategy?.sortino ?? headerStrategy?.sortinoRatio, 2), hint: "Downside-adjusted return" },
      { label: "Updated", value: formatDateTimeOrNA(headerStrategy?.updatedAt ?? selectedStrategy?.updatedAt), hint: "Latest header snapshot" },
    ];

    if (headerStrategy?.dataQuality !== undefined) {
      metrics.push({ label: "Data Quality", value: formatDataQuality(headerStrategy.dataQuality), hint: "ANMI Track validation" });
    }
    if (warningsCount > 0) {
      metrics.push({ label: "Warnings", value: String(warningsCount), hint: "Header data quality notes" });
    }

    return metrics;
  }, [headerStrategy, isLoadingHeader, selectedStrategy]);

  useEffect(() => {
    if (!isLoadingStrategies && !strategyId && selectedStrategy) {
      navigate(`/strategies/${selectedStrategy.id}`, { replace: true });
    }
  }, [isLoadingStrategies, navigate, selectedStrategy, strategyId]);

  useEffect(() => {
    if (!isSelectorOpen && !isBenchmarkMenuOpen) return;

    function handlePointerDown(event: MouseEvent): void {
      const target = event.target as Node;
      if (strategyMenuRef.current && !strategyMenuRef.current.contains(target)) {
        setIsSelectorOpen(false);
      }
      if (benchmarkMenuRef.current && !benchmarkMenuRef.current.contains(target)) {
        setIsBenchmarkMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isBenchmarkMenuOpen, isSelectorOpen]);

  useEffect(() => {
    if (!isSelectorOpen && !isBenchmarkMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsSelectorOpen(false);
        setIsBenchmarkMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBenchmarkMenuOpen, isSelectorOpen]);

  useEffect(() => {
    if (!selectedStrategy) {
      setHeaderStrategy(null);
      setHeaderError(null);
      return;
    }
    let active = true;
    setIsLoadingHeader(true);
    setHeaderError(null);
    setHeaderStrategy(null);
    fetchJson(`/api/v1/strategy-groups/${encodeURIComponent(selectedStrategy.id)}/header`)
      .then((payload) => {
        if (!active) return;
        setHeaderStrategy(normalizeGroupHeader(payload, selectedStrategy));
      })
      .catch(() => {
        if (!active) return;
        setHeaderStrategy(null);
        setHeaderError("Unable to load strategy header.");
      })
      .finally(() => {
        if (active) setIsLoadingHeader(false);
      });
    return () => {
      active = false;
    };
  }, [selectedStrategy]);

  useEffect(() => {
    if (!selectedStrategy) {
      setChartSeries([]);
      setChartWarnings([]);
      return;
    }
    let active = true;
    setIsLoadingNav(true);
    setNavError(null);
    setChartWarnings([]);
    const params = new URLSearchParams({
      scope: "group",
      metric: chartMode === "nav_usd" ? "nav_usd" : "unit_price",
      normalize: chartMode === "unit_price" ? "true" : "false",
    });
    if (chartMode === "unit_price" && selectedBenchmark) {
      params.set("benchmarks", selectedBenchmark);
    }
    fetchJson(`/api/v1/strategy-groups/${encodeURIComponent(selectedStrategy.id)}/chart?${params.toString()}`)
      .then((payload) => {
        if (!active) return;
        const normalized = normalizeChartResponse(payload, chartMode, chartMode === "unit_price" ? selectedBenchmark : null);
        const hasPrimaryPoints = normalized.series.some((series) => series.type === "primary" && series.points.length > 0);
        if (hasPrimaryPoints) {
          setChartSeries(normalized.series);
          setChartWarnings(normalized.warnings);
          setNavError(null);
        } else {
          setNavError("Unable to load primary strategy series.");
        }
      })
      .catch(() => {
        if (!active) return;
        setChartWarnings([]);
        setNavError("Unable to load chart data.");
      })
      .finally(() => {
        if (active) setIsLoadingNav(false);
      });
    return () => {
      active = false;
    };
  }, [chartMode, selectedBenchmark, selectedStrategy]);

  useEffect(() => {
    if (!selectedStrategy) {
      setTreeNodes([]);
      setSelectedNodeId(null);
      return;
    }
    let active = true;
    setIsLoadingTree(true);
    setTreeError(null);
    setSelectedNodeId(null);
    fetchJson(`/api/v1/strategy-groups/${encodeURIComponent(selectedStrategy.id)}/tree`)
      .then((payload) => {
        if (!active) return;
        const normalized = normalizeTree(payload);
        setTreeNodes(normalized);
        setSelectedNodeId(getFirstTreeNode(normalized)?.id ?? null);
      })
      .catch(() => {
        if (!active) return;
        setTreeNodes([]);
        setTreeError("Unable to load explorer data.");
      })
      .finally(() => {
        if (active) setIsLoadingTree(false);
      });
    return () => {
      active = false;
    };
  }, [selectedStrategy]);

  useEffect(() => {
    if (!selectedStrategy || !selectedTreeNode) {
      setNodeDetails(null);
      setHistoryRows([]);
      return;
    }
    let active = true;
    const params = new URLSearchParams({
      groupId: selectedStrategy.id,
      nodeId: selectedTreeNode.id,
      nodeType: selectedTreeNode.type,
    });
    setIsLoadingDetails(true);
    setIsLoadingHistory(true);
    setDetailsError(null);
    setHistoryError(null);
    fetchJson(`/api/v1/explorer/details?${params.toString()}`)
      .then((payload) => {
        if (active) setNodeDetails(normalizeDetails(payload, selectedTreeNode));
      })
      .catch(() => {
        if (active) {
          setNodeDetails(null);
          setDetailsError("Unable to load explorer details.");
        }
      })
      .finally(() => {
        if (active) setIsLoadingDetails(false);
      });

    const historyParams = new URLSearchParams(params);
    historyParams.set("limit", "50");
    fetchJson(`/api/v1/explorer/history?${historyParams.toString()}`)
      .then((payload) => {
        if (active) setHistoryRows(normalizeHistory(payload));
      })
      .catch(() => {
        if (active) {
          setHistoryRows([]);
          setHistoryError("Unable to load explorer history.");
        }
      })
      .finally(() => {
        if (active) setIsLoadingHistory(false);
      });

    return () => {
      active = false;
    };
  }, [selectedStrategy, selectedTreeNode]);

  const analytics = useMemo(() => {
    const rawPrimarySeries = chartSeries.find((series) => series.type === "primary");
    const primarySeries = rawPrimarySeries
      ? {
          ...rawPrimarySeries,
          label: chartMode === "nav_usd" ? "NAV USD" : selectedBenchmark ? "Unit Price Index" : "Unit Price",
        }
      : undefined;
    const selectedBenchmarkSeries = chartMode === "unit_price" && selectedBenchmark
      ? chartSeries.find((series) => series.type === "benchmark" && (series.symbol === selectedBenchmark || series.id.toUpperCase().includes(selectedBenchmark)))
      : undefined;
    const benchmarkSeries = selectedBenchmarkSeries
      ? [{ ...selectedBenchmarkSeries, label: selectedBenchmarkSeries.symbol ?? selectedBenchmark ?? selectedBenchmarkSeries.label }]
      : [];
    const visibleSeries = [primarySeries, ...benchmarkSeries].filter((series): series is NormalizedChartSeries => Boolean(series));
    const chartData = buildChartRows(visibleSeries);
    const visibleSeriesKeys = visibleSeries.map((series) => series.chartKey);
    const yDomain = getPaddedDomain(chartData, visibleSeriesKeys);
    const xTicks = getDailyTicks(chartData);
    const values = getFiniteSeriesValues(primarySeries);
    const strategyReturns = toReturns(values);
    const correlations = primarySeries
      ? benchmarkSeries
          .map((series) => {
            const correlation = pearsonAligned(primarySeries, series);
            return correlation === null ? null : `${series.label} ${correlation.toFixed(2)}`;
          })
          .filter((item): item is string => Boolean(item))
      : [];
    const primaryHasData = primarySeries?.points.some((point) => typeof point.value === "number" && Number.isFinite(point.value)) ?? false;
    const benchmarkValues = selectedBenchmarkSeries?.points.filter((point) => typeof point.value === "number" && Number.isFinite(point.value)) ?? [];
    const benchmarkHasData = selectedBenchmarkSeries ? benchmarkValues.length > 0 : true;
    const benchmarkHasPartialCoverage = selectedBenchmarkSeries
      ? selectedBenchmarkSeries.points.some((point) => point.value === null || !Number.isFinite(point.value)) && benchmarkValues.length > 0
      : false;
    let benchmarkWarning: string | null = null;
    if (chartMode === "unit_price" && selectedBenchmark && primaryHasData) {
      if (!selectedBenchmarkSeries || !benchmarkHasData) {
        benchmarkWarning = "Selected benchmark is unavailable for this range.";
      } else if (benchmarkHasPartialCoverage || chartWarnings.length > 0) {
        benchmarkWarning = "Benchmark coverage is partial for this range.";
      }
    }
    const advancedMetrics: Metric[] = [
      {
        label: "Correlation to markets",
        value: correlations.length > 0 ? correlations.slice(0, 2).join(" | ") : "N/A",
        hint: correlations.length > 2 ? correlations.slice(2).join(" | ") : "Calculated from visible API benchmark series.",
      },
      {
        label: "Autocorrelation",
        value: pearson(strategyReturns.slice(1), strategyReturns.slice(0, -1)).toFixed(2),
        hint: "Lag-1 autocorrelation of strategy returns.",
      },
      {
        label: "Optimal-F",
        value: formatPercent(optimalF(strategyReturns)),
        hint: "Prototype estimate based on NAV or unit price returns.",
      },
    ];
    return { advancedMetrics, benchmarkSeries, benchmarkWarning, chartData, primarySeries, xTicks, yDomain };
  }, [chartMode, chartSeries, chartWarnings, selectedBenchmark]);

  function handleStrategyChange(nextId: string): void {
    setIsSelectorOpen(false);
    setStrategySearch("");
    navigate(`/strategies/${encodeURIComponent(nextId)}`);
  }

  function handleChartModeChange(value: string): void {
    const nextMode: ChartMode = value === "nav_usd" ? "nav_usd" : "unit_price";
    setChartMode(nextMode);
    persistChartMode(nextMode);
  }

  function handleBenchmarkChange(value: string): void {
    const nextBenchmark = value.trim().length > 0 ? value : null;
    setSelectedBenchmark(nextBenchmark);
    persistSelectedBenchmark(nextBenchmark);
    setIsBenchmarkMenuOpen(false);
  }

  return (
    <main className="min-h-screen bg-[#050b14] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_90%_8%,rgba(14,165,233,0.12),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0),rgba(2,6,23,0.88))]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:56px_56px]" />

      <header className="relative z-50 border-b border-white/10 bg-[#07111f]/90 backdrop-blur-xl">
        <div className="relative z-40 mx-auto max-w-7xl px-5 py-6 lg:px-8">
          <div className="flex items-start gap-5">
            <div className="flex min-w-0 flex-1 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-6">
                <Link to="/" className="shrink-0 pt-5" aria-label="ANMI home">
                  <img
                    src={anmiLogo}
                    alt="ANMI"
                    className="h-10 w-auto object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.16)] sm:h-12"
                  />
              </Link>

                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
                    Track records and analytics
                  </div>

                  <div ref={strategyMenuRef} className="relative z-50 mt-1 inline-block max-w-full">
                    <button
                      type="button"
                      disabled={strategies.length === 0}
                      aria-expanded={isSelectorOpen}
                      aria-label="Select strategy"
                      onClick={() => setIsSelectorOpen((isOpen) => !isOpen)}
                      className="group inline-flex max-w-full items-center gap-2 text-left transition disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span className="truncate text-2xl font-semibold tracking-[-0.04em] text-white transition group-hover:text-cyan-50 sm:text-3xl">
                        {activeStrategy?.name ?? (isLoadingStrategies || isLoadingHeader ? "Loading strategy" : "Strategy profile")}
                      </span>
                      <ChevronDown className={cn("h-5 w-5 shrink-0 text-cyan-200 transition group-hover:translate-y-0.5 group-hover:text-cyan-100", isSelectorOpen ? "rotate-180" : null)} />
                    </button>

                    {isSelectorOpen ? (
                      <StrategySelectorGrid
                        search={strategySearch}
                        strategies={filteredStrategies}
                        selectedId={selectedStrategy?.id}
                        onSearchChange={setStrategySearch}
                        onSelect={handleStrategyChange}
                      />
                    ) : null}
                  </div>

                  {activeStrategy?.description ? (
                    <p className="mt-1 max-w-4xl truncate text-sm leading-6 text-slate-400">{activeStrategy.description}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <MetricChip label="UnitPrice" value={formatNumber(activeStrategy?.unitPrice)} />
                    <MetricChip label="APY" value={formatPercentOrNA(activeStrategy?.apy)} />
                    <MetricChip label="Max DD" value={formatPercentOrNA(activeStrategy?.maxDrawdown)} />
                    <MetricChip label="Updated" value={formatDateTimeOrNA(activeStrategy?.updatedAt)} />
                    {headerStrategy?.isLiveTrackRecord === true ? (
                      <div
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100"
                        title="Real strategy data is continuously tracked by ANMI Track."
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Live track record by ANMI Track
                      </div>
                    ) : null}
                    {apiStatus === "nok" ? (
                      <div
                        className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100"
                        title="ANMI API is currently unavailable."
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Backend is currently unavailable</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-0 mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {isLoadingStrategies || isLoadingBenchmarks || isLoadingHeader || isLoadingNav ? (
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <StatusPill active label={isLoadingStrategies ? "Loading strategy groups..." : isLoadingBenchmarks ? "Loading benchmarks..." : isLoadingHeader ? "Loading strategy header..." : "Loading chart..."} />
          </div>
        ) : null}

        {error ? <StateCard title="API error" message={error} /> : null}
        {headerError ? <StateCard title="Header unavailable" message={headerError} /> : null}
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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 rounded-2xl border border-white/10 bg-[#081421]/90 p-4 shadow-2xl shadow-slate-950/30 sm:p-6">
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  <LineChart className="h-4 w-4 text-cyan-200" />
                  {chartMode === "nav_usd" ? "NAV USD" : selectedBenchmark ? "Unit Price Index" : "Unit Price"}
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {chartMode === "nav_usd"
                    ? "Group NAV in dollars."
                    : selectedBenchmark
                      ? "Unit price and selected benchmark indexed for comparison."
                      : "Strategy group unit price history."}
                </p>
              </div>
              <div className="flex max-w-xl flex-wrap items-center justify-end gap-2">
                <SegmentedControl
                  value={chartMode}
                  options={[
                    { value: "nav_usd", label: "NAV USD" },
                    { value: "unit_price", label: "Unit Price" },
                  ]}
                  onChange={handleChartModeChange}
                />
                {chartMode === "unit_price" ? (
                  <div ref={benchmarkMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsBenchmarkMenuOpen((isOpen) => !isOpen)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-white"
                    >
                      <span>Benchmark</span>
                      <span className="text-cyan-100">{selectedBenchmark ?? "None"}</span>
                      <ChevronDown className={cn("h-3.5 w-3.5 text-cyan-200 transition", isBenchmarkMenuOpen ? "rotate-180" : null)} />
                    </button>
                    {isBenchmarkMenuOpen ? (
                      <div className="absolute right-0 top-full z-[100] mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/70">
                        <button
                          type="button"
                          onClick={() => handleBenchmarkChange("")}
                          className={cn(
                            "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition",
                            selectedBenchmark === null ? "bg-cyan-300/15 text-cyan-100" : "text-slate-300 hover:bg-cyan-300/10 hover:text-white",
                          )}
                        >
                          <span>None</span>
                          <span className="text-xs text-slate-500">None</span>
                        </button>
                        {benchmarkOptions.map((benchmark) => {
                          const selected = selectedBenchmark === benchmark.symbol;
                          return (
                            <button
                              key={benchmark.symbol}
                              type="button"
                              onClick={() => handleBenchmarkChange(benchmark.symbol)}
                              className={cn(
                                "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition",
                                selected ? "bg-cyan-300/15 text-cyan-100" : "text-slate-300 hover:bg-cyan-300/10 hover:text-white",
                              )}
                            >
                              <span className="truncate">{benchmark.label}</span>
                              <span className="ml-3 text-xs text-slate-500">{benchmark.symbol}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            {benchmarkError ? (
              <div className="mb-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-4 py-3 text-xs text-amber-100">{benchmarkError}</div>
            ) : null}
            {analytics.benchmarkWarning ? (
              <div className="mb-4 text-xs text-amber-200/75">{analytics.benchmarkWarning}</div>
            ) : null}

            <div className="relative h-[420px] min-h-[320px]">
              {analytics.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analytics.chartData} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                    <XAxis dataKey="timestamp" ticks={analytics.xTicks} tickFormatter={formatAxisDate} stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      domain={analytics.yDomain}
                      tickFormatter={chartMode === "nav_usd" ? formatAxisUsd : formatAxisNumber}
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      width={66}
                    />
                    <Tooltip
                      contentStyle={{ background: "#07111f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#e2e8f0" }}
                      labelStyle={{ color: "#bae6fd" }}
                      labelFormatter={formatTooltipDateTime}
                      formatter={(value, name) => {
                        if (typeof value !== "number") {
                          return [String(value), name];
                        }
                        if (chartMode === "nav_usd") {
                          return [formatTooltipUsd(value), name];
                        }
                        if (analytics.primarySeries && name === analytics.primarySeries.label) {
                          return [formatTooltipNumber(value), name];
                        }
                        return [value.toLocaleString("en-US", { maximumFractionDigits: 2 }), name];
                      }}
                    />
                    <Legend />
                    {analytics.primarySeries ? (
                      <Area
                        type="monotone"
                        dataKey={analytics.primarySeries.chartKey}
                        name={analytics.primarySeries.label}
                        stroke="#22d3ee"
                        fill="rgba(34,211,238,0.16)"
                        strokeWidth={3}
                        dot={false}
                        connectNulls={false}
                      />
                    ) : null}
                    {analytics.benchmarkSeries.map((series, index) => (
                      <Line
                        key={series.chartKey}
                        type="monotone"
                        dataKey={series.chartKey}
                        name={series.label}
                        stroke={chartColors[index % chartColors.length]}
                        strokeWidth={1.8}
                        dot={false}
                        connectNulls={false}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center rounded-xl border border-white/10 bg-white/[0.025] text-sm text-slate-500">
                  {isLoadingNav ? "Loading chart..." : navError ?? "Unable to load primary strategy series."}
                </div>
              )}
              {isLoadingNav && analytics.chartData.length > 0 ? (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-slate-950/55 backdrop-blur-[2px]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/90 px-4 py-2 text-xs font-medium text-slate-300 shadow-xl shadow-black/40">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-200" />
                    Loading chart...
                  </div>
                </div>
              ) : null}
            </div>
            {navError && analytics.chartData.length > 0 ? (
              <div className="mt-3 text-xs text-amber-200/75">{navError}</div>
            ) : null}
          </div>

          <MetricsTable metrics={primaryMetrics} />
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Advanced calculated metrics</div>
              <p className="mt-1 text-xs text-slate-500">Calculated from visible chart series. Not part of the primary ANMI Track collected metrics.</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <tbody>
                {analytics.advancedMetrics.map((metric) => (
                  <tr key={metric.label} className="border-b border-white/10 last:border-b-0">
                    <td className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{metric.label}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-white">{metric.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Optimal-F note: Prototype estimate based on NAV or unit price returns. Production calculation should use trade-level returns or risk-normalized R-multiples.
          </p>
        </section>

        <DataExplorer
          details={nodeDetails}
          detailsError={detailsError}
          historyError={historyError}
          historyRows={filteredHistoryRows}
          historySearch={historySearch}
          isLoadingDetails={isLoadingDetails}
          isLoadingHistory={isLoadingHistory}
          isLoadingTree={isLoadingTree}
          nodes={treeNodes}
          selectedNodeId={selectedNodeId}
          selectedNode={selectedTreeNode}
          treeError={treeError}
          totalHistoryRows={historyRows.length}
          onHistorySearchChange={setHistorySearch}
          onSelectNode={setSelectedNodeId}
        />
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

function DataExplorer({
  details,
  detailsError,
  historyError,
  historyRows,
  historySearch,
  isLoadingDetails,
  isLoadingHistory,
  isLoadingTree,
  nodes,
  selectedNode,
  selectedNodeId,
  totalHistoryRows,
  treeError,
  onHistorySearchChange,
  onSelectNode,
}: {
  details: ExplorerDetails | null;
  detailsError: string | null;
  historyError: string | null;
  historyRows: HistoryRecord[];
  historySearch: string;
  isLoadingDetails: boolean;
  isLoadingHistory: boolean;
  isLoadingTree: boolean;
  nodes: ExplorerTreeNode[];
  selectedNode?: ExplorerTreeNode;
  selectedNodeId: string | null;
  totalHistoryRows: number;
  treeError: string | null;
  onHistorySearchChange: (value: string) => void;
  onSelectNode: (nodeId: string) => void;
}): JSX.Element {
  const columns = getHistoryColumns(historyRows);

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-[#081421]/90 p-4 shadow-2xl shadow-slate-950/30 sm:p-6">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-100">Data Explorer</div>
          <p className="mt-2 text-sm text-slate-500">Verified hierarchy, node details and latest history records for the selected strategy group.</p>
        </div>
        <div className="text-xs text-slate-500">{totalHistoryRows} latest records</div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          {isLoadingTree ? <div className="p-3 text-sm text-slate-500">Loading explorer data...</div> : null}
          {treeError ? <div className="p-3 text-sm text-amber-100">{treeError}</div> : null}
          {!isLoadingTree && !treeError && nodes.length === 0 ? <div className="p-3 text-sm text-slate-500">No explorer tree available.</div> : null}
          <div className="space-y-1">
            {nodes.map((node) => (
              <TreeNodeButton key={node.id} node={node} depth={0} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} />
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            {isLoadingDetails ? <div className="text-sm text-slate-500">Loading node details...</div> : null}
            {detailsError ? <div className="text-sm text-amber-100">{detailsError}</div> : null}
            {!isLoadingDetails && !detailsError ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-white">{details?.title ?? selectedNode?.label ?? "Select a node"}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{details?.type ?? selectedNode?.type ?? "No node selected"}{details?.status ? ` / ${details.status}` : ""}</div>
                  </div>
                </div>
                {details?.summary.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {details.summary.map((item) => (
                      <MetricChip key={item.label} label={item.label} value={item.value} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No summary details returned for this node.</p>
                )}
              </>
            ) : null}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <div className="text-sm font-semibold text-white">History</div>
                <div className="mt-1 text-xs text-slate-500">{selectedNode?.label ?? "Select a node"}</div>
              </div>
              <input
                value={historySearch}
                onChange={(event) => onHistorySearchChange(event.target.value)}
                placeholder="Search history..."
                className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 md:w-72"
              />
            </div>
            {isLoadingHistory ? <div className="text-sm text-slate-500">Loading history records...</div> : null}
            {historyError ? <div className="text-sm text-amber-100">{historyError}</div> : null}
            {!isLoadingHistory && !historyError && historyRows.length === 0 ? <div className="text-sm text-slate-500">No history records found for this node.</div> : null}
            {historyRows.length > 0 ? <HistoryTable rows={historyRows} columns={columns} /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function TreeNodeButton({
  depth,
  node,
  selectedNodeId,
  onSelectNode,
}: {
  depth: number;
  node: ExplorerTreeNode;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}): JSX.Element {
  const selected = node.id === selectedNodeId;
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelectNode(node.id)}
        className={cn(
          "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
          selected ? "bg-cyan-300/12 text-white ring-1 ring-cyan-300/25" : "text-slate-300 hover:bg-cyan-300/8 hover:text-white",
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{node.label}</span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-slate-500">{node.type}{node.status ? ` / ${node.status}` : ""}</span>
        </span>
        {node.count !== undefined ? <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-400">{node.count}</span> : null}
      </button>
      {node.children?.map((child) => (
        <TreeNodeButton key={child.id} node={child} depth={depth + 1} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} />
      ))}
    </div>
  );
}

function getHistoryColumns(rows: HistoryRecord[]): string[] {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const timestampKey = keys.find((key) => ["timestamp", "snapshot_at", "created_at", "time"].includes(key));
  const ordered = timestampKey ? [timestampKey, ...keys.filter((key) => key !== timestampKey)] : keys;
  return ordered.slice(0, 8);
}

function HistoryTable({ rows, columns }: { rows: HistoryRecord[]; columns: string[] }): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-y border-white/10 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500">
            {columns.map((column) => <th key={column} className="px-3 py-3 font-medium">{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-white/[0.06] text-slate-300 hover:bg-white/[0.025]">
              {columns.map((column) => <td key={column} className="max-w-[220px] truncate px-3 py-3">{formatValue(row[column])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
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

function MetricChip({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs">
      <span className="uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="font-medium text-slate-100">{value}</span>
    </div>
  );
}

function StrategySelectorGrid({
  search,
  strategies,
  selectedId,
  onSearchChange,
  onSelect,
}: {
  search: string;
  strategies: StrategySummary[];
  selectedId?: string;
  onSearchChange: (value: string) => void;
  onSelect: (strategyId: string) => void;
}): JSX.Element {
  return (
    <div className="pointer-events-auto absolute left-0 top-full z-[100] mt-4 w-[min(820px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/70">
      <div className="border-b border-white/10 bg-slate-900/90 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/75">Select strategy</div>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search strategies..."
          className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40"
        />
      </div>

      <div className="grid grid-cols-[1.5fr_0.55fr_0.55fr_0.75fr_0.65fr] gap-4 bg-slate-900 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        <div>Strategy</div>
        <div>APY</div>
        <div>DD</div>
        <div>UnitPrice</div>
        <div>Status</div>
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        {strategies.map((strategy) => {
          const selected = strategy.id === selectedId;

          return (
            <button
              key={strategy.id}
              type="button"
              onClick={() => onSelect(strategy.id)}
              className={cn(
                "group grid w-full cursor-pointer grid-cols-[1.5fr_0.55fr_0.55fr_0.75fr_0.65fr] items-center gap-4 border-t border-white/10 px-5 py-4 text-left text-sm transition-all duration-200",
                "hover:-translate-y-[1px] hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:shadow-lg hover:shadow-cyan-950/25",
                selected ? "border-l-2 border-l-cyan-300 bg-cyan-300/15 text-white" : "bg-slate-950 text-slate-300",
              )}
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="truncate font-semibold text-white transition group-hover:text-cyan-50">{strategy.name}</div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-cyan-100 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                </div>
                {strategy.description ? (
                  <div className="mt-1 truncate text-xs text-slate-500 transition group-hover:text-slate-300">{strategy.description}</div>
                ) : null}
              </div>
              <div className="font-medium tabular-nums text-cyan-200 transition group-hover:text-cyan-100">{formatPercentOrNA(strategy.apy)}</div>
              <div className="font-medium tabular-nums text-amber-200 transition group-hover:text-amber-100">{formatPercentOrNA(strategy.maxDrawdown)}</div>
              <div className="font-medium tabular-nums text-slate-100 transition group-hover:text-white">{formatNumber(strategy.unitPrice)}</div>
              <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{strategy.status || "Tracked"}</div>
            </button>
          );
        })}
        {strategies.length === 0 ? (
          <div className="border-t border-white/10 px-5 py-5 text-sm text-slate-500">No strategies match your search.</div>
        ) : null}
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
