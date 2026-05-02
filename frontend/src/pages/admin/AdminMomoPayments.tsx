import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, CheckCircle, XCircle, ExternalLink, Smartphone } from "lucide-react";

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

export default function AdminMomoPayments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingRow[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
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

  useEffect(() => {
    load();
  }, []);

  const approve = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const response: any = await api.admin.verifyMomoPayment(bookingId, true);
      if (response.status === 200) {
        toast.success("Payment verified");
        await load();
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
        await load();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              Match MoMo transaction IDs and screenshots against incoming payments, then approve or ask the buyer to
              resubmit.
            </p>
          </div>
          <Button variant="outline" onClick={() => load()} className="w-full sm:w-auto shrink-0 min-h-10">
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending proofs ({items.length})</CardTitle>
            <CardDescription>Bookings with payment_status = pending_review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
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
                      <span className="font-medium text-foreground">
                        GH₵ {Number(row.payment_amount || 0).toFixed(2)}
                      </span>
                    </p>
                    <p className="font-mono text-xs break-all">
                      Txn ID: {row.momo_transaction_id || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted:{" "}
                      {row.momo_submitted_at
                        ? new Date(row.momo_submitted_at).toLocaleString()
                        : "—"}
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

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject proof</DialogTitle>
              <DialogDescription>
                The buyer will be able to pay again with a new transaction ID and screenshot.
              </DialogDescription>
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
