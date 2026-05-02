import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  acceptanceRate,
  actionInbox,
  averageRating,
  bookingFunnel,
  bookingsThisMonth,
  cancellationRate,
  conversion,
  earningsThisMonth,
  meanResponseHours,
  medianResponseHours,
  nextSevenDayAgenda,
  onTimeDeliveryRate,
  ratingDistribution,
  repeatBuyerShare,
  reviewRequestCandidates,
  serviceHealth,
  topServices,
  weeklyEarnings,
  type BookingRow,
  type ReviewRow,
  type ServiceRow,
  type ServiceViewRow,
} from "@/lib/sellerMetrics";

const VIEW_LOOKBACK_DAYS = 90;

interface BuyerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface SellerInsightsData {
  services: ServiceRow[];
  bookings: BookingRow[];
  reviews: ReviewRow[];
  views: ServiceViewRow[];
  buyersById: Record<string, BuyerProfile>;
  servicesById: Record<string, ServiceRow>;
  sellerName: string | null;
}

async function fetchSellerInsights(userId: string): Promise<SellerInsightsData> {
  const [profileRes, servicesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("services")
      .select(
        "id, user_id, title, category, default_price, default_delivery_time, is_active, is_verified, image_urls, rejection_reason, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const services = (servicesRes.data || []) as ServiceRow[];
  const serviceIds = services.map((s) => s.id);

  const sellerName = profileRes.data
    ? [profileRes.data.first_name, profileRes.data.last_name]
        .filter(Boolean)
        .join(" ") || null
    : null;

  if (serviceIds.length === 0) {
    return {
      services,
      bookings: [],
      reviews: [],
      views: [],
      buyersById: {},
      servicesById: {},
      sellerName,
    };
  }

  const viewsFrom = new Date(
    Date.now() - VIEW_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [bookingsRes, reviewsRes, viewsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, buyer_id, service_id, status, payment_status, payment_amount, payment_method, payment_released_at, momo_submitted_at, payout_status, date, time, created_at, updated_at",
      )
      .in("service_id", serviceIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select(
        "id, reviewer_id, reviewee_id, service_id, rating, review_text, created_at",
      )
      .eq("reviewee_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("service_views")
      .select("id, service_id, viewer_id, viewed_at")
      .in("service_id", serviceIds)
      .gte("viewed_at", viewsFrom),
  ]);

  const bookings = (bookingsRes.data || []) as BookingRow[];
  const reviews = (reviewsRes.data || []) as ReviewRow[];
  const views = (viewsRes.data || []) as ServiceViewRow[];

  const buyerIds = Array.from(new Set(bookings.map((b) => b.buyer_id)));
  let buyersById: Record<string, BuyerProfile> = {};
  if (buyerIds.length > 0) {
    const { data: buyers } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", buyerIds);
    if (buyers) {
      buyersById = Object.fromEntries(
        buyers.map((b) => [b.id, b as BuyerProfile]),
      );
    }
  }

  const servicesById: Record<string, ServiceRow> = {};
  for (const s of services) servicesById[s.id] = s;

  return {
    services,
    bookings,
    reviews,
    views,
    buyersById,
    servicesById,
    sellerName,
  };
}

export interface SellerInsightsResult {
  loading: boolean;
  error: unknown;
  refetch: () => void;
  data: SellerInsightsData;
  metrics: {
    earningsThisMonth: number;
    bookingsThisMonth: number;
    avgRating: { average: number; count: number };
    ratingDistribution: ReturnType<typeof ratingDistribution>;
    conversion30d: ReturnType<typeof conversion>;
    medianResponseHours: number | null;
    meanResponseHours: number | null;
    acceptanceRate30d: number | null;
    cancellationRate30d: number | null;
    onTimeRate30d: number | null;
    repeatBuyerShare: number | null;
    actionInbox: ReturnType<typeof actionInbox>;
    agendaNext7: ReturnType<typeof nextSevenDayAgenda>;
    reviewCandidates: ReturnType<typeof reviewRequestCandidates>;
    serviceHealth: ReturnType<typeof serviceHealth>;
    funnel30d: ReturnType<typeof bookingFunnel>;
    topServices30d: ReturnType<typeof topServices>;
    weeklyEarnings12: ReturnType<typeof weeklyEarnings>;
  };
}

const EMPTY_DATA: SellerInsightsData = {
  services: [],
  bookings: [],
  reviews: [],
  views: [],
  buyersById: {},
  servicesById: {},
  sellerName: null,
};

export function useSellerInsights(): SellerInsightsResult {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["seller-insights", userId],
    queryFn: () => fetchSellerInsights(userId as string),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const data = query.data ?? EMPTY_DATA;

  const metrics = useMemo(() => {
    const { services, bookings, reviews, views, servicesById } = data;
    return {
      earningsThisMonth: earningsThisMonth(bookings, servicesById),
      bookingsThisMonth: bookingsThisMonth(bookings),
      avgRating: averageRating(reviews),
      ratingDistribution: ratingDistribution(reviews),
      conversion30d: conversion(views, bookings, 30),
      medianResponseHours: medianResponseHours(bookings, 30),
      meanResponseHours: meanResponseHours(bookings, 30),
      acceptanceRate30d: acceptanceRate(bookings, 30),
      cancellationRate30d: cancellationRate(bookings, 30),
      onTimeRate30d: onTimeDeliveryRate(bookings, servicesById, 30),
      repeatBuyerShare: repeatBuyerShare(bookings),
      actionInbox: actionInbox(bookings),
      agendaNext7: nextSevenDayAgenda(bookings, servicesById),
      reviewCandidates: reviewRequestCandidates(bookings, reviews, 14),
      serviceHealth: serviceHealth(services, bookings, views),
      funnel30d: bookingFunnel(bookings, views, 30),
      topServices30d: topServices(services, bookings, views, 30),
      weeklyEarnings12: weeklyEarnings(bookings, servicesById, 12),
    };
  }, [data]);

  return {
    loading: query.isLoading,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
    data,
    metrics,
  };
}
