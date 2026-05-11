import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, ArrowLeft, Copy, CheckCircle2, Banknote } from 'lucide-react';

interface PendingPayout {
  id: string;
  payment_amount: number | null;
  payment_released_at: string | null;
  payout_status: string | null;
  service: { title: string; user_id: string } | null;
  seller: { first_name: string | null; last_name: string | null; phone: string | null } | null;
}

export default function AdminPayoutQueue() {
  const navigate = useNavigate();
  const [payouts, setPayouts] = useState<PendingPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<PendingPayout | null>(null);
  const [txnId, setTxnId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const result = await (api.admin as any).getPendingPayouts() as any;
      if (result.status === 200) {
        setPayouts(result.data || []);
      } else {
        toast.error(result.msg || 'Failed to load payouts');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (payout: PendingPayout) => {
    setSelectedPayout(payout);
    setTxnId('');
    setProofFile(null);
  };

  const handleConfirmPayout = async () => {
    if (!selectedPayout) return;
    if (txnId.trim().length < 4) {
      toast.error('Enter the transaction ID from your MoMo receipt');
      return;
    }
    if (!proofFile) {
      toast.error('Attach a screenshot of your payment receipt');
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('payoutTransactionId', txnId.trim());
      fd.append('proof', proofFile);
      const res = await (api.admin as any).confirmPayout(selectedPayout.id, fd) as any;
      if (res.status === 200) {
        toast.success('Payout confirmed');
        setSelectedPayout(null);
        fetchPayouts();
      } else {
        toast.error(res.msg || 'Failed to confirm payout');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to confirm payout');
    } finally {
      setSubmitting(false);
    }
  };

  const getSellerName = (p: PendingPayout) => {
    if (!p.seller) return 'Unknown';
    return [p.seller.first_name, p.seller.last_name].filter(Boolean).join(' ') || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Payout Queue</h1>
            <p className="text-sm text-muted-foreground">
              Bookings completed and waiting for seller payout
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto text-base px-3 py-1">
            {payouts.length} pending
          </Badge>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : payouts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
              <p className="font-medium">All payouts are up to date</p>
              <p className="text-sm mt-1">No pending payouts at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>MoMo number</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Released</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}…</TableCell>
                        <TableCell className="max-w-[160px] truncate">{p.service?.title || '—'}</TableCell>
                        <TableCell>{getSellerName(p)}</TableCell>
                        <TableCell>
                          {p.seller?.phone ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-sm">{p.seller.phone}</span>
                              <button
                                className="p-1 rounded hover:bg-muted"
                                onClick={() => {
                                  void navigator.clipboard.writeText(p.seller!.phone!);
                                  toast.success('Copied');
                                }}
                              >
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Not on file</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-green-700">
                          GH₵ {Number(p.payment_amount ?? 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.payment_released_at
                            ? new Date(p.payment_released_at).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => openDialog(p)}>
                            <Banknote className="h-3.5 w-3.5 mr-1.5" />
                            Pay out
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Mobile */}
            <div className="md:hidden space-y-3">
              {payouts.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{p.service?.title || 'Unknown service'}</CardTitle>
                    <CardDescription className="font-mono text-xs">{p.id.slice(0, 8)}…</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Seller</span>
                        <span>{getSellerName(p)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">MoMo</span>
                        {p.seller?.phone ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono">{p.seller.phone}</span>
                            <button
                              className="p-1 rounded hover:bg-muted"
                              onClick={() => {
                                void navigator.clipboard.writeText(p.seller!.phone!);
                                toast.success('Copied');
                              }}
                            >
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not on file</span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-semibold text-green-700">
                          GH₵ {Number(p.payment_amount ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => openDialog(p)}>
                      <Banknote className="h-4 w-4 mr-2" />
                      Pay out
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={!!selectedPayout} onOpenChange={(open) => { if (!open) setSelectedPayout(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payout</DialogTitle>
            <DialogDescription>
              Send GH₵ {Number(selectedPayout?.payment_amount ?? 0).toFixed(2)} to{' '}
              {getSellerName(selectedPayout!)} at{' '}
              <span className="font-mono">{selectedPayout?.seller?.phone || 'unknown number'}</span>,
              then record the transaction below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedPayout?.seller?.phone && (
              <div className="flex items-center justify-between rounded-md bg-muted p-3">
                <span className="font-mono text-sm">{selectedPayout.seller.phone}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(selectedPayout.seller!.phone!);
                    toast.success('Copied');
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="txn-id">Your MoMo transaction ID</Label>
              <Input
                id="txn-id"
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
                placeholder="From your confirmation SMS"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proof-file">Receipt screenshot</Label>
              <Input
                id="proof-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">JPG, PNG, or WebP · max 5 MB</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedPayout(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayout} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Confirm payout'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
