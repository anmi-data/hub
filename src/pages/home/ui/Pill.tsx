import type { ReactNode } from "react";
import { cn } from "../utils/cn";

type PillProps = {
  children: ReactNode;
  className?: string;
};

export function Pill({ children, className }: PillProps): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-slate-200 shadow-sm backdrop-blur",
        className
      )}
    >
      {children}
    </span>
  );
}
