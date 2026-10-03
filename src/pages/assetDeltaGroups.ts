import type { Locale } from "../i18n/locale";

// Frozen from CoinGecko's first 20 market-cap ranks on 2026-10-03.
// Exclude stablecoins and wrapped/bridged entries; do not backfill lower ranks.
// Source and selection details: docs/asset-delta-groups.md. No runtime fetch.
const top20CryptoSymbols = new Set([
  "BTC", "ETH", "BNB", "XRP", "SOL", "TRX", "FIGR_HELOC", "ZEC", "HYPE",
  "DOGE", "LINK", "XMR", "WBT", "ADA", "LEO", "RAIN", "XLM",
]);

const oilSymbols = new Set(["CL", "BZ"]);
const goldSymbols = new Set(["XAU", "XAUT", "PAXG"]);
// Canonical equities, ETFs and indices configured in Track's asset registry.
const stockMarketSymbols = new Set([
  "SPX", "NDX", "MSFT", "MSTR", "QQQ", "SPY", "SKHYNIX", "TSLA", "WDC",
]);
// Known non-crypto assets must not be mislabeled as altcoins.
const otherAssetSymbols = new Set(["XAG", "EURUSD"]);

const groupDefinitions = [
  { id: "oil", labels: { en: "Oil", ru: "Нефть", fr: "Pétrole", zh: "石油" } },
  { id: "gold", labels: { en: "Gold", ru: "Золото", fr: "Or", zh: "黄金" } },
  { id: "stocks", labels: { en: "Stock market", ru: "Фондовый рынок", fr: "Marché boursier", zh: "股票市场" } },
  { id: "top20", labels: { en: "Top20 Crypto", ru: "Top20 Crypto", fr: "Top20 Crypto", zh: "Top20 Crypto" } },
  { id: "altcoins", labels: { en: "Altcoins", ru: "Альткоины", fr: "Altcoins", zh: "山寨币" } },
  { id: "other", labels: { en: "Other assets", ru: "Прочие активы", fr: "Autres actifs", zh: "其他资产" } },
] as const;

type AssetDeltaGroupId = (typeof groupDefinitions)[number]["id"];

function assetDeltaGroupId(symbol: string): AssetDeltaGroupId {
  if (oilSymbols.has(symbol)) return "oil";
  if (goldSymbols.has(symbol)) return "gold";
  if (stockMarketSymbols.has(symbol)) return "stocks";
  if (otherAssetSymbols.has(symbol)) return "other";
  if (top20CryptoSymbols.has(symbol)) return "top20";
  return "altcoins";
}

export function groupAssetDeltas<T extends { assetSymbol: string }>(
  deltas: readonly T[],
  locale: Locale,
): Array<{ id: AssetDeltaGroupId; label: string; deltas: T[] }> {
  const groups = groupDefinitions.map((definition) => ({
    id: definition.id,
    label: definition.labels[locale],
    deltas: [] as T[],
  }));

  // The API supplies canonical symbols. Preserve each row and its existing
  // sort order within the group; grouping never changes quantities or values.
  for (const delta of deltas) {
    const symbol = delta.assetSymbol.trim().toUpperCase();
    if (symbol === "USD") continue;
    const groupId = assetDeltaGroupId(symbol);
    groups.find((group) => group.id === groupId)?.deltas.push(delta);
  }

  return groups.filter((group) => group.deltas.length > 0);
}
