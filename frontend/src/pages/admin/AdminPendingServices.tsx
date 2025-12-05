import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle, XCircle, Eye, Clock, AlertCircle, ArrowLeft, Store } from 'lucide-react';
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

export default function AdminPendingServices() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, active: 0 });
  
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

  const handleApprove = async (serviceId: string) => {
    setActionLoading(serviceId);
    try {
      const response: any = await api.admin.approveService(serviceId);
      if (response.status === 200) {
        toast.success('Service approved successfully!');
        fetchPendingServices();
        fetchStats();
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
        toast.success('Service rejected and seller notified');
        setRejectDialogOpen(false);
        fetchPendingServices();
        fetchStats();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Service Approval Dashboard</h1>
              <p className="text-muted-foreground">Review and approve pending services</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/services')}
              className="flex items-center gap-2"
            >
              <Store className="h-4 w-4" />
              Back to Market
            </Button>
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

        {/* Pending Services List */}
        {services.length === 0 ? (
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{service.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span>By: {service.profiles?.first_name} {service.profiles?.last_name}</span>
                        {service.seller_email && <span>({service.seller_email})</span>}
                        {service.profiles?.phone && <span>📞 {service.profiles.phone}</span>}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Service Details */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Description:</p>
                      <p className="text-sm">{service.description}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        onClick={() => handleApprove(service.id)}
                        disabled={actionLoading === service.id}
                        className="bg-green-600 hover:bg-green-700"
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
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => navigate(`/service/${service.id}`)}
                        variant="outline"
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

