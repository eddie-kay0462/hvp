import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';

interface Dispute {
  id: string;
  booking_id: string;
  reason: string;
  details: string | null;
  status: 'open' | 'resolved' | 'closed';
  admin_resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  raised_by_profile: { first_name: string | null; last_name: string | null } | null;
  booking: {
    id: string;
    payment_amount: number | null;
    service: { title: string } | null;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700 border-red-300',
  resolved: 'bg-green-100 text-green-700 border-green-300',
  closed: 'bg-gray-100 text-gray-600 border-gray-300',
};

export default function AdminDisputes() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'closed'>('open');
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolveAs, setResolveAs] = useState<'resolved' | 'closed'>('resolved');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, [filter]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const result = await (api as any).disputes.getAll(filter) as any;
      if (result.status === 200) {
        setDisputes(result.data || []);
      } else {
        toast.error(result.msg || 'Failed to load disputes');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const openResolveDialog = (dispute: Dispute) => {
    setSelected(dispute);
    setResolution('');
    setResolveAs('resolved');
  };

  const handleResolve = async () => {
    if (!selected || !resolution.trim()) return;
    try {
      setSubmitting(true);
      const result = await (api as any).disputes.resolve(selected.id, resolution.trim(), resolveAs) as any;
      if (result.status === 200) {
        toast.success('Dispute resolved');
        setSelected(null);
        fetchDisputes();
      } else {
        toast.error(result.msg || 'Failed to resolve dispute');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to resolve dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const raisedBy = (d: Dispute) => {
    const p = d.raised_by_profile;
    if (!p) return 'Unknown';
    return [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Disputes</h1>
            <p className="text-sm text-muted-foreground">Review and resolve booking disputes</p>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : disputes.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No {filter} disputes</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => (
              <Card key={d.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {d.booking?.service?.title || 'Unknown service'}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">
                        Booking {d.booking_id.slice(0, 8)}…
                      </CardDescription>
                    </div>
                    <Badge className={`shrink-0 text-xs ${STATUS_COLORS[d.status]}`}>
                      {d.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Raised by</span>
                      <span>{raisedBy(d)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reason</span>
                      <span className="text-right max-w-[60%]">{d.reason}</span>
                    </div>
                    {d.booking?.payment_amount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount at stake</span>
                        <span className="font-semibold">
                          GH₵ {Number(d.booking.payment_amount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Raised</span>
                      <span>{new Date(d.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {d.details && (
                    <div className="text-sm border-l-2 border-muted pl-3 text-muted-foreground">
                      {d.details}
                    </div>
                  )}

                  {d.admin_resolution && (
                    <div className="text-sm border-l-2 border-green-400 pl-3 text-muted-foreground">
                      <span className="font-medium text-foreground">Resolution: </span>
                      {d.admin_resolution}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/booking/${d.booking_id}`)}
                    >
                      View Booking
                    </Button>
                    {d.status === 'open' && (
                      <Button size="sm" onClick={() => openResolveDialog(d)}>
                        Resolve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Write your resolution. Both parties will see this note.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Resolution notes *</Label>
              <Textarea
                placeholder="Explain the outcome — e.g. 'Refund issued to buyer' or 'Payment released to seller as work was delivered'"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Mark as</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResolveAs('resolved')}
                  className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${resolveAs === 'resolved' ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background hover:bg-accent'}`}
                >
                  Resolved
                </button>
                <button
                  type="button"
                  onClick={() => setResolveAs('closed')}
                  className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${resolveAs === 'closed' ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background hover:bg-accent'}`}
                >
                  Closed (no action)
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelected(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={submitting || !resolution.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save resolution'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
