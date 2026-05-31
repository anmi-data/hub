import type { ReactNode } from "react";
import { cn } from "../utils/cn";

type InteractiveCardProps = {
  children: ReactNode;
  className?: string;
};

export function InteractiveCard({ children, className }: InteractiveCardProps): JSX.Element {
  return (
    <div
      className={cn(
        "group rounded-2xl border border-white/10 bg-slate-950/45 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-200/25 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-cyan-950/15",
        className
      )}
    >
      {children}
    </div>
  );
}
