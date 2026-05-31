import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { MethodologySection } from "./components/MethodologySection";
import { AlertSection } from "./components/AlertSection";
import { StrategyPreviewCard } from "./components/StrategyPreviewCard";
import { ValuePointsSection } from "./components/ValuePointsSection";
import { alertsValuePoints, trackValuePoints } from "./data/valuePoints";

export function HomePage(): JSX.Element {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050812] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_100%_10%,rgba(99,102,241,0.16),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0),rgba(2,6,23,0.8))]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:56px_56px]" />

      <Header />

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-28 lg:pt-20">
        <HeroSection />
        <StrategyPreviewCard />
      </section>

      <ValuePointsSection valuePoints={trackValuePoints} />
      <MethodologySection />
      <AlertSection />
      <ValuePointsSection valuePoints={alertsValuePoints} />
      <Footer />
    </main>
  );
}

export default HomePage;
