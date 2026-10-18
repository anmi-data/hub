# hub
ANMI helps investors trust trading strategies before allocating capital — with verified track records, risk-first analytics, drawdown visibility, transaction history and investor-ready strategy profiles

## ANMI Hub Analytics

Optional analytics uses PostHog Cloud EU. Set `VITE_POSTHOG_PROJECT_TOKEN` to the
public project token and `VITE_POSTHOG_HOST=https://eu.i.posthog.com` in `.env`.
The existing GitHub Actions repository variables provide production build values;
see [environment setup](docs/environment.md). Never use a personal API key.
Changing build variables requires rebuilding the site.

Consent defaults to `unknown`. The SDK is imported and initialized only after
`accepted`; `rejected` generates no analytics. The browser saves the choice under
`anmi:analytics-consent:v1`. **Analytics preferences**, available at the bottom of
every page, allows acceptance or withdrawal. Withdrawal clears SDK persistence,
aborts the current analytics fetch generation (including retries), and discards
pending events. Already delivered events cannot be recalled. Storage failures
default to no consent; explicit decisions still work in memory for that visit.
The [privacy notice](/privacy) describes this behavior for visitors.

Every event includes `product: "hub"` and `environment: import.meta.env.MODE`.
Page URLs exclude queries and fragments. Only anonymous SDK identifiers, library
metadata and the approved properties below survive the final send filter.
No account IDs, wallets, balances, positions, form contents or search text are
sent. Recording, autocapture, pageleave, feature flags, surveys, performance/error
capture and person-profile processing are disabled. No identify/alias calls are made.

| Implemented event | Trigger / allowed business properties |
| --- | --- |
| `$pageview` | Current page after acceptance and pathname navigation; sanitized `$pathname`, `$current_url` |
| `explore_strategies_clicked` | Hero link; `source`, `destination` |
| `strategies_nav_clicked` | Header/footer Strategies link; `source`, `destination` |
| `cta_clicked` | Existing Analytics/Alerts/Follow links; `source`, `destination`, fixed `feature` category |
| `strategy_selector_opened` | Selector opened; current public `group_id` |
| `strategy_selected` | Different strategy chosen; public `group_id`, `previous_group_id` |
| `chart_mode_changed` | Different mode chosen; `mode: aum / unit_price` |
| `benchmark_selected` | Different benchmark chosen; `symbol: BTC / ETH / SPX / NDX / XAU / XAG / CL / BZ / none` (available UI options come from the API) |
| `explorer_viewed` | IntersectionObserver visibility, once per pathname visit |
| `explorer_selector_opened` | Node selector opened; allowlisted `node_type`, `protocol_type` |
| `explorer_node_selected` | Different node chosen; category-only `node_type`, `protocol_type`, `dataset` |
| `explorer_history_page_changed` | Actual pagination change; `dataset`, `page` |
| `explorer_history_page_size_changed` | Actual page size change; `dataset`, `page_size` |
| `explorer_history_search_used` | User-edited search committed after existing 300 ms debounce, minimum 3 characters; `dataset`, `search_length_bucket: 3-10 / 11-50 / 51-200` |

The current feature cards are non-interactive and the Explorer has no rendered
dataset switcher. `feature_card_clicked` and `explorer_dataset_selected` have
typed definitions but are not emitted. Automatic dataset restoration, API loads,
chart mouse movement and state hydration do not create interaction events.

`signup_started`, `signup_completed`, `subscription_plan_viewed`,
`checkout_started` and `subscription_activated` are typed for future features and
are not emitted. Add future events to `AnalyticsEvents` and the runtime property
allowlist in `src/lib/analytics-events.ts`, then call `trackEvent` from a real
user-action handler. Public plan slugs are permitted; customer/payment data is not.
Future separate ANMI product apps can use `createAnalytics` with their own
`product` value. Each app should create one instance and retain the consent gate.

### Local tests and production verification

`npm run dev` does not track by default. To debug, use a separate test project and
explicitly set `VITE_ANALYTICS_DEBUG=true`, restart Vite, and accept analytics.
Missing configuration or SDK failures leave the application functional.

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
Tests use the existing Node test runner; browser checks use Playwright with an
installed Chrome. Set `ANMI_TEST_BROWSER_CHANNEL=msedge` to use Edge instead.
The browser tests mock the business API and PostHog; one transport test loads the
real installed SDK against an intercepted test host. No tests send to a real
PostHog project. The mobile screenshot is saved in ignored `test-results/`.

After deployment, verify in a fresh browser profile that there are no PostHog
requests before consent or after rejection. Accept, navigate, change strategies,
chart modes and benchmarks, scroll to Explorer, select nodes, paginate and search.
Inspect request properties for sanitized paths and absence of private data.
Withdraw consent and verify no further analytics requests, including failed
request retries. Repeat on mobile. Confirm actual delivery in the PostHog EU
project's live events view; a local mocked request does not prove ingestion.
Configure retention, authorized team access, dashboards and any future conversion
funnels in PostHog according to the site's policy; these are not set by this code.
