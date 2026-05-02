import { useMemo } from "react";
import { Clock, DollarSign, Download, Loader2, TrendingUp } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useSellerInsights } from "@/hooks/useSellerInsights";
import { bookingAmount, formatCurrency } from "@/lib/sellerMetrics";
import { downloadCsv, rowsToCsv } from "@/lib/csv";

interface EarningsRow {
  id: string;
  date: string;
  bookingId: string;
  serviceTitle: string;
  buyerName: string;
  amount: number;
  paymentMethod: string;
  payoutStatus: string;
  rawDate: Date;
}

interface SecureHoldRow {
  id: string;
  bookingId: string;
  buyerName: string;
  amount: number;
  status: string;
  expectedRelease: string;
}

interface PerServiceRow {
  serviceId: string;
  serviceTitle: string;
  completedCount: number;
  released: number;
}

export default function SellerPayments() {
  const { loading, data, metrics } = useSellerInsights();

  const { earningsHistory, secureHold, perService, totals } = useMemo(() => {
    const { bookings, servicesById, buyersById } = data;

    let availableToWithdraw = 0;
    let heldSecurely = 0;
    let earnedThisMonth = metrics.earningsThisMonth;

    const earnings: EarningsRow[] = [];
    const hold: SecureHoldRow[] = [];
    const perServiceMap = new Map<string, PerServiceRow>();

    for (const b of bookings) {
      const svc = servicesById[b.service_id];
      const amt = bookingAmount(b, svc);
      const buyer = buyersById[b.buyer_id];
      const buyerName =
        [buyer?.first_name, buyer?.last_name].filter(Boolean).join(" ") ||
        "Unknown";

      if (b.payment_status === "released") {
        availableToWithdraw += amt;
        const releasedAt = b.payment_released_at ?? b.updated_at ?? b.created_at;
        earnings.push({
          id: b.id,
          date: new Date(releasedAt).toLocaleDateString(),
          bookingId: `${b.id.slice(0, 8)}…`,
          serviceTitle: svc?.title || "Unknown service",
          buyerName,
          amount: amt,
          paymentMethod:
            b.payment_method === "momo_manual"
              ? "MoMo"
              : b.payment_method === "paystack"
                ? "Paystack"
                : "—",
          payoutStatus: b.payout_status === "sent" ? "Paid out" : "Pending payout",
          rawDate: new Date(releasedAt),
        });

        const existing = perServiceMap.get(b.service_id);
        if (existing) {
          existing.completedCount += 1;
          existing.released += amt;
        } else {
          perServiceMap.set(b.service_id, {
            serviceId: b.service_id,
            serviceTitle: svc?.title || "Unknown service",
            completedCount: 1,
            released: amt,
          });
        }
      } else if (b.payment_status === "paid") {
        heldSecurely += amt;
        let status = "Funded";
        if (b.status === "delivered") status = "Awaiting buyer confirmation";
        else if (b.status === "in_progress") status = "Work in progress";

        const releaseEstimate = new Date(b.created_at);
        releaseEstimate.setDate(releaseEstimate.getDate() + 7);

        hold.push({
          id: b.id,
          bookingId: `${b.id.slice(0, 8)}…`,
          buyerName,
          amount: amt,
          status,
          expectedRelease:
            b.status === "delivered"
              ? "Pending buyer confirmation"
              : releaseEstimate.toLocaleDateString(),
        });
      }
    }

    earnings.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    return {
      earningsHistory: earnings,
      secureHold: hold.slice(0, 10),
      perService: Array.from(perServiceMap.values()).sort(
        (a, b) => b.released - a.released,
      ),
      totals: {
        availableToWithdraw,
        heldSecurely,
        earnedThisMonth,
      },
    };
  }, [data, metrics.earningsThisMonth]);

  const handleExport = () => {
    if (earningsHistory.length === 0) {
      toast.info("No earnings to export yet.");
      return;
    }
    const csv = rowsToCsv(
      [
        "Date",
        "Booking ID",
        "Service",
        "Buyer",
        "Amount (GHS)",
        "Payment Method",
        "Payout Status",
      ],
      earningsHistory.map((row) => [
        row.date,
        row.bookingId,
        row.serviceTitle,
        row.buyerName,
        row.amount.toFixed(2),
        row.paymentMethod,
        row.payoutStatus,
      ]),
    );
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`hustle-village-earnings-${today}.csv`, csv);
  };

  if (loading) {
    return (
      <>
        <DashboardHeader
          title="Payments & Earnings"
          subtitle="Loading your payment data..."
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
        title="Payments & Earnings"
        subtitle="Track your income, funds held securely, and payment history"
      />

      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <StatCard
            title="Available to Withdraw"
            value={formatCurrency(totals.availableToWithdraw)}
            icon={DollarSign}
            iconBgColor="bg-primary/10"
          />
          <StatCard
            title="Held securely"
            value={formatCurrency(totals.heldSecurely)}
            icon={Clock}
            iconBgColor="bg-secondary-accent/20"
          />
          <StatCard
            title="Total Earned This Month"
            value={formatCurrency(totals.earnedThisMonth)}
            icon={TrendingUp}
            trend={{
              value:
                totals.earnedThisMonth > 0 ? "This month" : "No earnings yet",
              isPositive: totals.earnedThisMonth > 0,
            }}
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Earnings History</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={earningsHistory.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {earningsHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No earnings history yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earningsHistory.slice(0, 25).map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell>{earning.date}</TableCell>
                      <TableCell className="font-medium">
                        {earning.bookingId}
                      </TableCell>
                      <TableCell className="max-w-[18rem] truncate">
                        {earning.serviceTitle}
                      </TableCell>
                      <TableCell className="font-medium text-primary tabular-nums">
                        {formatCurrency(earning.amount)}
                      </TableCell>
                      <TableCell>{earning.paymentMethod}</TableCell>
                      <TableCell>
                        <span
                          className={`text-sm ${earning.payoutStatus === "Paid out" ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}
                        >
                          {earning.payoutStatus}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funds held securely</CardTitle>
          </CardHeader>
          <CardContent>
            {secureHold.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No funds held securely right now
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Hold status</TableHead>
                    <TableHead>Expected Release</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {secureHold.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.bookingId}
                      </TableCell>
                      <TableCell>{item.buyerName}</TableCell>
                      <TableCell className="font-medium tabular-nums">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-emerald-700 dark:text-emerald-400">
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.expectedRelease}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by service</CardTitle>
          </CardHeader>
          <CardContent>
            {perService.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No released revenue to break down yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Total released</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perService.map((row) => (
                    <TableRow key={row.serviceId}>
                      <TableCell className="font-medium max-w-[20rem] truncate">
                        {row.serviceTitle}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.completedCount}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(row.released)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button size="lg" className="gap-2" disabled>
            <DollarSign className="h-4 w-4" />
            Withdraw Funds
          </Button>
        </div>
      </div>
    </>
  );
}
