import anmiLogo from "../assets/anmi_logo_header.webp";
import { homeNavigation, socialLinks } from "../data/homeNavigation";

export function Header(): JSX.Element {
  return (
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-8">
      <a href="#" className="flex items-center">
        <div className="flex flex-col items-start leading-none">
          <img
            src={anmiLogo}
            alt="ANMI"
            className="h-9 w-auto object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.16)] sm:h-10 md:h-12"
          />
          <div className="mt-1 pl-1 text-[8px] font-medium uppercase tracking-[0.34em] text-slate-400 sm:text-[9px]">
            TRADING TRANSPARENCY
          </div>
        </div>
      </a>
      <div className="hidden items-center gap-6 md:flex">
        <nav className="flex items-center gap-7 text-sm text-slate-400">
          {homeNavigation.map((item) => (
            <a key={item.href} className="transition hover:text-white" href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {socialLinks.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={item.label}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-slate-400 transition hover:-translate-y-0.5 hover:border-cyan-200/30 hover:bg-cyan-200/10 hover:text-cyan-100"
              >
                <Icon className="h-4 w-4" />
              </a>
            );
          })}
        </div>
      </div>
    </header>
  );
}
