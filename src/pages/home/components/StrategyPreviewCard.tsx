import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { equityCurve, strategyMetrics, strategyTags } from "../data/strategyPreviewData";
import { MetricCard } from "../ui/MetricCard";

export function StrategyPreviewCard(): JSX.Element {
  return (
    <motion.div
      id="strategies"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, delay: 0.15 }}
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_90%_15%,rgba(168,85,247,0.16),transparent_30%)]" />
      <div className="relative rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-white">Convexity Harvest</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
              A transparent strategy profile showing verified performance, live risk metrics, trade history and data-quality checks.
            </p>
            <div className="mt-3 flex max-w-sm flex-nowrap items-center gap-1.5 overflow-hidden">
              {strategyTags.map((tag) => (
                <span
                  key={tag}
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[8.5px] font-medium uppercase tracking-[0.08em] text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-3 sm:w-44">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">
                  Verification score
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
                  94<span className="text-sm text-slate-400">/100</span>
                </div>
              </div>
              <ShieldCheck className="h-8 w-8 text-cyan-200" />
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[94%] rounded-full bg-cyan-200" />
            </div>
          </div>
        </div>

        <div className="mt-6 h-56 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityCurve} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="anmiEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#67e8f9" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#67e8f9" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="anmiBenchmark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.13)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                cursor={{ stroke: "rgba(103,232,249,0.35)", strokeWidth: 1 }}
                contentStyle={{
                  background: "rgba(15,23,42,0.92)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  color: "#e2e8f0",
                  boxShadow: "0 24px 80px rgba(0,0,0,.35)",
                }}
              />
              <Area type="monotone" dataKey="benchmark" stroke="#a78bfa" strokeWidth={2} fill="url(#anmiBenchmark)" />
              <Area type="monotone" dataKey="value" stroke="#67e8f9" strokeWidth={3} fill="url(#anmiEquity)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-white/[0.025] p-2 shadow-inner shadow-slate-950/40">
          <div className="grid auto-rows-fr grid-cols-2 gap-2 lg:grid-cols-4">
            {strategyMetrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
