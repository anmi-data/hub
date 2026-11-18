import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { gunzipSync } from "node:zlib";

let browser, server, origin;
before(async () => {
  server = await createServer({
    server: { host: "127.0.0.1", port: 0, proxy: {} },
    define: {
      "import.meta.env.VITE_ANALYTICS_DEBUG": JSON.stringify("true"),
      "import.meta.env.VITE_POSTHOG_PROJECT_TOKEN": JSON.stringify("phc_browser_test"),
      "import.meta.env.VITE_POSTHOG_HOST": JSON.stringify("https://analytics.example.test"),
    },
  });
  await server.listen();
  origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ channel: process.env.ANMI_TEST_BROWSER_CHANNEL || "chrome", headless: true });
});
after(async () => { await browser?.close(); await server?.close(); });

const mockSdk = `
let config;
window.__analyticsEvents = [];
window.__analyticsInits = 0;
export default {
  init(token, options) { config = options; window.__analyticsInits++; },
  set_config(options) { Object.assign(config, options); },
  opt_in_capturing() {}, opt_out_capturing() {}, reset() {},
  capture(event, properties) {
    const result = config.before_send({event, properties: { token: 'phc_browser_test', distinct_id: 'test', ...properties }});
    if (result) window.__analyticsEvents.push(result);
  }
};`;

async function fixture({ mock = true, mobile = false, saved } = {}) {
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    viewport: mobile ? { width: 375, height: 812 } : { width: 1440, height: 1000 },
  });
  // The installed SDK intentionally drops automated browsers; exercise a normal visitor.
  await context.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => false }));
  if (saved) await context.addInitScript(value => localStorage.setItem("anmi:analytics-consent:v1", value), saved);
  if (mock) await context.route(/\/node_modules\/\.vite\/deps\/posthog-js\.js/, route => route.fulfill({ contentType: "application/javascript", body: mockSdk }));
  await context.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    let payload = {};
    if (url.pathname === "/api/auth/me") payload = { user: { id: 1, username: "analytics-fixture", mustChangePassword: false }, admin: false, csrfToken: "fixture-csrf", adminCsrfToken: null };
    if (url.pathname.endsWith("/data-revision")) payload = { dataRevision: 1 };
    if (url.pathname.endsWith("/display/strategies")) payload = { strategies: [
      { id: "alpha", groupId: "public-alpha", name: "Alpha", status: "complete" },
      { id: "beta", groupId: "public-beta", name: "Beta", status: "complete" },
    ] };
    else if (url.pathname.endsWith("/benchmarks")) payload = [{ symbol: "BTC", name: "Bitcoin" }, { symbol: "ETH", name: "Ethereum" }];
    else if (url.pathname.endsWith("/tree")) payload = { root: { id: "private-account-1", entityId: "private-account-1", type: "account", label: "First account", children: [
      { id: "private-account-2", entityId: "private-account-2", accountId: "WALLET_SECRET", type: "account", protocolType: "lp", label: "Second account" },
    ] } };
    else if (url.pathname.endsWith("/history")) payload = { columns: [{ key: "timestamp", label: "Timestamp" }], rows: [{ timestamp: "2026-01-01T00:00:00Z" }], pagination: { page: Number(url.searchParams.get("page") || 1), pageSize: Number(url.searchParams.get("pageSize") || 10), totalRows: 100, totalPages: 10 } };
    else if (url.pathname.endsWith("/details")) payload = { datasets: ["snapshots"], type: "account" };
    await route.fulfill({ json: payload });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  return { context, page };
}
async function events(page, name) { return page.evaluate(name => (window.__analyticsEvents ?? []).filter(e => !name || e.event === name), name); }

test("browser: account cache survives unchanged revision and refreshes after collect", async () => {
  const { context, page } = await fixture();
  let revision = 1;
  let polls = 0;
  const details = [];
  await context.route("**/api/v1/data-revision", async route => {
    polls++;
    await route.fulfill({ json: { dataRevision: revision } });
  });
  context.on("request", request => {
    if (new URL(request.url()).pathname.endsWith("/explorer/details")) details.push(request.url());
  });
  try {
    await page.goto(origin + "/en/strategies/alpha");
    const explorer = page.locator("section").filter({ has: page.getByText("Track Record Explorer", { exact: true }) }).first();
    const select = async (from, to) => {
      await explorer.getByRole("button", { name: new RegExp(`^${from}\\s+Account$`, "i") }).click();
      await explorer.getByRole("button", { name: new RegExp(`^${to}\\s+Account`, "i") }).click();
    };
    await select("First account", "Second account");
    await select("Second account", "First account");
    const countBefore = details.length;
    const pollBefore = polls;
    const polled = page.waitForResponse(response => response.url().endsWith("/data-revision"));
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await polled;
    assert.ok(polls > pollBefore);
    await select("First account", "Second account");
    assert.equal(details.length, countBefore);
    revision = 2;
    const refreshed = page.waitForRequest(request => request.url().includes("/explorer/details"));
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await refreshed;
    assert.ok(details.length > countBefore);
  } finally { await context.close(); }
});
async function count(page, name, expected) {
  await page.waitForFunction(({ name, expected }) => (window.__analyticsEvents ?? []).filter(e => e.event === name).length === expected, { name, expected });
}

test("browser: unknown/rejected consent loads no SDK or analytics; mobile banner and preferences", async () => {
  const { context, page } = await fixture({ mobile: true });
  try {
    const requests = [];
    page.on("request", request => { if (/posthog-js|analytics\.example/.test(request.url())) requests.push(request.url()); });
    await page.goto(origin + "/en");
    await page.getByRole("button", { name: "Accept analytics", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.ok(await page.getByRole("button", { name: "Reject analytics", exact: true }).isVisible());
    await page.screenshot({ path: "test-results/analytics-mobile.png", fullPage: false });
    assert.deepEqual(requests, []);
    await page.getByRole("button", { name: "Reject analytics", exact: true }).click();
    await page.reload();
    await page.getByRole("heading", { name: "Trust trading strategies before allocating capital" }).waitFor();
    assert.deepEqual(requests, []);
    assert.equal(await page.getByRole("button", { name: "Accept analytics", exact: true }).count(), 0);
    await page.getByRole("button", { name: "Analytics preferences", exact: true }).click();
    await page.getByRole("button", { name: "Accept analytics", exact: true }).click();
    await count(page, "$pageview", 1);
  } finally { await context.close(); }
});

test("browser: StrictMode, router navigation, consent withdrawal and home CTA", async () => {
  const { context, page } = await fixture();
  try {
    await page.goto(origin + "/en?wallet=PRIVATE#secret");
    await page.getByRole("button", { name: "Accept analytics", exact: true }).click();
    await count(page, "$pageview", 1);
    assert.equal(await page.evaluate(() => window.__analyticsInits), 1);
    await page.getByRole("link", { name: "Privacy notice", exact: true }).click();
    await count(page, "$pageview", 2);
    // The / link redirects to /en; redirect-only routes must not add a pageview.
    await page.getByRole("link", { name: "ANMI Hub", exact: true }).click();
    await count(page, "$pageview", 3);
    await page.getByRole("link", { name: "View Analytics", exact: true }).click();
    await count(page, "cta_clicked", 1);
    assert.equal((await events(page, "$pageview")).length, 3);
    // Capture the click synchronously before the existing full-page anchor navigation.
    await page.getByRole("link", { name: "Explore Strategies", exact: true }).evaluate(element => {
      element.addEventListener("click", e => e.preventDefault(), { once: true }); element.click();
    });
    await count(page, "explore_strategies_clicked", 1);
    assert.ok(!JSON.stringify(await events(page)).includes("PRIVATE"));
    await page.getByRole("button", { name: "Analytics preferences", exact: true }).click();
    await page.getByRole("button", { name: "Reject analytics", exact: true }).click();
    const before = (await events(page)).length;
    await page.getByRole("link", { name: "Privacy notice", exact: true }).click();
    assert.equal((await events(page)).length, before);
  } finally { await context.close(); }
});

test("browser: strategy, chart, benchmark, Explorer, pagination and debounced private search", async () => {
  const { context, page } = await fixture({ saved: "accepted" });
  try {
    await page.goto(origin + "/en/strategies/alpha");
    await count(page, "$pageview", 1);
    const selector = page.locator('button[aria-expanded]').first();
    await selector.click();
    await count(page, "strategy_selector_opened", 1);
    await page.getByRole("button").filter({ hasText: "Beta" }).click();
    await count(page, "strategy_selected", 1); await count(page, "$pageview", 2);
    await page.getByRole("button", { name: "AUM", exact: true }).click();
    await page.getByRole("button", { name: "AUM", exact: true }).click();
    await count(page, "chart_mode_changed", 1);
    await page.getByRole("button", { name: "UNIT PRICE", exact: true }).click();
    await count(page, "chart_mode_changed", 2);
    await page.getByRole("button", { name: /Benchmark/ }).click();
    await page.getByRole("button", { name: /Ethereum|ETH/ }).last().click();
    await count(page, "benchmark_selected", 1);
    await page.getByRole("button", { name: /Benchmark/ }).click();
    await page.getByRole("button", { name: /Ethereum|ETH/ }).last().click();
    assert.equal((await events(page, "benchmark_selected")).length, 1);
    const explorer = page.locator("section").filter({ has: page.getByText("Track Record Explorer", { exact: true }) }).first();
    await explorer.scrollIntoViewIfNeeded();
    await count(page, "explorer_viewed", 1);
    await explorer.getByRole("button").filter({ hasText: "First account" }).click();
    await count(page, "explorer_selector_opened", 1);
    await explorer.getByRole("button").filter({ hasText: "Second account" }).click();
    await count(page, "explorer_node_selected", 1);
    await page.getByRole("button", { name: "Next history page" }).click();
    await count(page, "explorer_history_page_changed", 1);
    await explorer.locator("select").selectOption("30");
    await count(page, "explorer_history_page_size_changed", 1);
    await page.getByPlaceholder("Search history...").pressSequentially("WALLET_SECRET", { delay: 20 });
    await count(page, "explorer_history_search_used", 1);
    const recorded = await events(page);
    assert.ok(!JSON.stringify(recorded).includes("WALLET_SECRET"));
    assert.ok(!JSON.stringify(recorded).includes("private-account"));
    assert.equal(recorded.find(e => e.event === "explorer_history_search_used").properties.search_length_bucket, "11-50");
    assert.equal(recorded.find(e => e.event === "strategy_selected").properties.group_id, "public-beta");
    assert.equal(recorded.filter(e => e.event === "explorer_dataset_selected").length, 0);
  } finally { await context.close(); }
});

test("browser: real installed SDK emits only sanitized approved payloads and stops failed-request retries on withdrawal", async () => {
  const { context, page } = await fixture({ mock: false });
  try {
    const requests = [];
    await context.route("https://analytics.example.test/**", async route => {
      requests.push(route.request());
      await route.fulfill({ status: 503, contentType: "application/json", body: '{}' });
    });
    await page.goto(origin + "/en?wallet=PRIVATE_QUERY#PRIVATE_FRAGMENT");
    await page.getByRole("button", { name: "Accept analytics", exact: true }).waitFor();
    assert.equal(requests.length, 0);
    const response = page.waitForResponse(response => response.url().startsWith("https://analytics.example.test/"));
    await page.getByRole("button", { name: "Accept analytics", exact: true }).click();
    await response;
    assert.equal(requests.length, 1);
    const request = requests[0];
    let body = request.postDataBuffer();
    if (body[0] === 31 && body[1] === 139) body = gunzipSync(body);
    const decoded = body.toString();
    const data = JSON.parse(decoded.startsWith("data=") ? Buffer.from(new URLSearchParams(decoded).get("data"), "base64").toString() : decoded);
    const payload = data.batch?.[0] ?? (Array.isArray(data) ? data[0] : data);
    assert.equal(payload.event, "$pageview");
    assert.equal(data.api_key ?? payload.properties.token, "phc_browser_test");
    assert.equal(payload.properties.$pathname, "/en");
    assert.ok(!JSON.stringify(payload).includes("PRIVATE"));
    assert.equal(payload.properties.$process_person_profile, false);
    assert.equal(request.headers().referer, undefined);
    await page.getByRole("button", { name: "Analytics preferences", exact: true }).click();
    await page.getByRole("button", { name: "Reject analytics", exact: true }).click();
    const keys = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("ph_")));
    assert.deepEqual(keys, []);
    await page.getByRole("link", { name: "Privacy notice", exact: true }).click();
    // Wait beyond the first retry interval to verify withdrawal at the network boundary.
    await page.waitForTimeout(7000);
    assert.equal(requests.length, 1);
    await page.reload();
    await page.getByRole("heading", { name: "Analytics privacy notice" }).waitFor();
    assert.equal(requests.length, 1);
  } finally { await context.close(); }
});

test("browser: unavailable localStorage and blocked SDK leave navigation usable", async () => {
  const { context, page } = await fixture({ mock: false });
  try {
    await context.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new Error("storage blocked"); } }));
    await context.route(/\/node_modules\/\.vite\/deps\/posthog-js\.js/, route => route.abort());
    await page.goto(origin + "/en");
    await page.getByRole("button", { name: "Accept analytics", exact: true }).click();
    await page.getByRole("link", { name: "Privacy notice", exact: true }).click();
    await page.getByRole("heading", { name: "Analytics privacy notice" }).waitFor();
    await page.getByRole("button", { name: "Analytics preferences", exact: true }).click();
    await page.getByRole("button", { name: "Reject analytics", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Accept analytics", exact: true }).count(), 0);
  } finally { await context.close(); }
});


test("browser: group key metrics show t-statistic and beta for the selected benchmark and window", async () => {
  const { context, page } = await fixture({ saved: "rejected" });
  await context.route("**/advanced-metrics?**", route => {
    const window = new URL(route.request().url()).searchParams.get("window");
    return route.fulfill({ json: {
      id: "public-alpha", scopeType: "strategy_group", window, observations: 60,
      tStatistic: window === "30d" ? 1.25 : 2.5, tStatisticObservations: 60,
      betas: [{ symbol: "BTC", beta: 0.75, observations: 60 }, { symbol: "ETH", beta: window === "30d" ? null : -0.25, observations: 55 }],
      correlations: [], autocorrelations: [], warnings: []
    } });
  });
  try {
    await page.goto(origin + "/en/strategies/alpha");
    const metrics = page.getByRole("table", { name: "Key strategy metrics" });
    await page.waitForFunction(() => document.querySelector('[aria-label="Key strategy metrics"]')?.textContent.includes("2.5"));
    assert.match(await metrics.textContent(), /T-statistic.*90d.*2\.5/s);
    await page.getByRole("button", { name: /Benchmark/ }).click();
    await page.getByRole("button", { name: /Bitcoin|BTC/ }).last().click();
    assert.match(await metrics.textContent(), /Beta.*BTC.*0\.75/s);
    await page.getByRole("button", { name: /Benchmark/ }).click();
    await page.getByRole("button", { name: /Ethereum|ETH/ }).last().click();
    assert.match(await metrics.textContent(), /Beta.*ETH.*-0\.25/s);
    await page.getByRole("button", { name: "30d", exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Key strategy metrics"]')?.textContent.includes("1.25"));
    assert.match(await metrics.textContent(), /T-statistic.*30d.*1\.25/s);
    assert.match(await metrics.textContent(), /Beta.*ETH.*N\/A/s);
    await page.getByRole("button", { name: /Benchmark/ }).click();
    await page.getByRole("button", { name: /^None/ }).click();
    assert.match(await metrics.textContent(), /Beta.*No benchmark/s);
    assert.ok(!(await metrics.textContent()).includes("-0.25"));
  } finally { await context.close(); }
});
