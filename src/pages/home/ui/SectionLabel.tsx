import type { ReactNode } from "react";

type SectionLabelProps = {
  children: ReactNode;
};

export function SectionLabel({ children }: SectionLabelProps): JSX.Element {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-cyan-200">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
      {children}
    </div>
  );
}
