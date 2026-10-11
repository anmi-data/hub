import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  type ISeriesMarkersPluginApi,
  LineSeries,
  type AreaData,
  type BarPrice,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { Loader2 } from "lucide-react";
import { alignCapitalFlows, formatFlowUsd, type ChartCapitalFlow } from "./capitalFlows";

export type ChartViewPoint = {
  time: number;
  value: number;
};

export type ChartView = {
  capitalFlows?: ChartCapitalFlow[];
  mode: "aum" | "unit_price";
  title: string;
  subtitle: string;
  primaryLabel: string;
  benchmarkLabel?: string;
  primaryData: ChartViewPoint[];
  benchmarkData: ChartViewPoint[];
  valueMode: "usd" | "unit_price" | "index";
};

type StrategyTimeSeriesChartProps = {
  chartView: ChartView;
  loading?: boolean;
};

type TooltipState = {
  flows?: ChartCapitalFlow[];
  visible: boolean;
  x: number;
  y: number;
  date: string;
  primary?: string;
  benchmark?: string;
};

function formatPrimaryValue(value: number, valueMode: ChartView["valueMode"]): string {
  if (valueMode === "usd") {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  }

  if (valueMode === "index") {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function formatBenchmarkValue(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUsdAxisValue(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatTooltipDate(time: Time): string {
  if (typeof time === "number") {
    return new Date(time * 1000).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return String(time);
}

function toSeriesTime(time: number): UTCTimestamp {
  return time as UTCTimestamp;
}

function toAreaData(data: ChartViewPoint[]): AreaData<Time>[] {
  return data
    .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value))
    .sort((left, right) => left.time - right.time)
    .map((point) => ({ time: toSeriesTime(point.time), value: point.value }));
}

function toLineData(data: ChartViewPoint[]): LineData<Time>[] {
  return data
    .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value))
    .sort((left, right) => left.time - right.time)
    .map((point) => ({ time: toSeriesTime(point.time), value: point.value }));
}

function getSeriesValue(item: unknown): number | undefined {
  if (typeof item !== "object" || item === null || !("value" in item)) return undefined;
  const value = (item as { value?: unknown }).value;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getDataSignature(data: Array<{ time: Time; value: number }>): string {
  return data.map((point) => `${String(point.time)}:${point.value}`).join("|");
}

export function StrategyTimeSeriesChart({
  chartView,
  loading = false,
}: StrategyTimeSeriesChartProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const primarySeriesRef = useRef<ISeriesApi<"Area", Time> | null>(null);
  const benchmarkSeriesRef = useRef<ISeriesApi<"Line", Time> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const flowsRef = useRef(new Map<number, ChartCapitalFlow[]>());
  const chartViewRef = useRef(chartView);
  const primarySignatureRef = useRef<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, date: "" });

  const primaryData = useMemo(() => toAreaData(chartView.primaryData), [chartView.primaryData]);
  const benchmarkData = useMemo(() => toLineData(chartView.benchmarkData), [chartView.benchmarkData]);
  const primarySignature = useMemo(() => getDataSignature(primaryData), [primaryData]);
  const hasBenchmark = benchmarkData.length > 0;

  useEffect(() => {
    chartViewRef.current = chartView;
  }, [chartView]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.08)" },
        horzLines: { color: "rgba(148, 163, 184, 0.12)" },
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.18)",
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.18)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: "rgba(125, 211, 252, 0.25)", labelBackgroundColor: "#0f172a" },
        horzLine: { color: "rgba(125, 211, 252, 0.18)", labelBackgroundColor: "#0f172a" },
      },
    });

    const primarySeries = chart.addSeries(AreaSeries, {
      lineColor: "#22d3ee",
      topColor: "rgba(34, 211, 238, 0.26)",
      bottomColor: "rgba(34, 211, 238, 0.02)",
      lineWidth: 3,
      priceLineVisible: false,
    });
    const benchmarkSeries = chart.addSeries(LineSeries, {
      color: "#a78bfa",
      lineWidth: 2,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    primarySeriesRef.current = primarySeries;
    benchmarkSeriesRef.current = benchmarkSeries;
    markersRef.current = createSeriesMarkers(primarySeries, []);

    const handleCrosshairMove = (param: MouseEventParams<Time>): void => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0 || param.point.x > container.clientWidth || param.point.y > container.clientHeight) {
        setTooltip((current) => (current.visible ? { ...current, visible: false } : current));
        return;
      }

      const primaryValue = getSeriesValue(param.seriesData.get(primarySeries));
      const benchmarkValue = getSeriesValue(param.seriesData.get(benchmarkSeries));

      if (primaryValue === undefined) {
        setTooltip((current) => (current.visible ? { ...current, visible: false } : current));
        return;
      }

      setTooltip({
        visible: true,
        x: Math.min(param.point.x + 14, Math.max(14, container.clientWidth - 190)),
        y: Math.min(param.point.y + 14, Math.max(14, container.clientHeight - 112)),
        date: formatTooltipDate(param.time),
        flows: typeof param.time === "number" ? flowsRef.current.get(param.time) : undefined,
        primary: primaryValue === undefined ? undefined : formatPrimaryValue(primaryValue, chartViewRef.current.valueMode),
        benchmark: benchmarkValue === undefined ? undefined : formatBenchmarkValue(benchmarkValue),
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      chart.applyOptions({ width: Math.max(0, width), height: Math.max(0, height) });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      markersRef.current?.detach();
      markersRef.current = null;
      chart.remove();
      chartRef.current = null;
      primarySeriesRef.current = null;
      benchmarkSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (loading && primaryData.length === 0) return;
    if (primarySignatureRef.current === primarySignature) return;
    primarySignatureRef.current = primarySignature;
    primarySeriesRef.current?.setData(primaryData);

    if (primaryData.length > 0) {
      const latestTime = primaryData[primaryData.length - 1].time as UTCTimestamp;
      // Focus on the latest 30 days of strategy data; retain all points for panning.
      chartRef.current?.timeScale().setVisibleRange({
        from: toSeriesTime(latestTime - 30 * 24 * 60 * 60),
        to: latestTime,
      });
    }
  }, [loading, primaryData, primarySignature]);

  useEffect(() => {
    const flows = alignCapitalFlows(chartView.mode === "aum" ? chartView.capitalFlows ?? [] : [],
      primaryData.map(point => Number(point.time)));
    flowsRef.current = flows;
    setTooltip(current => ({ ...current, visible: false }));
    markersRef.current?.setMarkers([...flows.entries()].sort(([a], [b]) => a - b).flatMap(([time, events]) =>
      events.map(flow => ({
        time: toSeriesTime(time), id: `capital-flow-${flow.id}`,
        position: flow.externalFlowUsd < 0 ? "aboveBar" as const : "belowBar" as const,
        shape: flow.externalFlowUsd === 0 ? "circle" as const : flow.externalFlowUsd > 0 ? "arrowUp" as const : "arrowDown" as const,
        color: flow.externalFlowUsd === 0 ? "#a78bfa" : flow.externalFlowUsd > 0 ? "#34d399" : "#fb7185",
        text: flow.externalFlowUsd === 0 ? `${flow.flowType} ${formatPrimaryValue(Math.abs(flow.valueUsd), "usd")}` : formatFlowUsd(flow.externalFlowUsd),
      }))));
  }, [chartView.mode, chartView.capitalFlows, primaryData]);

  useEffect(() => {
    benchmarkSeriesRef.current?.setData(hasBenchmark ? benchmarkData : []);
  }, [benchmarkData, hasBenchmark]);

  useEffect(() => {
    primarySeriesRef.current?.applyOptions({
      priceFormat: chartView.valueMode === "usd"
        ? { type: "custom", formatter: (price: BarPrice) => formatUsdAxisValue(Number(price)) }
        : chartView.valueMode === "index"
          ? { type: "price", precision: 2, minMove: 0.01 }
          : { type: "price", precision: 4, minMove: 0.0001 },
    });
    benchmarkSeriesRef.current?.applyOptions({
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
  }, [chartView.valueMode]);

  return (
    <div className="relative h-[420px]">
      <div ref={containerRef} className="h-full w-full" />
      {chartView.mode === "aum" && (chartView.capitalFlows?.length ?? 0) > 0 ? (
        <div className="pointer-events-none absolute left-3 top-2 z-10 rounded bg-slate-950/80 px-2 py-1 text-[10px] text-slate-400">
          Capital flows: <span className="text-emerald-300">in</span> / <span className="text-rose-300">out</span> / <span className="text-violet-300">internal</span> · hover for details
        </div>
      ) : null}

      {!loading && primaryData.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl border border-white/10 bg-white/[0.025] text-sm text-slate-500">
          No chart data available.
        </div>
      ) : null}

      {tooltip.visible ? (
        <div
          className="absolute z-30 max-h-[380px] min-w-[176px] max-w-[320px] overflow-y-auto break-words rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 text-xs shadow-2xl shadow-black/50"
          style={{ left: tooltip.x, top: tooltip.flows?.length ? 14 : tooltip.y }}
        >
          <div className="mb-1 text-[11px] font-medium text-cyan-100">{tooltip.date}</div>
          {tooltip.primary ? (
            <div className="flex items-center justify-between gap-5 text-slate-300">
              <span>{chartView.primaryLabel}</span>
              <span className="font-semibold tabular-nums text-white">{tooltip.primary}</span>
            </div>
          ) : null}
          {tooltip.benchmark && chartView.benchmarkLabel ? (
            <div className="mt-1 flex items-center justify-between gap-5 text-slate-300">
              <span>{chartView.benchmarkLabel}</span>
              <span className="font-semibold tabular-nums text-violet-100">{tooltip.benchmark}</span>
            </div>
          ) : null}
          {tooltip.flows?.map(flow => (
            <div key={flow.id} className="mt-2 border-t border-white/10 pt-2 text-slate-300">
              <div className="font-semibold" style={{ color: flow.externalFlowUsd > 0 ? "#34d399" : flow.externalFlowUsd < 0 ? "#fb7185" : "#a78bfa" }}>
                {flow.flowType} · {formatFlowUsd(flow.externalFlowUsd)}
              </div>
              <div>{formatTooltipDate(toSeriesTime(Date.parse(flow.timestamp) / 1000))}</div>
              {flow.fromAccountId ? <div>From: {flow.fromAccountId}</div> : null}
              {flow.toAccountId ? <div>To: {flow.toAccountId}</div> : null}
              <div>Amount: {flow.amount === null ? "Unavailable" : flow.amount.toLocaleString("en-US", { maximumFractionDigits: 8 })} {flow.assetSymbol}</div>
              <div>Value: {formatPrimaryValue(Math.abs(flow.valueUsd), "usd")}</div>
              {flow.externalFlowUsd === 0 && flow.fromAccountId && flow.toAccountId ? <div>Internal transfer · external flow $0</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-slate-950/55 backdrop-blur-[2px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/90 px-4 py-2 text-xs font-medium text-slate-300 shadow-xl shadow-black/40">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-200" />
            Loading chart...
          </div>
        </div>
      ) : null}
    </div>
  );
}
