import { Link } from "react-router-dom";

export function PrivacyPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-slate-300">
      <article className="mx-auto max-w-2xl space-y-5 leading-7">
        <Link to="/" className="text-cyan-200 underline">ANMI Hub</Link>
        <h1 className="text-3xl font-semibold text-white">Analytics privacy notice</h1>
        <p>ANMI Hub uses optional PostHog Cloud EU analytics to understand website visits, strategy exploration, chart choices and use of the Track Record Explorer, and to improve our products.</p>
        <p>Analytics is off until you choose Accept analytics. Rejecting analytics leaves the website usable without loading PostHog or sending analytics requests. Your choice is saved in this browser using the versioned local storage key anmi:analytics-consent:v1. If browser storage is unavailable, your choice lasts only for this page session.</p>
        <p>After acceptance, PostHog stores anonymous browser and session identifiers and receives page paths and explicitly selected interaction metadata: public strategy group IDs, chart modes, benchmark symbols, Explorer node categories, dataset categories, pagination choices and search length ranges. Queries, URL fragments, search text, wallet addresses, account identifiers, form contents and financial values are excluded. Session recording, automatic click capture, feature flags and person profiles are disabled. Network requests necessarily expose connection information to the service; IP-based enrichment is disabled in our SDK configuration.</p>
        <p>You can change your choice or withdraw consent using Analytics preferences at the bottom of every page. Choose Reject analytics to stop future capture and clear PostHog browser persistence. Withdrawal does not recall requests already sent or delete events previously received by PostHog.</p>
        <p>PostHog Cloud EU receives analytics at eu.i.posthog.com. See <a className="text-cyan-200 underline" href="https://posthog.com/privacy" target="_blank" rel="noreferrer">PostHog’s privacy notice</a> for information about the service. Analytics settings do not control the operational API requests needed to display ANMI data.</p>
      </article>
    </main>
  );
}
