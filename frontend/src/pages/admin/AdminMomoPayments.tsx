import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, CheckCircle, XCircle, ExternalLink, Smartphone, History } from "lucide-react";

interface PendingRow {
  id: string;
  buyer_id: string;
  payment_amount: number | null;
  momo_transaction_id: string | null;
  payment_proof_url: string | null;
  momo_submitted_at: string | null;
  created_at: string | null;
  service?: { id: string; title: string } | null;
  buyer?: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
}

interface HistoryEvent {
  id: string;
  booking_id: string;
  event_type: string;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  booking?: {
    id: string;
    payment_amount: number | null;
    payment_status: string | null;
    momo_transaction_id: string | null;
    service?: { id: string; title: string } | null;
  } | null;
  buyer?: { first_name: string | null; last_name: string | null; email: string | null } | null;
  proof_signed_url?: string | null;
}

export default function AdminMomoPayments() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"queue" | "history">("queue");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingRow[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [historyHint, setHistoryHint] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string>("");

  const loadQueue = async () => {
    setLoading(true);
    try {
      const response: any = await api.admin.getPendingMomoPayments();
      if (response.status === 200) {
        setItems(response.data || []);
      } else {
        toast.error(response.msg || "Failed to load queue");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryHint(null);
    try {
      const response: any = await api.admin.getMomoPaymentHistory({
        limit: 80,
        offset: 0,
        event_type: historyFilter || undefined,
      });
      if (response.status === 200) {
        setHistoryEvents(response.data?.events || []);
        setHistoryHint(response.data?.hint || null);
      } else {
        toast.error(response.msg || "Failed to load history");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    if (tab === "history") {
      loadHistory();
    }
  }, [tab, historyFilter]);

  const approve = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const response: any = await api.admin.verifyMomoPayment(bookingId, true);
      if (response.status === 200) {
        toast.success("Payment verified");
        await loadQueue();
        if (tab === "history") await loadHistory();
      } else {
        toast.error(response.msg || "Failed to verify");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to verify");
    } finally {
      setActionLoading(null);
    }
  };

  const openReject = (bookingId: string) => {
    setSelectedId(bookingId);
    setRejectReason("");
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!selectedId) return;
    const note = rejectReason.trim() || "Could not verify payment. Please resubmit.";
    setActionLoading(selectedId);
    try {
      const response: any = await api.admin.verifyMomoPayment(selectedId, false, note);
      if (response.status === 200) {
        toast.success("Buyer can submit proof again");
        setRejectOpen(false);
        await loadQueue();
        if (tab === "history") await loadHistory();
      } else {
        toast.error(response.msg || "Failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const buyerLabel = (row: PendingRow) => {
    const b = row.buyer;
    if (!b) return "Buyer";
    const name = `${b.first_name || ""} ${b.last_name || ""}`.trim();
    return name || b.email || row.buyer_id.slice(0, 8);
  };

  const historyBuyerLabel = (ev: HistoryEvent) => {
    const b = ev.buyer;
    if (!b) return "—";
    const name = `${b.first_name || ""} ${b.last_name || ""}`.trim();
    return name || b.email || "Buyer";
  };

  const eventBadgeClass = (t: string) => {
    if (t === "approved") return "bg-green-100 text-green-800";
    if (t === "rejected") return "bg-red-100 text-red-800";
    return "bg-blue-100 text-blue-800";
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-4 md:px-6 md:pt-6 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <Button variant="ghost" className="mb-2 -ml-2 gap-2" onClick={() => navigate("/admin/services/pending")}>
              <ArrowLeft className="h-4 w-4" />
              Service approvals
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold flex flex-wrap items-center gap-2">
              <Smartphone className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" />
              Mobile Money verification
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Review the queue, then use <strong>History</strong> for past submissions and decisions (standard marketplace
              audit trail).
            </p>
          </div>
          <Button variant="outline" onClick={() => (tab === "queue" ? loadQueue() : loadHistory())} className="w-full sm:w-auto shrink-0 min-h-10">
            Refresh
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "queue" | "history")} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="queue" className="gap-1">
              Queue
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending proofs ({loading ? "…" : items.length})</CardTitle>
                <CardDescription>Bookings with payment_status = pending_review</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No payments awaiting verification.</p>
                ) : (
                  items.map((row) => (
                    <div
                      key={row.id}
                      className="border rounded-lg p-4 flex flex-col md:flex-row md:items-start gap-4 md:justify-between overflow-hidden"
                    >
                      <div className="space-y-1 text-sm min-w-0 flex-1">
                        <p className="font-semibold">{row.service?.title || "Service"}</p>
                        <p className="text-muted-foreground">
                          Buyer: {buyerLabel(row)}
                          {row.buyer?.email ? ` · ${row.buyer.email}` : ""}
                        </p>
                        <p>
                          Amount:{" "}
                          <span className="font-medium text-foreground">GH₵ {Number(row.payment_amount || 0).toFixed(2)}</span>
                        </p>
                        <p className="font-mono text-xs break-all">Txn ID: {row.momo_transaction_id || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {row.momo_submitted_at ? new Date(row.momo_submitted_at).toLocaleString() : "—"}
                        </p>
                        {row.payment_proof_url ? (
                          <a
                            href={row.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline"
                          >
                            View receipt screenshot <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="text-xs text-destructive">No screenshot URL</p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full md:w-auto">
                        <Button
                          size="sm"
                          className="gap-1 min-h-10 w-full sm:w-auto justify-center"
                          disabled={actionLoading === row.id}
                          onClick={() => approve(row.id)}
                        >
                          {actionLoading === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 min-h-10 w-full sm:w-auto justify-center"
                          disabled={actionLoading === row.id}
                          onClick={() => openReject(row.id)}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
                <div>
                  <CardTitle>Verification log</CardTitle>
                  <CardDescription>Submissions and admin decisions (newest first). Run DB migration if empty.</CardDescription>
                </div>
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-background min-h-10 max-w-full sm:max-w-[200px]"
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                >
                  <option value="">All events</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </CardHeader>
              <CardContent>
                {historyHint && (
                  <p className="text-sm text-amber-700 dark:text-amber-400 mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/40">
                    {historyHint}
                  </p>
                )}
                {historyLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : historyEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No events yet. History is recorded from new proof submissions onward.</p>
                ) : (
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-3 font-medium">When</th>
                          <th className="pb-2 pr-3 font-medium">Event</th>
                          <th className="pb-2 pr-3 font-medium">Service / booking</th>
                          <th className="pb-2 pr-3 font-medium">Buyer</th>
                          <th className="pb-2 pr-3 font-medium">Amount</th>
                          <th className="pb-2 font-medium">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyEvents.map((ev) => (
                          <tr key={ev.id} className="border-b border-border/60 align-top">
                            <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                              {new Date(ev.created_at).toLocaleString()}
                            </td>
                            <td className="py-2 pr-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${eventBadgeClass(ev.event_type)}`}>
                                {ev.event_type}
                              </span>
                            </td>
                            <td className="py-2 pr-3 min-w-[140px]">
                              <div className="font-medium">{ev.booking?.service?.title || "—"}</div>
                              <div className="text-xs text-muted-foreground font-mono">{ev.booking_id.slice(0, 8)}…</div>
                              {ev.booking?.payment_status && (
                                <div className="text-xs text-muted-foreground">Now: {ev.booking.payment_status}</div>
                              )}
                            </td>
                            <td className="py-2 pr-3">{historyBuyerLabel(ev)}</td>
                            <td className="py-2 pr-3">GH₵ {Number(ev.booking?.payment_amount ?? (ev.metadata as { payment_amount?: number })?.payment_amount ?? 0).toFixed(2)}</td>
                            <td className="py-2">
                              {ev.proof_signed_url ? (
                                <a
                                  href={ev.proof_signed_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary inline-flex items-center gap-1 hover:underline"
                                >
                                  Open <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject proof</DialogTitle>
              <DialogDescription>The buyer will be able to pay again with a new transaction ID and screenshot.</DialogDescription>
            </DialogHeader>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason shown to the buyer (optional)"
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => confirmReject()} disabled={!!actionLoading}>
                Confirm reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
