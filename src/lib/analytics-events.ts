export type InteractionSource = "hero" | "navigation" | "feature_card" | "other";
type LinkProperties = { source: InteractionSource; destination: "strategies" | "product" | "other"; feature?: string };
export type ExplorerProperties = { node_type?: string; protocol_type?: string; dataset?: string };

export interface AnalyticsEvents {
  explore_strategies_clicked: LinkProperties;
  strategies_nav_clicked: LinkProperties;
  feature_card_clicked: LinkProperties;
  cta_clicked: LinkProperties;
  strategy_selector_opened: { group_id: string | null };
  strategy_selected: { group_id: string; previous_group_id: string | null };
  chart_mode_changed: { mode: "aum" | "unit_price" };
  benchmark_selected: { symbol: string };
  explorer_viewed: Record<string, never>;
  explorer_selector_opened: ExplorerProperties;
  explorer_node_selected: ExplorerProperties;
  explorer_dataset_selected: { dataset: string };
  explorer_history_page_changed: { dataset: string; page: number };
  explorer_history_page_size_changed: { dataset: string; page_size: number };
  explorer_history_search_used: { dataset: string; search_length_bucket: "3-10" | "11-50" | "51-200" };
  signup_started: { source: "navigation" | "other" };
  signup_completed: Record<string, never>;
  subscription_plan_viewed: { plan: string };
  checkout_started: { plan: string };
  subscription_activated: { plan: string };
}

type Rule = (value: unknown) => boolean;
const oneOf = (...values: string[]): Rule => value => typeof value === "string" && values.includes(value);
const publicSlug: Rule = value => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value) && !/^0x[0-9a-f]+$/i.test(value);
const nullableSlug: Rule = value => value === null || publicSlug(value);
const positiveInteger: Rule = value => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const dataset = oneOf("snapshots", "balances", "positions_generic", "positions_lp", "positions_vaults", "positions_prediction", "positions_futures", "hedge", "errors", "other");
const explorer = {
  node_type: oneOf("strategy_group", "strategy", "account", "balance_group", "position_group", "other"),
  protocol_type: oneOf("lp", "vault", "prediction", "futures", "perp", "spot", "wallet", "cex", "dex", "other"),
  dataset,
};
const link = { source: oneOf("hero", "navigation", "feature_card", "other"), destination: oneOf("strategies", "product", "other"), feature: oneOf("analytics", "alerts", "follow_strategies") };
// This allowlist also runs after the SDK adds its automatic properties.
// Adding an event requires an explicit review of its permitted fields.
const schemas: Record<keyof AnalyticsEvents | "$pageview", Record<string, Rule>> = {
  $pageview: {},
  explore_strategies_clicked: link, strategies_nav_clicked: link, feature_card_clicked: link, cta_clicked: link,
  strategy_selector_opened: { group_id: nullableSlug },
  strategy_selected: { group_id: publicSlug, previous_group_id: nullableSlug },
  chart_mode_changed: { mode: oneOf("aum", "unit_price") },
  benchmark_selected: { symbol: oneOf("BTC", "ETH", "SPX", "NDX", "XAU", "XAG", "CL", "BZ", "none") },
  explorer_viewed: {}, explorer_selector_opened: explorer, explorer_node_selected: explorer,
  explorer_dataset_selected: { dataset },
  explorer_history_page_changed: { dataset, page: positiveInteger },
  explorer_history_page_size_changed: { dataset, page_size: positiveInteger },
  explorer_history_search_used: { dataset, search_length_bucket: oneOf("3-10", "11-50", "51-200") },
  signup_started: { source: oneOf("navigation", "other") }, signup_completed: {},
  subscription_plan_viewed: { plan: publicSlug }, checkout_started: { plan: publicSlug }, subscription_activated: { plan: publicSlug },
};

export function sanitizeEventProperties(event: string, properties: Record<string, unknown>): Record<string, unknown> | null {
  if (!Object.prototype.hasOwnProperty.call(schemas, event)) return null;
  return Object.fromEntries(Object.entries(schemas[event as keyof typeof schemas])
    .filter(([key, valid]) => valid(properties[key])).map(([key]) => [key, properties[key]]));
}

export function safeDataset(value: string | null): string {
  return dataset(value) ? value as string : "other";
}

export function explorerProperties(node?: { type: string; protocolType?: string }, selectedDataset?: string | null): ExplorerProperties {
  return {
    node_type: node && explorer.node_type(node.type) ? node.type : "other",
    protocol_type: node?.protocolType && explorer.protocol_type(node.protocolType) ? node.protocolType : "other",
    ...(selectedDataset ? { dataset: safeDataset(selectedDataset) } : {}),
  };
}

export function searchLengthBucket(length: number): AnalyticsEvents["explorer_history_search_used"]["search_length_bucket"] | null {
  return length < 3 ? null : length <= 10 ? "3-10" : length <= 50 ? "11-50" : "51-200";
}
