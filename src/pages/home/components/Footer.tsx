import anmiLogo from "../assets/anmi_logo_header.webp";
import { footerColumns } from "../data/footerData";

export function Footer(): JSX.Element {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-slate-950/45">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[0.85fr_1.55fr] lg:px-8 lg:py-16">
        <div className="max-w-md">
          <a href="#" className="inline-flex items-center">
            <div className="flex flex-col items-start leading-none">
              <img
                src={anmiLogo}
                alt="ANMI"
                className="h-10 w-auto object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.14)]"
              />
              <div className="mt-1 pl-1 text-[8px] font-medium uppercase tracking-[0.34em] text-slate-500">
                TRADING TRANSPARENCY
              </div>
            </div>
          </a>

          <p className="mt-6 text-sm leading-6 text-slate-400">
            Strategy intelligence and verification for investors who want evidence before allocation.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                {column.title}
              </div>
              <div className="mt-4 grid gap-3">
                {column.links.map((link) => (
                  <a
                    key={`${column.title}-${link.label}`}
                    href={link.href}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl border-t border-white/10 px-5 py-7 text-xs leading-5 text-slate-500 lg:px-8">
        <div className="max-w-5xl">
          ANMI provides informational analytics, verification records and due diligence tooling only. ANMI does not provide investment advice, personalized recommendations, portfolio management, brokerage, custody, execution, solicitation, securities offering, or guarantees of performance. Analytics, alerts and reports should not be relied on as instructions to buy, sell, hold or allocate capital, and past performance is not a reliable indicator of future results.
        </div>
      </div>
    </footer>
  );
}
