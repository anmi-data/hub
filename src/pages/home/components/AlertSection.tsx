import { ArrowRight } from "lucide-react";
import { notificationEvents } from "../data/notifications";
import { SectionLabel } from "../ui/SectionLabel";
import { InteractiveCard } from "../ui/InteractiveCard";
import { cn } from "../utils/cn";

export function AlertSection(): JSX.Element {
  return (
    <section id="media" className="relative z-10 mx-auto max-w-7xl px-5 pb-24 lg:px-8">
      <div className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-slate-950/25 backdrop-blur">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="p-8 sm:p-10 lg:p-12">
            <SectionLabel>Alerts</SectionLabel>
            <h2 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Know when something important happens
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-400">
              Follow selected strategies and receive timely alerts when risk, drawdown, market exposure, verification status or strategy behaviour changes, so every review starts from the latest evidence.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/notifications"
                className="inline-flex items-center justify-center rounded-full bg-cyan-200 px-6 py-3 text-sm font-semibold text-slate-950 shadow-xl shadow-cyan-950/25 transition hover:bg-white"
              >
                  View all alerts
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
              <a
                href="#methodology"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
              >
                Choose strategies to follow
              </a>
            </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>Community channels:</span>
                <a href="#media" className="text-cyan-200/80 transition hover:text-cyan-100">Telegram</a>
                <span className="text-slate-700">/</span>
                <a href="#media" className="text-cyan-200/80 transition hover:text-cyan-100">WeChat</a>
              </div>
          </div>

          <div className="relative border-t border-white/10 bg-slate-950/55 p-6 lg:border-l lg:border-t-0 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_20%_90%,rgba(168,85,247,0.12),transparent_35%)]" />
            <div className="relative rounded-3xl border border-white/10 bg-slate-900/65 p-5 shadow-2xl shadow-slate-950/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-cyan-200/75">
                    Alert center
                  </div>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                    Convexity Harvest updates
                  </h3>
                </div>
                <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">
                  Following
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {notificationEvents.map((event) => {
                  const Icon = event.icon;

                  return (
                    <InteractiveCard key={event.name} className="bg-slate-950/55 px-4 py-3">
                      <div className="flex items-start gap-3 text-left">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] transition duration-300 group-hover:border-cyan-200/25 group-hover:bg-cyan-200/10">
                          <Icon className={cn("h-4 w-4", event.colorClass)} />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center justify-between gap-4 text-left">
                            <span className="text-sm font-medium text-slate-300">{event.name}</span>
                            <span className="shrink-0 text-[11px] text-slate-500">{event.time}</span>
                          </div>
                          <div className={cn("mt-1 text-left text-xs font-medium", event.colorClass)}>
                            {event.status}
                          </div>
                        </div>
                      </div>
                    </InteractiveCard>
                  );
                })}
              </div>

              <p className="mt-5 text-xs leading-5 text-slate-500">
                Alerts surface factual changes in connected data, verification status, risk thresholds and monitored forecast ranges. They are designed for review and record-keeping, not as personal recommendations, portfolio management or instructions to trade or allocate capital.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
