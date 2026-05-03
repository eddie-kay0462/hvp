import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle, XCircle, Eye, Clock, ArrowLeft, Store, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Service {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  default_price: number | null;
  default_delivery_time: string | null;
  express_price: number | null;
  express_delivery_time: string | null;
  portfolio: string | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  created_at: string;
  image_urls: string[] | null;
  rejection_reason: string | null;
  seller_email?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface ModerationEventRow {
  id: string;
  service_id: string;
  event_type: string;
  admin_id: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  service_title: string | null;
  created_at: string;
  service?: { id: string; user_id: string; is_verified: boolean | null; is_active: boolean | null } | null;
  seller?: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

export default function AdminPendingServices() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<'queue' | 'history'>('queue');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, active: 0 });
  const [historyEvents, setHistoryEvents] = useState<ModerationEventRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyHint, setHistoryHint] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState('');
  
  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    // Backend handles admin authentication - just fetch the data
    // If user is not admin, the API will return 403 and we'll show the error
    if (user) {
      fetchPendingServices();
      fetchStats();
    }
  }, [user, navigate]);

  const fetchPendingServices = async () => {
    setLoading(true);
    try {
      const response: any = await api.admin.getPendingServices();
      if (response.status === 200) {
        setServices(response.data || []);
      } else {
        toast.error(response.msg || 'Failed to load pending services');
      }
    } catch (error: any) {
      console.error('Error fetching pending services:', error);
      toast.error(error.message || 'Failed to load pending services');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response: any = await api.admin.getServiceStats();
      if (response.status === 200) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchModerationHistory = async () => {
    setHistoryLoading(true);
    setHistoryHint(null);
    try {
      const response: any = await api.admin.getServiceModerationHistory({
        limit: 100,
        offset: 0,
        event_type: historyFilter || undefined,
      });
      if (response.status === 200) {
        setHistoryEvents(response.data?.events || []);
        setHistoryHint(response.data?.hint || null);
      } else {
        toast.error(response.msg || 'Failed to load review log');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load review log');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (user && mainTab === 'history') {
      fetchModerationHistory();
    }
  }, [user, mainTab, historyFilter]);

  const handleApprove = async (serviceId: string) => {
    setActionLoading(serviceId);
    try {
      const response: any = await api.admin.approveService(serviceId);
      if (response.status === 200) {
        toast.success('Service approved successfully!');
        if (response.data?.emailError) {
          toast.warning(`Seller was not emailed: ${response.data.emailError}`);
        }
        fetchPendingServices();
        fetchStats();
        if (mainTab === 'history') fetchModerationHistory();
      } else {
        toast.error(response.msg || 'Failed to approve service');
      }
    } catch (error: any) {
      console.error('Error approving service:', error);
      toast.error(error.message || 'Failed to approve service');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectDialog = (service: Service) => {
    setSelectedService(service);
    setRejectionReason('');
    setAdminNotes('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedService || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(selectedService.id);
    try {
      const response: any = await api.admin.rejectService(
        selectedService.id,
        rejectionReason,
        adminNotes || undefined
      );
      if (response.status === 200) {
        toast.success('Service rejected.');
        if (response.data?.emailError) {
          toast.warning(`Seller was not emailed: ${response.data.emailError}`);
        }
        setRejectDialogOpen(false);
        fetchPendingServices();
        fetchStats();
        if (mainTab === 'history') fetchModerationHistory();
      } else {
        toast.error(response.msg || 'Failed to reject service');
      }
    } catch (error: any) {
      console.error('Error rejecting service:', error);
      toast.error(error.message || 'Failed to reject service');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-4 md:px-6 md:pt-6 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Service Approval Dashboard</h1>
              <p className="text-muted-foreground">Review and approve pending services</p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full lg:w-auto">
              <Button variant="outline" onClick={() => navigate('/admin/payments/momo')} className="gap-2 w-full sm:w-auto justify-center">
                MoMo payments
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/services')}
                className="flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Store className="h-4 w-4" />
                Back to Market
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'queue' | 'history')} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="queue" className="gap-1">
              <Clock className="h-4 w-4" />
              Queue
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <History className="h-4 w-4" />
              Review log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : services.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">There are no pending services to review.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {services.map((service) => (
                  <Card key={service.id}>
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg sm:text-xl mb-1">{service.title}</CardTitle>
                          <CardDescription className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 text-sm">
                            <span>By: {service.profiles?.first_name} {service.profiles?.last_name}</span>
                            {service.seller_email && <span className="break-all">({service.seller_email})</span>}
                            {service.profiles?.phone && <span>📞 {service.profiles.phone}</span>}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 shrink-0 w-fit">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Description:</p>
                          <p className="text-sm">{service.description}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Category</p>
                            <p className="text-sm font-medium">{service.category}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Price</p>
                            <p className="text-sm font-medium">
                              GH₵ {service.default_price?.toFixed(2) || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Delivery Time</p>
                            <p className="text-sm font-medium">{service.default_delivery_time || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Submitted</p>
                            <p className="text-sm font-medium">{formatDate(service.created_at)}</p>
                          </div>
                        </div>

                        {service.portfolio && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Portfolio</p>
                            <p className="text-sm">{service.portfolio}</p>
                          </div>
                        )}

                        {service.image_urls && service.image_urls.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Images</p>
                            <div className="flex gap-2 overflow-x-auto">
                              {service.image_urls.map((url, index) => (
                                <img
                                  key={index}
                                  src={url}
                                  alt={`Service image ${index + 1}`}
                                  className="h-20 w-20 object-cover rounded border"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-4 border-t">
                          <Button
                            onClick={() => handleApprove(service.id)}
                            disabled={actionLoading === service.id}
                            className="bg-green-600 hover:bg-green-700 min-h-10 w-full sm:w-auto justify-center"
                          >
                            {actionLoading === service.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Approve
                          </Button>
                          <Button
                            onClick={() => openRejectDialog(service)}
                            disabled={actionLoading === service.id}
                            variant="destructive"
                            className="min-h-10 w-full sm:w-auto justify-center"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            onClick={() => navigate(`/service/${service.id}`)}
                            variant="outline"
                            className="min-h-10 w-full sm:w-auto justify-center"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
                <div>
                  <CardTitle>Approve / reject log</CardTitle>
                  <CardDescription>Recorded decisions (newest first). Approvals and rejections from this release onward.</CardDescription>
                </div>
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-background min-h-10 max-w-full sm:max-w-[200px]"
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                >
                  <option value="">All outcomes</option>
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
                  <p className="text-sm text-muted-foreground py-8 text-center">No moderation events yet.</p>
                ) : (
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-3 font-medium">When</th>
                          <th className="pb-2 pr-3 font-medium">Outcome</th>
                          <th className="pb-2 pr-3 font-medium">Listing</th>
                          <th className="pb-2 pr-3 font-medium">Seller</th>
                          <th className="pb-2 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyEvents.map((ev) => (
                          <tr key={ev.id} className="border-b border-border/60 align-top">
                            <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                              {formatDate(ev.created_at)}
                            </td>
                            <td className="py-2 pr-3">
                              <Badge
                                variant="secondary"
                                className={
                                  ev.event_type === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }
                              >
                                {ev.event_type}
                              </Badge>
                            </td>
                            <td className="py-2 pr-3 min-w-[160px]">
                              <div className="font-medium">{ev.service_title || ev.service?.id || '—'}</div>
                              <Button
                                variant="link"
                                className="h-auto p-0 text-xs"
                                onClick={() => navigate(`/service/${ev.service_id}`)}
                              >
                                Open listing
                              </Button>
                            </td>
                            <td className="py-2 pr-3">
                              {ev.seller
                                ? `${ev.seller.first_name || ''} ${ev.seller.last_name || ''}`.trim() || ev.seller.email || '—'
                                : '—'}
                            </td>
                            <td className="py-2 max-w-[280px]">
                              {ev.event_type === 'rejected' && ev.rejection_reason && (
                                <p className="text-xs text-muted-foreground line-clamp-3">{ev.rejection_reason}</p>
                              )}
                              {ev.admin_notes && (
                                <p className="text-xs text-muted-foreground mt-1 italic">Internal: {ev.admin_notes}</p>
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
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Service</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. The seller will receive this feedback via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="e.g., Service description is too vague, images are low quality, portfolio link is broken..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Internal Notes (Optional)
              </label>
              <Textarea
                placeholder="Private notes for admin reference..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || actionLoading === selectedService?.id}
            >
              {actionLoading === selectedService?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

