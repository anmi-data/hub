import type { PostHog, PostHogConfig } from "posthog-js";
import { sanitizeEventProperties, type AnalyticsEvents } from "./analytics-events";

export type AnalyticsConsent = "unknown" | "accepted" | "rejected";
export const ANALYTICS_CONSENT_KEY = "anmi:analytics-consent:v1";
type Sdk = Pick<PostHog, "init" | "capture" | "opt_in_capturing" | "opt_out_capturing" | "reset" | "set_config">;
type Settings = {
  product: string;
  environment: string;
  enabled: boolean;
  token?: string;
  host?: string;
  storage: () => Pick<Storage, "getItem" | "setItem">;
  loadSdk: () => Promise<Sdk>;
  origin: () => string;
};

export function sanitizePath(path: string): string {
  // Paths are public routing data. Queries, fragments and external URLs never pass through.
  const clean = path.split(/[?#]/, 1)[0];
  return clean.startsWith("/") && !clean.startsWith("//") ? clean : "/";
}

export function createAnalytics(settings: Settings) {
  let consent: AnalyticsConsent = "unknown";
  try {
    const saved = settings.storage().getItem(ANALYTICS_CONSENT_KEY);
    if (saved === "accepted" || saved === "rejected") consent = saved;
  } catch { /* Unavailable storage is not consent. An explicit choice still works for this tab. */ }
  let sdk: Sdk | undefined;
  let ready = false;
  let transport: AbortController | undefined;
  let generation = 0;
  let pending: Promise<void> | undefined;
  let page: { path: string; visit: number } | undefined;
  let capturedVisit = -1;
  const viewedVisits = new Set<number>();
  let queue: Array<{ name: string; properties: Record<string, unknown> }> = [];
  const listeners = new Set<() => void>();
  const allowed = () => consent === "accepted" && settings.enabled && Boolean(settings.token?.trim()) && Boolean(settings.host?.trim());
  const notify = () => listeners.forEach(listener => listener());
  const stop = () => {
    ready = false;
    queue = [];
    // Every SDK fetch (including delayed retries) retains this generation's signal.
    transport?.abort();
    try {
      sdk?.opt_out_capturing();
      sdk?.reset(true);
      sdk?.opt_out_capturing();
    } catch { /* SDK failures must not affect the application. */ }
  };

  const send = (name: string, properties: Record<string, unknown>) => {
    if (!allowed() || !ready) return;
    try { sdk?.capture(name, { ...properties, product: settings.product, environment: settings.environment }); } catch { /* Optional analytics. */ }
  };
  const captureCurrentPage = () => {
    if (!page || !allowed() || !ready || capturedVisit === page.visit) return;
    capturedVisit = page.visit;
    send("$pageview", { $pathname: page.path, $current_url: settings.origin() + page.path });
  };

  const initialize = (): Promise<void> => {
    if (!allowed() || ready) return Promise.resolve();
    if (pending) return pending;
    const version = generation;
    pending = (async () => {
      try {
        // Always yield, even when reusing the SDK, so finally can clear the assigned promise.
        const loaded = await Promise.resolve().then(() => sdk ?? settings.loadSdk());
        if (!allowed() || generation !== version) return;
        transport = new AbortController();
        // 1.438.12 request.js spreads fetch_options into RequestInit; its declaration
        // lists only cache/next_options. Keep this verified extension typed locally.
        const fetchOptions: NonNullable<PostHogConfig["fetch_options"]> & Pick<RequestInit, "signal" | "referrerPolicy"> = {
          cache: "no-store", signal: transport.signal, referrerPolicy: "no-referrer",
        };
        if (!sdk) {
          sdk = loaded;
          const config: Partial<PostHogConfig> = {
            api_host: settings.host,
            capture_pageview: false, capture_pageleave: false, autocapture: false,
            disable_session_recording: true, person_profiles: "identified_only",
            advanced_disable_flags: true, advanced_disable_feature_flags: true,
            disable_surveys: true, disable_web_experiments: true, disable_external_dependency_loading: true,
            disable_conversations: true, disable_product_tours: true,
            capture_performance: false, capture_exceptions: false, capture_dead_clicks: false,
            save_referrer: false, save_campaign_params: false, ip: false,
            opt_out_capturing_by_default: true, opt_out_persistence_by_default: true,
            persistence: "localStorage", request_batching: false,
            api_transport: "fetch", disable_beacon: true, fetch_options: fetchOptions,
            before_send: event => {
              if (!event || !allowed()) return null;
              const safe = sanitizeEventProperties(event.event, event.properties);
              if (!safe) return null;
              // Discard automatic URL/referrer/title/UTM/person properties, including initial values.
              // Only anonymous SDK identifiers and library metadata are retained.
              for (const key of ["token", "distinct_id", "$device_id", "$session_id", "$window_id", "$lib", "$lib_version"]) {
                if (typeof event.properties[key] === "string") safe[key] = event.properties[key];
              }
              const path = sanitizePath(typeof event.properties.$pathname === "string" ? event.properties.$pathname : page?.path ?? "/");
              event.properties = { ...safe, $pathname: path, $current_url: settings.origin() + path,
                $process_person_profile: false, product: settings.product, environment: settings.environment };
              delete event.$set;
              delete event.$set_once;
              return event;
            },
          };
          sdk.init(settings.token!, config);
        } else {
          sdk.set_config({ fetch_options: fetchOptions });
        }
        if (!allowed() || generation !== version) { stop(); return; }
        sdk.opt_in_capturing({ captureEventName: false });
        ready = true;
        captureCurrentPage();
        const acceptedEvents = queue;
        queue = [];
        acceptedEvents.forEach(event => send(event.name, event.properties));
        notify();
      } catch { stop(); }
      finally { pending = undefined; }
    })();
    return pending;
  };

  const applyConsent = (next: AnalyticsConsent) => {
    if (next !== consent) generation++;
    consent = next;
    if (next !== "accepted") stop();
    notify();
    if (next === "accepted") {
      // Wait for an invalidated import to settle before starting a new consent generation.
      void (pending ?? Promise.resolve()).then(() => initialize());
    }
  };
  return {
    initialize,
    getAnalyticsConsent: () => consent,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setAnalyticsConsent: (next: AnalyticsConsent) => {
      try { settings.storage().setItem(ANALYTICS_CONSENT_KEY, next); } catch { /* Keep explicit in-memory choice. */ }
      applyConsent(next);
    },
    syncConsent: (value: string | null) => applyConsent(value === "accepted" || value === "rejected" ? value : "unknown"),
    trackPageView: (path: string) => {
      const clean = sanitizePath(path);
      if (page?.path !== clean) page = { path: clean, visit: (page?.visit ?? 0) + 1 };
      captureCurrentPage();
      void initialize();
    },
    trackEvent: <E extends keyof AnalyticsEvents>(name: E, properties: AnalyticsEvents[E]): boolean => {
      if (!allowed()) return false;
      const safe = sanitizeEventProperties(name, properties);
      if (!safe) return false;
      safe.$pathname = page?.path ?? "/";
      if (name === "explorer_viewed") {
        if (!page || viewedVisits.has(page.visit)) return false;
        viewedVisits.add(page.visit);
      }
      if (ready) send(name, safe);
      else { if (queue.length < 50) queue.push({ name, properties: safe }); void initialize(); }
      return true;
    },
  };
}

const analytics = createAnalytics({
  product: "hub", environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD || import.meta.env.VITE_ANALYTICS_DEBUG === "true",
  token: import.meta.env.VITE_POSTHOG_PROJECT_TOKEN, host: import.meta.env.VITE_POSTHOG_HOST,
  storage: () => window.localStorage, origin: () => window.location.origin,
  loadSdk: async () => (await import("posthog-js")).default,
});

export const { trackEvent, trackPageView, getAnalyticsConsent, setAnalyticsConsent, subscribe: subscribeAnalytics } = analytics;
if (typeof window !== "undefined") {
  window.addEventListener("storage", event => {
    if (event.key === ANALYTICS_CONSENT_KEY || event.key === null) analytics.syncConsent(event.newValue);
  });
}
