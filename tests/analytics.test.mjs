import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function moduleUrl(source) {
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}
const eventsUrl = moduleUrl(readFileSync(new URL("../src/lib/analytics-events.ts", import.meta.url), "utf8"));
const source = readFileSync(new URL("../src/lib/analytics.ts", import.meta.url), "utf8")
  .replace('"./analytics-events"', JSON.stringify(eventsUrl)).replaceAll("import.meta.env", "({})");
const { createAnalytics, ANALYTICS_CONSENT_KEY } = await import(moduleUrl(source));
const { explorerProperties, searchLengthBucket } = await import(eventsUrl);

function fixture(overrides = {}) {
  const events = [];
  const calls = { imports: 0, init: 0, out: 0, reset: 0 };
  const storage = new Map();
  let config;
  const sdk = {
    init(_token, options) { calls.init++; config = options; },
    set_config(options) { Object.assign(config, options); },
    opt_in_capturing() {}, opt_out_capturing() { calls.out++; }, reset() { calls.reset++; },
    capture(event, properties) {
      const result = config.before_send({ event, properties: { token: "phc_test", distinct_id: "anonymous", $referrer: "https://private.test/?secret=1", $set: { email: "private" }, ...properties } });
      if (result) events.push(result);
    },
  };
  const analytics = createAnalytics({ product: "hub", environment: "test", enabled: true, token: "phc_test", host: "https://eu.i.posthog.com",
    storage: () => ({ getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) }),
    loadSdk: async () => { calls.imports++; return sdk; }, origin: () => "https://anmi.test", ...overrides });
  return { analytics, calls, events, storage, sdk, config: () => config };
}

test("unknown and rejected consent never import/initialize SDK or capture", async () => {
  const f = fixture();
  assert.equal(f.analytics.getAnalyticsConsent(), "unknown");
  f.analytics.trackPageView("/en");
  f.analytics.trackEvent("chart_mode_changed", { mode: "aum" });
  await f.analytics.initialize();
  f.analytics.setAnalyticsConsent("rejected");
  await f.analytics.initialize();
  assert.equal(f.calls.imports, 0); assert.equal(f.calls.init, 0); assert.deepEqual(f.events, []);
});

test("acceptance loads once, captures current page once and preserves typed events", async () => {
  const f = fixture();
  f.analytics.trackPageView("/en?wallet=SECRET#private");
  f.analytics.setAnalyticsConsent("accepted");
  await f.analytics.initialize();
  f.analytics.trackPageView("/en");
  f.analytics.trackPageView("/en"); // StrictMode replay/remount
  f.analytics.trackEvent("chart_mode_changed", { mode: "aum", balance: 999, query: "SECRET" });
  assert.equal(f.calls.init, 1);
  assert.deepEqual(f.events.map(e => e.event), ["$pageview", "chart_mode_changed"]);
  const encoded = JSON.stringify(f.events);
  assert.ok(!encoded.includes("SECRET")); assert.ok(!encoded.includes("private")); assert.ok(!encoded.includes("999"));
  assert.equal(f.events[0].properties.$current_url, "https://anmi.test/en");
  assert.equal(f.events[0].properties.product, "hub");
  assert.equal(f.events[0].properties.environment, "test");
  assert.equal(f.events[0].properties.token, "phc_test");
  assert.equal(f.storage.get(ANALYTICS_CONSENT_KEY), "accepted");
});

test("saved acceptance is restored; route transitions and back navigation count once", async () => {
  const f = fixture({ storage: () => ({ getItem: () => "accepted", setItem() {} }) });
  assert.equal(f.analytics.getAnalyticsConsent(), "accepted");
  f.analytics.trackPageView("/en"); await f.analytics.initialize();
  f.analytics.trackPageView("/en/strategies/public-group");
  f.analytics.trackPageView("/en/strategies/public-group?search=private");
  f.analytics.trackPageView("/en");
  assert.deepEqual(f.events.map(e => e.properties.$pathname), ["/en", "/en/strategies/public-group", "/en"]);
});

test("withdrawal clears persistence, aborts transports and stops events; reacceptance works", async () => {
  const f = fixture();
  f.analytics.setAnalyticsConsent("accepted"); await f.analytics.initialize();
  const signal = f.config().fetch_options.signal;
  f.analytics.setAnalyticsConsent("rejected");
  assert.equal(signal.aborted, true); assert.ok(f.calls.out > 0); assert.ok(f.calls.reset > 0);
  f.analytics.trackEvent("chart_mode_changed", { mode: "aum" });
  assert.deepEqual(f.events, []);
  f.analytics.setAnalyticsConsent("accepted"); await f.analytics.initialize();
  f.analytics.trackEvent("chart_mode_changed", { mode: "unit_price" });
  assert.equal(f.events.length, 1); assert.equal(f.calls.init, 1);
  assert.equal(f.config().fetch_options.signal.aborted, false);
  f.analytics.setAnalyticsConsent("rejected");
  f.analytics.setAnalyticsConsent("accepted"); await f.analytics.initialize();
  f.analytics.trackEvent("chart_mode_changed", { mode: "aum" });
  assert.equal(f.events.length, 2);
});

test("revoking consent during import prevents initialization and discards pending events", async () => {
  let resolve;
  const pending = new Promise(r => { resolve = r; });
  const f = fixture({ loadSdk: () => pending });
  f.analytics.setAnalyticsConsent("accepted");
  const initialized = f.analytics.initialize();
  f.analytics.trackEvent("chart_mode_changed", { mode: "aum" });
  f.analytics.setAnalyticsConsent("rejected");
  resolve(f.sdk); await initialized;
  assert.equal(f.calls.init, 0); assert.equal(f.events.length, 0);
});

test("accepted/rejected/accepted during lazy import uses only the latest consent generation", async () => {
  let resolve;
  const pending = new Promise(r => { resolve = r; });
  const f = fixture({ loadSdk: () => pending });
  f.analytics.setAnalyticsConsent("accepted"); const initialized = f.analytics.initialize();
  f.analytics.setAnalyticsConsent("rejected"); f.analytics.setAnalyticsConsent("accepted");
  resolve(f.sdk); await initialized; await f.analytics.initialize();
  f.analytics.trackEvent("chart_mode_changed", { mode: "aum" });
  assert.equal(f.calls.init, 1); assert.equal(f.events.length, 1);
});

test("missing config, disabled development, unavailable storage and blocked SDK are harmless", async () => {
  for (const overrides of [{ token: "" }, { host: "" }, { enabled: false }]) {
    const f = fixture(overrides); f.analytics.setAnalyticsConsent("accepted");
    await f.analytics.initialize(); assert.equal(f.calls.imports, 0);
  }
  const f = fixture({ storage: () => { throw new Error("blocked"); } });
  assert.equal(f.analytics.getAnalyticsConsent(), "unknown");
  f.analytics.setAnalyticsConsent("accepted"); await f.analytics.initialize(); assert.equal(f.calls.init, 1);
  const blocked = fixture({ loadSdk: async () => { throw new Error("blocked"); } });
  blocked.analytics.setAnalyticsConsent("accepted"); await blocked.analytics.initialize();
  assert.deepEqual(blocked.events, []);
});

test("Explorer metadata excludes private identifiers; viewed events are once per visit", async () => {
  const f = fixture(); f.analytics.setAnalyticsConsent("accepted");
  f.analytics.trackPageView("/en/strategies/public"); await f.analytics.initialize();
  f.analytics.trackEvent("explorer_node_selected", explorerProperties({ type: "account", protocolType: "lp", accountId: "SECRET", balance: 999 }, "snapshots"));
  f.analytics.trackEvent("explorer_viewed", {}); f.analytics.trackEvent("explorer_viewed", {});
  assert.deepEqual(f.events[1].properties.node_type, "account");
  assert.ok(!JSON.stringify(f.events).includes("SECRET"));
  assert.equal(f.events.filter(e => e.event === "explorer_viewed").length, 1);
  assert.equal(searchLengthBucket(2), null); assert.equal(searchLengthBucket(8), "3-10");
  assert.equal(searchLengthBucket(20), "11-50"); assert.equal(searchLengthBucket(100), "51-200");
});

test("cross-tab withdrawal and initialization failure remain fail-closed", async () => {
  const f = fixture(); f.analytics.setAnalyticsConsent("accepted"); await f.analytics.initialize();
  f.analytics.syncConsent("rejected");
  assert.equal(f.analytics.getAnalyticsConsent(), "rejected");
  f.analytics.trackEvent("cta_clicked", { source: "hero", destination: "other" });
  assert.deepEqual(f.events, []);
  const broken = fixture({ loadSdk: async () => ({ init() { throw new Error("failed"); }, opt_out_capturing() {}, reset() {} }) });
  broken.analytics.setAnalyticsConsent("accepted"); await broken.analytics.initialize();
  assert.deepEqual(broken.events, []);
});
