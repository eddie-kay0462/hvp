export type BookingStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "delivered"
  | "completed"
  | "cancelled";

export interface BookingRow {
  id: string;
  buyer_id: string;
  service_id: string;
  status: BookingStatus | string;
  payment_status: string | null;
  payment_amount: number | null;
  payment_method: string | null;
  payment_released_at: string | null;
  momo_submitted_at: string | null;
  payout_status: string | null;
  date: string | null;
  time: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ServiceRow {
  id: string;
  user_id: string;
  title: string;
  category: string;
  default_price: number | null;
  default_delivery_time: string | null;
  is_active: boolean | null;
  is_verified: boolean | null;
  image_urls: string[] | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  service_id: string | null;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export interface ServiceViewRow {
  id: string;
  service_id: string;
  viewer_id: string | null;
  viewed_at: string;
}

export const BOOKING_OPEN_STATUSES: BookingStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "delivered",
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfMonth(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  const dow = d.getDay();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dow);
  return d;
}

export function daysAgo(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * MS_PER_DAY);
}

export function bookingAmount(b: BookingRow, service?: ServiceRow): number {
  if (typeof b.payment_amount === "number" && b.payment_amount > 0) {
    return b.payment_amount;
  }
  return service?.default_price ?? 0;
}

function inWindow(iso: string | null, fromMs: number): boolean {
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  return Number.isFinite(ts) && ts >= fromMs;
}

export function earningsThisMonth(
  bookings: BookingRow[],
  servicesById: Record<string, ServiceRow>,
): number {
  const start = startOfMonth().getTime();
  return bookings.reduce((sum, b) => {
    if (b.payment_status !== "released") return sum;
    const releasedAt = b.payment_released_at ?? b.updated_at ?? b.created_at;
    if (!inWindow(releasedAt, start)) return sum;
    return sum + bookingAmount(b, servicesById[b.service_id]);
  }, 0);
}

export function bookingsThisMonth(bookings: BookingRow[]): number {
  const start = startOfMonth().getTime();
  return bookings.filter((b) => inWindow(b.created_at, start)).length;
}

export function averageRating(reviews: ReviewRow[]): {
  average: number;
  count: number;
} {
  if (!reviews.length) return { average: 0, count: 0 };
  const total = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
  return { average: total / reviews.length, count: reviews.length };
}

export function ratingDistribution(reviews: ReviewRow[]): Record<1 | 2 | 3 | 4 | 5, number> {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const r of reviews) {
    const n = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
    if (n >= 1 && n <= 5) dist[n] += 1;
  }
  return dist;
}

export interface ConversionStats {
  views: number;
  bookings: number;
  rate: number;
}

export function conversion(
  views: ServiceViewRow[],
  bookings: BookingRow[],
  windowDays = 30,
): ConversionStats {
  const from = daysAgo(windowDays).getTime();
  const v = views.filter((x) => inWindow(x.viewed_at, from)).length;
  const b = bookings.filter((x) => inWindow(x.created_at, from)).length;
  const rate = v > 0 ? b / v : 0;
  return { views: v, bookings: b, rate };
}

function bookingResponseMs(b: BookingRow): number | null {
  if (b.status === "pending") return null;
  if (!b.updated_at) return null;
  const created = new Date(b.created_at).getTime();
  const updated = new Date(b.updated_at).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(updated)) return null;
  const delta = updated - created;
  return delta >= 0 ? delta : null;
}

export function medianResponseHours(
  bookings: BookingRow[],
  windowDays = 30,
): number | null {
  const from = daysAgo(windowDays).getTime();
  const values = bookings
    .filter((b) => inWindow(b.created_at, from))
    .map(bookingResponseMs)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
  return median / (60 * 60 * 1000);
}

export function meanResponseHours(
  bookings: BookingRow[],
  windowDays = 30,
): number | null {
  const from = daysAgo(windowDays).getTime();
  const values = bookings
    .filter((b) => inWindow(b.created_at, from))
    .map(bookingResponseMs)
    .filter((v): v is number => v !== null);
  if (!values.length) return null;
  const total = values.reduce((s, v) => s + v, 0);
  return total / values.length / (60 * 60 * 1000);
}

export function acceptanceRate(
  bookings: BookingRow[],
  windowDays = 30,
): number | null {
  const from = daysAgo(windowDays).getTime();
  const seen = bookings.filter((b) => inWindow(b.created_at, from));
  if (!seen.length) return null;
  const acted = seen.filter((b) =>
    ["accepted", "in_progress", "delivered", "completed"].includes(b.status),
  ).length;
  return acted / seen.length;
}

export function cancellationRate(
  bookings: BookingRow[],
  windowDays = 30,
): number | null {
  const from = daysAgo(windowDays).getTime();
  const seen = bookings.filter((b) => inWindow(b.created_at, from));
  if (!seen.length) return null;
  const cancelled = seen.filter((b) => b.status === "cancelled").length;
  return cancelled / seen.length;
}

function parseDeliveryDays(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d+)\s*-?\s*(\d+)?/);
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = m[2] ? Number(m[2]) : lo;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return Math.max(lo, hi);
}

export function onTimeDeliveryRate(
  bookings: BookingRow[],
  servicesById: Record<string, ServiceRow>,
  windowDays = 30,
): number | null {
  const from = daysAgo(windowDays).getTime();
  const candidates = bookings.filter(
    (b) =>
      (b.status === "delivered" || b.status === "completed") &&
      inWindow(b.created_at, from),
  );
  if (!candidates.length) return null;
  let measured = 0;
  let onTime = 0;
  for (const b of candidates) {
    const svc = servicesById[b.service_id];
    const promised = parseDeliveryDays(svc?.default_delivery_time ?? null);
    if (promised === null) continue;
    const created = new Date(b.created_at).getTime();
    const updated = new Date(b.updated_at ?? b.created_at).getTime();
    if (!Number.isFinite(created) || !Number.isFinite(updated)) continue;
    measured += 1;
    const elapsedDays = (updated - created) / MS_PER_DAY;
    if (elapsedDays <= promised) onTime += 1;
  }
  return measured > 0 ? onTime / measured : null;
}

export function repeatBuyerShare(bookings: BookingRow[]): number | null {
  if (!bookings.length) return null;
  const counts = new Map<string, number>();
  for (const b of bookings) counts.set(b.buyer_id, (counts.get(b.buyer_id) ?? 0) + 1);
  const total = counts.size;
  if (!total) return null;
  let repeat = 0;
  counts.forEach((n) => {
    if (n > 1) repeat += 1;
  });
  return repeat / total;
}

export interface ActionInbox {
  pendingAcceptance: number;
  paidNotStarted: number;
  deliveredAwaitingBuyer: number;
  momoProofSubmitted: number;
  awaitingPayout: number;
}

export function actionInbox(bookings: BookingRow[]): ActionInbox {
  let pendingAcceptance = 0;
  let paidNotStarted = 0;
  let deliveredAwaitingBuyer = 0;
  let momoProofSubmitted = 0;
  let awaitingPayout = 0;
  for (const b of bookings) {
    if (b.status === "pending") pendingAcceptance += 1;
    if (
      b.payment_status === "paid" &&
      (b.status === "accepted" || b.status === "pending")
    ) {
      paidNotStarted += 1;
    }
    if (b.status === "delivered") deliveredAwaitingBuyer += 1;
    if (
      b.payment_method === "momo_manual" &&
      b.momo_submitted_at &&
      b.payment_status !== "paid"
    ) {
      momoProofSubmitted += 1;
    }
    if (
      b.status === "completed" &&
      b.payment_status === "released" &&
      !b.payout_status
    ) {
      awaitingPayout += 1;
    }
  }
  return {
    pendingAcceptance,
    paidNotStarted,
    deliveredAwaitingBuyer,
    momoProofSubmitted,
    awaitingPayout,
  };
}

export interface AgendaItem {
  booking: BookingRow;
  service?: ServiceRow;
  startsAt: Date;
}

export function nextSevenDayAgenda(
  bookings: BookingRow[],
  servicesById: Record<string, ServiceRow>,
  now = new Date(),
): AgendaItem[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const items: AgendaItem[] = [];
  for (const b of bookings) {
    if (b.status === "cancelled" || b.status === "completed") continue;
    if (!b.date) continue;
    const composed = b.time ? `${b.date}T${b.time}` : `${b.date}T00:00:00`;
    const startsAt = new Date(composed);
    if (!Number.isFinite(startsAt.getTime())) continue;
    if (startsAt < start || startsAt >= end) continue;
    items.push({ booking: b, service: servicesById[b.service_id], startsAt });
  }
  items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return items;
}

export function reviewRequestCandidates(
  bookings: BookingRow[],
  reviews: ReviewRow[],
  windowDays = 14,
): BookingRow[] {
  const from = daysAgo(windowDays).getTime();
  const reviewedKey = new Set(
    reviews
      .filter((r) => r.service_id)
      .map((r) => `${r.reviewer_id}:${r.service_id}`),
  );
  return bookings.filter((b) => {
    if (b.status !== "completed") return false;
    if (!inWindow(b.updated_at ?? b.created_at, from)) return false;
    return !reviewedKey.has(`${b.buyer_id}:${b.service_id}`);
  });
}

export interface ServiceHealthIssue {
  service: ServiceRow;
  reasons: string[];
}

export function serviceHealth(
  services: ServiceRow[],
  bookings: BookingRow[],
  views: ServiceViewRow[],
): ServiceHealthIssue[] {
  const from = daysAgo(30).getTime();
  const bookingsByService = new Map<string, number>();
  for (const b of bookings) {
    if (!inWindow(b.created_at, from)) continue;
    bookingsByService.set(
      b.service_id,
      (bookingsByService.get(b.service_id) ?? 0) + 1,
    );
  }
  const viewsByService = new Map<string, number>();
  for (const v of views) {
    if (!inWindow(v.viewed_at, from)) continue;
    viewsByService.set(v.service_id, (viewsByService.get(v.service_id) ?? 0) + 1);
  }

  const issues: ServiceHealthIssue[] = [];
  for (const s of services) {
    const reasons: string[] = [];
    if (!s.image_urls || s.image_urls.length === 0) reasons.push("No photos");
    if (s.is_verified === false && s.rejection_reason) {
      reasons.push(`Rejected: ${s.rejection_reason}`);
    } else if (s.is_verified === false) {
      reasons.push("Pending review");
    }
    if (s.is_verified === true && s.is_active === false) reasons.push("Paused");
    const bk = bookingsByService.get(s.id) ?? 0;
    const vw = viewsByService.get(s.id) ?? 0;
    if (s.is_verified === true && s.is_active !== false && bk === 0 && vw > 5) {
      reasons.push(`${vw} views, 0 bookings (30d)`);
    }
    if (reasons.length) issues.push({ service: s, reasons });
  }
  return issues;
}

export interface FunnelStats {
  views: number;
  requests: number;
  accepted: number;
  completed: number;
}

export function bookingFunnel(
  bookings: BookingRow[],
  views: ServiceViewRow[],
  windowDays = 30,
): FunnelStats {
  const from = daysAgo(windowDays).getTime();
  const inRange = bookings.filter((b) => inWindow(b.created_at, from));
  const v = views.filter((x) => inWindow(x.viewed_at, from)).length;
  const requests = inRange.length;
  const accepted = inRange.filter((b) =>
    ["accepted", "in_progress", "delivered", "completed"].includes(b.status),
  ).length;
  const completed = inRange.filter((b) => b.status === "completed").length;
  return { views: v, requests, accepted, completed };
}

export interface TopServiceRow {
  service: ServiceRow;
  views: number;
  bookings: number;
  conversion: number;
  revenue: number;
}

export function topServices(
  services: ServiceRow[],
  bookings: BookingRow[],
  views: ServiceViewRow[],
  windowDays = 30,
): TopServiceRow[] {
  const from = daysAgo(windowDays).getTime();
  const servicesById: Record<string, ServiceRow> = {};
  for (const s of services) servicesById[s.id] = s;

  const viewMap = new Map<string, number>();
  for (const v of views) {
    if (!inWindow(v.viewed_at, from)) continue;
    viewMap.set(v.service_id, (viewMap.get(v.service_id) ?? 0) + 1);
  }
  const bookingMap = new Map<string, number>();
  const revenueMap = new Map<string, number>();
  for (const b of bookings) {
    if (inWindow(b.created_at, from)) {
      bookingMap.set(b.service_id, (bookingMap.get(b.service_id) ?? 0) + 1);
    }
    if (
      b.payment_status === "released" &&
      inWindow(b.payment_released_at ?? b.updated_at ?? b.created_at, from)
    ) {
      const amt = bookingAmount(b, servicesById[b.service_id]);
      revenueMap.set(b.service_id, (revenueMap.get(b.service_id) ?? 0) + amt);
    }
  }

  return services
    .map((s) => {
      const v = viewMap.get(s.id) ?? 0;
      const bk = bookingMap.get(s.id) ?? 0;
      return {
        service: s,
        views: v,
        bookings: bk,
        conversion: v > 0 ? bk / v : 0,
        revenue: revenueMap.get(s.id) ?? 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings);
}

export interface WeeklyEarnings {
  weekStart: Date;
  label: string;
  amount: number;
}

export function weeklyEarnings(
  bookings: BookingRow[],
  servicesById: Record<string, ServiceRow>,
  weeks = 12,
  now = new Date(),
): WeeklyEarnings[] {
  const buckets: WeeklyEarnings[] = [];
  const thisWeek = startOfWeek(now);
  for (let i = weeks - 1; i >= 0; i--) {
    const wkStart = new Date(thisWeek);
    wkStart.setDate(wkStart.getDate() - i * 7);
    buckets.push({
      weekStart: wkStart,
      label: wkStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: 0,
    });
  }
  for (const b of bookings) {
    if (b.payment_status !== "released") continue;
    const releasedAt = new Date(
      b.payment_released_at ?? b.updated_at ?? b.created_at,
    );
    if (!Number.isFinite(releasedAt.getTime())) continue;
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (releasedAt >= buckets[i].weekStart) {
        buckets[i].amount += bookingAmount(b, servicesById[b.service_id]);
        break;
      }
    }
  }
  return buckets;
}

export function formatCurrency(value: number): string {
  return `GH\u20B5 ${value.toFixed(2)}`;
}

export function formatHours(value: number | null): string {
  if (value === null) return "—";
  if (value < 1) return `${Math.round(value * 60)} min`;
  if (value < 24) return `${value.toFixed(1)} hr`;
  return `${(value / 24).toFixed(1)} days`;
}

export function formatPercent(value: number | null, digits = 0): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}
