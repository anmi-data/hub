import type { MethodologyStep } from "../types/home";

export const methodologySteps: MethodologyStep[] = [
  {
    step: "01",
    title: "Connect and verify live accounts",
    text: "We connect to live trading accounts, keep data synchronized and identify deviations from the stated strategy, not manually inflated statistics.",
  },
  {
    step: "02",
    title: "Build a verified track record",
    text: "Account activity is transformed into a verifiable record with equity curve, drawdowns, return profile, risk parameters, capacity assumptions and verification score.",
  },
  {
    step: "03",
    title: "Analyze strategy behaviour",
    text: "We evaluate risk, market exposure, hidden correlations, event sensitivity, autocorrelation, lag effects and dependency on previous wins or losses.",
  },
  {
    step: "04",
    title: "Classify and publish the strategy",
    text: "Each strategy is classified by delta, gamma, market type and execution style, then presented as an investor-ready profile with reports and update subscriptions.",
  },
];
