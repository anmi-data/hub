import { useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { getAnalyticsConsent, setAnalyticsConsent, subscribeAnalytics } from "../../lib/analytics";

export function AnalyticsConsent(): JSX.Element {
  const consent = useSyncExternalStore(subscribeAnalytics, getAnalyticsConsent);
  const [editing, setEditing] = useState(false);
  const preferences = useRef<HTMLButtonElement>(null);
  const visible = consent === "unknown" || editing;
  function choose(value: "accepted" | "rejected") {
    setAnalyticsConsent(value);
    setEditing(false);
    preferences.current?.focus({ preventScroll: true });
  }
  return (
    <>
      <footer className="relative z-10 flex flex-wrap justify-center gap-5 border-t border-white/10 bg-slate-950 px-5 py-5 text-sm text-slate-300">
        <button ref={preferences} type="button" className="underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-cyan-200" onClick={() => setEditing(true)}>Analytics preferences</button>
        <Link className="underline underline-offset-4 hover:text-white" to="/privacy">Privacy notice</Link>
      </footer>
      {visible && (
        <section aria-labelledby="analytics-consent-title" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-h-[60vh] max-w-xl overflow-y-auto rounded-2xl border border-cyan-200/25 bg-slate-950 p-5 text-slate-200 shadow-2xl sm:inset-x-5 sm:bottom-5">
          <h2 id="analytics-consent-title" className="text-base font-semibold text-white">Analytics preferences</h2>
          <p className="mt-2 text-sm leading-6">We use optional analytics to understand how visitors explore ANMI and improve our products. You can accept or decline at any time.</p>
          <Link className="mt-2 inline-block text-sm text-cyan-200 underline" to="/privacy">Privacy notice</Link>
          <div className="mt-4 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
            <button type="button" onClick={() => choose("accepted")} className="min-h-11 rounded-xl border border-cyan-200/40 bg-slate-800 px-3 py-3 text-sm font-semibold hover:bg-slate-700 focus-visible:outline focus-visible:outline-cyan-200">Accept analytics</button>
            <button type="button" onClick={() => choose("rejected")} className="min-h-11 rounded-xl border border-cyan-200/40 bg-slate-800 px-3 py-3 text-sm font-semibold hover:bg-slate-700 focus-visible:outline focus-visible:outline-cyan-200">Reject analytics</button>
          </div>
          {editing && consent !== "unknown" && <button type="button" className="mt-3 text-sm underline" onClick={() => setEditing(false)}>Keep current preference</button>}
        </section>
      )}
    </>
  );
}
