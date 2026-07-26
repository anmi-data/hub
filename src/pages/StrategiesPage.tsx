import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle, ChevronDown, Circle, LineChart, Loader2, ShieldCheck, TrendingUp, X, XCircle } from "lucide-react";
import { StrategyTimeSeriesChart, type ChartView } from "../components/charts/StrategyTimeSeriesChart";
import { getLocalizedCategory, getLocalizedText, getStrategyPresentation, localizedPath, type Locale, useLocale } from "../i18n/locale";
import anmiLogo from "./home/assets/anmi_logo_header.webp";
import { cn } from "./home/utils/cn";

type StrategySummary = {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  status?: string;
  apy?: number | null;
  change1dPct: number | null;
  change7dPct: number | null;
  change1yPct: number | null;
  changeYtdPct: number | null;
  apy30dPct: number | null;
  apyAllPct: number | null;
  dailyVar95Pct: number | null;
  lifetimeDays: number | null;
  maxDrawdown?: number | null;
  currentDrawdown?: number | null;
  unitPrice?: number | null;
  navUsd?: number | null;
  updatedAt?: string | null;
};

type StrategyGroupDataQualityLabel = "excellent" | "good" | "degraded" | "poor" | "unknown";

type StrategyGroupDataQuality = {
  score: number | null;
  label: StrategyGroupDataQualityLabel;
  latestBatchScore: number | null;
  emaPeriod: number | null;
  alpha: number | null;
  samples: number | null;
  components: {
    availability: number | null;
    status: number | null;
    warnings: number | null;
  };
  metricsReliable: boolean | null;
  warnings: string[];
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
  change1dPct: number | null;
  change7dPct: number | null;
  change1yPct: number | null;
  changeYtdPct: number | null;
  apy30dPct: number | null;
  apyAllPct: number | null;
  dailyVar95Pct: number | null;
  cagr?: number | null;
  volatility?: number | null;
  volatilityAnnualized?: number | null;
  sharpe?: number | null;
  sharpeRatio?: number | null;
  sortino?: number | null;
  sortinoRatio?: number | null;
  maxDrawdown?: number | null;
  currentDrawdown?: number | null;
  dataQuality?: StrategyGroupDataQuality | string | number | boolean | null;
  updatedAt?: string | null;
  warnings?: string[];
  isLiveTrackRecord?: boolean;
};

type ExplorerNode = {
  id: string;
  type: string;
  entityId: string;
  strategyId?: string;
  accountId?: string;
  protocolType?: string;
  defaultDataset?: string;
  header?: ExplorerHeaderField[];
  summary?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

type ExplorerHeaderField = {
  key: string;
  label: string;
  value: unknown;
  format?: string;
  unit?: string;
};

type StructuredWarning = {
  level: "info" | "warning" | "error" | string;
  code: string;
  message: string;
  nodeId?: string | null;
  entityId?: string | null;
};

type ExplorerTreeNode = ExplorerNode & {
  uiKey: string;
  label: string;
  headerFields: Array<{ key: string; label: string; value: string }>;
  summaryCards: Array<{ label: string; value: string; tone?: "default" | "good" | "warning" | "risk" }>;
  count?: number | null;
  status?: string | null;
  collectionStatus?: string | null;
  hasCollectionError?: boolean;
  latestErrorMessage?: string | null;
  updatedAt?: string | null;
  children?: ExplorerTreeNode[];
};

type FlatExplorerNode = ExplorerTreeNode & {
  depth: number;
  pathLabel: string;
};

type ExplorerDetails = {
  title: string;
  subtitle?: string | null;
  type: string;
  status?: string | null;
  headerFields: Array<{ key: string; label: string; value: string }>;
  summaryCards: Array<{ label: string; value: string; tone?: "default" | "good" | "warning" | "risk" }>;
  latest?: Record<string, unknown> | null;
  datasets: HistoryDataset[];
  warnings: string[];
  rawHeader?: ExplorerHeaderField[];
  rawSummary?: Record<string, unknown>;
  rawLatest?: Record<string, unknown> | null;
};

type HistoryDataset = {
  id: string;
  label: string;
  count?: number | null;
};

type ExplorerHistoryColumn = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "datetime" | string;
  format?: "text" | "number" | "currency" | "percent" | "datetime" | "boolean" | "address" | "tags" | string;
  unit?: "USD" | string;
};

type ExplorerHistoryPagination = {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type ExplorerHistory = {
  columns: ExplorerHistoryColumn[];
  rows: Array<Record<string, unknown>>;
  pagination: ExplorerHistoryPagination;
  search?: string;
};

type HistoryRecord = Record<string, unknown>;

type ChartMode = "nav_usd" | "unit_price";
type ApiStatus = "ok" | "nok";

type BenchmarkOption = {
  symbol: string;
  label: string;
  assetClass?: string | null;
  source?: string | null;
  status?: string | null;
};

type AdvancedMetricsWindow = "30d" | "90d" | "all";

type AdvancedMarketCorrelation = {
  symbol: string;
  correlation: number | null;
  observations: number;
};

type AdvancedReturnAutocorrelation = {
  lagDays: number;
  autocorrelation: number | null;
  observations: number;
};

type AdvancedMetricsResponse = {
  id: string;
  scopeType: "strategy" | "strategy_group";
  window: AdvancedMetricsWindow;
  timestamp: string | null;
  observations: number;
  correlations: AdvancedMarketCorrelation[];
  autocorrelations: AdvancedReturnAutocorrelation[];
  optimalFUncapped: number | null;
  optimalFCapped: number | null;
  kellyApprox: number | null;
  meanDailyReturn: number | null;
  dailyVolatility: number | null;
  maxLoss: number | null;
  dataQuality: number | null;
  warnings: string[];
};

type AssetDeltaItem = {
  assetSymbol: string;
  balanceQuantity: number;
  lpQuantity: number;
  derivativeQuantity: number;
  netDelta: number;
  sourceSymbols: string[];
};

type AssetDeltasResponse = {
  id: string;
  scopeType: "strategy" | "strategy_group";
  timestamp: string | null;
  deltas: AssetDeltaItem[];
  dataQuality: {
    status: "complete" | "partial";
    warnings: string[];
  };
};

type ApiChartSeriesPoint = {
  timestamp: string;
  rawValue?: number | null;
  normalizedValue?: number | null;
};

type BenchmarkCache = Record<string, NormalizedChartSeries>;
type PrimaryChartCache = Record<string, NormalizedChartSeries>;

type ApiChartSeries = {
  id?: string;
  key?: string;
  role?: string;
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
  raw: unknown;
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

type TimePoint = {
  time: number;
  value: number;
};

type VisibleSeriesPoint = TimePoint & {
  timestamp: string;
};

type Metric = {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
};

type ExposureMixKind =
  | "strategy_group_strategies"
  | "strategy_exposure"
  | "account_exposure"
  | "lp_pools"
  | "perp_margin"
  | "assets";

type ExposureMixItem = {
  key: string;
  label: string;
  value: number;
  amountUsd?: number | null;
  kind?: ExposureMixKind;
};

const DEFAULT_CHART_MODE: ChartMode = "unit_price";
const DEFAULT_BENCHMARK = "BTC";
const DEFAULT_ADVANCED_METRICS_WINDOW: AdvancedMetricsWindow = "90d";
const CHART_MODE_STORAGE_KEY = "anmi-hub:chart-mode:v1";
const SELECTED_BENCHMARK_STORAGE_KEY = "anmi-hub:selected-benchmark:v1";
const HISTORY_PAGE_SIZES = [10, 30, 50, 100] as const;
const DEFAULT_HISTORY_PAGE_SIZE: (typeof HISTORY_PAGE_SIZES)[number] = 50;
const benchmarkLabelFallbacks: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SPX: "S&P 500",
  XAU: "Gold",
  XAG: "Silver",
  CL: "WTI Crude Oil",
  NDX: "Nasdaq 100",
};

function createHistoryPagination(
  page = 1,
  pageSize: (typeof HISTORY_PAGE_SIZES)[number] = DEFAULT_HISTORY_PAGE_SIZE,
  totalRows = 0,
): ExplorerHistoryPagination {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  return {
    page: safePage,
    pageSize,
    totalRows,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };
}

function createEmptyHistory(
  page = 1,
  pageSize: (typeof HISTORY_PAGE_SIZES)[number] = DEFAULT_HISTORY_PAGE_SIZE,
): ExplorerHistory {
  return {
    columns: [],
    rows: [],
    pagination: createHistoryPagination(page, pageSize),
  };
}

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

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : asNumber(value) ?? null;
}

function normalizeDataQualityLabel(value: unknown): StrategyGroupDataQualityLabel {
  const label = asString(value)?.toLowerCase();
  return label === "excellent" || label === "good" || label === "degraded" || label === "poor" || label === "unknown"
    ? label
    : "unknown";
}

function normalizeDataQuality(value: Record<string, unknown>, fallback: unknown): StrategyGroupDataQuality | string | number | boolean | null {
  if (Object.keys(value).length === 0) {
    return asString(fallback) ?? asNumber(fallback) ?? null;
  }

  const components = isRecord(value.components) ? value.components : {};
  return {
    score: nullableNumber(value.score),
    label: normalizeDataQualityLabel(value.label),
    latestBatchScore: nullableNumber(value.latestBatchScore ?? value.latest_batch_score),
    emaPeriod: nullableNumber(value.emaPeriod ?? value.ema_period),
    alpha: nullableNumber(value.alpha),
    samples: nullableNumber(value.samples),
    components: {
      availability: nullableNumber(components.availability),
      status: nullableNumber(components.status),
      warnings: nullableNumber(components.warnings),
    },
    metricsReliable: typeof value.metricsReliable === "boolean" ? value.metricsReliable : null,
    warnings: Array.isArray(value.warnings) ? value.warnings.map(asString).filter((item): item is string => Boolean(item)) : [],
  };
}

function getRecordValue(value: unknown, keys: string[]): unknown {
  if (!isRecord(value)) return undefined;
  for (const key of keys) {
    if (key in value) return value[key];
  }
  return undefined;
}

function isValidPointStatus(point: unknown): boolean {
  const status = String(
    getRecordValue(point, ["status"]) ??
    getRecordValue(point, ["dataStatus"]) ??
    getRecordValue(point, ["quality"]) ??
    getRecordValue(point, ["dataQuality"]) ??
    getRecordValue(point, ["snapshotStatus"]) ??
    "",
  ).toLowerCase();

  if (!status) return true;

  return !["error", "partial", "missing", "failed", "invalid"].includes(status);
}

function getChartPointValue(
  chartMode: ChartMode,
  seriesType: "primary" | "benchmark",
  rawValue: number | null,
  normalizedValue: number | null,
): number | null {
  if (chartMode === "nav_usd") {
    return rawValue ?? normalizedValue ?? null;
  }

  if (seriesType === "benchmark") {
    return normalizedValue ?? rawValue ?? null;
  }

  return rawValue ?? normalizedValue ?? null;
}

type StrategyGroupPresentation = {
  name?: string;
  description?: string;
};

function normalizeStrategyGroupPresentations(payload: unknown, locale: Locale): Map<string, StrategyGroupPresentation> {
  const presentations = new Map<string, StrategyGroupPresentation>();
  asArray(payload).forEach((item) => {
    if (!isRecord(item)) return;
    const id = asString(item.id) ?? asString(item.groupId) ?? asString(item.group_id);
    if (!id) return;
    presentations.set(id, {
      name: getLocalizedText(item.name ?? item.group_name_json, locale),
      description: getLocalizedText(item.description ?? item.group_description_json, locale),
    });
  });
  return presentations;
}

function normalizeStrategyRecord(
  item: unknown,
  locale: Locale,
  groupPresentations: Map<string, StrategyGroupPresentation>,
): StrategySummary | undefined {
  if (!isRecord(item)) return undefined;
  const metrics = isRecord(item.metrics) ? item.metrics : {};
  const id = asString(item.group_id) ?? asString(item.groupId) ?? asString(item.id);
  if (!id) return undefined;
  const localizedPresentation = getStrategyPresentation(id, locale);
  const apiGroupPresentation = groupPresentations.get(localizedPresentation.groupId);
  const strategy: StrategySummary = {
    id,
    groupId: localizedPresentation.groupId,
    name:
      getLocalizedText(item.group_name_json ?? item.displayName ?? item.name ?? item.label, locale) ??
      apiGroupPresentation?.name ??
      localizedPresentation.name ??
      id,
    change1dPct: nullableNumber(item.change1dPct),
    change7dPct: nullableNumber(item.change7dPct),
    change1yPct: nullableNumber(item.change1yPct),
    changeYtdPct: nullableNumber(item.changeYtdPct),
    apy30dPct: nullableNumber(item.apy30dPct),
    apyAllPct: nullableNumber(item.apyAllPct),
    dailyVar95Pct: nullableNumber(item.dailyVar95Pct),
    lifetimeDays: nullableNumber(item.lifetimeDays),
  };
  const description =
    getLocalizedText(item.group_description_json ?? item.description, locale) ??
    apiGroupPresentation?.description ??
    localizedPresentation.description;
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

function normalizeStrategies(strategiesPayload: unknown, groupsPayload: unknown, locale: Locale): StrategySummary[] {
  const groupPresentations = normalizeStrategyGroupPresentations(groupsPayload, locale);
  return asArray(strategiesPayload)
    .map((item) => normalizeStrategyRecord(item, locale, groupPresentations))
    .filter((item): item is StrategySummary => Boolean(item));
}

function normalizeGroupHeader(raw: unknown, locale: Locale, fallback?: StrategySummary): StrategyGroupHeader {
  const root = isRecord(raw) ? raw : {};
  const group = isRecord(root.group) ? root.group : {};
  const summary = isRecord(root.summary) ? root.summary : isRecord(group.summary) ? group.summary : {};
  const metrics = isRecord(root.metrics) ? root.metrics : isRecord(group.metrics) ? group.metrics : {};
  const dataQuality = isRecord(root.dataQuality) ? root.dataQuality : isRecord(root.data_quality) ? root.data_quality : {};
  const liveTrackRecord = isRecord(root.liveTrackRecord) ? root.liveTrackRecord : isRecord(root.live_track_record) ? root.live_track_record : {};
  const id = asString(group.id) ?? asString(root.id) ?? fallback?.id ?? "";
  const name = fallback?.name ?? getLocalizedText(group.name, locale) ?? getLocalizedText(root.name, locale) ?? id;
  const warnings = [
    ...(Array.isArray(root.warnings) ? root.warnings : []),
    ...(Array.isArray(dataQuality.warnings) ? dataQuality.warnings : []),
  ].map(asString).filter((item): item is string => Boolean(item));
  const normalized: StrategyGroupHeader = {
    id,
    name,
    description: fallback?.description ?? getLocalizedText(group.description, locale) ?? getLocalizedText(root.description, locale) ?? null,
    status: asString(group.status) ?? asString(root.status) ?? asString(liveTrackRecord.status) ?? fallback?.status ?? null,
    unitPrice: firstNumber(summary.unitPrice, summary.unit_price, group.unitPrice, group.unit_price, root.unitPrice, root.unit_price, fallback?.unitPrice),
    navUsd: firstNumber(summary.navUsd, summary.nav_usd, group.navUsd, group.nav_usd, root.navUsd, root.nav_usd, fallback?.navUsd),
    totalReturn: firstNumber(metrics.totalReturnPct, metrics.totalReturn, metrics.total_return, root.totalReturnPct, root.totalReturn, root.total_return),
    apy: firstNumber(metrics.apyPct, metrics.apy, root.apyPct, root.apy, fallback?.apy),
    change1dPct: nullableNumber(metrics.change1dPct),
    change7dPct: nullableNumber(metrics.change7dPct),
    change1yPct: nullableNumber(metrics.change1yPct),
    changeYtdPct: nullableNumber(metrics.changeYtdPct),
    apy30dPct: nullableNumber(metrics.apy30dPct),
    apyAllPct: nullableNumber(metrics.apyAllPct),
    dailyVar95Pct: nullableNumber(metrics.dailyVar95Pct),
    cagr: firstNumber(metrics.cagrPct, metrics.cagr, root.cagrPct, root.cagr),
    volatility: firstNumber(metrics.volatilityAnnualizedPct, metrics.volatilityAnnualized, metrics.volatility, root.volatilityAnnualizedPct, root.volatility),
    volatilityAnnualized: firstNumber(metrics.volatilityAnnualizedPct, metrics.volatilityAnnualized, metrics.volatility_annualized, root.volatilityAnnualizedPct, root.volatilityAnnualized),
    sharpe: firstNumber(metrics.sharpeRatio, metrics.sharpe, root.sharpeRatio, root.sharpe),
    sharpeRatio: firstNumber(metrics.sharpeRatio, metrics.sharpe_ratio, metrics.sharpe, root.sharpeRatio, root.sharpe_ratio, root.sharpe),
    sortino: firstNumber(metrics.sortinoRatio, metrics.sortino, root.sortinoRatio, root.sortino),
    sortinoRatio: firstNumber(metrics.sortinoRatio, metrics.sortino_ratio, metrics.sortino, root.sortinoRatio, root.sortino_ratio, root.sortino),
    maxDrawdown: firstNumber(metrics.maxDrawdownPct, metrics.maxDrawdown, metrics.max_drawdown, root.maxDrawdownPct, root.maxDrawdown, root.max_drawdown, fallback?.maxDrawdown),
    currentDrawdown: firstNumber(metrics.currentDrawdownPct, metrics.currentDrawdown, metrics.current_drawdown, root.currentDrawdownPct, root.currentDrawdown, root.current_drawdown, fallback?.currentDrawdown),
    dataQuality: normalizeDataQuality(dataQuality, root.dataQuality),
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

function normalizeTreeNode(item: unknown, parentPath: string, locale: Locale, index = 0): ExplorerTreeNode | undefined {
  if (!isRecord(item)) return undefined;
  const id = asString(item.id) ?? asString(item.nodeId) ?? asString(item.key) ?? `node-${index}`;
  const type = asString(item.type) ?? asString(item.nodeType) ?? "node";
  const label = getLocalizedText(item.label ?? item.name, locale) ?? id;
  const pathPart = `${type}:${id}:${label}:${index}`;
  const uiKey = parentPath ? `${parentPath}/${pathPart}` : pathPart;
  const meta = isRecord(item.meta) ? item.meta : {};
  const fallbackEntityId = id.includes(":") ? id.slice(id.indexOf(":") + 1) : id;
  const entityId = asString(item.entityId) ?? asString(item.entity_id) ?? asString(meta.entityId) ?? asString(meta.entity_id) ?? fallbackEntityId;
  const strategyId = asString(item.strategyId) ?? asString(item.strategy_id) ?? asString(meta.strategyId) ?? asString(meta.strategy_id);
  const accountId = asString(item.accountId) ?? asString(item.account_id) ?? asString(meta.accountId) ?? asString(meta.account_id);
  const protocolType = asString(item.protocolType) ?? asString(item.protocol_type) ?? asString(item.protocol) ?? asString(meta.protocolType) ?? asString(meta.protocol_type) ?? asString(meta.protocol);
  const defaultDataset = asString(item.defaultDataset) ?? asString(item.default_dataset);
  const header = normalizeRawHeaderFields(item.header, locale);
  const summary = isRecord(item.summary) ? item.summary : undefined;
  const children = asArray(item.children)
    .map((child, childIndex) => normalizeTreeNode(child, uiKey, locale, childIndex))
    .filter((node): node is ExplorerTreeNode => Boolean(node));
  const node: ExplorerTreeNode = {
    id,
    type,
    entityId,
    label,
    uiKey,
    header,
    summary,
    headerFields: normalizeHeaderFields(item.header, locale),
    summaryCards: normalizeSummaryCards(summary, locale, type, protocolType?.toLowerCase()),
  };
  const count = firstNumber(item.count, item.rows, item.total);
  const status = asString(item.status);
  const collectionStatus = asString(item.collectionStatus) ?? asString(item.collection_status);
  const latestErrorMessage = asString(item.latestErrorMessage) ?? asString(item.latest_error_message);
  const updatedAt = asString(item.updatedAt) ?? asString(item.updated_at) ?? asString(item.timestamp);
  if (count !== null) node.count = count;
  if (status) node.status = status;
  if (collectionStatus) node.collectionStatus = collectionStatus;
  if (typeof item.hasCollectionError === "boolean") node.hasCollectionError = item.hasCollectionError;
  if (typeof item.has_collection_error === "boolean") node.hasCollectionError = item.has_collection_error;
  if (latestErrorMessage) node.latestErrorMessage = latestErrorMessage;
  if (updatedAt) node.updatedAt = updatedAt;
  if (strategyId) node.strategyId = strategyId;
  if (accountId) node.accountId = accountId;
  if (protocolType) node.protocolType = protocolType.toLowerCase();
  if (defaultDataset) node.defaultDataset = defaultDataset;
  if (Object.keys(meta).length > 0) node.meta = meta;
  if (children.length > 0) node.children = children;
  return node;
}

function normalizeTree(payload: unknown, locale: Locale): ExplorerTreeNode[] {
  if (isRecord(payload) && isRecord(payload.root)) {
    const root = normalizeTreeNode(payload.root, "", locale, 0);
    return root ? [root] : [];
  }
  const nodes = asArray(payload);
  if (nodes.length > 0) {
    return nodes.map((item, index) => normalizeTreeNode(item, "", locale, index)).filter((node): node is ExplorerTreeNode => Boolean(node));
  }
  const single = normalizeTreeNode(payload, "", locale, 0);
  return single ? [single] : [];
}

function normalizeStructuredWarning(item: unknown): StructuredWarning | undefined {
  if (!isRecord(item)) return undefined;
  const message = asString(item.message);
  if (!message) return undefined;
  return {
    level: asString(item.level) ?? "warning",
    code: asString(item.code) ?? "warning",
    message,
    nodeId: asString(item.nodeId) ?? asString(item.node_id) ?? null,
    entityId: asString(item.entityId) ?? asString(item.entity_id) ?? null,
  };
}

function getTreeStructuredWarnings(payload: unknown): StructuredWarning[] {
  if (!isRecord(payload)) return [];
  const dataQuality = isRecord(payload.dataQuality) ? payload.dataQuality : isRecord(payload.data_quality) ? payload.data_quality : {};
  const rawStructured = Array.isArray(dataQuality.structuredWarnings)
    ? dataQuality.structuredWarnings
    : Array.isArray(dataQuality.structured_warnings)
      ? dataQuality.structured_warnings
      : [];
  const structured = rawStructured.map(normalizeStructuredWarning).filter((item): item is StructuredWarning => Boolean(item));
  if (structured.length > 0) return structured;

  const rawWarnings = Array.isArray(dataQuality.warnings) ? dataQuality.warnings : Array.isArray(payload.warnings) ? payload.warnings : [];
  return rawWarnings
    .map(asString)
    .filter((message): message is string => Boolean(message))
    .map((message) => ({ level: "warning", code: "warning", message, nodeId: null, entityId: null }));
}

function findTreeNode(nodes: ExplorerTreeNode[], uiKey: string | null): ExplorerTreeNode | undefined {
  if (!uiKey) return undefined;
  for (const node of nodes) {
    if (node.uiKey === uiKey) return node;
    const child = findTreeNode(node.children ?? [], uiKey);
    if (child) return child;
  }
  return undefined;
}

function getFirstTreeNode(nodes: ExplorerTreeNode[]): ExplorerTreeNode | undefined {
  return nodes[0];
}

function flattenExplorerNodes(
  nodes: ExplorerTreeNode[],
  depth = 0,
  parentLabels: string[] = [],
): FlatExplorerNode[] {
  return nodes.flatMap((node) => {
    const pathLabels = [...parentLabels, node.label];
    const current: FlatExplorerNode = {
      ...node,
      depth,
      pathLabel: pathLabels.join(" / "),
    };

    return [
      current,
      ...flattenExplorerNodes(node.children ?? [], depth + 1, pathLabels),
    ];
  });
}

function getEntityId(node: ExplorerNode): string {
  return node.entityId;
}

function getDefaultDatasetForNode(node: ExplorerNode): string {
  if (node.defaultDataset) return node.defaultDataset;
  switch (node.type) {
    case "balance_group":
      return "balances";
    case "position_group":
      if (node.protocolType === "lp") return "positions_lp";
      if (node.protocolType === "vault") return "positions_vaults";
      if (node.protocolType === "futures" || node.protocolType === "perp") return "positions_futures";
      return "positions_generic";
    case "strategy_group":
    case "strategy":
    case "account":
    default:
      return "snapshots";
  }
}

export function buildExplorerDetailsUrl(apiBaseUrl: string, groupId: string, node: ExplorerNode): string {
  const params = new URLSearchParams();

  params.set("type", node.type);
  params.set("id", getEntityId(node));
  params.set("groupId", groupId);
  params.set("includeRaw", "false");

  if (node.strategyId) params.set("strategyId", node.strategyId);
  if (node.accountId) params.set("accountId", node.accountId);
  if (node.protocolType) params.set("protocolType", node.protocolType);

  return `${apiBaseUrl}/explorer/details?${params.toString()}`;
}

export function buildExplorerHistoryUrl(
  apiBaseUrl: string,
  groupId: string,
  node: ExplorerNode,
  dataset: string,
  page: number,
  pageSize: (typeof HISTORY_PAGE_SIZES)[number],
  search?: string,
): string {
  const params = new URLSearchParams();

  params.set("type", node.type);
  params.set("id", getEntityId(node));
  params.set("dataset", dataset);
  params.set("groupId", groupId);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  params.set("includeRaw", "false");
  if (search?.trim()) params.set("search", search.trim().slice(0, 200));

  if (node.strategyId) params.set("strategyId", node.strategyId);
  if (node.accountId) params.set("accountId", node.accountId);
  if (node.protocolType) params.set("protocolType", node.protocolType);

  return `${apiBaseUrl}/explorer/history?${params.toString()}`;
}

function unwrapDetailsPayload(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) return {};
  if (isRecord(payload.details)) return payload.details;
  if (isRecord(payload.data)) {
    if (isRecord(payload.data.details)) return payload.data.details;
    return payload.data;
  }
  return payload;
}

function normalizeDatasetItem(item: unknown): HistoryDataset | undefined {
  if (typeof item === "string") return { id: item, label: formatDatasetLabel(item) };
  if (!isRecord(item)) return undefined;
  const id = asString(item.id) ?? asString(item.key) ?? asString(item.dataset) ?? asString(item.name);
  if (!id) return undefined;
  return {
    id,
    label: formatDatasetLabel(asString(item.label) ?? id),
    count: firstNumber(item.count, item.rows, item.total),
  };
}

function normalizeDatasets(source: Record<string, unknown>, node?: ExplorerTreeNode): HistoryDataset[] {
  const history = isRecord(source.history) ? source.history : {};
  const data = isRecord(source.data) ? source.data : {};
  const availableHistory = isRecord(source.availableHistory) ? source.availableHistory : {};
  const candidates = [
    source.availableHistory,
    availableHistory.datasets,
    source.datasets,
    source.historyDatasets,
    source.availableDatasets,
    history.datasets,
    data.datasets,
  ];
  const rawDatasets = candidates.find(Array.isArray);
  const datasets = (Array.isArray(rawDatasets) ? rawDatasets : [])
    .map(normalizeDatasetItem)
    .filter((item): item is HistoryDataset => Boolean(item));
  if (datasets.length > 0) return datasets;
  const fallbackId = node ? getDefaultDatasetForNode(node) : "snapshots";
  return [{ id: fallbackId, label: formatDatasetLabel(fallbackId) }];
}

function getSummaryPriorityKeys(nodeType?: string, protocolType?: string): string[] {
  if (nodeType === "account") {
    return [
      "navUsd", "walletNavUsd", "walletWeight", "lpNavUsd", "lpFeesUsd", "lpWeight", "perpNavUsd", "perpWeight",
      "leverage", "unrealizedPnlUsd", "realizedPnlUsd", "fundingUsd", "accountWeight", "marginUsage", "updatedAt",
    ];
  }
  if (nodeType === "position_group" && (protocolType === "lp" || protocolType === "vault")) {
    return ["lpNavUsd", "feesUsd", "unclaimedFeesUsd", "inRange", "rangeUtilization", "feesYield", "lpPnlUsd", "impermanentRisk", "updatedAt"];
  }
  if (nodeType === "position_group" && (protocolType === "futures" || protocolType === "perp")) {
    return ["notionalUsd", "marginUsd", "unrealizedPnlUsd", "realizedPnlUsd", "pnlPct", "fundingUsd", "fundingRate", "liquidationPrice", "distanceToLiquidation", "updatedAt"];
  }
  if (nodeType === "balance_group") {
    return ["aumUsd", "stablecoinShare", "volatileAssetExposure", "updatedAt"];
  }
  return [];
}

function isInternalSummaryKey(key: string): boolean {
  return key.startsWith("_") || ["raw", "debug", "meta", "metadata"].includes(key);
}

function orderSummaryEntries(entries: Array<[string, unknown]>, nodeType?: string, protocolType?: string): Array<[string, unknown]> {
  const priority = getSummaryPriorityKeys(nodeType, protocolType);
  if (priority.length === 0) return entries.filter(([key]) => !isInternalSummaryKey(key));
  const byKey = new Map(entries);
  const prioritized = priority
    .filter((key) => byKey.has(key))
    .map((key): [string, unknown] => [key, byKey.get(key)]);
  const rest = entries.filter(([key]) => !priority.includes(key) && !isInternalSummaryKey(key));
  return [...prioritized, ...rest];
}

function normalizeSummaryCards(value: unknown, locale: Locale, nodeType?: string, protocolType?: string): ExplorerDetails["summaryCards"] {
  if (Array.isArray(value)) {
    return value
      .map((item): ExplorerDetails["summaryCards"][number] | undefined => {
        if (!isRecord(item)) return undefined;
        const label = getLocalizedText(item.label ?? item.name ?? item.key, locale);
        if (!label) return undefined;
        const rawValue = item.value ?? item.count ?? item.amount;
        return {
          label: formatMetricLabel(label),
          value: formatFieldValue(label, rawValue, locale),
          tone: asString(item.tone) as ExplorerDetails["summaryCards"][number]["tone"],
        };
      })
      .filter((item): item is ExplorerDetails["summaryCards"][number] => Boolean(item));
  }

  if (isRecord(value)) {
    return orderSummaryEntries(Object.entries(value), nodeType, protocolType)
      .map(([key, item]) => ({ label: formatMetricLabel(key), value: formatFieldValue(key, item, locale) }));
  }

  return [];
}

function formatExplorerHeaderValue(field: string, value: unknown, locale: Locale, format?: string | null, unit?: string | null): string {
  if (value === null || value === undefined) return isStrategyContractMetricField(field) ? "—" : formatEmptyValue();
  if (isLifetimeDaysField(field)) return formatLifetimeDays(asNumber(value));
  const normalizedFormat = format?.trim().toLowerCase();
  if (normalizedFormat === "usd" || normalizedFormat === "currency") return formatUsdOrNA(asNumber(value));
  if (normalizedFormat === "percent" || normalizedFormat === "percentage") {
    const numericValue = asNumber(value);
    if (numericValue === undefined) return formatValue(value);
    if (isDailyVar95Field(field)) return formatRiskPercentPointsOrDash(numericValue);
    return isPercentagePointsField(field) ? formatPercentPointsOrDash(numericValue) : formatPercent(numericValue);
  }
  if (normalizedFormat === "datetime") return formatDateTime(value);
  if (normalizedFormat === "address") return formatAddress(value);
  if (normalizedFormat === "tags") return formatTags(value);
  if (normalizedFormat === "boolean") return typeof value === "boolean" ? (value ? "Yes" : "No") : formatValue(value);
  if (normalizedFormat === "number") return formatNumberOrNA(asNumber(value));
  const formatted = formatFieldValue(field, value, locale);
  return unit && formatted !== "N/A" ? `${formatted} ${unit}` : formatted;
}

function normalizeHeaderFields(value: unknown, locale: Locale): ExplorerDetails["headerFields"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): ExplorerDetails["headerFields"][number] | undefined => {
      if (!isRecord(item)) return undefined;
      const key = asString(item.key) ?? asString(item.id) ?? asString(item.name);
      if (!key) return undefined;
      const label = getLocalizedText(item.label, locale) ?? formatMetricLabel(key);
      return {
        key,
        label: formatMetricLabel(label),
        value: formatExplorerHeaderValue(key, item.value, locale, asString(item.format) ?? null, asString(item.unit) ?? null),
      };
    })
    .filter((item): item is ExplorerDetails["headerFields"][number] => Boolean(item));
}

function normalizeRawHeaderFields(value: unknown, locale: Locale): ExplorerHeaderField[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const fields = value
    .map((item): ExplorerHeaderField | undefined => {
      if (!isRecord(item)) return undefined;
      const key = asString(item.key) ?? asString(item.id) ?? asString(item.name);
      if (!key) return undefined;
      return {
        key,
        label: getLocalizedText(item.label, locale) ?? formatMetricLabel(key),
        value: item.value,
        format: asString(item.format),
        unit: asString(item.unit),
      };
    })
    .filter((item): item is ExplorerHeaderField => Boolean(item));
  return fields.length > 0 ? fields : undefined;
}

function normalizeDetails(payload: unknown, locale: Locale, node?: ExplorerTreeNode): ExplorerDetails {
  const source = unwrapDetailsPayload(payload);
  const responseNode = isRecord(source.node) ? source.node : {};
  const headerFields = normalizeHeaderFields(source.header, locale);
  const rawHeader = normalizeRawHeaderFields(source.header, locale);
  const rawSummary = isRecord(source.summary) ? source.summary : undefined;
  const detailsType = asString(source.type) ?? asString(responseNode.type) ?? node?.type ?? "node";
  const detailsProtocolType = asString(source.protocolType) ?? asString(source.protocol_type) ?? asString(responseNode.protocolType) ?? asString(responseNode.protocol_type) ?? node?.protocolType;
  const summaryCards = [
    ...normalizeSummaryCards(source.summary, locale, detailsType, detailsProtocolType),
    ...normalizeSummaryCards(source.summaryCards, locale, detailsType, detailsProtocolType),
    ...normalizeSummaryCards(source.cards, locale, detailsType, detailsProtocolType),
    ...normalizeSummaryCards(source.metrics, locale, detailsType, detailsProtocolType),
  ];
  const latest = isRecord(source.latest) ? source.latest : isRecord(source.latestSnapshot) ? source.latestSnapshot : isRecord(source.snapshot) ? source.snapshot : null;
  const latestCards = summaryCards.length === 0 && latest
    ? Object.entries(latest).slice(0, 8).map(([key, value]) => ({ label: formatMetricLabel(key), value: formatFieldValue(key, value, locale) }))
    : [];
  const dataQuality = isRecord(source.dataQuality) ? source.dataQuality : isRecord(source.data_quality) ? source.data_quality : {};
  const warnings = [
    ...(Array.isArray(source.warnings) ? source.warnings : []),
    ...(Array.isArray(dataQuality.warnings) ? dataQuality.warnings : []),
  ].map(asString).filter((item): item is string => Boolean(item));
  return {
    title: asString(source.title) ?? asString(responseNode.label) ?? asString(source.label) ?? asString(source.name) ?? node?.label ?? "Node details",
    subtitle: asString(source.subtitle) ?? asString(source.description) ?? null,
    type: detailsType,
    status: asString(source.status) ?? asString(responseNode.status) ?? node?.status ?? null,
    headerFields: headerFields.length > 0 ? headerFields : node?.headerFields ?? [],
    summaryCards: summaryCards.length > 0 ? summaryCards : node?.summaryCards.length ? node.summaryCards : latestCards,
    latest,
    datasets: normalizeDatasets(source, node),
    warnings,
    rawHeader,
    rawSummary,
    rawLatest: latest,
  };
}

function uniqueMetricRows(rows: Metric[]): Metric[] {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = normalizeMetricKey(row.label);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function buildNodeCurrentMetrics(details: ExplorerDetails | null, locale: Locale, selectedNode?: ExplorerTreeNode): Metric[] {
  const headerRows: Metric[] = (details?.headerFields.length
    ? details.headerFields
    : selectedNode?.headerFields ?? []
  ).map((field) => ({
    label: field.label,
    value: field.value,
  }));

  const summaryRows: Metric[] = (details?.summaryCards.length
    ? details.summaryCards
    : selectedNode?.summaryCards ?? []
  ).map((card) => ({
    label: card.label,
    value: card.value,
  }));

  const latestRows: Metric[] = details?.latest
    ? Object.entries(details.latest)
        .filter(([key]) => !["data", "raw", "metadata", "meta"].includes(key))
        .slice(0, 8)
        .map(([key, value]) => ({
          label: formatMetricLabel(key),
          value: formatFieldValue(key, value, locale),
        }))
    : [];

  return uniqueMetricRows([...headerRows, ...summaryRows, ...latestRows]);
}


function normalizeHistoryColumn(item: unknown): ExplorerHistoryColumn | undefined {
  if (typeof item === "string") return { key: item, label: formatMetricLabel(item), type: "string" };
  if (!isRecord(item)) return undefined;
  const key = asString(item.key) ?? asString(item.id) ?? asString(item.name);
  if (!key) return undefined;
  return {
    key,
    label: formatMetricLabel(asString(item.label) ?? key),
    type: asString(item.type) ?? "string",
    format: asString(item.format),
    unit: asString(item.unit),
  };
}

function unwrapHistoryPayload(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) return {};
  return isRecord(payload.data) ? payload.data : payload;
}

function normalizeHistory(
  payload: unknown,
  fallbackPage: number,
  fallbackPageSize: (typeof HISTORY_PAGE_SIZES)[number],
  fallbackSearch: string,
): ExplorerHistory {
  const source = unwrapHistoryPayload(payload);
  const rows = (Array.isArray(source.rows) ? source.rows : Array.isArray(source.items) ? source.items : Array.isArray(source.records) ? source.records : Array.isArray(source.history) ? source.history : [])
    .filter(isRecord)
    .map((row) => ({ ...row }));
  const normalizedColumns = (Array.isArray(source.columns) ? source.columns : [])
    .map(normalizeHistoryColumn)
    .filter((column): column is ExplorerHistoryColumn => Boolean(column));
  const columns = normalizedColumns;
  const pagination = isRecord(source.pagination) ? source.pagination : {};
  const page = firstNumber(pagination.page) ?? fallbackPage;
  const pageSize = firstNumber(pagination.pageSize, pagination.page_size) ?? fallbackPageSize;
  const safePageSize = HISTORY_PAGE_SIZES.find((option) => option === pageSize) ?? fallbackPageSize;
  const totalRows = firstNumber(pagination.totalRows, pagination.total_rows, source.totalRows, source.total) ?? rows.length;
  const totalPages = firstNumber(pagination.totalPages, pagination.total_pages) ?? Math.max(1, Math.ceil(totalRows / safePageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));

  return {
    columns: columns.filter((column) => !isStatusField(column.key) && !isMessageField(column.key)),
    rows,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      totalRows,
      totalPages,
      hasNextPage: typeof pagination.hasNextPage === "boolean" ? pagination.hasNextPage : safePage < totalPages,
      hasPreviousPage: typeof pagination.hasPreviousPage === "boolean" ? pagination.hasPreviousPage : safePage > 1,
    },
    search: asString(source.search) ?? (isRecord(source.search) ? asString(source.search.query) : undefined) ?? fallbackSearch,
  };
}

function formatHistoryRange(page: number, pageSize: number, totalRows: number, search: string): string {
  const isSearchActive = search.trim().length > 0;
  if (totalRows === 0) return isSearchActive ? "0 matching records" : "0 records";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRows);
  return `${start}-${end} of ${totalRows} ${isSearchActive ? "matching records" : "records"}`;
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatPercent(value: number): string {
  const percent = Math.abs(value) <= 1 ? value * 100 : value;
  return `${percent.toFixed(2)}%`;
}

function formatPercentOrNA(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? "N/A" : formatPercent(value);
}

function formatPercentPointsOrDash(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function formatRiskPercentPointsOrDash(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${Math.abs(value).toFixed(2)}%`;
}

function formatLifetimeDays(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function getChangeValueClassName(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) return "text-slate-100";
  return value > 0 ? "text-emerald-300" : "text-rose-300";
}

type StrategyMetricKey =
  | "change1dPct"
  | "change7dPct"
  | "change1yPct"
  | "changeYtdPct"
  | "apy30dPct"
  | "apyAllPct"
  | "dailyVar95Pct"
  | "lifetimeDays";

type StrategySortKey = "name" | StrategyMetricKey;
type SortDirection = "asc" | "desc";

type StrategyMetricColumn = {
  key: StrategyMetricKey;
  label: string;
  hint: string;
  format: (value: number | null) => string;
  valueClassName: (value: number | null) => string;
};

const YTD_TOOLTIP = "Изменение unit price с начала текущего календарного года (YTD).";
const VAR_95_TOOLTIP = "Максимальная ожидаемая однодневная потеря при 95% уровне доверия на основе исторических изменений unit price";

const STRATEGY_METRIC_COLUMNS: StrategyMetricColumn[] = [
  {
    key: "change1dPct",
    label: "1 day change",
    hint: "Изменение unit price за последний день.",
    format: formatPercentPointsOrDash,
    valueClassName: getChangeValueClassName,
  },
  {
    key: "change7dPct",
    label: "1 week change",
    hint: "Изменение unit price за последнюю неделю.",
    format: formatPercentPointsOrDash,
    valueClassName: getChangeValueClassName,
  },
  {
    key: "change1yPct",
    label: "1 year change",
    hint: "Изменение unit price за последний год.",
    format: formatPercentPointsOrDash,
    valueClassName: getChangeValueClassName,
  },
  {
    key: "changeYtdPct",
    label: "This year change",
    hint: YTD_TOOLTIP,
    format: formatPercentPointsOrDash,
    valueClassName: getChangeValueClassName,
  },
  {
    key: "apy30dPct",
    label: "30D APY",
    hint: "Годовая доходность на основе изменения unit price за последние 30 дней.",
    format: formatPercentPointsOrDash,
    valueClassName: () => "text-cyan-200",
  },
  {
    key: "apyAllPct",
    label: "All-time APY",
    hint: "Годовая доходность за всю доступную историю unit price.",
    format: formatPercentPointsOrDash,
    valueClassName: () => "text-cyan-200",
  },
  {
    key: "dailyVar95Pct",
    label: "1 day VaR (95%)",
    hint: VAR_95_TOOLTIP,
    format: formatRiskPercentPointsOrDash,
    valueClassName: () => "text-amber-200",
  },
  {
    key: "lifetimeDays",
    label: "Lifetime",
    hint: "Количество полных дней между первым и последним наблюдением стратегии.",
    format: formatLifetimeDays,
    valueClassName: () => "text-slate-100",
  },
];

function compareNullableMetricValues(
  left: number | null,
  right: number | null,
  direction: SortDirection,
): number {
  const leftMissing = left === null || !Number.isFinite(left);
  const rightMissing = right === null || !Number.isFinite(right);
  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;
  return direction === "asc" ? left - right : right - left;
}

function formatRatioPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Unknown";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
}

function formatNumberOrNA(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function formatAdvancedNumber(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined || !Number.isFinite(value) ? "—" : value.toFixed(digits);
}

function formatCorrelation(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function autocorrelationInterpretation(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  if (value > 0.2) return "Trend persistence";
  if (value < -0.2) return "Mean reversion";
  return "Weak / neutral";
}

function formatUsdOrNA(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function isStrategyGroupDataQuality(value: unknown): value is StrategyGroupDataQuality {
  return isRecord(value) && "components" in value && "metricsReliable" in value;
}

function formatDataQuality(value: StrategyGroupHeader["dataQuality"]): string {
  if (value === null || value === undefined) return "N/A";
  if (isStrategyGroupDataQuality(value)) return `${formatRatioPercent(value.score)} (${value.label})`;
  if (typeof value === "boolean") return value ? "Reliable" : "Review";
  return String(value);
}

function formatDataQualityDetail(value: number | null | undefined): string {
  return value === null || value === undefined ? "Unknown" : formatRatioPercent(value);
}

function formatDataQualityHint(value: StrategyGroupDataQuality): string {
  const details = [
    `Label: ${value.label}`,
    `Samples: ${value.samples ?? "Unknown"} batches`,
  ];
  if (value.latestBatchScore !== null) details.push(`Latest batch: ${formatDataQualityDetail(value.latestBatchScore)}`);
  if (value.components.availability !== null) details.push(`Availability: ${formatDataQualityDetail(value.components.availability)}`);
  if (value.components.status !== null) details.push(`Status: ${formatDataQualityDetail(value.components.status)}`);
  if (value.components.warnings !== null) details.push(`Warnings: ${formatDataQualityDetail(value.components.warnings)}`);
  if (value.metricsReliable !== null) details.push(`Metrics reliable: ${value.metricsReliable ? "Yes" : "No"}`);
  if (value.emaPeriod !== null) details.push(`EMA period: ${value.emaPeriod}`);
  if (value.alpha !== null) details.push(`Alpha: ${formatNumberOrNA(value.alpha, 4)}`);
  return details.join(" | ");
}

function formatValue(value: unknown): string {
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return "N/A";
    return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
  }
  if (value !== null && typeof value === "object") {
    try {
      const serialized = JSON.stringify(value);
      return serialized.length > 120 ? `${serialized.slice(0, 117)}...` : serialized;
    } catch {
      return "Object";
    }
  }
  return "N/A";
}

function formatEmptyValue(): string {
  return "-";
}

function formatAddress(value: unknown): string {
  const address = asString(value);
  if (!address) return formatEmptyValue();
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

function formatTags(value: unknown): string {
  if (Array.isArray(value)) {
    const tags = value.map((item) => formatValue(item)).filter((item) => item !== "N/A");
    return tags.length > 0 ? tags.join(", ") : formatEmptyValue();
  }
  return formatValue(value);
}

function isAumField(value: string): boolean {
  const normalized = value.replace(/[\s_-]+/g, "").toLowerCase();
  return normalized === "nav" || normalized === "navusd" || normalized === "aum" || normalized === "aumusd";
}

function isUsdField(value: string): boolean {
  const normalized = value.replace(/[\s_-]+/g, "").toLowerCase();
  return normalized.endsWith("usd") || normalized.includes("usd");
}

function isPercentField(value: string): boolean {
  const normalized = value.replace(/[\s_-]+/g, "").toLowerCase();
  return (
    normalized.endsWith("pct") ||
    normalized.includes("weight") ||
    normalized.includes("share") ||
    normalized.includes("rate") ||
    normalized.includes("yield") ||
    normalized.includes("utilization") ||
    normalized.includes("usage")
  );
}

function isPercentagePointsField(value: string): boolean {
  return value.replace(/[\s_-]+/g, "").toLowerCase().endsWith("pct");
}

function normalizeFieldKey(value: string): string {
  return value.replace(/[\s_-]+/g, "").toLowerCase();
}

function isDailyVar95Field(value: string): boolean {
  return normalizeFieldKey(value) === "dailyvar95pct";
}

function isLifetimeDaysField(value: string): boolean {
  return normalizeFieldKey(value) === "lifetimedays";
}

function isStrategyContractMetricField(value: string): boolean {
  return [
    "change1dpct",
    "change7dpct",
    "change1ypct",
    "changeytdpct",
    "apy30dpct",
    "apyallpct",
    "dailyvar95pct",
    "lifetimedays",
  ].includes(normalizeFieldKey(value));
}

function isCategoryField(value: string): boolean {
  return normalizeFieldKey(value) === "category";
}

function formatFieldValue(field: string, value: unknown, locale: Locale = "en"): string {
  if (value === null || value === undefined) return isStrategyContractMetricField(field) ? "—" : formatEmptyValue();
  if (isCategoryField(field)) return getLocalizedCategory(value, locale) ?? formatEmptyValue();
  if (isAumField(field) || isUsdField(field)) {
    return formatUsdOrNA(asNumber(value));
  }
  if (isLifetimeDaysField(field)) return formatLifetimeDays(asNumber(value));
  if (isPercentField(field)) {
    const numericValue = asNumber(value);
    if (numericValue === undefined) return formatValue(value);
    if (isDailyVar95Field(field)) return formatRiskPercentPointsOrDash(numericValue);
    return isPercentagePointsField(field) ? formatPercentPointsOrDash(numericValue) : formatPercent(numericValue);
  }

  return formatValue(value);
}

function formatDatasetLabel(value: string): string {
  const labels: Record<string, string> = {
    snapshots: "Snapshots",
    balances: "Balances",
    positions_generic: "Generic positions",
    positions_lp: "LP positions",
    positions_vaults: "Managed LP vaults",
    positions_futures: "Futures",
    hedge: "Hedge",
    errors: "Errors",
  };
  return labels[value] ?? value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNodeTypeLabel(type: string): string {
  const normalized = type.trim().toLowerCase();
  const labels: Record<string, string> = {
    strategy_group: "Strategy Group",
    strategy: "Strategy",
    account: "Account",
    balance_group: "Balance Group",
    position_group: "Position Group",
    lp_position: "LP Position",
    futures_position: "Futures Position",
    generic_position: "Generic Position",
  };
  return labels[normalized] ?? formatDatasetLabel(type);
}

function formatMetricLabel(key: string): string {
  const normalizedText = key.trim().toLowerCase();
  const normalized = normalizedText.replace(/[\s_-]+/g, "");
  const labels: Record<string, string> = {
    nav: "AUM",
    navusd: "AUM",
    nav_usd: "AUM",
    "nav usd": "AUM",
    aum: "AUM",
    aumusd: "AUM",
    unitprice: "Unit Price",
    unit_price: "Unit Price",
    "unit price": "Unit Price",
  };
  return labels[normalizedText] ?? labels[normalized] ?? formatDatasetLabel(key);
}

function formatExplorerNodeKind(node: ExplorerTreeNode): string {
  const type = node.type?.toLowerCase();
  const protocolType = node.protocolType?.toLowerCase();

  if (type === "strategy_group") return "Strategy Group";
  if (type === "strategy") return "Strategy";
  if (type === "account") return "Account";
  if (type === "balance_group") return "Balance";
  if (type === "lp_position") return "Liquidity";
  if (type === "position_group" && (protocolType === "lp" || protocolType === "vault")) return "Liquidity";
  if (type === "position_group") return "Positions";
  if (type === "futures_position") return "Positions";
  if (type === "generic_position") return "Positions";

  return formatDatasetLabel(node.type ?? "Node");
}

function normalizeMetricKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%\s,]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getNumericHeaderOrSummaryValue(node: ExplorerTreeNode, keys: string[]): number | null {
  const normalizedKeys = new Set(keys.map(normalizeMetricKey));

  for (const field of node.header ?? []) {
    const fieldKey = normalizeMetricKey(field.key);
    const fieldLabel = normalizeMetricKey(field.label);
    if (normalizedKeys.has(fieldKey) || normalizedKeys.has(fieldLabel)) {
      const value = toFiniteNumber(field.value);
      if (value !== null) return value;
    }
  }

  for (const [key, value] of Object.entries(node.summary ?? {})) {
    if (normalizedKeys.has(normalizeMetricKey(key))) {
      const numericValue = toFiniteNumber(value);
      if (numericValue !== null) return numericValue;
    }
  }

  return null;
}

function getRawContainers(details: ExplorerDetails | null, node?: ExplorerTreeNode): Array<Record<string, unknown>> {
  const containers: Array<Record<string, unknown>> = [];
  if (node?.summary) containers.push(node.summary);
  if (details?.rawSummary) containers.push(details.rawSummary);
  if (details?.rawLatest) containers.push(details.rawLatest);
  const latestData = details?.rawLatest?.data;
  if (isRecord(latestData)) containers.push(latestData);
  return containers;
}

function getMetricFromContainers(containers: Array<Record<string, unknown>>, keys: string[]): number | null {
  const normalizedKeys = new Set(keys.map(normalizeMetricKey));
  for (const container of containers) {
    for (const [key, value] of Object.entries(container)) {
      if (!normalizedKeys.has(normalizeMetricKey(key))) continue;
      const numeric = toFiniteNumber(value);
      if (numeric !== null && Number.isFinite(numeric)) return numeric;
    }
  }
  return null;
}

function getMetricFromNodeAndDetails(details: ExplorerDetails | null, node: ExplorerTreeNode | undefined, keys: string[]): number | null {
  if (!node) return null;
  const fromNode = getNumericHeaderOrSummaryValue(node, keys);
  if (fromNode !== null) return fromNode;
  return getMetricFromContainers(getRawContainers(details, node), keys);
}

function getStringFromContainers(containers: Array<Record<string, unknown>>, keys: string[]): string | null {
  const normalizedKeys = new Set(keys.map(normalizeMetricKey));
  for (const container of containers) {
    for (const [key, value] of Object.entries(container)) {
      if (!normalizedKeys.has(normalizeMetricKey(key))) continue;
      const text = asString(value);
      if (text) return text;
    }
  }
  return null;
}

function getStringMetric(node: ExplorerTreeNode, keys: string[]): string | null {
  const normalizedKeys = new Set(keys.map(normalizeMetricKey));
  for (const field of node.header ?? []) {
    if (normalizedKeys.has(normalizeMetricKey(field.key)) || normalizedKeys.has(normalizeMetricKey(field.label))) {
      const text = asString(field.value);
      if (text) return text;
    }
  }
  if (!node.summary) return null;
  return getStringFromContainers([node.summary], keys);
}

function getStringMetricFromDetails(details: ExplorerDetails | null, node: ExplorerTreeNode, keys: string[]): string | null {
  const fromNode = getStringMetric(node, keys);
  if (fromNode) return shortenAddressLike(fromNode);
  for (const field of details?.rawHeader ?? []) {
    const normalizedKeys = new Set(keys.map(normalizeMetricKey));
    if (normalizedKeys.has(normalizeMetricKey(field.key)) || normalizedKeys.has(normalizeMetricKey(field.label))) {
      const text = asString(field.value);
      if (text) return shortenAddressLike(text);
    }
  }
  return shortenAddressLike(getStringFromContainers(getRawContainers(details, node), keys));
}

function getChildAmountUsd(child: ExplorerTreeNode, keys: string[]): number | null {
  return getNumericHeaderOrSummaryValue(child, keys);
}

function getChildWeight(child: ExplorerTreeNode, keys: string[]): number | null {
  return getNumericHeaderOrSummaryValue(child, keys);
}

function normalizeExposureItems(items: ExposureMixItem[]): ExposureMixItem[] {
  const positive = items.filter((item) => Number.isFinite(item.value) && item.value > 0);
  const total = positive.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return [];
  return positive.map((item) => ({ ...item, value: item.value / total }));
}

function isExposureMixItem(item: ExposureMixItem | null): item is ExposureMixItem {
  return item !== null;
}

function getBalanceTimesPrice(node: ExplorerTreeNode): number | null {
  const balance = getNumericHeaderOrSummaryValue(node, ["balance", "amount", "quantity"]);
  const price = getNumericHeaderOrSummaryValue(node, ["priceUsd", "price_usd", "usdPrice", "usd_price"]);
  return balance !== null && price !== null && balance > 0 && price > 0 ? balance * price : null;
}

function getBalanceTimesPriceFromDetails(details: ExplorerDetails | null, node: ExplorerTreeNode): number | null {
  const containers = getRawContainers(details, node);
  const balance = getMetricFromContainers(containers, ["balance", "amount", "quantity"]);
  const price = getMetricFromContainers(containers, ["priceUsd", "price_usd", "usdPrice", "usd_price"]);
  return balance !== null && price !== null && balance > 0 && price > 0 ? balance * price : null;
}

function shortenAddressLike(value: string | null): string | null {
  if (!value) return null;
  return /^0x[a-fA-F0-9]{20,}$/.test(value) ? formatAddress(value) : value;
}

function getTokenPairLabel(node: ExplorerTreeNode): string | null {
  const token0 = getStringMetric(node, ["token0", "token0Symbol", "token0_symbol"]);
  const token1 = getStringMetric(node, ["token1", "token1Symbol", "token1_symbol"]);
  return token0 && token1 ? `${token0}/${token1}` : null;
}

function buildStrategyGroupExposureMix(node: ExplorerTreeNode): ExposureMixItem[] {
  const strategies = (node.children ?? []).filter((child) => child.type === "strategy");
  const explicitWeights = strategies
    .map<ExposureMixItem | null>((child) => {
      const weight = getChildWeight(child, ["weight", "strategyWeight", "strategy_weight", "accountWeight", "account_weight"]);
      return weight !== null
        ? { key: child.uiKey, label: child.label, value: weight, amountUsd: getTreeAumValue(child), kind: "strategy_group_strategies" as const }
        : null;
    })
    .filter(isExposureMixItem);
  if (explicitWeights.length > 0) return normalizeExposureItems(explicitWeights);

  return normalizeExposureItems(strategies
    .map<ExposureMixItem | null>((child) => {
      const amountUsd = getTreeAumValue(child);
      return amountUsd !== null && amountUsd > 0
        ? { key: child.uiKey, label: child.label, value: amountUsd, amountUsd, kind: "strategy_group_strategies" as const }
        : null;
    })
    .filter(isExposureMixItem));
}

function buildPortfolioExposureMix(details: ExplorerDetails | null, node: ExplorerTreeNode, kind: "strategy_exposure" | "account_exposure"): ExposureMixItem[] {
  const explicit = [
    { key: "assets", label: "Assets", value: getMetricFromNodeAndDetails(details, node, ["assetsWeight", "assets_weight", "walletWeight", "wallet_weight", "spotWeight", "spot_weight", "balancesWeight", "balances_weight"]) },
    { key: "lp", label: "LP", value: getMetricFromNodeAndDetails(details, node, ["lpWeight", "lp_weight", "liquidityWeight", "liquidity_weight"]) },
    { key: "perp", label: "Perp", value: getMetricFromNodeAndDetails(details, node, ["perpWeight", "perp_weight", "futuresWeight", "futures_weight", "hedgeWeight", "hedge_weight"]) },
    { key: "options", label: "Options", value: getMetricFromNodeAndDetails(details, node, ["optionsWeight", "options_weight", "optionWeight", "option_weight"]) },
  ]
    .filter((item): item is { key: string; label: string; value: number } => item.value !== null && item.value > 0)
    .map((item) => ({ ...item, kind }));
  if (explicit.length > 0) return normalizeExposureItems(explicit);

  return normalizeExposureItems([
    { key: "assets", label: "Assets", amountUsd: getMetricFromNodeAndDetails(details, node, ["assetsAumUsd", "assets_aum_usd", "walletNavUsd", "wallet_nav_usd", "spotNavUsd", "spot_nav_usd"]) },
    { key: "lp", label: "LP", amountUsd: getMetricFromNodeAndDetails(details, node, ["lpNavUsd", "lp_nav_usd", "liquidityNavUsd", "liquidity_nav_usd", "lpFeesUsd", "lp_fees_usd"]) },
    { key: "perp", label: "Perp", amountUsd: getMetricFromNodeAndDetails(details, node, ["perpNavUsd", "perp_nav_usd", "futuresNavUsd", "futures_nav_usd", "hedgeNavUsd", "hedge_nav_usd"]) },
    { key: "options", label: "Options", amountUsd: getMetricFromNodeAndDetails(details, node, ["optionsNavUsd", "options_nav_usd", "optionNavUsd", "option_nav_usd"]) },
  ]
    .filter((item): item is { key: string; label: string; amountUsd: number } => item.amountUsd !== null && item.amountUsd > 0)
    .map((item) => ({ key: item.key, label: item.label, value: item.amountUsd, amountUsd: item.amountUsd, kind })));
}

function buildStrategyExposureMix(details: ExplorerDetails | null, node: ExplorerTreeNode): ExposureMixItem[] {
  return buildPortfolioExposureMix(details, node, "strategy_exposure");
}

function buildAccountExposureMix(details: ExplorerDetails | null, node: ExplorerTreeNode): ExposureMixItem[] {
  return buildPortfolioExposureMix(details, node, "account_exposure");
}

function buildLpPoolExposureMix(details: ExplorerDetails | null, node: ExplorerTreeNode): ExposureMixItem[] {
  const childItems = (node.children ?? [])
    .map<ExposureMixItem | null>((child) => {
      const amountUsd = getChildAmountUsd(child, ["lpNavUsd", "lp_nav_usd", "navUsd", "nav_usd", "aumUsd", "aum_usd", "valueUsd", "value_usd"]);
      const label = getStringMetric(child, ["poolLabel", "pool", "tokenPair"]) ?? getTokenPairLabel(child) ?? child.label;
      return amountUsd !== null && amountUsd > 0
        ? { key: child.uiKey, label, value: amountUsd, amountUsd, kind: "lp_pools" as const }
        : null;
    })
    .filter(isExposureMixItem);
  if (childItems.length > 0) return normalizeExposureItems(childItems);

  const poolLabel = getStringMetricFromDetails(details, node, ["poolLabel", "pool", "poolAddress"]) ?? getTokenPairLabel(node);
  const lpNavUsd = getMetricFromNodeAndDetails(details, node, ["lpNavUsd", "lp_nav_usd", "navUsd", "nav_usd"]);
  return poolLabel && lpNavUsd !== null && lpNavUsd > 0
    ? [{ key: "pool", label: poolLabel, value: 1, amountUsd: lpNavUsd, kind: "lp_pools" }]
    : [];
}

function buildPerpMarginExposureMix(details: ExplorerDetails | null, node: ExplorerTreeNode): ExposureMixItem[] {
  const assetMargins = (node.children ?? [])
    .map<ExposureMixItem | null>((child) => {
      const marginUsd = getChildAmountUsd(child, ["marginUsd", "margin_usd"]);
      const label = getStringMetric(child, ["assetSymbol", "asset_symbol", "marketSymbol", "market_symbol"]) ?? child.label;
      return marginUsd !== null && marginUsd > 0
        ? { key: child.uiKey, label, value: marginUsd, amountUsd: marginUsd, kind: "perp_margin" as const }
        : null;
    })
    .filter(isExposureMixItem);
  const totalMarginUsd = assetMargins.reduce((sum, item) => sum + (item.amountUsd ?? 0), 0);
  const totalNavUsd = getMetricFromNodeAndDetails(details, node, ["navUsd", "nav_usd", "aumUsd", "aum_usd", "walletNavUsd", "wallet_nav_usd"]);

  if (totalNavUsd !== null && totalNavUsd > 0) {
    const freeUsd = Math.max(totalNavUsd - totalMarginUsd, 0);
    const items = assetMargins.map((item) => ({ ...item, value: (item.amountUsd ?? 0) / totalNavUsd }));
    if (freeUsd > 0) items.push({ key: "free", label: "Free", value: freeUsd / totalNavUsd, amountUsd: freeUsd, kind: "perp_margin" });
    return items.filter((item) => item.value > 0);
  }

  return normalizeExposureItems(assetMargins);
}

function buildAssetsExposureMix(details: ExplorerDetails | null, node: ExplorerTreeNode): ExposureMixItem[] {
  const childItems = (node.children ?? [])
    .map<ExposureMixItem | null>((child) => {
      const amountUsd = getChildAmountUsd(child, ["aumUsd", "aum_usd", "valueUsd", "value_usd", "navUsd", "nav_usd"]) ?? getBalanceTimesPrice(child);
      const label = getStringMetric(child, ["assetSymbol", "asset_symbol", "normalizedAssetSymbol", "normalized_asset_symbol"]) ?? child.label;
      return amountUsd !== null && amountUsd > 0
        ? { key: child.uiKey, label, value: amountUsd, amountUsd, kind: "assets" as const }
        : null;
    })
    .filter(isExposureMixItem);
  if (childItems.length > 0) return normalizeExposureItems(childItems);

  const assetLabel = getStringMetricFromDetails(details, node, ["assetSymbol", "asset_symbol", "normalizedAssetSymbol", "normalized_asset_symbol"]);
  const amountUsd = getMetricFromNodeAndDetails(details, node, ["aumUsd", "aum_usd", "valueUsd", "value_usd"]) ?? getBalanceTimesPriceFromDetails(details, node);
  return assetLabel && amountUsd !== null && amountUsd > 0
    ? [{ key: assetLabel, label: assetLabel, value: 1, amountUsd, kind: "assets" }]
    : [];
}

function buildExposureMix(details: ExplorerDetails | null, selectedNode?: ExplorerTreeNode): ExposureMixItem[] {
  if (!selectedNode) return [];
  const type = selectedNode.type.toLowerCase();
  const protocolType = selectedNode.protocolType?.toLowerCase();

  if (type === "strategy_group") return buildStrategyGroupExposureMix(selectedNode);
  if (type === "strategy") return buildStrategyExposureMix(details, selectedNode);
  if (type === "account") return buildAccountExposureMix(details, selectedNode);
  if (type === "position_group" && (protocolType === "lp" || protocolType === "vault")) return buildLpPoolExposureMix(details, selectedNode);
  if (type === "position_group" && (protocolType === "futures" || protocolType === "perp")) return buildPerpMarginExposureMix(details, selectedNode);
  if (type === "balance_group") return buildAssetsExposureMix(details, selectedNode);
  return [];
}

function getTreeAumValue(node: ExplorerTreeNode): number | null {
  return getNumericHeaderOrSummaryValue(node, [
    "aumUsd",
    "aum_usd",
    "navUsd",
    "nav_usd",
    "walletNavUsd",
    "wallet_nav_usd",
    "lpNavUsd",
    "lp_nav_usd",
    "perpNavUsd",
    "perp_nav_usd",
    "valueUsd",
    "value_usd",
  ]);
}

function getTreeWeightValue(node: ExplorerTreeNode): number | null {
  return getNumericHeaderOrSummaryValue(node, [
    "weight",
    "accountWeight",
    "account_weight",
    "walletWeight",
    "wallet_weight",
    "lpWeight",
    "lp_weight",
    "perpWeight",
    "perp_weight",
    "strategyWeight",
    "strategy_weight",
  ]);
}

function formatTreeAum(node: ExplorerTreeNode): string {
  const value = getTreeAumValue(node);
  if (value === null) return "AUM —";
  return `AUM ${value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  })}`;
}

function formatTreeWeight(node: ExplorerTreeNode): string {
  const value = getTreeWeightValue(node);
  if (value === null) return "Weight —";
  return `Weight ${(value * 100).toFixed(2)}%`;
}

function isTimestampField(key: string): boolean {
  const normalized = key.trim().replace(/[\s-]+/g, "_").toLowerCase();
  return ["timestamp", "created_at", "updated_at", "snapshot_at", "time", "date"].includes(normalized);
}

function isStatusField(key: string): boolean {
  return key.trim().toLowerCase() === "status";
}

function isMessageField(key: string): boolean {
  const normalized = key.trim().replace(/[\s_-]+/g, "").toLowerCase();
  return [
    "error",
    "errormessage",
    "message",
    "warning",
    "warningmessage",
    "reason",
    "statusmessage",
  ].includes(normalized);
}

function getRowStatus(row: HistoryRecord): string | null {
  return asString(row.status) ?? asString(row.dataStatus) ?? asString(row.quality) ?? asString(row.dataQuality) ?? asString(row.snapshotStatus) ?? null;
}

function getRowMessage(row: HistoryRecord): string | null {
  for (const key of ["error", "errorMessage", "error_message", "message", "warning", "warningMessage", "reason", "statusMessage", "status_message"]) {
    const value = row[key];
    const formatted = typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : formatValue(value);
    if (formatted) return formatted;
  }
  return null;
}

function getStatusTone(status: string | null | undefined): "good" | "warning" | "risk" | "default" {
  const normalized = String(status ?? "").toLowerCase();
  if (["complete", "success", "ok"].includes(normalized)) return "good";
  if (["partial", "warning", "stale"].includes(normalized)) return "warning";
  if (["error", "failed", "invalid", "missing"].includes(normalized)) return "risk";
  return "default";
}

function formatDateTime(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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

function localizedApiUrl(url: string, locale: Locale): string {
  const localizedUrl = new URL(url, window.location.origin);
  localizedUrl.searchParams.set("locale", locale);
  return `${localizedUrl.pathname}${localizedUrl.search}${localizedUrl.hash}`;
}

class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly responseMessage: string | null,
  ) {
    super(responseMessage ? `Request failed: ${status} ${responseMessage}` : `Request failed: ${status}`);
    this.name = "ApiRequestError";
  }
}

async function fetchJson(url: string, locale?: Locale): Promise<unknown> {
  const response = await fetch(locale ? localizedApiUrl(url, locale) : url, {
    headers: locale ? { "Accept-Language": locale } : undefined,
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch((): null => null);
    const responseMessage = isRecord(errorPayload)
      ? asString(errorPayload.message) ?? asString(errorPayload.error) ?? null
      : null;
    throw new ApiRequestError(response.status, responseMessage);
  }
  return response.json() as Promise<unknown>;
}

function shouldRetryAdvancedMetrics(error: unknown): boolean {
  return !(error instanceof ApiRequestError) || error.status === 404 || error.status === 429 || error.status >= 500;
}

async function fetchAdvancedMetricsJson(url: string, locale: Locale): Promise<unknown> {
  try {
    return await fetchJson(url, locale);
  } catch (error) {
    if (!shouldRetryAdvancedMetrics(error)) throw error;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 750));
    return fetchJson(url, locale);
  }
}

function advancedMetricsErrorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return "Unable to reach ANMI API. Check the connection and try again.";
  }
  if (error.status === 404) {
    return "Advanced metrics have not been calculated for this strategy and window yet.";
  }
  return error.responseMessage
    ? `Advanced metrics API returned ${error.status}: ${error.responseMessage}`
    : `Advanced metrics API returned HTTP ${error.status}.`;
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

function normalizeAdvancedMetrics(payload: unknown): AdvancedMetricsResponse | null {
  if (!isRecord(payload)) return null;
  const id = asString(payload.id);
  const scopeType = payload.scopeType === "strategy" || payload.scopeType === "strategy_group"
    ? payload.scopeType
    : null;
  const window = payload.window === "30d" || payload.window === "90d" || payload.window === "all"
    ? payload.window
    : null;
  if (!id || !scopeType || !window) return null;

  const correlations = (Array.isArray(payload.correlations) ? payload.correlations : []).flatMap((item): AdvancedMarketCorrelation[] => {
    if (!isRecord(item)) return [];
    const symbol = asString(item.symbol);
    if (!symbol) return [];
    return [{
      symbol,
      correlation: nullableNumber(item.correlation),
      observations: Math.max(0, Math.trunc(asNumber(item.observations) ?? 0)),
    }];
  });
  const autocorrelations = (Array.isArray(payload.autocorrelations) ? payload.autocorrelations : []).flatMap((item): AdvancedReturnAutocorrelation[] => {
    if (!isRecord(item)) return [];
    const lagDays = asNumber(item.lagDays);
    if (lagDays === undefined || !Number.isInteger(lagDays)) return [];
    return [{
      lagDays,
      autocorrelation: nullableNumber(item.autocorrelation),
      observations: Math.max(0, Math.trunc(asNumber(item.observations) ?? 0)),
    }];
  });

  return {
    id,
    scopeType,
    window,
    timestamp: asString(payload.timestamp) ?? null,
    observations: Math.max(0, Math.trunc(asNumber(payload.observations) ?? 0)),
    correlations,
    autocorrelations,
    optimalFUncapped: nullableNumber(payload.optimalFUncapped ?? payload.optimalF),
    optimalFCapped: nullableNumber(payload.optimalFCapped),
    kellyApprox: nullableNumber(payload.kellyApprox),
    meanDailyReturn: nullableNumber(payload.meanDailyReturn),
    dailyVolatility: nullableNumber(payload.dailyVolatility),
    maxLoss: nullableNumber(payload.maxLoss),
    dataQuality: nullableNumber(payload.dataQuality),
    warnings: (Array.isArray(payload.warnings) ? payload.warnings : [])
      .map(asString)
      .filter((warning): warning is string => Boolean(warning)),
  };
}

function normalizeAssetDeltas(payload: unknown): AssetDeltasResponse | null {
  if (!isRecord(payload)) return null;
  const id = asString(payload.id);
  const scopeType = payload.scopeType === "strategy" || payload.scopeType === "strategy_group"
    ? payload.scopeType
    : null;
  if (!id || !scopeType) return null;

  const deltas = (Array.isArray(payload.deltas) ? payload.deltas : []).flatMap((item): AssetDeltaItem[] => {
    if (!isRecord(item)) return [];
    const assetSymbol = asString(item.assetSymbol);
    const balanceQuantity = asNumber(item.balanceQuantity);
    const lpQuantity = asNumber(item.lpQuantity);
    const derivativeQuantity = asNumber(item.derivativeQuantity);
    const netDelta = asNumber(item.netDelta);
    if (!assetSymbol || balanceQuantity === undefined || lpQuantity === undefined || derivativeQuantity === undefined || netDelta === undefined) {
      return [];
    }
    return [{
      assetSymbol,
      balanceQuantity,
      lpQuantity,
      derivativeQuantity,
      netDelta,
      sourceSymbols: (Array.isArray(item.sourceSymbols) ? item.sourceSymbols : [])
        .map(asString)
        .filter((symbol): symbol is string => Boolean(symbol)),
    }];
  });
  const quality = isRecord(payload.dataQuality) ? payload.dataQuality : {};

  return {
    id,
    scopeType,
    timestamp: asString(payload.timestamp) ?? null,
    deltas,
    dataQuality: {
      status: quality.status === "partial" ? "partial" : "complete",
      warnings: (Array.isArray(quality.warnings) ? quality.warnings : [])
        .map(asString)
        .filter((warning): warning is string => Boolean(warning)),
    },
  };
}

function buildAssetDeltasUrl(node: ExplorerTreeNode | null): string | null {
  if (node?.type === "strategy_group") {
    return `/api/v1/strategy-groups/${encodeURIComponent(node.entityId)}/asset-deltas`;
  }
  if (node?.type === "strategy") {
    return `/api/v1/strategies/${encodeURIComponent(node.strategyId ?? node.entityId)}/asset-deltas`;
  }
  return null;
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

function normalizeChartPoint(item: unknown, chartMode: ChartMode, seriesType: "primary" | "benchmark"): NormalizedChartPoint | undefined {
  if (!isRecord(item)) return undefined;
  const timestamp = asString(item.timestamp) ?? asString(item.created_at) ?? asString(item.snapshot_at) ?? asString(item.time);
  if (!timestamp) return undefined;
  const rawValue = firstNumber(item.rawValue, item.raw_value, item.value, item.nav_usd, item.navUsd, item.unit_price, item.unitPrice);
  const normalizedValue = firstNumber(item.normalizedValue, item.normalized_value, item.indexed_nav, item.indexedNav, item.indexed, item.index);
  const value = getChartPointValue(chartMode, seriesType, rawValue, normalizedValue);
  return {
    timestamp,
    value,
    rawValue,
    normalizedValue,
    raw: item,
  };
}

function normalizeChartResponse(payload: unknown, chartMode: ChartMode): { series: NormalizedChartSeries[]; warnings: string[] } {
  let primaryCount = 0;
  const usedKeys = new Set<string>();
  const series = getChartSeriesPayloadItems(payload)
    .map((item): NormalizedChartSeries | undefined => {
      if (!isRecord(item)) return undefined;
      const rawType = (asString(item.type) ?? asString(item.kind) ?? asString(item.role) ?? "").toLowerCase();
      const type: "primary" | "benchmark" = rawType === "benchmark" ? "benchmark" : "primary";
      const symbol = asString(item.symbol)?.toUpperCase();
      const fallbackId = type === "primary" ? (primaryCount === 0 ? "primary" : `primary-${primaryCount + 1}`) : symbol;
      if (type === "primary") primaryCount += 1;
      const id = asString(item.id) ?? asString(item.key) ?? fallbackId ?? `series-${primaryCount}`;
      let chartKey = type === "primary" ? "primary" : `benchmark_${(symbol ?? id).replace(/[^a-zA-Z0-9_]/g, "_")}`;
      while (usedKeys.has(chartKey)) chartKey = `${chartKey}_${usedKeys.size}`;
      usedKeys.add(chartKey);
      const defaultLabel = type === "primary" ? (chartMode === "unit_price" ? "Unit Price" : "AUM") : id;
      const label = asString(item.label) ?? symbol ?? defaultLabel;
      const points = asArray(item.points)
        .map((point) => normalizeChartPoint(point, chartMode, type))
        .filter((point): point is NormalizedChartPoint => Boolean(point))
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
      const warnings = Array.isArray(item.warnings) ? item.warnings.map(asString).filter((warning): warning is string => Boolean(warning)) : [];

      return { id, chartKey, label, type, symbol, points, warnings };
    })
    .filter((item): item is NormalizedChartSeries => Boolean(item));

  return { series, warnings: getPayloadWarnings(payload) };
}

function getBenchmarkHistoryPayloadItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  const directCandidates = [payload.points, payload.items, payload.data, payload.history, payload.prices, payload.results];
  const directMatch = directCandidates.find(Array.isArray);
  if (Array.isArray(directMatch)) return directMatch;
  const nestedData = isRecord(payload.data) ? payload.data : {};
  const nestedCandidates = [nestedData.points, nestedData.items, nestedData.history, nestedData.prices, nestedData.results];
  const nestedMatch = nestedCandidates.find(Array.isArray);
  if (Array.isArray(nestedMatch)) return nestedMatch;

  const series = getChartSeriesPayloadItems(payload).find((item) => {
    if (!isRecord(item)) return false;
    const rawType = (asString(item.type) ?? asString(item.kind) ?? asString(item.role) ?? "").toLowerCase();
    return rawType === "benchmark" || Array.isArray(item.points);
  });
  return isRecord(series) ? asArray(series.points) : [];
}

function normalizeBenchmarkHistoryPoint(item: unknown): NormalizedChartPoint | undefined {
  if (!isRecord(item)) return undefined;
  const timestamp = asString(item.timestamp) ?? asString(item.created_at) ?? asString(item.snapshot_at) ?? asString(item.time) ?? asString(item.date);
  if (!timestamp) return undefined;
  const rawValue = firstNumber(item.rawValue, item.raw_value, item.priceUsd, item.price_usd, item.close, item.value);
  const normalizedValue = firstNumber(item.normalizedValue, item.normalized_value, item.indexed, item.index, item.indexedValue, item.indexed_value);
  const value = normalizedValue ?? rawValue;
  return {
    timestamp,
    value,
    rawValue,
    normalizedValue,
    raw: item,
  };
}

function normalizeBenchmarkHistory(payload: unknown, symbol: string): NormalizedChartSeries {
  const points = getBenchmarkHistoryPayloadItems(payload)
    .map(normalizeBenchmarkHistoryPoint)
    .filter((point): point is NormalizedChartPoint => Boolean(point))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  return {
    id: `benchmark:${symbol}`,
    chartKey: "benchmark",
    label: symbol,
    type: "benchmark",
    symbol,
    points,
    warnings: [],
  };
}

function toUnixTimeSeconds(timestamp: string): number | null {
  const timeMs = new Date(timestamp).getTime();
  if (!Number.isFinite(timeMs)) return null;
  return Math.floor(timeMs / 1000);
}

function reindexToFirstVisiblePoint(points: TimePoint[]): TimePoint[] {
  const first = points.find((point) => typeof point.value === "number" && Number.isFinite(point.value) && point.value > 0);

  if (!first) return [];

  return points
    .filter((point) => typeof point.value === "number" && Number.isFinite(point.value))
    .map((point) => ({
      time: point.time,
      value: (point.value / first.value) * 100,
    }));
}

function getDisplayPointValue(point: NormalizedChartPoint): number | null {
  return point.rawValue ?? point.value ?? point.normalizedValue ?? null;
}

function toVisibleSeriesPoints(series?: NormalizedChartSeries, requirePositive = false): VisibleSeriesPoint[] {
  const pointsByTime = new Map<number, VisibleSeriesPoint>();

  series?.points.forEach((point) => {
    if (!isValidPointStatus(point.raw)) return;
    const time = toUnixTimeSeconds(point.timestamp);
    const value = getDisplayPointValue(point);
    if (time === null || typeof value !== "number" || !Number.isFinite(value)) return;
    if (requirePositive && value <= 0) return;
    pointsByTime.set(time, { time, timestamp: point.timestamp, value });
  });

  return Array.from(pointsByTime.values()).sort((left, right) => left.time - right.time);
}

function reindexVisibleSeriesPoints(points: VisibleSeriesPoint[]): VisibleSeriesPoint[] {
  const timestampsByTime = new Map(points.map((point) => [point.time, point.timestamp]));
  return reindexToFirstVisiblePoint(points).map((point) => ({
    ...point,
    timestamp: timestampsByTime.get(point.time) ?? new Date(point.time * 1000).toISOString(),
  }));
}

function filterBenchmarkPointsToPrimaryTimes(primaryPoints: VisibleSeriesPoint[], benchmarkPoints: VisibleSeriesPoint[]): VisibleSeriesPoint[] {
  const primaryTimes = new Set(primaryPoints.map((point) => point.time));
  return benchmarkPoints.filter((point) => primaryTimes.has(point.time));
}

function toChartViewData(points: VisibleSeriesPoint[]): Array<{ time: number; value: number }> {
  return points.map((point) => ({ time: point.time, value: point.value }));
}

function buildChartView({
  chartMode,
  primarySeries,
  selectedBenchmark,
  benchmarkCache,
}: {
  chartMode: ChartMode;
  primarySeries?: NormalizedChartSeries;
  selectedBenchmark: string | null;
  benchmarkCache: BenchmarkCache;
}): ChartView {
  const rawPrimaryPoints = primarySeries?.points ?? [];

  if (chartMode === "nav_usd") {
    const primaryData = toVisibleSeriesPoints(primarySeries);
    if (import.meta.env.DEV) {
      console.debug("Chart normalized data", {
        mode: chartMode,
        rawPrimaryPoints: rawPrimaryPoints.length,
        validPrimaryPoints: primaryData.length,
        benchmarkPoints: 0,
        firstPrimary: primaryData[0],
        lastPrimary: primaryData[primaryData.length - 1],
      });
    }
    return {
      mode: "aum",
      title: "AUM",
      subtitle: "Total value of assets under management.",
      primaryLabel: "AUM",
      primaryData: toChartViewData(primaryData),
      benchmarkData: [],
      valueMode: "usd",
    };
  }

  const primaryPoints = toVisibleSeriesPoints(primarySeries, true);
  if (!selectedBenchmark) {
    if (import.meta.env.DEV) {
      console.debug("Chart normalized data", {
        mode: chartMode,
        rawPrimaryPoints: rawPrimaryPoints.length,
        validPrimaryPoints: primaryPoints.length,
        benchmarkPoints: 0,
        firstPrimary: primaryPoints[0],
        lastPrimary: primaryPoints[primaryPoints.length - 1],
      });
    }
    return {
      mode: "unit_price",
      title: "Unit Price",
      subtitle: "Strategy group unit price history.",
      primaryLabel: "Unit Price",
      primaryData: toChartViewData(primaryPoints),
      benchmarkData: [],
      valueMode: "unit_price",
    };
  }

  const benchmarkSeries = benchmarkCache[selectedBenchmark];
  const benchmarkPoints = benchmarkSeries
    ? filterBenchmarkPointsToPrimaryTimes(primaryPoints, toVisibleSeriesPoints(benchmarkSeries, true))
    : [];
  const primaryData = toChartViewData(reindexVisibleSeriesPoints(primaryPoints));
  const benchmarkData = toChartViewData(reindexVisibleSeriesPoints(benchmarkPoints));

  if (import.meta.env.DEV) {
    console.debug("Chart normalized data", {
      mode: chartMode,
      rawPrimaryPoints: rawPrimaryPoints.length,
      validPrimaryPoints: primaryPoints.length,
      benchmarkPoints: benchmarkData.length,
      firstPrimary: primaryPoints[0],
      lastPrimary: primaryPoints[primaryPoints.length - 1],
    });
  }

  return {
    mode: "unit_price",
    title: "Unit Price Index",
    subtitle: "Compare strategy performance against the selected benchmark on the same indexed scale.",
    primaryLabel: "Unit Price Index",
    benchmarkLabel: benchmarkData.length > 0 ? `${selectedBenchmark} Index` : undefined,
    primaryData,
    benchmarkData,
    valueMode: "index",
  };
}

function MetricsTable({
  metrics,
  subtitle = "Collected and verified by ANMI Track",
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
              <tr key={metric.label} title={metric.hint} className="border-b border-white/10 last:border-b-0">
                <td className="px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{metric.label}</td>
                <td className={cn("px-3 py-2.5 text-right font-semibold tabular-nums text-white", metric.valueClassName)}>
                  {metric.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}

function NodeMetricsTable({ metrics }: { metrics: Metric[] }): JSX.Element {
  if (metrics.length === 0) {
    return (
      <p className="mt-4 text-sm text-slate-500">
        No current metrics are available for this element yet.
      </p>
    );
  }

  return (
    <div className="mt-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-white/10">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[38%]" />
          <col className="w-[62%]" />
        </colgroup>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.label} className="border-b border-white/10 last:border-b-0">
              <td className="align-top px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                <span className="block max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">
                  {metric.label}
                </span>
              </td>
              <td className="min-w-0 align-top px-3 py-2.5 text-left font-semibold tabular-nums text-white sm:text-right">
                <span className="block max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">
                  {metric.value}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssetDeltasTable({
  data,
  error,
  isLoading,
}: {
  data: AssetDeltasResponse | null;
  error: string | null;
  isLoading: boolean;
}): JSX.Element {
  return (
    <div className="mt-5 min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
        Net asset delta
      </div>
      <div className="mt-1 text-xs leading-5 text-slate-500">
        Account balances + LP assets + signed futures/perps. USD stablecoins are grouped as USD.
      </div>

      {isLoading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading asset deltas...
        </div>
      ) : error ? (
        <div className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-xs leading-5 text-amber-100">
          {error}
        </div>
      ) : data && data.deltas.length > 0 ? (
        <div className="mt-3 min-w-0 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full table-fixed text-xs">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[26%]" />
              <col className="w-[26%]" />
              <col className="w-[26%]" />
            </colgroup>
            <thead className="bg-slate-950/60 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-2 py-2 text-left">Asset</th>
                <th className="px-2 py-2 text-right" title="Account balances plus LP token quantities">Held</th>
                <th className="px-2 py-2 text-right" title="Signed futures and perpetual quantity">Deriv.</th>
                <th className="px-2 py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {data.deltas.map((delta) => {
                const heldQuantity = delta.balanceQuantity + delta.lpQuantity;
                const sourceTitle = delta.sourceSymbols.length > 1
                  ? `Grouped from ${delta.sourceSymbols.join(", ")}`
                  : undefined;
                return (
                  <tr key={delta.assetSymbol} className="border-t border-white/10">
                    <td className="px-2 py-2 font-semibold text-slate-200" title={sourceTitle}>{delta.assetSymbol}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-300" title={`Balances: ${formatAssetQuantity(delta.balanceQuantity)}; LP: ${formatAssetQuantity(delta.lpQuantity)}`}>
                      {formatAssetQuantity(heldQuantity)}
                    </td>
                    <td className={cn("px-2 py-2 text-right tabular-nums", delta.derivativeQuantity < 0 ? "text-rose-200" : "text-slate-300")}>
                      {formatAssetQuantity(delta.derivativeQuantity, true)}
                    </td>
                    <td className={cn("px-2 py-2 text-right font-semibold tabular-nums", delta.netDelta < 0 ? "text-rose-200" : delta.netDelta > 0 ? "text-emerald-200" : "text-slate-300")}>
                      {formatAssetQuantity(delta.netDelta, true)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : data ? (
        <div className="mt-3 text-xs text-slate-500">No current asset exposure is available for this scope.</div>
      ) : null}

      {data?.dataQuality.warnings.length ? (
        <div className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-xs leading-5 text-amber-100">
          {data.dataQuality.warnings.join(" ")}
        </div>
      ) : null}
      {data?.timestamp ? (
        <div className="mt-2 text-[10px] text-slate-600">Latest account state: {formatDateTimeOrNA(data.timestamp)}</div>
      ) : null}
    </div>
  );
}

function formatAssetQuantity(value: number, signed = false): string {
  const absoluteValue = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", absoluteValue !== 0 && absoluteValue < 1
    ? { maximumSignificantDigits: 7 }
    : { maximumFractionDigits: 4 }).format(absoluteValue);
  if (value < 0) return `-${formatted}`;
  if (signed && value > 0) return `+${formatted}`;
  return formatted;
}

const EXPOSURE_COLORS = [
  "bg-cyan-400",
  "bg-violet-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-sky-400",
  "bg-rose-400",
  "bg-fuchsia-400",
  "bg-slate-400",
];

function compactExposureItems(items: ExposureMixItem[], maxItems = 8): ExposureMixItem[] {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  if (sorted.length <= maxItems) return sorted;
  const head = sorted.slice(0, maxItems - 1);
  const tail = sorted.slice(maxItems - 1);
  const otherValue = tail.reduce((sum, item) => sum + item.value, 0);
  const otherAmount = tail.reduce((sum, item) => sum + (item.amountUsd ?? 0), 0);
  return [...head, { key: "other", label: "Other", value: otherValue, amountUsd: otherAmount > 0 ? otherAmount : null }];
}

function getExposureSegmentClass(item: ExposureMixItem, index: number): string {
  const knownClasses: Record<string, string> = {
    assets: "bg-sky-400",
    lp: "bg-emerald-400",
    perp: "bg-violet-400",
    options: "bg-amber-400",
    free: "bg-slate-500",
  };
  return knownClasses[item.key] ?? EXPOSURE_COLORS[index % EXPOSURE_COLORS.length];
}

function getExposureTitle(item: ExposureMixItem): string {
  const percent = `${(item.value * 100).toFixed(1)}%`;
  const amount = item.amountUsd !== null && item.amountUsd !== undefined ? ` / ${formatUsdOrNA(item.amountUsd)}` : "";
  return `${item.label}: ${percent}${amount}`;
}

function ExposureMixBar({ items }: { items: ExposureMixItem[] }): JSX.Element | null {
  const visibleItems = compactExposureItems(items.filter((item) => Number.isFinite(item.value) && item.value > 0));

  if (visibleItems.length === 0) return null;

  return (
    <div className="mt-4 min-w-0">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
        Exposure mix
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/10">
        {visibleItems.map((item, index) => (
          <div
            key={item.key}
            className={getExposureSegmentClass(item, index)}
            style={{ width: `${Math.max(0, item.value * 100)}%` }}
            title={getExposureTitle(item)}
          />
        ))}
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs">
        {visibleItems.map((item, index) => (
          <div key={item.key} className="flex min-w-0 items-center gap-2 text-slate-300" title={getExposureTitle(item)}>
            <span className={cn("h-2 w-2 shrink-0 rounded-full", getExposureSegmentClass(item, index))} />
            <span className="font-medium text-slate-200">{item.label}</span>
            <span className="shrink-0 tabular-nums text-slate-500">
              {(item.value * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StrategiesPage(): JSX.Element {
  const { strategyId } = useParams<{ strategyId: string }>();
  const navigate = useNavigate();
  const locale = useLocale();
  const [strategies, setStrategies] = useState<StrategySummary[]>([]);
  const [primaryChartCache, setPrimaryChartCache] = useState<PrimaryChartCache>({});
  const [benchmarkOptions, setBenchmarkOptions] = useState<BenchmarkOption[]>([]);
  const [benchmarkCache, setBenchmarkCache] = useState<BenchmarkCache>({});
  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null);
  const [advancedMetricsWindow, setAdvancedMetricsWindow] = useState<AdvancedMetricsWindow>(DEFAULT_ADVANCED_METRICS_WINDOW);
  const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedMetricsResponse | null>(null);
  const [advancedMetricsRequestVersion, setAdvancedMetricsRequestVersion] = useState(0);
  const [headerStrategy, setHeaderStrategy] = useState<StrategyGroupHeader | null>(null);
  const [treeNodes, setTreeNodes] = useState<ExplorerTreeNode[]>([]);
  const [treeWarnings, setTreeWarnings] = useState<StructuredWarning[]>([]);
  const [selectedTreeNode, setSelectedTreeNode] = useState<ExplorerTreeNode | null>(null);
  const [assetDeltas, setAssetDeltas] = useState<AssetDeltasResponse | null>(null);
  const [nodeDetails, setNodeDetails] = useState<ExplorerDetails | null>(null);
  const [historyData, setHistoryData] = useState<ExplorerHistory>(() => createEmptyHistory());
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [historySearchInput, setHistorySearchInput] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState<(typeof HISTORY_PAGE_SIZES)[number]>(DEFAULT_HISTORY_PAGE_SIZE);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);
  const [isLoadingBenchmarks, setIsLoadingBenchmarks] = useState(true);
  const [isLoadingHeader, setIsLoadingHeader] = useState(false);
  const [isLoadingNav, setIsLoadingNav] = useState(false);
  const [isLoadingBenchmarkHistory, setIsLoadingBenchmarkHistory] = useState(false);
  const [isLoadingAdvancedMetrics, setIsLoadingAdvancedMetrics] = useState(false);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingAssetDeltas, setIsLoadingAssetDeltas] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [navError, setNavError] = useState<string | null>(null);
  const [advancedMetricsError, setAdvancedMetricsError] = useState<string | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [assetDeltasError, setAssetDeltasError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
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
    setPrimaryChartCache({});
    setBenchmarkCache({});
  }, [locale]);

  useEffect(() => {
    let active = true;
    setIsLoadingStrategies(true);
    Promise.all([
      fetchJson("/api/v1/strategies", locale),
      fetchJson("/api/v1/strategy-groups", locale),
    ])
      .then(([strategiesPayload, groupsPayload]) => {
        if (!active) return;
        const normalized = normalizeStrategies(strategiesPayload, groupsPayload, locale);
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
  }, [locale]);

  useEffect(() => {
    let active = true;
    setIsLoadingBenchmarks(true);
    fetchJson("/api/v1/benchmarks", locale)
      .then((payload) => {
        if (!active) return;
        const normalized = normalizeBenchmarkOptions(payload);
        const availableSymbols = normalized.map((benchmark) => benchmark.symbol);
        setBenchmarkOptions(normalized);
        setSelectedBenchmark(normalizeSelectedBenchmark(readSavedBenchmark(), availableSymbols));
      })
      .catch(() => {
        if (!active) return;
        setBenchmarkOptions([]);
        setSelectedBenchmark(null);
      })
      .finally(() => {
        if (active) setIsLoadingBenchmarks(false);
      });
    return () => {
      active = false;
    };
  }, [locale]);

  const selectedStrategy = useMemo(() => {
    if (strategies.length === 0) return undefined;
    if (!strategyId) return strategies[0];
    return strategies.find((strategy) => strategy.id === strategyId);
  }, [strategies, strategyId]);

  const firstStrategy = strategies[0];
  const isStrategyNotFound = Boolean(strategyId && !isLoadingStrategies && strategies.length > 0 && !selectedStrategy);
  const activeStrategy = headerStrategy ?? selectedStrategy;
  const selectedNodeKey = selectedTreeNode?.uiKey ?? null;
  const selectedNodeWarnings = useMemo(() => {
    if (!selectedTreeNode) return [];
    return treeWarnings.filter((warning) => (
      warning.nodeId === selectedTreeNode.id ||
      warning.entityId === selectedTreeNode.entityId
    ));
  }, [selectedTreeNode, treeWarnings]);
  const globalTreeWarnings = useMemo(() => treeWarnings.filter((warning) => !warning.nodeId && !warning.entityId), [treeWarnings]);
  const filteredStrategies = useMemo(() => {
    const query = strategySearch.trim().toLowerCase();
    if (!query) return strategies;
    return strategies.filter((strategy) => (
      strategy.name.toLowerCase().includes(query) ||
      strategy.description?.toLowerCase().includes(query) ||
      strategy.id.toLowerCase().includes(query)
    ));
  }, [strategies, strategySearch]);
  const historyPagination = historyData.pagination;
  const totalHistoryPages = Math.max(1, historyPagination.totalPages);
  const safeHistoryPage = Math.max(1, Math.min(historyPagination.page, totalHistoryPages));
  const hasHistoryMessageColumn = historyData.rows.some((row) => getRowMessage(row) !== null);
  const historyRangeLabel = formatHistoryRange(
    safeHistoryPage,
    historyPagination.pageSize,
    historyPagination.totalRows,
    historySearch,
  );
  const primaryMetrics = useMemo((): Metric[] => {
    if (isLoadingHeader) {
      return [
        "AUM",
        "Net Return",
        ...STRATEGY_METRIC_COLUMNS.map((column) => column.label),
        "Max Drawdown",
        "Drawdown",
        "Volatility",
        "Sharpe ratio",
        "Sortino ratio",
        "Last update",
      ].map((label) => ({ label, value: "Loading...", hint: "ANMI Track header" }));
    }

    const source = headerStrategy ?? selectedStrategy;
    const warningsCount = headerStrategy?.warnings?.length ?? 0;
    const contractMetrics = STRATEGY_METRIC_COLUMNS.map((column): Metric => {
      const value = column.key === "lifetimeDays"
        ? selectedStrategy?.lifetimeDays ?? null
        : headerStrategy
          ? headerStrategy[column.key]
          : selectedStrategy?.[column.key] ?? null;

      return {
        label: column.label,
        value: column.format(value),
        hint: column.hint,
        valueClassName: column.valueClassName(value),
      };
    });
    const metrics: Metric[] = [
      { label: "AUM", value: formatUsdOrNA(source?.navUsd), hint: "Total assets under management" },
      { label: "Net Return", value: formatPercentOrNA(headerStrategy?.totalReturn), hint: "Total return" },
      ...contractMetrics,
      { label: "Max Drawdown", value: formatPercentOrNA(headerStrategy?.maxDrawdown ?? selectedStrategy?.maxDrawdown), hint: "Maximum drawdown" },
      { label: "Volatility", value: formatPercentOrNA(headerStrategy?.volatility ?? headerStrategy?.volatilityAnnualized), hint: "Annualized volatility" },
      { label: "Sharpe ratio", value: formatNumberOrNA(headerStrategy?.sharpe ?? headerStrategy?.sharpeRatio, 2), hint: "Risk-adjusted return" },
      { label: "Sortino ratio", value: formatNumberOrNA(headerStrategy?.sortino ?? headerStrategy?.sortinoRatio, 2), hint: "Downside-adjusted return" },
      { label: "Last update", value: formatDateTimeOrNA(headerStrategy?.updatedAt ?? selectedStrategy?.updatedAt), hint: "Latest snapshot timestamp" },
    ];

    if (headerStrategy?.dataQuality !== undefined) {
      const dataQuality = headerStrategy.dataQuality;
      metrics.push({
        label: "Data Quality",
        value: formatDataQuality(dataQuality),
        hint: isStrategyGroupDataQuality(dataQuality) ? formatDataQualityHint(dataQuality) : "ANMI Track validation",
      });
    }
    if (warningsCount > 0) {
      metrics.push({ label: "Warnings", value: String(warningsCount), hint: "Header data quality notes" });
    }

    return metrics;
  }, [headerStrategy, isLoadingHeader, selectedStrategy]);
  const dataQualityWarnings = isStrategyGroupDataQuality(headerStrategy?.dataQuality)
    ? headerStrategy.dataQuality.warnings
    : [];

  useEffect(() => {
    setHistoryPage(1);
  }, [historyPageSize, historySearch, selectedDataset, selectedNodeKey]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setHistorySearch(historySearchInput.trim().slice(0, 200));
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [historySearchInput]);

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages);
    }
  }, [historyPage, totalHistoryPages]);

  useEffect(() => {
    if (!isLoadingStrategies && !strategyId && selectedStrategy) {
      navigate(localizedPath(locale, `/strategies/${encodeURIComponent(selectedStrategy.id)}`), { replace: true });
    }
  }, [isLoadingStrategies, locale, navigate, selectedStrategy, strategyId]);

  useEffect(() => {
    if (!isSelectorOpen) return;

    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    if (!isMobile) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSelectorOpen]);

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
    fetchJson(`/api/v1/strategy-groups/${encodeURIComponent(selectedStrategy.groupId)}/header`, locale)
      .then((payload) => {
        if (!active) return;
        setHeaderStrategy(normalizeGroupHeader(payload, locale, selectedStrategy));
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
  }, [locale, selectedStrategy]);

  useEffect(() => {
    if (!selectedStrategy) {
      setAdvancedMetrics(null);
      setAdvancedMetricsError(null);
      return;
    }
    let active = true;
    setIsLoadingAdvancedMetrics(true);
    setAdvancedMetrics(null);
    setAdvancedMetricsError(null);
    fetchAdvancedMetricsJson(
      `/api/v1/strategy-groups/${encodeURIComponent(selectedStrategy.groupId)}/advanced-metrics?window=${advancedMetricsWindow}`,
      locale,
    )
      .then((payload) => {
        if (!active) return;
        const normalized = normalizeAdvancedMetrics(payload);
        if (normalized === null) {
          setAdvancedMetricsError("Advanced metrics response is unavailable.");
          return;
        }
        setAdvancedMetrics(normalized);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setAdvancedMetrics(null);
        setAdvancedMetricsError(advancedMetricsErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setIsLoadingAdvancedMetrics(false);
      });
    return () => {
      active = false;
    };
  }, [advancedMetricsRequestVersion, advancedMetricsWindow, locale, selectedStrategy]);

  useEffect(() => {
    if (!selectedStrategy) {
      return;
    }
    const metric = chartMode === "nav_usd" ? "nav_usd" : "unit_price";
    const cacheKey = `${selectedStrategy.id}:${metric}`;
    if (primaryChartCache[cacheKey]) {
      setIsLoadingNav(false);
      setNavError(null);
      return;
    }

    let active = true;
    setIsLoadingNav(true);
    setNavError(null);
    const params = new URLSearchParams({
      scope: "group",
      metric,
      normalize: "false",
    });
    fetchJson(`/api/v1/strategy-groups/${encodeURIComponent(selectedStrategy.groupId)}/chart?${params.toString()}`, locale)
      .then((payload) => {
        if (!active) return;
        const normalized = normalizeChartResponse(payload, chartMode);
        const primarySeries = normalized.series.find((series) => series.type === "primary" && series.points.length > 0);
        if (primarySeries) {
          setPrimaryChartCache((current) => ({ ...current, [cacheKey]: primarySeries }));
          setNavError(null);
        } else {
          setNavError("Unable to load primary strategy series.");
        }
      })
      .catch(() => {
        if (!active) return;
        setNavError("Unable to load chart data.");
      })
      .finally(() => {
        if (active) setIsLoadingNav(false);
      });
    return () => {
      active = false;
    };
  }, [chartMode, locale, primaryChartCache, selectedStrategy]);

  useEffect(() => {
    if (chartMode !== "unit_price" || !selectedBenchmark || benchmarkCache[selectedBenchmark]) {
      setIsLoadingBenchmarkHistory(false);
      return;
    }

    let active = true;
    setIsLoadingBenchmarkHistory(true);
    fetchJson(`/api/v1/benchmarks/${encodeURIComponent(selectedBenchmark)}/history?normalize=true`, locale)
      .then((payload) => {
        if (!active) return;
        const normalized = normalizeBenchmarkHistory(payload, selectedBenchmark);
        setBenchmarkCache((current) => ({ ...current, [selectedBenchmark]: normalized }));
      })
      .catch(() => {
        if (import.meta.env.DEV) {
          console.debug(`Benchmark history unavailable for ${selectedBenchmark}.`);
        }
      })
      .finally(() => {
        if (active) setIsLoadingBenchmarkHistory(false);
      });

    return () => {
      active = false;
    };
  }, [benchmarkCache, chartMode, locale, selectedBenchmark]);

  useEffect(() => {
    if (!selectedStrategy) {
      setTreeNodes([]);
      setTreeWarnings([]);
      setSelectedTreeNode(null);
      return;
    }
    let active = true;
    setIsLoadingTree(true);
    setTreeError(null);
    setSelectedTreeNode(null);
    setHistoryPage(1);
    setHistorySearchInput("");
    setHistorySearch("");
    fetchJson(`/api/v1/strategy-groups/${encodeURIComponent(selectedStrategy.groupId)}/tree`, locale)
      .then((payload) => {
        if (!active) return;
        const normalized = normalizeTree(payload, locale);
        setTreeNodes(normalized);
        setTreeWarnings(getTreeStructuredWarnings(payload));
        setSelectedTreeNode(getFirstTreeNode(normalized) ?? null);
      })
      .catch(() => {
        if (!active) return;
        setTreeNodes([]);
        setTreeWarnings([]);
        setTreeError("Unable to load explorer data.");
      })
      .finally(() => {
        if (active) setIsLoadingTree(false);
      });
    return () => {
      active = false;
    };
  }, [locale, selectedStrategy]);

  useEffect(() => {
    if (!selectedStrategy || !selectedTreeNode) {
      setNodeDetails(null);
      setHistoryData(createEmptyHistory(historyPage, historyPageSize));
      setSelectedDataset(null);
      return;
    }
    let active = true;
    setIsLoadingDetails(true);
    setIsLoadingHistory(true);
    setDetailsError(null);
    setHistoryError(null);
    setNodeDetails(null);
    setHistoryData(createEmptyHistory(1, historyPageSize));
    setSelectedDataset(getDefaultDatasetForNode(selectedTreeNode));
    const detailsUrl = buildExplorerDetailsUrl("/api/v1", selectedStrategy.groupId, selectedTreeNode);
    if (import.meta.env.DEV) {
      console.debug("Explorer details request", { node: selectedTreeNode, url: detailsUrl });
    }
    fetchJson(detailsUrl, locale)
      .then((payload) => {
        if (!active) return;
        if (import.meta.env.DEV) {
          console.debug("Explorer details raw response", payload);
        }
        const details = normalizeDetails(payload, locale, selectedTreeNode);
        setNodeDetails(details);
      })
      .catch(() => {
        if (active) {
          setNodeDetails(null);
          setDetailsError("Unable to load explorer details.");
          setIsLoadingHistory(false);
        }
      })
      .finally(() => {
        if (active) setIsLoadingDetails(false);
      });

    return () => {
      active = false;
    };
  }, [locale, selectedStrategy, selectedTreeNode]);

  useEffect(() => {
    const url = buildAssetDeltasUrl(selectedTreeNode);
    if (url === null) {
      setAssetDeltas(null);
      setAssetDeltasError(null);
      setIsLoadingAssetDeltas(false);
      return;
    }

    let active = true;
    setAssetDeltas(null);
    setAssetDeltasError(null);
    setIsLoadingAssetDeltas(true);
    fetchJson(url, locale)
      .then((payload) => {
        if (!active) return;
        const normalized = normalizeAssetDeltas(payload);
        if (normalized === null) {
          setAssetDeltasError("Asset delta response is unavailable.");
          return;
        }
        setAssetDeltas(normalized);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setAssetDeltas(null);
        setAssetDeltasError(requestError instanceof ApiRequestError && requestError.responseMessage
          ? requestError.responseMessage
          : "Unable to load asset deltas from ANMI API.");
      })
      .finally(() => {
        if (active) setIsLoadingAssetDeltas(false);
      });

    return () => {
      active = false;
    };
  }, [locale, selectedTreeNode]);

  useEffect(() => {
    if (!selectedStrategy || !selectedTreeNode || !selectedDataset) return;
    let active = true;
    setIsLoadingHistory(true);
    setHistoryError(null);
    const historyUrl = buildExplorerHistoryUrl(
      "/api/v1",
      selectedStrategy.groupId,
      selectedTreeNode,
      selectedDataset,
      historyPage,
      historyPageSize,
      historySearch,
    );
    if (import.meta.env.DEV) {
      console.debug("Explorer history request", { node: selectedTreeNode, dataset: selectedDataset, url: historyUrl });
    }
    fetchJson(historyUrl, locale)
      .then((payload) => {
        if (!active) return;
        if (import.meta.env.DEV) {
          console.debug("Explorer history raw response", payload);
        }
        setHistoryData(normalizeHistory(payload, historyPage, historyPageSize, historySearch));
      })
      .catch(() => {
        if (active) {
          setHistoryData(createEmptyHistory(historyPage, historyPageSize));
          setHistoryError("Unable to load explorer history.");
        }
      })
      .finally(() => {
        if (active) setIsLoadingHistory(false);
      });

    return () => {
      active = false;
    };
  }, [historyPage, historyPageSize, historySearch, locale, selectedDataset, selectedStrategy, selectedTreeNode]);

  const analytics = useMemo(() => {
    const metric = chartMode === "nav_usd" ? "nav_usd" : "unit_price";
    const cacheKey = selectedStrategy ? `${selectedStrategy.id}:${metric}` : "";
    const chartView = buildChartView({
      chartMode,
      primarySeries: primaryChartCache[cacheKey],
      selectedBenchmark,
      benchmarkCache,
    });
    if (import.meta.env.DEV) {
      console.debug("ChartView", {
        mode: chartView.mode,
        primaryPoints: chartView.primaryData.length,
        benchmarkPoints: chartView.benchmarkData.length,
        firstPrimary: chartView.primaryData[0],
        firstBenchmark: chartView.benchmarkData[0],
      });
    }
    return { chartView };
  }, [benchmarkCache, chartMode, primaryChartCache, selectedBenchmark, selectedStrategy]);

  function handleStrategyChange(nextId: string): void {
    setIsSelectorOpen(false);
    setStrategySearch("");
    navigate(localizedPath(locale, `/strategies/${encodeURIComponent(nextId)}`));
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

  function handleHistoryPageChange(nextPage: number): void {
    setHistoryPage(Math.max(1, Math.min(totalHistoryPages, nextPage)));
  }

  function handleHistoryPageSizeChange(nextPageSize: (typeof HISTORY_PAGE_SIZES)[number]): void {
    setHistoryPageSize(nextPageSize);
    setHistoryPage(1);
  }

  function handleHistorySearchInputChange(value: string): void {
    setHistorySearchInput(value);
    setHistoryPage(1);
  }

  function handleDatasetChange(dataset: string): void {
    setSelectedDataset(dataset);
    setHistoryPage(1);
  }

  function handleExplorerNodeChange(node: ExplorerTreeNode): void {
    setSelectedTreeNode(node);
    setHistoryPage(1);
    setHistorySearchInput("");
    setHistorySearch("");
  }

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#050b14] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_90%_8%,rgba(14,165,233,0.12),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0),rgba(2,6,23,0.88))]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:56px_56px]" />

      <header className="relative z-50 border-b border-white/10 bg-[#07111f]/90 backdrop-blur-xl">
        <div className="relative z-40 mx-auto max-w-7xl px-5 py-6 lg:px-8">
          <div className="flex items-start gap-5">
            <div className="flex min-w-0 flex-1 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-6">
                <Link to={localizedPath(locale)} className="shrink-0 pt-5" aria-label="ANMI home">
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
                      className="group inline-flex max-w-full items-center gap-2 text-left transition focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-70"
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
                        onClose={() => setIsSelectorOpen(false)}
                      />
                    ) : null}
                  </div>

                  {activeStrategy?.description ? (
                    <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-400">{activeStrategy.description}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
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

      <section className="relative z-0 mx-auto min-w-0 max-w-7xl overflow-hidden px-5 py-8 lg:px-8">
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
            action={firstStrategy ? { label: `Open ${firstStrategy.name}`, onClick: () => navigate(localizedPath(locale, `/strategies/${encodeURIComponent(firstStrategy.id)}`), { replace: true }) } : undefined}
          />
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 rounded-2xl border border-white/10 bg-[#081421]/90 p-4 shadow-2xl shadow-slate-950/30 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  <LineChart className="h-4 w-4 text-cyan-200" />
                  <div className="inline-flex items-center text-sm font-medium">
                    <button
                      type="button"
                      onClick={() => handleChartModeChange("nav_usd")}
                      className={cn(
                        "px-1 py-0.5 text-sm transition",
                        chartMode === "nav_usd" ? "text-cyan-100" : "text-slate-500 hover:text-slate-200",
                      )}
                    >
                      AUM
                    </button>
                    <span className="mx-2 h-4 w-px bg-white/10" />
                    <button
                      type="button"
                      onClick={() => handleChartModeChange("unit_price")}
                      className={cn(
                        "px-1 py-0.5 text-sm transition",
                        chartMode === "unit_price" ? "text-cyan-100" : "text-slate-500 hover:text-slate-200",
                      )}
                    >
                      UNIT PRICE
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-500">{analytics.chartView.subtitle}</p>
              </div>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:flex-nowrap lg:w-auto lg:shrink-0">
                {chartMode === "unit_price" ? (
                  <div ref={benchmarkMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsBenchmarkMenuOpen((isOpen) => !isOpen)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-white"
                    >
                      <span>Benchmark</span>
                      <span className="text-cyan-100">{selectedBenchmark ?? "None"}</span>
                      {isLoadingBenchmarkHistory ? <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-200" /> : null}
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
            <StrategyTimeSeriesChart
              chartView={analytics.chartView}
              loading={isLoadingNav}
            />
            {navError ? (
              <div className="mt-3 text-xs text-amber-200/75">{navError}</div>
            ) : null}
          </div>

          <div className="min-w-0">
            <MetricsTable metrics={primaryMetrics} />
            {dataQualityWarnings.length > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-xs leading-5 text-amber-100">
                {dataQualityWarnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">Advanced Metrics</div>
              <p className="mt-1 text-xs text-slate-500">Persisted analytics calculated by ANMI Track from complete daily unit-price returns</p>
            </div>
            <div className="inline-flex self-start rounded-lg border border-white/10 bg-slate-950/40 p-1 sm:self-auto">
              {(["30d", "90d", "all"] as const).map((window) => (
                <button
                  key={window}
                  type="button"
                  onClick={() => setAdvancedMetricsWindow(window)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition",
                    advancedMetricsWindow === window
                      ? "bg-cyan-300/15 text-cyan-100"
                      : "text-slate-500 hover:text-slate-200",
                  )}
                >
                  {window}
                </button>
              ))}
            </div>
          </div>
          {isLoadingAdvancedMetrics ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/30 px-4 py-8 text-center text-sm text-slate-400">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-cyan-200" />
              Loading persisted advanced metrics…
            </div>
          ) : advancedMetricsError ? (
            <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center">
              <span>{advancedMetricsError}</span>
              <button
                type="button"
                onClick={() => setAdvancedMetricsRequestVersion((version) => version + 1)}
                className="shrink-0 rounded-lg border border-amber-200/20 bg-amber-100/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100 transition hover:bg-amber-100/10"
              >
                Try again
              </button>
            </div>
          ) : advancedMetrics ? (
            <>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/20">
                  <div className="border-b border-white/10 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Correlation to markets
                  </div>
                  <div className="max-h-[344px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[#07111f] text-[10px] uppercase tracking-[0.12em] text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Market</th>
                          <th className="px-3 py-2 text-right font-semibold">Correlation</th>
                          <th className="px-3 py-2 text-right font-semibold">Observations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advancedMetrics.correlations.map((metric) => {
                          const isHigh = metric.correlation !== null && Math.abs(metric.correlation) > 0.6;
                          return (
                            <tr key={metric.symbol} className={cn("border-t border-white/[0.07]", isHigh ? "bg-amber-300/[0.06]" : null)}>
                              <td className="px-3 py-2 font-medium text-slate-200">{metric.symbol}</td>
                              <td className={cn("px-3 py-2 text-right font-semibold tabular-nums", isHigh ? "text-amber-200" : "text-slate-200")}>
                                {formatCorrelation(metric.correlation)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-slate-500">{metric.observations}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/20">
                  <div className="border-b border-white/10 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Autocorrelation
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Lag</th>
                        <th className="px-3 py-2 text-right font-semibold">Autocorrelation</th>
                        <th className="px-3 py-2 text-right font-semibold">Observations</th>
                        <th className="px-3 py-2 text-right font-semibold">Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advancedMetrics.autocorrelations.map((metric) => (
                        <tr key={metric.lagDays} className="border-t border-white/[0.07]">
                          <td className="px-3 py-2 font-medium text-slate-200">{metric.lagDays}d</td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-200">
                            {formatCorrelation(metric.autocorrelation)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-500">{metric.observations}</td>
                          <td className="px-3 py-2 text-right text-xs text-slate-500">
                            {autocorrelationInterpretation(metric.autocorrelation)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.045] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Optimal-F</div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Optimal-F</div>
                      <div className="mt-1 text-xl font-semibold tabular-nums text-white">{formatAdvancedNumber(advancedMetrics.optimalFUncapped)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Capped</div>
                      <div className="mt-1 text-xl font-semibold tabular-nums text-cyan-100">{formatAdvancedNumber(advancedMetrics.optimalFCapped)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Kelly approx.</div>
                      <div className="mt-1 font-semibold tabular-nums text-slate-200">{formatAdvancedNumber(advancedMetrics.kellyApprox)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Observations</div>
                      <div className="mt-1 font-semibold tabular-nums text-slate-200">{advancedMetrics.observations}</div>
                    </div>
                  </div>
                  {advancedMetrics.observations < 30 ? (
                    <div className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-xs leading-5 text-amber-100">
                      Small sample: only {advancedMetrics.observations} daily returns are available.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <AdvancedMetricCard label="Mean daily return" value={formatRatioPercent(advancedMetrics.meanDailyReturn, 3)} />
                <AdvancedMetricCard label="Daily volatility" value={formatRatioPercent(advancedMetrics.dailyVolatility, 3)} />
                <AdvancedMetricCard label="Maximum daily loss" value={formatRatioPercent(advancedMetrics.maxLoss, 3)} tone="risk" />
                <AdvancedMetricCard label="Data quality" value={formatRatioPercent(advancedMetrics.dataQuality, 1)} />
              </div>

              {advancedMetrics.warnings.length > 0 ? (
                <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2 text-xs leading-5 text-amber-100">
                  {advancedMetrics.warnings.map((warning) => <div key={warning}>{warning}</div>)}
                </div>
              ) : null}
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Optimal-F is estimated from historical daily returns and is not a guaranteed safe allocation.
                {advancedMetrics.timestamp ? ` Calculated ${formatDateTime(advancedMetrics.timestamp)}.` : ""}
              </p>
            </>
          ) : null}
        </section>

        <DataExplorer
          assetDeltas={assetDeltas}
          assetDeltasError={assetDeltasError}
          details={nodeDetails}
          detailsError={detailsError}
          historyColumns={historyData.columns}
          historyError={historyError}
          historyPage={safeHistoryPage}
          historyPageSize={historyPageSize}
          historyRangeLabel={historyRangeLabel}
          historyRows={historyData.rows}
          historySearch={historySearchInput}
          globalWarnings={globalTreeWarnings}
          hasHistoryMessageColumn={hasHistoryMessageColumn}
          isLoadingDetails={isLoadingDetails}
          isLoadingAssetDeltas={isLoadingAssetDeltas}
          isLoadingHistory={isLoadingHistory}
          isLoadingTree={isLoadingTree}
          hasNextHistoryPage={historyPagination.hasNextPage}
          hasPreviousHistoryPage={historyPagination.hasPreviousPage}
          nodes={treeNodes}
          selectedNode={selectedTreeNode ?? undefined}
          selectedNodeWarnings={selectedNodeWarnings}
          selectedDataset={selectedDataset}
          treeError={treeError}
          totalHistoryPages={totalHistoryPages}
          onHistorySearchInputChange={handleHistorySearchInputChange}
          onHistoryPageChange={handleHistoryPageChange}
          onHistoryPageSizeChange={handleHistoryPageSizeChange}
          onSelectNode={handleExplorerNodeChange}
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

function AdvancedMetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "risk";
}): JSX.Element {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/20 px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className={cn("mt-1.5 text-lg font-semibold tabular-nums", tone === "risk" ? "text-amber-200" : "text-slate-100")}>
        {value}
      </div>
    </div>
  );
}

function ExplorerNodeSelector({
  nodes,
  selectedNode,
  onSelectNode,
}: {
  nodes: FlatExplorerNode[];
  selectedNode?: ExplorerTreeNode;
  onSelectNode: (node: ExplorerTreeNode) => void;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedKey = selectedNode?.uiKey ?? null;
  const selectedType = selectedNode ? formatExplorerNodeKind(selectedNode) : "Select node";
  const normalizedSearch = search.trim().toLowerCase();
  const filteredNodes = normalizedSearch
    ? nodes.filter((node) => (
        node.label.toLowerCase().includes(normalizedSearch) ||
        node.pathLabel.toLowerCase().includes(normalizedSearch) ||
        formatExplorerNodeKind(node).toLowerCase().includes(normalizedSearch)
      ))
    : nodes;

  useEffect(() => {
    if (!isOpen) return undefined;

    const onPointerDown = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        disabled={nodes.length === 0}
        onClick={() => setIsOpen((value) => !value)}
        className={cn(
          "flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-left transition",
          "hover:border-cyan-300/30 hover:bg-cyan-300/5 disabled:cursor-not-allowed disabled:opacity-50",
          isOpen ? "border-cyan-300/40 bg-cyan-300/10" : null,
        )}
      >
        <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <span className="block truncate text-sm font-semibold text-white">{selectedNode?.label ?? "Select a node"}</span>
          <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{selectedType}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", isOpen ? "rotate-180 text-cyan-100" : null)} />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/60">
          <div className="border-b border-white/10 p-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search nodes..."
              autoFocus
              className="h-9 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {filteredNodes.map((node) => {
              const selected = node.uiKey === selectedKey;
              const parentPath = node.pathLabel.split(" / ").slice(0, -1).join(" / ");

              return (
                <button
                  key={node.uiKey}
                  type="button"
                  onClick={() => {
                    onSelectNode(node);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2 text-left transition",
                    selected ? "bg-cyan-300/12 text-white" : "text-slate-300 hover:bg-white/[0.055] hover:text-white",
                  )}
                  style={{ paddingLeft: `${12 + node.depth * 12}px` }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{node.label}</span>
                    <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      {formatExplorerNodeKind(node)}{parentPath ? ` / ${parentPath}` : ""}
                    </span>
                  </span>
                  {node.hasCollectionError ? <StatusBadge label="Error" tone="warning" title={node.latestErrorMessage ?? undefined} /> : null}
                </button>
              );
            })}
            {filteredNodes.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500">No nodes match your search</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DataExplorer({
  assetDeltas,
  assetDeltasError,
  details,
  detailsError,
  historyColumns,
  historyError,
  historyPage,
  historyPageSize,
  historyRangeLabel,
  historyRows,
  historySearch,
  globalWarnings,
  hasHistoryMessageColumn,
  hasNextHistoryPage,
  hasPreviousHistoryPage,
  isLoadingDetails,
  isLoadingAssetDeltas,
  isLoadingHistory,
  isLoadingTree,
  nodes,
  selectedDataset,
  selectedNode,
  selectedNodeWarnings,
  totalHistoryPages,
  treeError,
  onHistorySearchInputChange,
  onHistoryPageChange,
  onHistoryPageSizeChange,
  onSelectNode,
}: {
  assetDeltas: AssetDeltasResponse | null;
  assetDeltasError: string | null;
  details: ExplorerDetails | null;
  detailsError: string | null;
  historyColumns: ExplorerHistoryColumn[];
  historyError: string | null;
  historyPage: number;
  historyPageSize: (typeof HISTORY_PAGE_SIZES)[number];
  historyRangeLabel: string;
  historyRows: HistoryRecord[];
  historySearch: string;
  globalWarnings: StructuredWarning[];
  hasHistoryMessageColumn: boolean;
  hasNextHistoryPage: boolean;
  hasPreviousHistoryPage: boolean;
  isLoadingDetails: boolean;
  isLoadingAssetDeltas: boolean;
  isLoadingHistory: boolean;
  isLoadingTree: boolean;
  nodes: ExplorerTreeNode[];
  selectedDataset: string | null;
  selectedNode?: ExplorerTreeNode;
  selectedNodeWarnings: StructuredWarning[];
  totalHistoryPages: number;
  treeError: string | null;
  onHistorySearchInputChange: (value: string) => void;
  onHistoryPageChange: (page: number) => void;
  onHistoryPageSizeChange: (pageSize: (typeof HISTORY_PAGE_SIZES)[number]) => void;
  onSelectNode: (node: ExplorerTreeNode) => void;
}): JSX.Element {
  const locale = useLocale();
  const flatNodes = useMemo(() => flattenExplorerNodes(nodes), [nodes]);
  const datasetLabel = selectedDataset ? formatDatasetLabel(selectedDataset) : "selected dataset";
  const canGoBack = hasPreviousHistoryPage;
  const canGoForward = hasNextHistoryPage;
  const currentNodeMetrics = buildNodeCurrentMetrics(details, locale, selectedNode);
  const exposureMix = buildExposureMix(details, selectedNode);
  const warningsToShow = selectedNodeWarnings.length > 0
    ? selectedNodeWarnings
    : details?.warnings.map((message) => ({ level: "warning", code: "warning", message })) ?? [];

  return (
    <section className="mt-6 min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-[#081421]/90 p-4 shadow-2xl shadow-slate-950/30 sm:p-6">
      <div className="mb-5">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-100">Track Record Explorer</div>
        <p className="mt-2 text-sm text-slate-500">
          See what the strategy is really made of: raw balances, positions, snapshots, and collection history.
        </p>
        {globalWarnings.length > 0 ? (
          <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-xs leading-5 text-amber-100">
            Data Quality: {globalWarnings.map((warning) => warning.message).join(" ")}
          </div>
        ) : null}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <ExplorerNodeSelector nodes={flatNodes} selectedNode={selectedNode} onSelectNode={onSelectNode} />

          {isLoadingTree ? <div className="mt-4 text-sm text-slate-500">Loading explorer data...</div> : null}
          {treeError ? <div className="mt-4 text-sm text-amber-100">{treeError}</div> : null}
          {!isLoadingTree && !treeError && nodes.length === 0 ? <div className="mt-4 text-sm text-slate-500">No explorer tree available</div> : null}

          <div className="mt-5 min-w-0">
            {isLoadingDetails ? <div className="text-sm text-slate-500">Loading node details...</div> : null}
            {detailsError ? <div className="text-sm text-amber-100">{detailsError}</div> : null}
            {!isLoadingDetails && !detailsError ? (
              <div className="min-w-0">
                {details?.subtitle ? <div className="text-xs text-slate-500">{details.subtitle}</div> : null}
              </div>
            ) : null}
          </div>

          {exposureMix.length > 0 ? <ExposureMixBar items={exposureMix} /> : null}

          <div className="mt-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
              Current metrics
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Latest verified values for the selected element.
            </div>
            <NodeMetricsTable metrics={currentNodeMetrics} />
            {selectedNode?.type === "strategy_group" || selectedNode?.type === "strategy" ? (
              <AssetDeltasTable data={assetDeltas} error={assetDeltasError} isLoading={isLoadingAssetDeltas} />
            ) : null}
          </div>

          {warningsToShow.length ? (
            <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-xs leading-5 text-amber-100">
              {warningsToShow.map((warning) => `${warning.level}: ${warning.message}`).join(" ")}
            </div>
          ) : null}
        </aside>

        <section className="min-w-0 rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Historical records</div>
              <div className="mt-1 truncate text-xs text-slate-500">{selectedNode?.label ?? "Select a node"}</div>
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={historySearch}
                onChange={(event) => onHistorySearchInputChange(event.target.value)}
                placeholder="Search history..."
                className="h-10 min-w-0 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 sm:w-64"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Rows</span>
                <select
                  value={historyPageSize}
                  onChange={(event) => {
                    const nextPageSize = HISTORY_PAGE_SIZES.find((pageSize) => pageSize === Number(event.target.value));
                    if (nextPageSize) onHistoryPageSizeChange(nextPageSize);
                  }}
                  className="h-8 rounded-lg border border-white/10 bg-slate-950 px-2 text-xs text-slate-200 outline-none focus:border-cyan-300/40"
                >
                  {HISTORY_PAGE_SIZES.map((pageSize) => (
                    <option key={pageSize} value={pageSize}>{pageSize}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!canGoBack}
                  onClick={() => onHistoryPageChange(Math.max(1, historyPage - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-cyan-300/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous history page"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <span className="tabular-nums">{historyPage} / {totalHistoryPages}</span>
                <button
                  type="button"
                  disabled={!canGoForward}
                  onClick={() => onHistoryPageChange(historyPage + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition hover:border-cyan-300/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next history page"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mb-3 text-xs text-slate-500">{historyRangeLabel}</div>
          {isLoadingHistory ? <div className="text-sm text-slate-500">Loading history...</div> : null}
          {historyError ? <div className="text-sm text-amber-100">{historyError}</div> : null}
          {!isLoadingHistory && !historyError && historyRows.length === 0 ? <div className="text-sm text-slate-500">No history records found for {datasetLabel}</div> : null}
          {historyRows.length > 0 ? <HistoryTable rows={historyRows} columns={historyColumns} showMessageColumn={hasHistoryMessageColumn} /> : null}
        </section>
      </div>
    </section>
  );
}

function TreeNodeButton({
  depth,
  node,
  selectedNodeKey,
  onSelectNode,
}: {
  depth: number;
  node: ExplorerTreeNode;
  selectedNodeKey: string | null;
  onSelectNode: (node: ExplorerTreeNode) => void;
}): JSX.Element {
  const selected = node.uiKey === selectedNodeKey;
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelectNode(node)}
        className={cn(
          "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border px-3 py-3 text-left transition",
          selected
            ? "border-cyan-300/60 bg-cyan-300/10 text-white"
            : "border-transparent text-slate-300 hover:border-cyan-300/25 hover:bg-cyan-300/5 hover:text-white",
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="min-w-0 text-left">
          <span className="block truncate text-sm font-semibold text-slate-100">{node.label}</span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{formatExplorerNodeKind(node)}</span>
          {/*
              {[...node.headerFields, ...node.summaryCards].slice(0, 2).map((item) => `${item.label}: ${item.value}`).join(" · ")}
            </span>
          ) : null}
          */}
          {node.hasCollectionError ? (
            <span className="mt-1 block truncate text-[10px] font-medium text-amber-200" title={node.latestErrorMessage ?? undefined}>
              Collection error
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-xs font-semibold tabular-nums text-slate-100">{formatTreeAum(node)}</span>
          <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{formatTreeWeight(node)}</span>
        </span>
      </button>
      {node.children?.map((child) => (
        <TreeNodeButton key={child.uiKey} node={child} depth={depth + 1} selectedNodeKey={selectedNodeKey} onSelectNode={onSelectNode} />
      ))}
    </div>
  );
}

function StatusBadge({
  label,
  tone,
  title,
}: {
  label: string;
  tone: "good" | "warning" | "risk" | "default";
  title?: string;
}): JSX.Element {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
        tone === "good" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : null,
        tone === "warning" ? "border-amber-300/20 bg-amber-300/10 text-amber-100" : null,
        tone === "risk" ? "border-rose-300/20 bg-rose-300/10 text-rose-100" : null,
        tone === "default" ? "border-white/10 bg-white/[0.04] text-slate-400" : null,
      )}
    >
      {label}
    </span>
  );
}

function StatusIcon({ status }: { status: string | null }): JSX.Element {
  const tone = getStatusTone(status);
  const className = cn(
    "h-4 w-4",
    tone === "good" ? "text-emerald-300" : null,
    tone === "warning" ? "text-amber-300" : null,
    tone === "risk" ? "text-rose-300" : null,
    tone === "default" ? "text-slate-500" : null,
  );

  if (tone === "good") return <CheckCircle className={className} aria-label={status ?? "OK"} />;
  if (tone === "warning") return <AlertTriangle className={className} aria-label={status ?? "Warning"} />;
  if (tone === "risk") return <XCircle className={className} aria-label={status ?? "Error"} />;
  return <Circle className={className} aria-label={status ?? "Unknown"} />;
}

function formatHistoryCell(column: ExplorerHistoryColumn, row: HistoryRecord): string {
  const value = row[column.key];
  if (value === null || value === undefined) return isStrategyContractMetricField(column.key) ? "—" : formatEmptyValue();

  const normalizedFormat = column.format?.trim().toLowerCase();
  if (normalizedFormat === "currency" || column.unit === "USD") return formatUsdOrNA(asNumber(value));
  if (normalizedFormat === "percent") {
    const numericValue = asNumber(value);
    if (numericValue === undefined) return formatValue(value);
    if (isDailyVar95Field(column.key)) return formatRiskPercentPointsOrDash(numericValue);
    return isPercentagePointsField(column.key) ? formatPercentPointsOrDash(numericValue) : formatPercent(numericValue);
  }
  if (normalizedFormat === "datetime" || column.type === "datetime" || isTimestampField(column.key)) return formatDateTime(value);
  if (normalizedFormat === "address") return formatAddress(value);
  if (normalizedFormat === "tags") return formatTags(value);
  if (normalizedFormat === "boolean" || column.type === "boolean") return typeof value === "boolean" ? (value ? "Yes" : "No") : formatValue(value);
  if (isLifetimeDaysField(column.key)) return formatLifetimeDays(asNumber(value));
  if (normalizedFormat === "number" || column.type === "number") return formatNumberOrNA(asNumber(value));

  return formatFieldValue(column.key, value);
}

function HistoryTable({
  rows,
  columns,
  showMessageColumn,
}: {
  rows: HistoryRecord[];
  columns: ExplorerHistoryColumn[];
  showMessageColumn: boolean;
}): JSX.Element {
  return (
    <div className="min-w-0 max-w-full overflow-x-auto">
      <table className="w-full min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-white/10 text-left text-[10px] uppercase tracking-[0.14em] text-slate-500">
            <th className="w-10 px-3 py-3 font-medium">Status</th>
            {columns.map((column) => <th key={column.key} className="px-3 py-3 font-medium">{column.label}</th>)}
            {showMessageColumn ? <th className="px-3 py-3 font-medium">Message</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const status = getRowStatus(row);
            const message = getRowMessage(row);
            const tone = getStatusTone(status);
            return (
              <tr key={index} className="border-b border-white/[0.06] text-slate-300 hover:bg-white/[0.025]">
                <td className="px-3 py-3" title={status ?? "Unknown"}>
                  <StatusIcon status={status} />
                </td>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "max-w-[220px] truncate px-3 py-3",
                      isTimestampField(column.key) ? "tabular-nums text-slate-200" : null,
                      ["nav", "nav_usd", "navUsd", "unit_price", "unitPrice", "units"].includes(column.key) ? "tabular-nums text-slate-100" : null,
                    )}
                    title={formatHistoryCell(column, row)}
                  >
                    {formatHistoryCell(column, row)}
                  </td>
                ))}
                {showMessageColumn ? (
                  <td
                    className={cn(
                      "max-w-[280px] truncate px-3 py-3",
                      tone === "risk" ? "text-rose-200" : null,
                      tone === "warning" ? "text-amber-100" : null,
                      tone === "good" ? "text-slate-400" : null,
                    )}
                    title={message ?? ""}
                  >
                    {message ?? "N/A"}
                  </td>
                ) : null}
              </tr>
            );
          })}
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
    <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs">
      <span className="min-w-0 truncate uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="min-w-0 max-w-[180px] overflow-hidden truncate font-medium text-slate-100">{value}</span>
    </div>
  );
}

function StrategySelectorMetric({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}): JSX.Element {
  return (
    <div className="min-w-0" title={hint}>
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600 lg:hidden">
        {label}
      </div>
      <div
        className={cn(
          "whitespace-normal break-words font-medium tabular-nums [overflow-wrap:anywhere]",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}

function StrategySelectorGrid({
  search,
  strategies,
  selectedId,
  onSearchChange,
  onSelect,
  onClose,
}: {
  search: string;
  strategies: StrategySummary[];
  selectedId?: string;
  onSearchChange: (value: string) => void;
  onSelect: (strategyId: string) => void;
  onClose: () => void;
}): JSX.Element {
  const [sortKey, setSortKey] = useState<StrategySortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const sortedStrategies = useMemo(() => {
    return [...strategies].sort((left, right) => {
      if (sortKey === "name") {
        const comparison = left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
        return sortDirection === "asc" ? comparison : -comparison;
      }
      return compareNullableMetricValues(left[sortKey], right[sortKey], sortDirection);
    });
  }, [sortDirection, sortKey, strategies]);
  const desktopGridStyle = {
    gridTemplateColumns: "minmax(180px,1.7fr) repeat(8,minmax(72px,0.7fr))",
  };

  function handleSort(nextKey: StrategySortKey): void {
    if (sortKey === nextKey) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "name" ? "asc" : "desc");
  }

  function getSortIndicator(key: StrategySortKey): string {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  return (
    <div
      className={cn(
        "pointer-events-auto z-[100] min-w-0 max-w-full overflow-x-hidden shadow-2xl shadow-black/70",
        "fixed inset-0 flex h-[100dvh] w-screen max-w-none flex-col rounded-none border-0 bg-slate-950",
        "sm:absolute sm:left-0 sm:right-auto sm:top-full sm:bottom-auto sm:mt-4 sm:block sm:h-auto sm:max-h-none sm:w-[min(1280px,calc(100vw-2rem))] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-white/10",
      )}
    >
      <div className="shrink-0 border-b border-white/10 bg-slate-900/95 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/75">
            Select strategy
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-300 sm:hidden"
            aria-label="Close strategy selector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search strategies..."
          className="mt-3 w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] sm:max-h-[400px]">
        <div
          className="sticky top-0 z-10 hidden bg-slate-900 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 lg:grid lg:gap-2"
          style={desktopGridStyle}
        >
          <button
            type="button"
            onClick={() => handleSort("name")}
            className="text-left transition hover:text-cyan-100"
          >
            Strategy{getSortIndicator("name")}
          </button>
          {STRATEGY_METRIC_COLUMNS.map((column) => (
            <button
              key={column.key}
              type="button"
              title={column.hint}
              onClick={() => handleSort(column.key)}
              className="min-w-0 whitespace-normal text-left leading-4 transition hover:text-cyan-100"
            >
              {column.label}{getSortIndicator(column.key)}
            </button>
          ))}
        </div>
        {sortedStrategies.map((strategy) => {
          const selected = strategy.id === selectedId;

          return (
            <button
              key={strategy.id}
              type="button"
              onClick={() => onSelect(strategy.id)}
              className={cn(
                "group flex w-full min-w-0 max-w-full cursor-pointer flex-col gap-3 border-t border-white/10 px-4 py-4 text-left text-sm transition-all duration-200",
                "lg:grid lg:items-center lg:gap-2 lg:px-5",
                "lg:hover:-translate-y-[1px] lg:hover:border-cyan-300/30 lg:hover:bg-cyan-300/10 lg:hover:shadow-lg lg:hover:shadow-cyan-950/25",
                selected ? "border-l-2 border-l-cyan-300 bg-cyan-300/15 text-white" : "bg-slate-950 text-slate-300",
              )}
              style={desktopGridStyle}
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="whitespace-normal break-words font-semibold leading-5 text-white transition [overflow-wrap:anywhere] group-hover:text-cyan-50 sm:truncate">
                    {strategy.name}
                  </div>
                  <ArrowRight className="hidden h-4 w-4 shrink-0 text-cyan-100 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100 lg:block" />
                </div>
                {strategy.description ? (
                  <div className="mt-1 whitespace-normal break-words text-xs leading-5 text-slate-500 transition [overflow-wrap:anywhere] group-hover:text-slate-300 lg:truncate">
                    {strategy.description}
                  </div>
                ) : null}
              </div>
              <div className="grid min-w-0 max-w-full grid-cols-2 gap-3 lg:contents">
                {STRATEGY_METRIC_COLUMNS.map((column) => {
                  const value = strategy[column.key];
                  return (
                    <StrategySelectorMetric
                      key={column.key}
                      label={column.label}
                      value={column.format(value)}
                      hint={column.hint}
                      valueClassName={cn(column.valueClassName(value), "transition group-hover:brightness-125")}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
        {strategies.length === 0 ? (
          <div className="border-t border-white/10 px-5 py-5 text-sm text-slate-500">No strategies match your search</div>
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
    <div className="inline-flex items-center text-sm font-medium">
      {options.map((option, index) => (
        <span key={option.value} className="inline-flex items-center">
          {index > 0 ? <span className="mx-2 h-4 w-px bg-white/10" /> : null}
          <button
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "px-1 py-0.5 text-sm transition",
              option.value === value
                ? "text-cyan-100"
                : "text-slate-500 hover:text-slate-200",
            )}
          >
            {option.label}
          </button>
        </span>
      ))}
    </div>
  );
}
