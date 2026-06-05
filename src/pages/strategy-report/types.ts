export type Confidence = "Low" | "Medium" | "High";

export type Metric = {
  label: string;
  value: string;
  confidence: Confidence;
  note: string;
};

export type ChartKind =
  | "verification"
  | "performance"
  | "risk"
  | "distribution"
  | "regime"
  | "dna"
  | "sizing"
  | "capacity";

export type ReportSection = {
  id: string;
  shortLabel: string;
  title: string;
  question: string;
  conclusion: string;
  confidence: Confidence;
  positive: string;
  risk: string;
  meaning: string;
  metrics: Metric[];
  chart: ChartKind;
};

export type StrategyReport = {
  slug: string;
  name: string;
  type: string;
  market: string;
  trackRecord: string;
  granularity: string;
  lastUpdate: string;
  verificationScore: number;
  riskLevel: string;
  readiness: string;
  confidence: Confidence;
  sections: ReportSection[];
};
