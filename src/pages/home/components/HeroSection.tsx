import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { localizedPath, useLocale } from "../../../i18n/locale";
import { Pill } from "../ui/Pill";

export function HeroSection(): JSX.Element {
  const locale = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65 }}
    >
      <Pill>
        <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-cyan-200" />
        See the risk behind every return
      </Pill>
      <h1 className="mt-7 max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
        Trust trading strategies before allocating capital
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
        We audit the real trading accounts behind each strategy and analyze the evidence behind its performance: risk, drawdowns, market exposure, correlations and trade drivers. The result is a clear view of whether the edge is real, how robust it is, and where entry timing or positioning can be improved.
      </p>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <a
          href={localizedPath(locale, "/strategies")}
          className="inline-flex items-center justify-center rounded-full bg-cyan-200 px-6 py-3 text-sm font-semibold text-slate-950 shadow-xl shadow-cyan-950/25 transition hover:bg-white"
        >
          Explore Strategies
          <ArrowRight className="ml-2 h-4 w-4" />
        </a>
        <a
          href="#analytics"
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/[0.1]"
        >
          View Analytics
        </a>
      </div>
      <p className="mt-5 max-w-2xl text-xs leading-6 text-slate-500">
        ANMI provides analytical information for informational and educational purposes only. Nothing on this site constitutes investment advice, portfolio management, brokerage, solicitation, or an offer or recommendation to buy, sell, hold or allocate capital to any strategy or financial instrument. Past performance does not predict future returns.
      </p>
    </motion.div>
  );
}
