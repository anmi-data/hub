import type { MetricCardData } from "../types/home";
import { cn } from "../utils/cn";

export function MetricCard({ label, value, note }: MetricCardData): JSX.Element {
  const isDrawdown = label.toLowerCase().includes("drawdown");
  const isCapacity = label.toLowerCase().includes("capacity");

  return (
    <div className="group relative min-h-[112px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 p-3.5 backdrop-blur-md transition duration-300 hover:border-cyan-200/25 hover:bg-white/[0.055]">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent" />
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[9px] font-medium uppercase leading-3 tracking-[0.12em] text-slate-500">
            {label}
          </div>
          <div
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              isDrawdown ? "bg-amber-300/80" : isCapacity ? "bg-violet-300/80" : "bg-cyan-200/80"
            )}
          />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="whitespace-nowrap text-[1.25rem] font-semibold leading-none tracking-tight text-white tabular-nums sm:text-[1.4rem] xl:text-2xl">
            {value}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div className="text-[10px] leading-3 text-slate-500">{note}</div>
          <div className="h-1 w-8 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full",
                isDrawdown ? "w-2/3 bg-amber-300/70" : isCapacity ? "w-3/4 bg-violet-300/70" : "w-4/5 bg-cyan-200/70"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
