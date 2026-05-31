import { methodologySteps } from "../data/methodologySteps";
import { SectionLabel } from "../ui/SectionLabel";

export function MethodologySection(): JSX.Element {
  return (
    <section id="methodology" className="relative z-10 mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="lg:sticky lg:top-8">
          <SectionLabel>Methodology</SectionLabel>
          <h2 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            From live account data to investor-ready strategy evidence
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-400">
            ANMI follows a focused verification workflow: connect live accounts, build a verified track record, analyze strategy behaviour and turn the result into investor-ready evidence.
          </p>
        </div>

        <div className="grid gap-4">
          {methodologySteps.map((item) => (
            <div
              key={item.step}
              className="group grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition duration-300 hover:border-cyan-200/25 hover:bg-white/[0.06] sm:grid-cols-[4.5rem_1fr]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-sm font-semibold text-cyan-200">
                {item.step}
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
