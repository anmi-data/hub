import type { ValuePoint } from "../types/home";

type ValuePointsSectionProps = {
  valuePoints: ValuePoint[];
};

export function ValuePointsSection({ valuePoints }: ValuePointsSectionProps): JSX.Element {
  return (
    <section className="relative z-10 border-y border-white/10 bg-white/[0.025]">
      <div className="mx-auto grid max-w-7xl justify-center gap-6 px-5 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {valuePoints.map((item) => (
          <div key={item.label} className="mx-auto max-w-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">
              {item.label}
            </div>
            <div className="mt-2 text-sm font-medium leading-6 text-slate-300">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
