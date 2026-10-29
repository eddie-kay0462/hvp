interface Priced {
  pricing_type?: string | null;
  default_price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  service_packages?: { price: number | string }[] | null;
}

/** Display price, matching ServiceCard's wording. */
export const formatServicePrice = (s: Priced) => {
  if (s.pricing_type === "range" && s.price_min != null && s.price_max != null) {
    return `GH₵ ${s.price_min} – ${s.price_max}`;
  }
  if (s.pricing_type === "packages") {
    const prices = (s.service_packages ?? []).map((p) => Number(p.price)).filter((p) => p > 0);
    return `From GH₵ ${prices.length ? Math.min(...prices) : s.default_price ?? 0}`;
  }
  return `GH₵ ${s.default_price ?? 0}`;
};

/** "May 2026" */
export const formatMonthYear = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : null;
