export type ChartCapitalFlow = {
  id: number;
  timestamp: string;
  flowType: "deposit" | "withdrawal" | "transfer";
  fromAccountId: string | null;
  toAccountId: string | null;
  assetSymbol: string;
  amount: number | null;
  valueUsd: number;
  externalFlowUsd: number;
};

export function parseCapitalFlows(value: unknown): ChartCapitalFlow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ChartCapitalFlow => {
    if (typeof item !== "object" || item === null) return false;
    const row = item as Record<string, unknown>;
    return typeof row.id === "number" && typeof row.timestamp === "string" && Number.isFinite(Date.parse(row.timestamp))
      && ["deposit", "withdrawal", "transfer"].includes(String(row.flowType))
      && (row.fromAccountId === null || typeof row.fromAccountId === "string")
      && (row.toAccountId === null || typeof row.toAccountId === "string")
      && typeof row.assetSymbol === "string" && (row.amount === null || typeof row.amount === "number" && Number.isFinite(row.amount))
      && typeof row.valueUsd === "number" && Number.isFinite(row.valueUsd)
      && typeof row.externalFlowUsd === "number" && Number.isFinite(row.externalFlowUsd);
  });
}

/** Anchor to the first existing snapshot at/after the event; never invent an AUM point. */
export function alignCapitalFlows(flows: ChartCapitalFlow[], times: number[]): Map<number, ChartCapitalFlow[]> {
  const result = new Map<number, ChartCapitalFlow[]>();
  for (const flow of flows) {
    const time = Date.parse(flow.timestamp) / 1000;
    if (!times.length || time < times[0] || time > times[times.length - 1]) continue;
    let low = 0;
    let high = times.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (times[mid] < time) low = mid + 1;
      else high = mid;
    }
    const at = times[low];
    result.set(at, [...(result.get(at) ?? []), flow]);
  }
  return result;
}

export function formatFlowUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", signDisplay: "exceptZero", maximumFractionDigits: 2 });
}
