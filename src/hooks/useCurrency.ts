import { useProfile } from "@/hooks/useData";

export type CurrencyCode = "EUR" | "UAH";

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: "€",
  UAH: "₴",
};

export function useCurrency() {
  const { data: profile } = useProfile();
  const code: CurrencyCode = ((profile as any)?.currency as CurrencyCode) || "EUR";
  const symbol = CURRENCY_SYMBOLS[code] || "€";

  const fmt = (amount: number, decimals?: number) => {
    const d = decimals ?? 0;
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;
  };

  return { code, symbol, fmt };
}
