import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartData } from "./data";
import type { ChartKind } from "./types";

const tooltipStyle = {
  background: "rgba(15,23,42,.96)",
  border: "1px solid rgba(148,163,184,.18)",
  borderRadius: 12,
  color: "#e2e8f0",
};

const axisTick = { fill: "#94a3b8", fontSize: 11 };
const gridStroke = "rgba(148,163,184,.12)";

function ChartFrame({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="h-[300px] w-full sm:h-[360px]">{children}</div>;
}

function VerificationChart(): JSX.Element {
  return (
    <ChartFrame>
      <ResponsiveContainer>
        <BarChart data={chartData.verification} layout="vertical" margin={{ left: 18, right: 12 }}>
          <CartesianGrid stroke={gridStroke} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={100} tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill="#7dd3fc" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function PerformanceChart(): JSX.Element {
  return (
    <ChartFrame>
      <ResponsiveContainer>
        <AreaChart data={chartData.performance} margin={{ left: -15, right: 12 }}>
          <defs>
            <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis domain={[85, 160]} tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="high" stroke="#64748b" fill="url(#confidenceBand)" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="low" stroke="#64748b" fill="#07111f" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="nav" stroke="#7dd3fc" strokeWidth={3} dot={{ r: 3 }} connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function RiskChart(): JSX.Element {
  return (
    <ChartFrame>
      <ResponsiveContainer>
        <AreaChart data={chartData.risk} margin={{ left: -15, right: 12 }}>
          <defs>
            <linearGradient id="drawdown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.04} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis domain={[-14, 0]} tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={2} fill="url(#drawdown)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function DistributionChart(): JSX.Element {
  const colors = ["#e87979", "#f0a36b", "#d8a860", "#78bfa3", "#66b7a4", "#52a78f"];
  return (
    <>
      <ChartFrame>
        <ResponsiveContainer>
          <BarChart data={chartData.distribution} margin={{ left: -20, right: 12 }}>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.distribution.map((_, index) => <Cell key={colors[index]} fill={colors[index]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <Matrix title="PnL transition matrix" labels={["Big loss", "Small loss", "Flat", "Small win", "Big win"]} />
    </>
  );
}

function RegimeChart(): JSX.Element {
  return (
    <>
      <ChartFrame>
        <ResponsiveContainer>
          <BarChart data={chartData.regime} margin={{ left: -20, right: 12 }}>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="return" fill="#77bfa3" radius={[5, 5, 0, 0]} />
            <Bar dataKey="drawdown" fill="#d58b76" radius={[0, 0, 5, 5]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <Matrix title="Cross-market correlation" labels={["BTC", "ETH", "S&P 500", "Gold", "VIX"]} />
    </>
  );
}

function DnaChart(): JSX.Element {
  return (
    <>
      <ChartFrame>
        <ResponsiveContainer>
          <RadarChart data={chartData.dna} outerRadius="70%">
            <PolarGrid stroke={gridStroke} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Radar dataKey="value" stroke="#7dd3fc" fill="#60a5fa" fillOpacity={0.22} strokeWidth={2} />
            <Tooltip contentStyle={tooltipStyle} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Gamma proxy · market move vs strategy PnL</div>
        <div className="h-44">
          <ResponsiveContainer>
            <ScatterChart margin={{ left: -18, right: 12 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="move" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey="pnl" tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Scatter data={chartData.gamma} fill="#f0a36b" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function SizingChart(): JSX.Element {
  return (
    <>
      <ChartFrame>
        <ResponsiveContainer>
          <LineChart data={chartData.sizing} margin={{ left: -20, right: 12 }}>
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line dataKey="growth" stroke="#7dd3fc" strokeWidth={3} dot={{ fill: "#7dd3fc", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
      <Heatmap />
    </>
  );
}

function CapacityChart(): JSX.Element {
  return (
    <>
      <ChartFrame>
        <ResponsiveContainer>
          <AreaChart data={chartData.capacity} margin={{ left: -15, right: 12 }}>
            <defs>
              <linearGradient id="capacity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area dataKey="return" stroke="#7dd3fc" strokeWidth={3} fill="url(#capacity)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>
      <Scorecard />
    </>
  );
}

function Scorecard(): JSX.Element {
  const scores = [["Evidence", 82], ["Performance", 74], ["Risk", 58], ["Edge", 67], ["Capacity", 71], ["Timing", 54]] as const;
  return (
    <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
      {scores.map(([label, score]) => (
        <div key={label} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div className="flex justify-between text-[10px] uppercase tracking-[0.12em] text-slate-400"><span>{label}</span><span>{score}/100</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-300/70" style={{ width: `${score}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function Matrix({ title, labels }: { title: string; labels: string[] }): JSX.Element {
  const values = [18, 31, 44, 57, 72, 26, 63, 38, 81, 52, 41, 75, 68, 34, 59, 22, 48, 77, 61, 36, 66, 43, 29, 73, 55];
  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <div className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{title}</div>
      <div className="grid grid-cols-5 gap-1.5">
        {values.map((value, index) => (
          <div key={`${labels[index % 5]}-${index}`} className="rounded-md border border-sky-200/10 p-2 text-center text-[10px] text-slate-200" style={{ backgroundColor: `rgba(56, 148, 170, ${value / 150})` }}>
            {value}%
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[9px] text-slate-500">
        {labels.map((label) => <span key={label}>{label}</span>)}
      </div>
    </div>
  );
}

function Heatmap(): JSX.Element {
  const values = [0.8, 1.2, 1.5, 0.6, 1.1, 1.8, 2.2, 1.4, 0.7, 1.4, 1.9, 0.9];
  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <div className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">TP / SL analytical expectancy</div>
      <div className="grid grid-cols-4 gap-1.5">
        {values.map((value, index) => (
          <div key={`${value}-${index}`} className="rounded-md border border-emerald-200/10 p-3 text-center text-xs font-medium text-slate-100" style={{ backgroundColor: `rgba(68, 145, 126, ${value / 4})` }}>
            +{value.toFixed(1)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportChart({ kind }: { kind: ChartKind }): JSX.Element {
  const charts: Record<ChartKind, JSX.Element> = {
    verification: <VerificationChart />,
    performance: <PerformanceChart />,
    risk: <RiskChart />,
    distribution: <DistributionChart />,
    regime: <RegimeChart />,
    dna: <DnaChart />,
    sizing: <SizingChart />,
    capacity: <CapacityChart />,
  };

  return charts[kind];
}
