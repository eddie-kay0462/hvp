import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  ImageOff,
  Loader2,
  MessageSquareWarning,
  PauseCircle,
  Receipt,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSellerInsights } from "@/hooks/useSellerInsights";
import {
  formatCurrency,
  formatHours,
  formatPercent,
} from "@/lib/sellerMetrics";

interface InboxItem {
  key: string;
  label: string;
  count: number;
  href: string;
  icon: typeof Calendar;
  tone: "default" | "primary" | "warning" | "success";
}

const toneClasses: Record<InboxItem["tone"], string> = {
  default: "bg-muted text-foreground",
  primary: "bg-primary/10 text-primary",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

interface KpiCardProps {
  label: string;
  value: string;
  caption?: string;
  icon: typeof Calendar;
}

function KpiCard({ label, value, caption, icon: Icon }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground tabular-nums truncate">
              {value}
            </p>
            {caption && (
              <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
            )}
          </div>
          <div className="rounded-lg bg-muted p-2.5 shrink-0">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const statusBadgeVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "default",
  accepted: "secondary",
  in_progress: "secondary",
  delivered: "default",
  completed: "outline",
  cancelled: "destructive",
};

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { loading, data, metrics } = useSellerInsights();

  const inboxItems = useMemo<InboxItem[]>(() => {
    const a = metrics.actionInbox;
    return [
      {
        key: "pending",
        label: "Pending acceptance",
        count: a.pendingAcceptance,
        href: "/seller/bookings?status=new",
        icon: AlertCircle,
        tone: "primary",
      },
      {
        key: "paid",
        label: "Paid — start work",
        count: a.paidNotStarted,
        href: "/seller/bookings?status=in_progress",
        icon: TrendingUp,
        tone: "warning",
      },
      {
        key: "delivered",
        label: "Delivered — awaiting buyer",
        count: a.deliveredAwaitingBuyer,
        href: "/seller/bookings?status=in_progress",
        icon: CheckCircle2,
        tone: "success",
      },
      {
        key: "momo",
        label: "MoMo proof submitted",
        count: a.momoProofSubmitted,
        href: "/seller/bookings",
        icon: Receipt,
        tone: "default",
      },
      {
        key: "payout",
        label: "Awaiting payout",
        count: a.awaitingPayout,
        href: "/seller/payments",
        icon: Wallet,
        tone: "default",
      },
    ];
  }, [metrics.actionInbox]);

  const reviewCandidates = useMemo(() => {
    return metrics.reviewCandidates.slice(0, 4).map((b) => {
      const buyer = data.buyersById[b.buyer_id];
      const buyerName =
        [buyer?.first_name, buyer?.last_name].filter(Boolean).join(" ") ||
        "Buyer";
      const service = data.servicesById[b.service_id];
      return {
        id: b.id,
        buyerName,
        serviceTitle: service?.title || "Service",
        bookingUrl: `${window.location.origin}/booking/${b.id}`,
      };
    });
  }, [metrics.reviewCandidates, data.buyersById, data.servicesById]);

  const agendaByDay = useMemo(() => {
    const groups = new Map<string, typeof metrics.agendaNext7>();
    for (const item of metrics.agendaNext7) {
      const key = item.startsAt.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries());
  }, [metrics.agendaNext7]);

  const greetingName = data.sellerName || "there";

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Booking link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  if (loading) {
    return (
      <>
        <DashboardHeader
          title="Loading..."
          subtitle="Fetching your dashboard data"
        />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        title={`Hi, ${greetingName}`}
        subtitle="What needs your attention and how things are going."
      />

      <div className="p-4 md:p-6 space-y-6">
        <section
          aria-label="Key metrics"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4"
        >
          <KpiCard
            label="Earnings (this month)"
            value={formatCurrency(metrics.earningsThisMonth)}
            caption="Released payments only"
            icon={Wallet}
          />
          <KpiCard
            label="Bookings (this month)"
            value={metrics.bookingsThisMonth.toString()}
            caption="New bookings created"
            icon={Calendar}
          />
          <KpiCard
            label="Avg rating"
            value={
              metrics.avgRating.count > 0
                ? metrics.avgRating.average.toFixed(1)
                : "—"
            }
            caption={
              metrics.avgRating.count > 0
                ? `${metrics.avgRating.count} review${metrics.avgRating.count === 1 ? "" : "s"}`
                : "No reviews yet"
            }
            icon={Star}
          />
          <KpiCard
            label="Conversion (30d)"
            value={
              metrics.conversion30d.views > 0
                ? formatPercent(metrics.conversion30d.rate, 1)
                : "—"
            }
            caption={`${metrics.conversion30d.views} views → ${metrics.conversion30d.bookings} bookings`}
            icon={Eye}
          />
          <KpiCard
            label="Median response"
            value={formatHours(metrics.medianResponseHours)}
            caption="Time to first action"
            icon={Clock}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Action inbox</CardTitle>
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => navigate("/seller/insights")}
              >
                View insights
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {inboxItems.every((i) => i.count === 0) ? (
                <p className="text-sm text-muted-foreground py-2">
                  Nothing waiting on you right now.
                </p>
              ) : (
                inboxItems.map((item) => {
                  const Icon = item.icon;
                  const muted = item.count === 0;
                  return (
                    <button
                      key={item.key}
                      onClick={() => navigate(item.href)}
                      className="group w-full flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:border-foreground/20 hover:bg-muted/40 disabled:opacity-60"
                      disabled={muted}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses[item.tone]}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={muted ? "secondary" : "default"}>
                          {item.count}
                        </Badge>
                        {!muted && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Next 7 days</CardTitle>
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => navigate("/seller/bookings")}
              >
                All bookings
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {agendaByDay.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No bookings scheduled this week.
                </p>
              ) : (
                <div className="space-y-4">
                  {agendaByDay.map(([day, items]) => (
                    <div key={day}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {day}
                      </p>
                      <div className="space-y-2">
                        {items.map((item) => {
                          const buyer = data.buyersById[item.booking.buyer_id];
                          const buyerName =
                            [buyer?.first_name, buyer?.last_name]
                              .filter(Boolean)
                              .join(" ") || "Buyer";
                          const time = item.booking.time
                            ? item.startsAt.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "Anytime";
                          return (
                            <button
                              key={item.booking.id}
                              onClick={() =>
                                navigate(`/booking/${item.booking.id}`)
                              }
                              className="w-full flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left hover:border-foreground/20 hover:bg-muted/40 transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {item.service?.title || "Service"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {buyerName} · {time}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  statusBadgeVariants[item.booking.status] ||
                                  "default"
                                }
                              >
                                {item.booking.status.replace("_", " ")}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ask buyers for a review</CardTitle>
            </CardHeader>
            <CardContent>
              {reviewCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No completed bookings waiting on a review.
                </p>
              ) : (
                <div className="space-y-2">
                  {reviewCandidates.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.buyerName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.serviceTitle}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => handleCopyLink(c.bookingUrl)}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        Copy link
                      </Button>
                    </div>
                  ))}
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
                <p className="text-sm text-muted-foreground py-2">
                  Listings look healthy. Nothing flagged right now.
                </p>
              ) : (
                <div className="space-y-2">
                  {metrics.serviceHealth.slice(0, 5).map((issue) => (
                    <button
                      key={issue.service.id}
                      onClick={() => navigate("/seller/services")}
                      className="w-full flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-left hover:border-foreground/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {issue.service.title}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {issue.reasons.map((reason) => {
                            const Icon = reason.startsWith("No photos")
                              ? ImageOff
                              : reason.startsWith("Paused")
                                ? PauseCircle
                                : reason.startsWith("Pending review") ||
                                    reason.startsWith("Rejected")
                                  ? MessageSquareWarning
                                  : AlertCircle;
                            return (
                              <span
                                key={reason}
                                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
                              >
                                <Icon className="h-3 w-3" />
                                {reason}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </button>
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
