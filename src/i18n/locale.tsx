import { createContext, useContext, useEffect, type ReactNode } from "react";

export const SUPPORTED_LOCALES = ["en", "ru"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function isSupportedLocale(value: string | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value?.toLowerCase() as Locale);
}

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }): JSX.Element {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function localizedPath(locale: Locale, path = ""): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalizedPath === "/" ? "" : normalizedPath}`;
}

function getLocalizedRecordValue(value: Record<string, unknown>, locale: Locale): string | undefined {
  const candidates = [
    value[locale],
    value[locale.split("-")[0]],
    value.en,
    value.default,
    ...Object.values(value),
  ];
  return candidates.find((item): item is string => typeof item === "string" && item.trim().length > 0)?.trim();
}

export function getLocalizedText(value: unknown, locale: Locale): string | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return getLocalizedRecordValue(value as Record<string, unknown>, locale);
  }
  if (typeof value !== "string" || value.trim().length === 0) return undefined;

  const raw = value.trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string") return parsed.trim() || undefined;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return getLocalizedRecordValue(parsed as Record<string, unknown>, locale);
    }
  } catch {
    return raw;
  }
  return raw;
}

const CATEGORY_TRANSLATIONS: Record<string, Record<Locale, string>> = {
  mixed: { en: "Mixed", ru: "Смешанная" },
  hodler: { en: "Hodler", ru: "Ходлер" },
  futures: { en: "Futures", ru: "Фьючерсы" },
  "liquidity provider": { en: "Liquidity Provider", ru: "Поставщик ликвидности" },
};

export function getLocalizedCategory(value: unknown, locale: Locale): string | undefined {
  const localizedValue = getLocalizedText(value, locale);
  if (!localizedValue) return undefined;
  const translation = CATEGORY_TRANSLATIONS[localizedValue.toLowerCase()];
  return translation?.[locale] ?? localizedValue;
}

type LocalizedStrategyPresentation = {
  groupId: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
};

const STRATEGY_PRESENTATIONS: Record<string, LocalizedStrategyPresentation> = {
  algo_trading: {
    groupId: "algo_trading",
    name: { en: "Algorithmic Trading", ru: "Алгоритмическая торговля" },
    description: {
      en: "A strategy group that executes algorithmic trading strategies.",
      ru: "Группа стратегий, использующих алгоритмические торговые системы.",
    },
  },
  funding_arb: {
    groupId: "funding_arb",
    name: { en: "Funding Arbitrage", ru: "Фандинг-арбитраж" },
    description: {
      en: "A strategy group that captures funding rate differentials between centralized and decentralized perpetual markets.",
      ru: "Группа стратегий, использующих разницу ставок финансирования между централизованными и децентрализованными рынками бессрочных контрактов.",
    },
  },
  lp_deep_sui: {
    groupId: "convexity_harvest",
    name: { en: "Convexity Harvest", ru: "Сбор премии за выпуклость" },
    description: {
      en: "A strategy group that monetizes demand for upside convexity through synthetic perpetual call selling with active risk management.",
      ru: "Группа стратегий, монетизирующих спрос на положительную выпуклость через продажу синтетических бессрочных коллов с активным управлением риском.",
    },
  },
  lp_options: {
    groupId: "options_lp",
    name: { en: "Option Hedged Liquidity Provision", ru: "Ликвидность с опционным хеджированием" },
    description: {
      en: "A strategy group that provides liquidity with option hedging.",
      ru: "Группа стратегий предоставления ликвидности с опционным хеджированием.",
    },
  },
  options_antilp: {
    groupId: "options_antilp",
    name: { en: "Smart hedged Options Trading", ru: "Торговля опционами с динамическим хеджированием" },
    description: {
      en: "A strategy group that trades options with smart hedging techniques.",
      ru: "Группа опционных стратегий с динамическим хеджированием риска.",
    },
  },
  other: {
    groupId: "other",
    name: { en: "Non-systematic Strategies", ru: "Несистематические стратегии" },
    description: {
      en: "A strategy group that encompasses manual trading and other non-systematic strategies.",
      ru: "Группа ручных и других несистематических торговых стратегий.",
    },
  },
  sui_stables: {
    groupId: "stables",
    name: { en: "Stablecoin Liquidity Provision", ru: "Ликвидность в стейблкоинах" },
    description: {
      en: "A strategy group that provides liquidity for stablecoins.",
      ru: "Группа стратегий предоставления ликвидности в стейблкоинах.",
    },
  },
};

export function getStrategyPresentation(
  strategyId: string,
  locale: Locale,
): { groupId: string; name?: string; description?: string } {
  const presentation = STRATEGY_PRESENTATIONS[strategyId];
  return presentation
    ? {
        groupId: presentation.groupId,
        name: presentation.name[locale] ?? presentation.name.en,
        description: presentation.description[locale] ?? presentation.description.en,
      }
    : { groupId: strategyId };
}
