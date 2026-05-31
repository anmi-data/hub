import type { ChartDataPoint, MetricCardData, StrategyTag } from "../types/home";

export const equityCurve: ChartDataPoint[] = [
  { month: "Jan", value: 100, benchmark: 100 },
  { month: "Feb", value: 104, benchmark: 102 },
  { month: "Mar", value: 109, benchmark: 99 },
  { month: "Apr", value: 107, benchmark: 101 },
  { month: "May", value: 116, benchmark: 104 },
  { month: "Jun", value: 123, benchmark: 106 },
  { month: "Jul", value: 119, benchmark: 108 },
  { month: "Aug", value: 128, benchmark: 111 },
  { month: "Sep", value: 137, benchmark: 109 },
  { month: "Oct", value: 132, benchmark: 112 },
  { month: "Nov", value: 145, benchmark: 116 },
  { month: "Dec", value: 158, benchmark: 119 },
];

export const strategyMetrics: MetricCardData[] = [
  { label: "Return", value: "+58.4%", note: "Verified net" },
  { label: "Max DD", value: "-11.8%", note: "Observed stress" },
  { label: "Market corr.", value: "0.18", note: "Low dependency" },
  { label: "Capacity", value: "â‚¬1-5M", note: "Est. scale" },
];

export const strategyTags: StrategyTag[] = [
  "Low delta",
  "Short gamma",
  "Mean reversion",
  "Systematic",
];
