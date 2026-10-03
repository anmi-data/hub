# Asset delta groups

The strategy and strategy-group delta table displays non-empty groups in this
order: Oil, Gold, Stock market, Top20 Crypto, Altcoins. Labels follow the page
locale. USD stays hidden. Within each group, the existing descending absolute
USD-delta order is preserved, with unavailable USD values last.

Classification uses the API's canonical `assetSymbol`:

- Oil: CL, BZ.
- Gold: XAU, XAUT, PAXG.
- Stock market: SPX, NDX, MSFT, MSTR, QQQ, SPY, SKHYNIX, TSLA, WDC
  (the equities, ETFs and indices in Track's asset configuration).
- Top20 Crypto: the fixed selection below.
- Altcoins: remaining crypto symbols.

XAG (silver) and EURUSD (FX) appear in an additional Other assets group when
present, so they are not classified as gold or altcoins. New non-crypto
instruments require an explicit classification in `src/pages/assetDeltaGroups.ts`.
The API already groups supported USD stablecoins as USD and normalizes supported
wrappers to their underlying assets; this display grouping does not duplicate
that normalization, change financial values, or sum unlike asset quantities.

## Fixed Top20 Crypto selection

Source: [CoinGecko market capitalization ranking](https://www.coingecko.com/),
consulted on 2026-10-03. The first 20 ranks are filtered to exclude stablecoins
and wrapped/bridged coins. Lower ranks are not added to replace exclusions.
This leaves 17 entries; the name refers to the original ranking cutoff.
There is no scheduled refresh or runtime market-data request.

| Rank | Symbol | Selection |
| --- | --- | --- |
| 1 | BTC | Included |
| 2 | ETH | Included |
| 3 | USDT | Excluded: stablecoin |
| 4 | BNB | Included |
| 5 | XRP | Included |
| 6 | USDC | Excluded: stablecoin |
| 7 | SOL | Included |
| 8 | TRX | Included |
| 9 | FIGR_HELOC | Included |
| 10 | ZEC | Included |
| 11 | HYPE | Included |
| 12 | DOGE | Included |
| 13 | LINK | Included |
| 14 | XMR | Included |
| 15 | WBT | Included |
| 16 | USDS | Excluded: stablecoin |
| 17 | ADA | Included |
| 18 | LEO | Included |
| 19 | RAIN | Included |
| 20 | XLM | Included |

There were no wrapped/bridged entries in these 20 ranks. FIGR_HELOC is a tokenized
private-credit asset, not a USD stablecoin or a wrapped/bridged coin, so it remains
under the requested exclusion rule. See its
[CoinGecko profile](https://www.coingecko.com/en/coins/figure-heloc).
