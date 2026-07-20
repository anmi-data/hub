import { useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Database, ShieldCheck } from "lucide-react";
import anmiLogo from "../home/assets/anmi_logo_header.webp";
import { cn } from "../home/utils/cn";
import { ReportChart } from "./ReportCharts";
import type { Confidence, Metric, ReportSection, StrategyReport } from "./types";
import { useParams } from "react-router-dom";
import { strategyReports } from "./data";
import { localizedPath, useLocale } from "../../i18n/locale";

const confidenceStyle: Record<Confidence, string> = {
  High: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  Medium: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  Low: "border-rose-300/20 bg-rose-300/10 text-rose-200",
};

function ConfidenceBadge({ value }: { value: Confidence }): JSX.Element {
  return <span className={cn("rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em]", confidenceStyle[value])}>{value} confidence</span>;
}

function ReportHeader({ report }: { report: StrategyReport }): JSX.Element {
  const locale = useLocale();
  const details = [
    ["Strategy type", report.type], ["Market", report.market], ["Track record", report.trackRecord],
    ["Granularity", report.granularity], ["Last update", report.lastUpdate],
  ];
  return (
    <header className="border-b border-white/10 bg-[#07111f]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-5">
          <a href={localizedPath(locale)} className="flex items-center gap-3 text-sm text-slate-400 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            <img src={anmiLogo} alt="ANMI" className="h-8 w-auto" />
          </a>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <Database className="h-3.5 w-3.5 text-sky-300" /> Prototype · illustrative sample data
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="mr-1 flex h-10 items-center text-3xl font-semibold leading-none tracking-[-0.04em] text-white sm:h-11 sm:text-4xl">{report.name}</h1>
            <div className="inline-flex h-6 translate-y-1 items-center gap-1.5 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] px-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,.45)]" />
              <span className="text-[9px] font-semibold leading-none text-emerald-200">Active</span>
              <span className="text-[9px] leading-none text-slate-500">Partially verified</span>
            </div>
          </div>
          <div className="hidden flex-wrap items-center justify-end gap-x-5 gap-y-2 sm:flex">
            {details.map(([label, value]) => (
              <div key={label}>
                <div className="text-[8px] uppercase tracking-[0.13em] text-slate-500">{label}</div>
                <div className="mt-0.5 whitespace-nowrap text-[10px] font-medium text-slate-300">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function ReportMetric({ metric }: { metric: Metric }): JSX.Element {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[0.13em] text-slate-500">{metric.label}</div>
        <span className={cn("mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full", metric.confidence === "High" ? "bg-emerald-300" : metric.confidence === "Medium" ? "bg-amber-300" : "bg-rose-300")} />
      </div>
      <div className="mt-3 text-xl font-semibold tracking-tight text-slate-100">{metric.value}</div>
      <div className="mt-2 text-[10px] text-slate-500">{metric.confidence} confidence · {metric.note}</div>
    </div>
  );
}

function InsightPanel({ section }: { section: ReportSection }): JSX.Element {
  return (
    <aside className="space-y-4 xl:sticky xl:top-40 xl:self-start">
      <div className="rounded-2xl border border-sky-300/15 bg-sky-300/[0.06] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-sky-200">Section conclusion</div>
          <ConfidenceBadge value={section.confidence} />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-200">{section.conclusion}</p>
      </div>
      <Insight icon={<CheckCircle2 className="text-emerald-300" />} label="Positive evidence" text={section.positive} />
      <Insight icon={<AlertTriangle className="text-amber-300" />} label="Risk / uncertainty" text={section.risk} />
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">What this means for investor</div>
        <p className="mt-3 text-sm leading-6 text-slate-300">{section.meaning}</p>
      </div>
    </aside>
  );
}

function Insight({ icon, label, text }: { icon: JSX.Element; label: string; text: string }): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>{label}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

export function StrategyReportPage(): JSX.Element {
  const locale = useLocale();
  const { strategySlug } = useParams<{ strategySlug: string }>();
  const report = strategySlug ? strategyReports[strategySlug] : undefined;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!report) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050b14] px-4 text-slate-100">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-white">Report not found</h1>
          <a href={localizedPath(locale)} className="mt-5 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </a>
        </div>
      </main>
    );
  }

  const activeId = selectedId ?? report.sections[0].id;
  const section = report.sections.find((item) => item.id === activeId) ?? report.sections[0];

  return (
    <main className="min-h-screen bg-[#050b14] text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:56px_56px]" />
      <ReportHeader report={report} />
      <nav className="border-b border-white/10 bg-[#07111f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 flex-nowrap gap-1 overflow-x-auto">
            {report.sections.map((item, index) => (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={cn("shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors", item.id === activeId ? "bg-sky-200 text-slate-950" : "text-slate-400 hover:bg-white/[0.05] hover:text-white")}>
                <span className="mr-1.5 opacity-60">0{index + 1}</span>{item.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="relative mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-sky-300/80">{section.title}</div>
            <h2 className="mt-2 max-w-4xl text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">{section.question}</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">Illustrative analysis <ChevronRight className="h-3.5 w-3.5" /> Not investment advice</div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {section.metrics.map((metric) => <ReportMetric key={metric.label} metric={metric} />)}
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#081421]/90 p-4 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Analytical visualization</div>
                  <div className="mt-1 text-sm text-slate-500">Illustrative sample data · confidence-aware</div>
                </div>
                <ShieldCheck className="h-5 w-5 text-sky-300" />
              </div>
              <ReportChart kind={section.chart} />
            </div>
          </section>
          <InsightPanel section={section} />
        </div>
        <p className="mt-8 border-t border-white/10 pt-5 text-xs leading-5 text-slate-500">
          ANMI provides informational analytics only. It does not provide investment advice, portfolio management, or guarantees of future performance. Past performance is not a reliable indicator of future results.
        </p>
      </div>
    </main>
  );
}
