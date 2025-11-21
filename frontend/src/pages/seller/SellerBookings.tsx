import { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Booking {
  id: string;
  buyer_id: string;
  service_id: string;
  date: string | null;
  time: string | null;
  status: "pending" | "accepted" | "in_progress" | "delivered" | "completed" | "cancelled";
  created_at: string;
  buyer?: {
    first_name: string | null;
    last_name: string | null;
  };
  service?: {
    title: string;
    default_price: number | null;
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

export default function SellerBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTab, setSelectedTab] = useState("all");

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

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
        .select('id, title, default_price')
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

  const getBuyerName = (booking: Booking) => {
    if (booking.buyer?.first_name && booking.buyer?.last_name) {
      return `${booking.buyer.first_name} ${booking.buyer.last_name}`;
    }
    return booking.buyer?.first_name || booking.buyer?.last_name || 'Unknown';
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

      <div className="p-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Bookings ({bookings.length})</TabsTrigger>
            <TabsTrigger value="new">New Requests ({bookings.filter(b => b.status === "pending" || b.status === "accepted").length})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({bookings.filter(b => b.status === "in_progress").length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({bookings.filter(b => b.status === "completed").length})</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4">
            {filteredBookings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {selectedTab === "all" 
                    ? "No bookings yet"
                    : `No ${selectedTab === "new" ? "new booking requests" : selectedTab.replace("_", " ")} bookings at the moment`}
                </CardContent>
              </Card>
            ) : (
              <Card>
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
                            {booking.service?.default_price ? `GH₵ ${booking.service.default_price.toFixed(2)}` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(booking.status)}>
                              {booking.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-2"
                              onClick={() => navigate(`/booking/${booking.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
