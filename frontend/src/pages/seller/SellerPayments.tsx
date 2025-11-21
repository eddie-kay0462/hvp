import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Clock, Loader2 } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Booking {
  id: string;
  service_id: string;
  status: string;
  created_at: string;
  service?: {
    title: string;
    default_price: number | null;
  };
}

export default function SellerPayments() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    availableToWithdraw: 0,
    inEscrow: 0,
    totalEarnedThisMonth: 0,
  });
  const [earningsHistory, setEarningsHistory] = useState<any[]>([]);
  const [escrowItems, setEscrowItems] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchPaymentsData();
    }
  }, [user]);

  const fetchPaymentsData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get seller's services
      const { data: services } = await supabase
        .from('services')
        .select('id, title, default_price')
        .eq('user_id', user.id);

      const serviceIds = services?.map(s => s.id) || [];

      if (serviceIds.length === 0) {
        setStats({ availableToWithdraw: 0, inEscrow: 0, totalEarnedThisMonth: 0 });
        setEarningsHistory([]);
        setEscrowItems([]);
        return;
      }

      // Fetch all bookings for seller's services
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          id,
          service_id,
          buyer_id,
          status,
          created_at
        `)
        .in('service_id', serviceIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const servicesMap: Record<string, any> = {};
      services?.forEach(service => {
        servicesMap[service.id] = service;
      });

      // Calculate current month earnings
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const completedThisMonth = (bookingsData || []).filter(b => {
        if (b.status !== 'completed') return false;
        const bookingDate = new Date(b.created_at);
        return bookingDate >= startOfMonth;
      });

      const totalEarnedThisMonth = completedThisMonth.reduce((sum, booking) => {
        const service = servicesMap[booking.service_id];
        return sum + (service?.default_price || 0);
      }, 0);

      // Available to withdraw = all completed bookings (simplified - in real app would track withdrawals)
      const allCompleted = (bookingsData || []).filter(b => b.status === 'completed');
      const availableToWithdraw = allCompleted.reduce((sum, booking) => {
        const service = servicesMap[booking.service_id];
        return sum + (service?.default_price || 0);
      }, 0);

      // In escrow = pending, accepted, or in_progress bookings
      const inEscrowBookings = (bookingsData || []).filter(b => 
        b.status === 'pending' || b.status === 'accepted' || b.status === 'in_progress'
      );
      const inEscrow = inEscrowBookings.reduce((sum, booking) => {
        const service = servicesMap[booking.service_id];
        return sum + (service?.default_price || 0);
      }, 0);

      setStats({
        availableToWithdraw,
        inEscrow,
        totalEarnedThisMonth,
      });

      // Fetch buyer profiles for escrow items
      const buyerIds = [...new Set(inEscrowBookings.map(b => b.buyer_id))];
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

      // Create earnings history from completed bookings
      const history = allCompleted.slice(0, 10).map(booking => {
        const service = servicesMap[booking.service_id];
        return {
          id: booking.id,
          date: new Date(booking.created_at).toLocaleDateString(),
          bookingId: booking.id.slice(0, 8) + '...',
          service: service?.title || 'Unknown Service',
          amount: service?.default_price || 0,
          type: 'Released',
        };
      });

      setEarningsHistory(history);

      // Create escrow items
      const escrow = inEscrowBookings.slice(0, 10).map(booking => {
        const service = servicesMap[booking.service_id];
        const buyer = buyersMap[booking.buyer_id];
        const buyerName = buyer?.first_name && buyer?.last_name
          ? `${buyer.first_name} ${buyer.last_name}`
          : buyer?.first_name || buyer?.last_name || 'Unknown';

        // Estimate release date (7 days after booking creation)
        const releaseDate = new Date(booking.created_at);
        releaseDate.setDate(releaseDate.getDate() + 7);

        return {
          bookingId: booking.id.slice(0, 8) + '...',
          buyer: buyerName,
          amount: service?.default_price || 0,
          status: booking.status === 'pending' ? 'Pending' : booking.status === 'accepted' ? 'Funded' : 'Funded',
          expectedRelease: releaseDate.toLocaleDateString(),
        };
      });

      setEscrowItems(escrow);

    } catch (error: any) {
      console.error('Error fetching payments data:', error);
      toast.error('Failed to load payments data');
    } finally {
      setLoading(false);
    }
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
        subtitle="Track your income, escrow, and payment history"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Available to Withdraw"
            value={`GH₵ ${stats.availableToWithdraw.toFixed(2)}`}
            icon={DollarSign}
            iconBgColor="bg-primary/10"
          />
          <StatCard
            title="In Escrow"
            value={`GH₵ ${stats.inEscrow.toFixed(2)}`}
            icon={Clock}
            iconBgColor="bg-secondary-accent/20"
          />
          <StatCard
            title="Total Earned This Month"
            value={`GH₵ ${stats.totalEarnedThisMonth.toFixed(2)}`}
            icon={TrendingUp}
            trend={{ 
              value: stats.totalEarnedThisMonth > 0 ? "This month" : "No earnings yet", 
              isPositive: stats.totalEarnedThisMonth > 0 
            }}
          />
        </div>

        {/* Earnings History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Earnings History</CardTitle>
              <Button variant="outline" size="sm" disabled>
                Export
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
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earningsHistory.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell>{earning.date}</TableCell>
                      <TableCell className="font-medium">{earning.bookingId}</TableCell>
                      <TableCell>{earning.service}</TableCell>
                      <TableCell className="font-medium text-primary">
                        GH₵ {earning.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${earning.type === "Released" ? "text-green-600" : "text-yellow-600"}`}>
                          {earning.type}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Escrow Section */}
        <Card>
          <CardHeader>
            <CardTitle>Funds in Escrow</CardTitle>
          </CardHeader>
          <CardContent>
            {escrowItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No funds in escrow
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Escrow Status</TableHead>
                    <TableHead>Expected Release</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escrowItems.map((item) => (
                    <TableRow key={item.bookingId}>
                      <TableCell className="font-medium">{item.bookingId}</TableCell>
                      <TableCell>{item.buyer}</TableCell>
                      <TableCell className="font-medium">
                        GH₵ {item.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-green-600">{item.status}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.expectedRelease}</TableCell>
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
