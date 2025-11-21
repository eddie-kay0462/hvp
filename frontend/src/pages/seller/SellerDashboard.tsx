import { useEffect, useState } from "react";
import { Package, Calendar, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Booking {
  id: string;
  buyer_id: string;
  service_id: string;
  date: string;
  time: string;
  status: string;
  created_at: string;
  buyer?: {
    first_name: string | null;
    last_name: string | null;
  };
  service?: {
    title: string;
  };
}

const statusColors: Record<string, string> = {
  pending: "default",
  accepted: "secondary",
  in_progress: "secondary",
  completed: "outline",
};

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sellerName, setSellerName] = useState("Seller");
  const [stats, setStats] = useState({
    activeServices: 0,
    newBookings: 0,
    inProgressBookings: 0,
    earningsThisMonth: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch seller profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        const name = profile.first_name && profile.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile.first_name || profile.last_name || "Seller";
        setSellerName(name);
      }

      // Fetch seller's services
      const { data: services } = await supabase
        .from('services')
        .select('id, is_active')
        .eq('user_id', user.id);

      const activeServices = services?.filter(s => s.is_active) || [];
      const serviceIds = services?.map(s => s.id) || [];

      // Fetch bookings for seller's services
      const { data: bookingsData } = serviceIds.length > 0
        ? await supabase
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
            .order('created_at', { ascending: false })
        : { data: [] };

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

      // Fetch service titles
      const { data: servicesData } = serviceIds.length > 0
        ? await supabase
            .from('services')
            .select('id, title')
            .in('id', serviceIds)
        : { data: [] };

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

      // Calculate stats
      const newBookings = mappedBookings.filter(b => b.status === 'pending' || b.status === 'accepted').length;
      const inProgressBookings = mappedBookings.filter(b => b.status === 'in_progress').length;

      // Calculate earnings from completed bookings this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const completedThisMonth = mappedBookings.filter(b => {
        if (b.status !== 'completed') return false;
        const bookingDate = new Date(b.created_at);
        return bookingDate >= startOfMonth;
      });

      // Get service prices for completed bookings
      const completedServiceIds = completedThisMonth.map(b => b.service_id);
      const { data: completedServices } = completedServiceIds.length > 0
        ? await supabase
            .from('services')
            .select('id, default_price')
            .in('id', completedServiceIds)
        : { data: [] };

      const completedServicesMap: Record<string, any> = {};
      completedServices?.forEach(service => {
        completedServicesMap[service.id] = service;
      });

      const earningsThisMonth = completedThisMonth.reduce((sum, booking) => {
        const service = completedServicesMap[booking.service_id];
        return sum + (service?.default_price || 0);
      }, 0);

      setStats({
        activeServices: activeServices.length,
        newBookings,
        inProgressBookings,
        earningsThisMonth,
      });

      // Set recent bookings (last 3)
      setRecentBookings(mappedBookings.slice(0, 3));

      // Set upcoming bookings (pending/accepted with future dates)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = mappedBookings
        .filter(b => {
          const bookingDate = new Date(b.date);
          bookingDate.setHours(0, 0, 0, 0);
          return (b.status === 'pending' || b.status === 'accepted' || b.status === 'in_progress') &&
                 bookingDate >= today;
        })
        .slice(0, 2);
      setUpcomingBookings(upcoming);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
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
        title={`Hi, ${sellerName}`}
        subtitle="Here's your seller overview and recent activity"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Services"
            value={stats.activeServices}
            icon={Package}
            trend={{ value: `${stats.activeServices} listed`, isPositive: true }}
          />
          <StatCard
            title="New Booking Requests"
            value={stats.newBookings}
            icon={Calendar}
            trend={{ value: `${stats.newBookings} pending`, isPositive: stats.newBookings > 0 }}
          />
          <StatCard
            title="In-Progress Bookings"
            value={stats.inProgressBookings}
            icon={TrendingUp}
            iconBgColor="bg-secondary-accent/20"
          />
          <StatCard
            title="Earnings This Month"
            value={`GH₵ ${stats.earningsThisMonth.toFixed(2)}`}
            icon={DollarSign}
            trend={{ value: "This month", isPositive: stats.earningsThisMonth > 0 }}
            iconBgColor="bg-primary/10"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {recentBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent bookings
                </p>
              ) : (
                <>
                  <div className="space-y-4">
                    {recentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between pb-4 border-b last:border-0">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{getBuyerName(booking)}</p>
                          <p className="text-sm text-muted-foreground">{booking.service?.title || 'Unknown Service'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(booking.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={statusColors[booking.status] as any}>
                          {booking.status.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => navigate('/seller/bookings')}
                  >
                    View All Bookings
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Bookings & Tips */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming bookings
                  </p>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between pb-4 border-b last:border-0">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{getBuyerName(booking)}</p>
                          <p className="text-sm text-muted-foreground">{booking.service?.title || 'Unknown Service'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(booking.date).toLocaleDateString()} at {booking.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-accent-light/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base">Tips to Get More Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Add clear photos to your services</li>
                  <li>• Respond to requests within 24 hours</li>
                  <li>• Keep your availability updated</li>
                  <li>• Ask satisfied clients for reviews</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
