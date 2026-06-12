import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  ColorType,
  createChart,
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

export type ChartPoint = {
  timestamp: string;
  primary?: number | null;
  benchmark?: number | null;
};

type StrategyTimeSeriesChartProps = {
  data: ChartPoint[];
  mode: "nav_usd" | "unit_price";
  benchmarkSymbol?: string | null;
  loading?: boolean;
};

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  date: string;
  primary?: string;
  benchmark?: string;
};

function formatPrimaryValue(value: number, mode: StrategyTimeSeriesChartProps["mode"], indexed: boolean): string {
  if (mode === "nav_usd") {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  }

  if (indexed) {
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

function toChartTime(timestamp: string): UTCTimestamp | null {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed / 1000) as UTCTimestamp;
}

function toAreaData(data: ChartPoint[]): AreaData<Time>[] {
  const values = new Map<number, number>();

  data.forEach((point) => {
    if (point.primary === null || point.primary === undefined || !Number.isFinite(point.primary)) return;
    const time = toChartTime(point.timestamp);
    if (time === null) return;
    values.set(time, point.primary);
  });

  return Array.from(values.entries())
    .sort(([left], [right]) => left - right)
    .map(([time, value]) => ({ time: time as UTCTimestamp, value }));
}

function toLineData(data: ChartPoint[]): LineData<Time>[] {
  const values = new Map<number, number>();

  data.forEach((point) => {
    if (point.primary === null || point.primary === undefined || !Number.isFinite(point.primary)) return;
    if (point.benchmark === null || point.benchmark === undefined || !Number.isFinite(point.benchmark)) return;
    const time = toChartTime(point.timestamp);
    if (time === null) return;
    values.set(time, point.benchmark);
  });

  return Array.from(values.entries())
    .sort(([left], [right]) => left - right)
    .map(([time, value]) => ({ time: time as UTCTimestamp, value }));
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
  data,
  mode,
  benchmarkSymbol,
  loading = false,
}: StrategyTimeSeriesChartProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const primarySeriesRef = useRef<ISeriesApi<"Area", Time> | null>(null);
  const benchmarkSeriesRef = useRef<ISeriesApi<"Line", Time> | null>(null);
  const modeRef = useRef(mode);
  const benchmarkSymbolRef = useRef(benchmarkSymbol);
  const primarySignatureRef = useRef<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, date: "" });

  const primaryData = useMemo(() => toAreaData(data), [data]);
  const benchmarkData = useMemo(() => toLineData(data), [data]);
  const primarySignature = useMemo(() => getDataSignature(primaryData), [primaryData]);
  const hasBenchmark = Boolean(benchmarkSymbol && benchmarkData.length > 0);
  const isIndexed = mode === "unit_price" && Boolean(benchmarkSymbol);

  useEffect(() => {
    modeRef.current = mode;
    benchmarkSymbolRef.current = benchmarkSymbol;
  }, [benchmarkSymbol, mode]);

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
        primary: primaryValue === undefined ? undefined : formatPrimaryValue(primaryValue, modeRef.current, modeRef.current === "unit_price" && Boolean(benchmarkSymbolRef.current)),
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
      chart.remove();
      chartRef.current = null;
      primarySeriesRef.current = null;
      benchmarkSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (primarySignatureRef.current === primarySignature) return;
    primarySignatureRef.current = primarySignature;
    primarySeriesRef.current?.setData(primaryData);

    if (primaryData.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [primaryData, primarySignature]);

  useEffect(() => {
    benchmarkSeriesRef.current?.setData(hasBenchmark ? benchmarkData : []);
  }, [benchmarkData, hasBenchmark]);

  useEffect(() => {
    primarySeriesRef.current?.applyOptions({
      priceFormat: mode === "nav_usd"
        ? { type: "custom", formatter: (price: BarPrice) => formatUsdAxisValue(Number(price)) }
        : isIndexed
          ? { type: "price", precision: 2, minMove: 0.01 }
          : { type: "price", precision: 4, minMove: 0.0001 },
    });
    benchmarkSeriesRef.current?.applyOptions({
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
  }, [isIndexed, mode]);

  return (
    <div className="relative h-[420px]">
      <div ref={containerRef} className="h-full w-full" />

      {!loading && primaryData.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-xl border border-white/10 bg-white/[0.025] text-sm text-slate-500">
          No chart data available.
        </div>
      ) : null}

      {tooltip.visible ? (
        <div
          className="pointer-events-none absolute z-30 min-w-[176px] rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 text-xs shadow-2xl shadow-black/50"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="mb-1 text-[11px] font-medium text-cyan-100">{tooltip.date}</div>
          {tooltip.primary ? (
            <div className="flex items-center justify-between gap-5 text-slate-300">
              <span>{mode === "nav_usd" ? "AUM" : isIndexed ? "Unit Price Index" : "Unit Price"}</span>
              <span className="font-semibold tabular-nums text-white">{tooltip.primary}</span>
            </div>
          ) : null}
          {tooltip.benchmark && benchmarkSymbol ? (
            <div className="mt-1 flex items-center justify-between gap-5 text-slate-300">
              <span>{benchmarkSymbol} Index</span>
              <span className="font-semibold tabular-nums text-violet-100">{tooltip.benchmark}</span>
            </div>
          ) : null}
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
