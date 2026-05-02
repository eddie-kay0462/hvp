import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, Star } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSellerInsights } from "@/hooks/useSellerInsights";
import {
  acceptanceRate,
  bookingFunnel,
  cancellationRate,
  conversion,
  formatCurrency,
  formatHours,
  formatPercent,
  meanResponseHours,
  onTimeDeliveryRate,
  topServices,
} from "@/lib/sellerMetrics";

const earningsChartConfig: ChartConfig = {
  amount: {
    label: "Earnings (GH\u20B5)",
    color: "hsl(var(--primary))",
  },
};

interface MetricTileProps {
  label: string;
  value: string;
  subtle?: string;
}

function MetricTile({ label, value, subtle }: MetricTileProps) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">
        {value}
      </p>
      {subtle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtle}</p>
      )}
    </div>
  );
}

export default function SellerInsights() {
  const { loading, data, metrics } = useSellerInsights();
  const [windowDays, setWindowDays] = useState<30 | 90>(30);

  const scoped = useMemo(() => {
    return {
      conversion: conversion(data.views, data.bookings, windowDays),
      acceptance: acceptanceRate(data.bookings, windowDays),
      cancellation: cancellationRate(data.bookings, windowDays),
      onTime: onTimeDeliveryRate(data.bookings, data.servicesById, windowDays),
      meanResponse: meanResponseHours(data.bookings, windowDays),
      funnel: bookingFunnel(data.bookings, data.views, windowDays),
      top: topServices(data.services, data.bookings, data.views, windowDays),
    };
  }, [data, windowDays]);

  const recentReviews = useMemo(
    () => data.reviews.slice(0, 5),
    [data.reviews],
  );

  if (loading) {
    return (
      <>
        <DashboardHeader
          title="Insights"
          subtitle="Loading your analytics..."
        />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  const ratingTotal = metrics.avgRating.count;
  const dist = metrics.ratingDistribution;
  const repeatShare = metrics.repeatBuyerShare;

  return (
    <>
      <DashboardHeader
        title="Insights"
        subtitle="How your listings are performing across visits, bookings, and reviews."
      />

      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            Showing the last {windowDays} days where applicable.
          </p>
          <Tabs
            value={String(windowDays)}
            onValueChange={(v) => setWindowDays(v === "90" ? 90 : 30)}
          >
            <TabsList>
              <TabsTrigger value="30">30 days</TabsTrigger>
              <TabsTrigger value="90">90 days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Earnings (last 12 weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.weeklyEarnings12.every((b) => b.amount === 0) ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No released payments in the last 12 weeks yet.
              </p>
            ) : (
              <ChartContainer
                config={earningsChartConfig}
                className="h-[260px] w-full"
              >
                <BarChart
                  data={metrics.weeklyEarnings12.map((b) => ({
                    week: b.label,
                    amount: b.amount,
                  }))}
                  margin={{ left: 8, right: 8, top: 8 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
                    }
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          formatCurrency(Number(value) || 0)
                        }
                      />
                    }
                  />
                  <Bar
                    dataKey="amount"
                    fill="var(--color-amount)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Booking funnel (last {windowDays}d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const f = scoped.funnel;
                const steps: { label: string; value: number; rate?: string }[] = [
                  { label: "Service views", value: f.views },
                  {
                    label: "Booking requests",
                    value: f.requests,
                    rate:
                      f.views > 0 ? formatPercent(f.requests / f.views, 1) : "—",
                  },
                  {
                    label: "Accepted+",
                    value: f.accepted,
                    rate:
                      f.requests > 0
                        ? formatPercent(f.accepted / f.requests, 1)
                        : "—",
                  },
                  {
                    label: "Completed",
                    value: f.completed,
                    rate:
                      f.accepted > 0
                        ? formatPercent(f.completed / f.accepted, 1)
                        : "—",
                  },
                ];
                const max = Math.max(1, ...steps.map((s) => s.value));
                return (
                  <div className="space-y-3">
                    {steps.map((s) => (
                      <div key={s.label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">
                            {s.label}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {s.value}
                            {s.rate && (
                              <span className="ml-2 text-xs">{s.rate}</span>
                            )}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${(s.value / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reliability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <MetricTile
                  label="Acceptance rate"
                  value={formatPercent(scoped.acceptance, 0)}
                  subtle="Bookings you acted on"
                />
                <MetricTile
                  label="Avg response"
                  value={formatHours(scoped.meanResponse)}
                  subtle="Time to first action"
                />
                <MetricTile
                  label="On-time delivery"
                  value={formatPercent(scoped.onTime, 0)}
                  subtle="Within stated delivery time"
                />
                <MetricTile
                  label="Cancellation rate"
                  value={formatPercent(scoped.cancellation, 0)}
                  subtle="Lower is better"
                />
                <MetricTile
                  label="Conversion"
                  value={
                    scoped.conversion.views > 0
                      ? formatPercent(scoped.conversion.rate, 1)
                      : "—"
                  }
                  subtle={`${scoped.conversion.views} views`}
                />
                <MetricTile
                  label="Repeat buyers"
                  value={formatPercent(repeatShare, 0)}
                  subtle="Booked you more than once"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top services (last {windowDays}d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoped.top.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No services to rank yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoped.top.slice(0, 8).map((row) => (
                    <TableRow key={row.service.id}>
                      <TableCell className="font-medium max-w-[16rem] truncate">
                        {row.service.title}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.views}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.bookings}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.views > 0
                          ? formatPercent(row.conversion, 1)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(row.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              {ratingTotal === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No reviews yet.
                </p>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-foreground tabular-nums">
                      {metrics.avgRating.average.toFixed(1)}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-4 w-4 ${n <= Math.round(metrics.avgRating.average) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {ratingTotal} review{ratingTotal === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {([5, 4, 3, 2, 1] as const).map((n) => {
                      const count = dist[n];
                      const pct = ratingTotal > 0 ? count / ratingTotal : 0;
                      return (
                        <div key={n} className="flex items-center gap-3 text-xs">
                          <span className="w-3 text-muted-foreground">{n}</span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-400"
                              style={{ width: `${pct * 100}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-muted-foreground tabular-nums">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-3 pt-1">
                    {recentReviews.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {r.review_text && (
                          <p className="mt-2 text-sm text-foreground/90 leading-relaxed">
                            {r.review_text}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Service health</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.serviceHealth.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No issues flagged. Listings look healthy.
                </p>
              ) : (
                <div className="space-y-3">
                  {metrics.serviceHealth.map((issue) => (
                    <div
                      key={issue.service.id}
                      className="rounded-lg border border-border p-3"
                    >
                      <p className="text-sm font-medium text-foreground truncate">
                        {issue.service.title}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {issue.reasons.map((reason) => (
                          <Badge
                            key={reason}
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
