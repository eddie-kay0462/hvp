import { useEffect, useState } from "react";
import { Eye, Loader2, SendHorizonal } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Booking {
  id: string;
  buyer_id: string;
  service_id: string;
  date: string | null;
  time: string | null;
  status: "pending" | "accepted" | "in_progress" | "delivered" | "completed" | "cancelled";
  quote_status: "pending_quote" | "quote_sent" | "quote_accepted" | "quote_declined" | null;
  buyer_requirements: string | null;
  quoted_price: number | null;
  seller_quote_note: string | null;
  created_at: string;
  buyer?: {
    first_name: string | null;
    last_name: string | null;
  };
  service?: {
    title: string;
    default_price: number | null;
    pricing_type: 'fixed' | 'range';
    price_min: number | null;
    price_max: number | null;
  };
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, any> = {
    pending: "default",
    accepted: "secondary",
    in_progress: "secondary",
    delivered: "default",
    completed: "outline",
    cancelled: "destructive",
  };
  return variants[status] || "default";
};

const VALID_TABS = new Set(["all", "new", "in_progress", "completed"]);

export default function SellerBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (() => {
    const raw = searchParams.get("status");
    if (raw && VALID_TABS.has(raw)) return raw;
    if (raw === "pending" || raw === "accepted") return "new";
    return "all";
  })();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quotingBooking, setQuotingBooking] = useState<Booking | null>(null);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteNote, setQuoteNote] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  useEffect(() => {
    const raw = searchParams.get("status");
    if (!raw) return;
    if (VALID_TABS.has(raw)) setSelectedTab(raw);
    else if (raw === "pending" || raw === "accepted") setSelectedTab("new");
  }, [searchParams]);

  const handleTabChange = (next: string) => {
    setSelectedTab(next);
    if (next === "all") {
      searchParams.delete("status");
    } else {
      searchParams.set("status", next);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const fetchBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // First, get seller's services
      const { data: services } = await supabase
        .from('services')
        .select('id')
        .eq('user_id', user.id);

      const serviceIds = services?.map(s => s.id) || [];

      if (serviceIds.length === 0) {
        setBookings([]);
        return;
      }

      // Fetch bookings for seller's services
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          id,
          buyer_id,
          service_id,
          date,
          time,
          status,
          quote_status,
          buyer_requirements,
          quoted_price,
          seller_quote_note,
          created_at
        `)
        .in('service_id', serviceIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch buyer profiles
      const buyerIds = [...new Set((bookingsData || []).map(b => b.buyer_id))];
      const { data: buyers } = buyerIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', buyerIds)
        : { data: [] };

      const buyersMap: Record<string, any> = {};
      buyers?.forEach(buyer => {
        buyersMap[buyer.id] = buyer;
      });

      // Fetch service details
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, title, default_price, pricing_type, price_min, price_max')
        .in('id', serviceIds);

      const servicesMap: Record<string, any> = {};
      servicesData?.forEach(service => {
        servicesMap[service.id] = service;
      });

      // Map bookings with buyer and service info
      const mappedBookings: Booking[] = (bookingsData || []).map((booking: any) => ({
        ...booking,
        buyer: buyersMap[booking.buyer_id],
        service: servicesMap[booking.service_id],
      }));

      setBookings(mappedBookings);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const openQuoteDialog = (booking: Booking) => {
    setQuotingBooking(booking);
    setQuotePrice('');
    setQuoteNote('');
    setQuoteDialogOpen(true);
  };

  const handleSendQuote = async () => {
    if (!quotingBooking || !quotePrice) return;
    const price = parseFloat(quotePrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    setSubmittingQuote(true);
    try {
      const result = await (api.bookings as any).submitQuote(quotingBooking.id, {
        quotedPrice: price,
        quoteNote: quoteNote.trim() || undefined,
      }) as any;
      if (result.status === 200) {
        toast.success('Quote sent to buyer!');
        setQuoteDialogOpen(false);
        fetchBookings();
      } else {
        toast.error(result.msg || 'Failed to send quote');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to send quote');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const getBuyerName = (booking: Booking) => {
    if (booking.buyer?.first_name && booking.buyer?.last_name) {
      return `${booking.buyer.first_name} ${booking.buyer.last_name}`;
    }
    return booking.buyer?.first_name || booking.buyer?.last_name || 'Unknown';
  };

  const getBookingAmount = (booking: Booking) => {
    if (booking.quoted_price) return `GH₵ ${booking.quoted_price.toFixed(2)}`;
    if (booking.service?.pricing_type === 'range' && booking.service.price_min != null && booking.service.price_max != null) {
      return `GH₵ ${booking.service.price_min}–${booking.service.price_max}`;
    }
    return booking.service?.default_price ? `GH₵ ${booking.service.default_price.toFixed(2)}` : 'N/A';
  };

  const filteredBookings = selectedTab === "all"
    ? bookings
    : bookings.filter(b => {
        if (selectedTab === "new") return b.status === "pending" || b.status === "accepted";
        return b.status === selectedTab;
      });

  if (loading) {
    return (
      <>
        <DashboardHeader 
          title="Bookings" 
          subtitle="Loading your bookings..."
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
        title="Bookings" 
        subtitle="Manage all your booking requests and ongoing services"
      />

      <div className="p-4 md:p-6">
        <Tabs value={selectedTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All ({bookings.length})</TabsTrigger>
            <TabsTrigger value="new" className="text-xs sm:text-sm">New ({bookings.filter(b => b.status === "pending" || b.status === "accepted").length})</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs sm:text-sm">In Progress ({bookings.filter(b => b.status === "in_progress").length})</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed ({bookings.filter(b => b.status === "completed").length})</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4">
            {filteredBookings.length === 0 ? (
              <Card>
                <CardContent className="p-6 md:p-8 text-center text-muted-foreground">
                  {selectedTab === "all" 
                    ? "No bookings yet"
                    : `No ${selectedTab === "new" ? "new booking requests" : selectedTab.replace("_", " ")} bookings at the moment`}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Desktop Table View */}
                <Card className="hidden md:block">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Booking ID</TableHead>
                          <TableHead>Buyer</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">{booking.id.slice(0, 8)}...</TableCell>
                            <TableCell>{getBuyerName(booking)}</TableCell>
                            <TableCell>{booking.service?.title || 'Unknown Service'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {booking.date && booking.time ? (
                                <>
                                  {new Date(booking.date).toLocaleDateString()}<br />
                                  <span className="text-xs">{booking.time}</span>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">Instant booking</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {getBookingAmount(booking)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={getStatusBadge(booking.status)}>
                                  {booking.status.replace("_", " ")}
                                </Badge>
                                {booking.quote_status === 'pending_quote' && (
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-300 text-xs">Quote needed</Badge>
                                )}
                                {booking.quote_status === 'quote_sent' && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">Quote sent</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {booking.quote_status === 'pending_quote' && (
                                  <Button variant="default" size="sm" className="gap-1" onClick={() => openQuoteDialog(booking)}>
                                    <SendHorizonal className="h-3 w-3" />
                                    Quote
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => navigate(`/booking/${booking.id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {filteredBookings.map((booking) => (
                    <Card key={booking.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base truncate">
                                {booking.service?.title || 'Unknown Service'}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                ID: {booking.id.slice(0, 8)}...
                              </p>
                            </div>
                            <Badge variant={getStatusBadge(booking.status)} className="shrink-0">
                              {booking.status.replace("_", " ")}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Buyer:</span>
                              <span className="font-medium">{getBuyerName(booking)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Date & Time:</span>
                              <span className="font-medium text-right">
                                {booking.date && booking.time ? (
                                  <>
                                    {new Date(booking.date).toLocaleDateString()}<br />
                                    <span className="text-xs">{booking.time}</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Instant booking</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Amount:</span>
                              <span className="font-semibold">{getBookingAmount(booking)}</span>
                            </div>
                            {booking.quote_status && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Quote:</span>
                                <Badge variant="secondary" className={`text-xs ${booking.quote_status === 'pending_quote' ? 'bg-purple-100 text-purple-700' : booking.quote_status === 'quote_sent' ? 'bg-blue-100 text-blue-700' : ''}`}>
                                  {booking.quote_status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            )}
                            {booking.buyer_requirements && (
                              <div className="text-xs text-muted-foreground border-l-2 border-purple-300 pl-2 mt-1">
                                <span className="font-medium text-foreground">Buyer needs: </span>{booking.buyer_requirements}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {booking.quote_status === 'pending_quote' && (
                              <Button variant="default" className="flex-1" onClick={() => openQuoteDialog(booking)}>
                                <SendHorizonal className="h-4 w-4 mr-2" />
                                Send Quote
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => navigate(`/booking/${booking.id}`)}
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
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Send Quote Dialog */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send a Quote</DialogTitle>
            <DialogDescription>
              {quotingBooking?.service?.title} — review the buyer's requirements and enter your price.
            </DialogDescription>
          </DialogHeader>

          {quotingBooking?.buyer_requirements && (
            <div className="bg-muted/50 rounded-md p-3 text-sm border-l-4 border-purple-400">
              <p className="text-xs font-medium text-muted-foreground mb-1">What the buyer needs:</p>
              <p className="text-foreground">{quotingBooking.buyer_requirements}</p>
            </div>
          )}

          {quotingBooking?.service?.pricing_type === 'range' && quotingBooking.service.price_min != null && quotingBooking.service.price_max != null && (
            <p className="text-xs text-muted-foreground">
              Your listed range: GH₵{quotingBooking.service.price_min} – GH₵{quotingBooking.service.price_max}
            </p>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quote-price">Your Price (GHS) *</Label>
              <Input
                id="quote-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={quotePrice}
                onChange={(e) => setQuotePrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-note">Message to Buyer (Optional)</Label>
              <Textarea
                id="quote-note"
                placeholder="e.g. 'This price includes two revisions and delivery within 5 days.'"
                value={quoteNote}
                onChange={(e) => setQuoteNote(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setQuoteDialogOpen(false)} disabled={submittingQuote}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSendQuote} disabled={submittingQuote || !quotePrice}>
                {submittingQuote ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : 'Send Quote'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
