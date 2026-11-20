/**
 * Indicative rates to USD, used only to show travellers a rough figure in a
 * currency they probably think in. Never used for charging — v1 takes no
 * payments, guests settle with the property on arrival.
 */
const usdRates: Record<string, number> = {
  USD: 1,
  AUD: 0.66,
  NZD: 0.6,
  FJD: 0.44,
  WST: 0.36,
  TOP: 0.42,
  VUV: 0.0084,
  SBD: 0.12,
  PGK: 0.26,
  XPF: 0.009,
}

export function formatMoney(amount: number, currency: string): string {
  const rounded = Math.round(amount)
  return `${currency} ${rounded.toLocaleString('en-US')}`
}

export function toUsd(amount: number, currency: string): number {
  const rate = usdRates[currency] ?? 1
  return amount * rate
}

/** "≈ US$185" — rounded to the nearest dollar so it never reads as a quote. */
export function approxUsd(amount: number, currency: string): string | null {
  if (currency === 'USD') return null
  const usd = toUsd(amount, currency)
  if (!Number.isFinite(usd) || usd <= 0) return null
  return `≈ US$${Math.round(usd).toLocaleString('en-US')}`
}
