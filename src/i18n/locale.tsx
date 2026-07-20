import { createContext, useContext, useEffect, type ReactNode } from "react";

export const SUPPORTED_LOCALES = ["en", "ru", "fr", "zh"] as const;
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
  mixed: { en: "Mixed", ru: "Смешанная", fr: "Mixte", zh: "混合" },
  hodler: { en: "Hodler", ru: "Ходлер", fr: "Détenteur", zh: "持有者" },
  futures: { en: "Futures", ru: "Фьючерсы", fr: "Futures", zh: "期货" },
  "liquidity provider": {
    en: "Liquidity Provider",
    ru: "Поставщик ликвидности",
    fr: "Fournisseur de liquidité",
    zh: "流动性提供者",
  },
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
    name: { en: "Algorithmic Trading", ru: "Алгоритмическая торговля", fr: "Trading algorithmique", zh: "算法交易" },
    description: {
      en: "A strategy group that executes algorithmic trading strategies.",
      ru: "Группа стратегий, использующих алгоритмические торговые системы.",
      fr: "Un groupe de stratégies qui exécute des systèmes de trading algorithmique.",
      zh: "一组执行算法交易系统的策略。",
    },
  },
  funding_arb: {
    groupId: "funding_arb",
    name: { en: "Funding Arbitrage", ru: "Фандинг-арбитраж", fr: "Arbitrage du financement", zh: "资金费率套利" },
    description: {
      en: "A strategy group that captures funding rate differentials between centralized and decentralized perpetual markets.",
      ru: "Группа стратегий, использующих разницу ставок финансирования между централизованными и децентрализованными рынками бессрочных контрактов.",
      fr: "Un groupe de stratégies qui exploite les écarts de taux de financement entre les marchés perpétuels centralisés et décentralisés.",
      zh: "一组利用中心化与去中心化永续合约市场资金费率差异的策略。",
    },
  },
  lp_deep_sui: {
    groupId: "convexity_harvest",
    name: { en: "Convexity Harvest", ru: "Сбор премии за выпуклость", fr: "Capture de la prime de convexité", zh: "凸性溢价策略" },
    description: {
      en: "A strategy group that monetizes demand for upside convexity through synthetic perpetual call selling with active risk management.",
      ru: "Группа стратегий, монетизирующих спрос на положительную выпуклость через продажу синтетических бессрочных коллов с активным управлением риском.",
      fr: "Un groupe de stratégies qui monétise la demande de convexité haussière par la vente de calls perpétuels synthétiques avec une gestion active du risque.",
      zh: "一组通过卖出合成永续看涨期权并进行主动风险管理来获取上行凸性溢价的策略。",
    },
  },
  lp_options: {
    groupId: "options_lp",
    name: { en: "Option Hedged Liquidity Provision", ru: "Ликвидность с опционным хеджированием", fr: "Fourniture de liquidité couverte par options", zh: "期权对冲流动性提供" },
    description: {
      en: "A strategy group that provides liquidity with option hedging.",
      ru: "Группа стратегий предоставления ликвидности с опционным хеджированием.",
      fr: "Un groupe de stratégies qui fournit de la liquidité avec une couverture par options.",
      zh: "一组通过期权进行对冲的流动性提供策略。",
    },
  },
  options_antilp: {
    groupId: "options_antilp",
    name: { en: "Smart hedged Options Trading", ru: "Торговля опционами с динамическим хеджированием", fr: "Trading d’options avec couverture dynamique", zh: "动态对冲期权交易" },
    description: {
      en: "A strategy group that trades options with smart hedging techniques.",
      ru: "Группа опционных стратегий с динамическим хеджированием риска.",
      fr: "Un groupe de stratégies d’options utilisant des techniques de couverture dynamique.",
      zh: "一组使用动态对冲技术进行期权交易的策略。",
    },
  },
  other: {
    groupId: "other",
    name: { en: "Non-systematic Strategies", ru: "Несистематические стратегии", fr: "Stratégies non systématiques", zh: "非系统化策略" },
    description: {
      en: "A strategy group that encompasses manual trading and other non-systematic strategies.",
      ru: "Группа ручных и других несистематических торговых стратегий.",
      fr: "Un groupe qui rassemble le trading manuel et d’autres stratégies non systématiques.",
      zh: "一组涵盖手动交易及其他非系统化交易方式的策略。",
    },
  },
  sui_stables: {
    groupId: "stables",
    name: { en: "Stablecoin Liquidity Provision", ru: "Ликвидность в стейблкоинах", fr: "Fourniture de liquidité en stablecoins", zh: "稳定币流动性提供" },
    description: {
      en: "A strategy group that provides liquidity for stablecoins.",
      ru: "Группа стратегий предоставления ликвидности в стейблкоинах.",
      fr: "Un groupe de stratégies qui fournit de la liquidité aux stablecoins.",
      zh: "一组为稳定币提供流动性的策略。",
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
