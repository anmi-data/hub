import type { ValuePoint } from "../types/home";

export const trackValuePoints: ValuePoint[] = [
  {
    label: "Verified account data",
    value: "We audit real trading accounts, not screenshots, promises or manually edited performance tables.",
  },
  {
    label: "Live account sync",
    value: "We connect to live trading accounts and identify deviations from the stated strategy, not manually inflated statistics.",
  },
  {
    label: "Hidden exposure",
    value: "We uncover hidden market links across assets, regimes and correlations, separating strategy insight from favorable market conditions.",
  },
  {
    label: "Risk-first analysis",
    value: "We examine drawdowns, loss periods and stress behaviour first, so returns are judged in context, not as headline numbers.",
  },
];

export const alertsValuePoints: ValuePoint[] = [
  {
    label: "Risk alerts",
    value: "Spot drawdown, volatility and stress changes early, with clear context on what moved and why it matters",
  },
  {
    label: "Exposure intelligence",
    value: "See when correlation, asset exposure or regime sensitivity shifts, before the strategy profile looks stale",
  },
  {
    label: "Verification signals",
    value: "Track account syncs, score changes and strategy deviations as fresh evidence enters the due diligence record",
  }
];