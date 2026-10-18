import { useEffect, useRef, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { getAnalyticsConsent, subscribeAnalytics, trackEvent } from "../../lib/analytics";

export function useExplorerVisibility() {
  const ref = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const consent = useSyncExternalStore(subscribeAnalytics, getAnalyticsConsent);
  useEffect(() => {
    if (!ref.current || consent !== "accepted" || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        trackEvent("explorer_viewed", {});
        observer.disconnect();
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [pathname, consent]);
  return ref;
}
