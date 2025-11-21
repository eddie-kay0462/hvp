import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
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
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Booking {
  id: string;
  buyer_id: string;
  service_id: string;
  date: string | null;
  time: string | null;
  status: "pending" | "accepted" | "in_progress" | "delivered" | "completed" | "cancelled";
  created_at: string;
  service?: {
    id: string;
    title: string;
    description: string;
    default_price: number | null;
    express_price: number | null;
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

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Pending",
    accepted: "Accepted",
    in_progress: "In Progress",
    delivered: "Delivered - Awaiting Confirmation",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
};

export default function Bookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTab, setSelectedTab] = useState("all");

  useEffect(() => {
    const checkSessionAndFetch = async () => {
      if (!user) {
        navigate("/login");
        return;
      }

      // Verify session is still valid
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        toast.error("Your session has expired. Please sign in again.");
        navigate("/login");
        return;
      }

      fetchBookings();
    };

    checkSessionAndFetch();
  }, [user, navigate]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await api.bookings.getUserBookings("buyer") as any;

      if (result.status === 200) {
        setBookings(result.data?.bookings || []);
      } else if (result.status === 401) {
        // Token expired or invalid - redirect to login
        console.error("401 Unauthorized - Session expired or invalid token");
        toast.error("Your session has expired. Please sign in again.");
        // Clear any stale session
        await supabase.auth.signOut();
        navigate("/login");
      } else {
        toast.error(result.msg || "Failed to load bookings");
      }
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      console.error("Error details:", error.originalError || error);
      
      // Check if it's an authentication error
      if (error.status === 401 || error.message?.includes("authorized") || error.message?.includes("sign in") || error.message?.includes("401")) {
        console.error("Authentication error detected - redirecting to login");
        toast.error("Your session has expired. Please sign in again.");
        // Clear any stale session
        await supabase.auth.signOut();
        navigate("/login");
      } else {
        toast.error(error.message || "Failed to load bookings");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "N/A";
    return `GH₵${price.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not scheduled";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "Not scheduled";
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const filteredBookings =
    selectedTab === "all"
      ? bookings
      : bookings.filter((b) => {
          if (selectedTab === "new") {
            return b.status === "pending" || b.status === "accepted";
          }
          return b.status === selectedTab;
        });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="p-6 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
            <p className="text-muted-foreground">
              Manage all your service bookings
            </p>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">
                All Bookings ({bookings.length})
              </TabsTrigger>
              <TabsTrigger value="new">
                New Requests (
                {bookings.filter((b) => b.status === "pending" || b.status === "accepted").length}
                )
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                In Progress ({bookings.filter((b) => b.status === "in_progress").length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({bookings.filter((b) => b.status === "completed").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-4">
              {filteredBookings.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {selectedTab === "all"
                        ? "You haven't made any bookings yet. Browse services to get started!"
                        : `No ${selectedTab === "new" ? "new booking requests" : selectedTab.replace("_", " ")} bookings at the moment`}
                    </p>
                    {selectedTab === "all" && (
                      <Button onClick={() => navigate("/services")}>
                        Browse Services
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                            <TableCell className="font-medium">
                              {booking.service?.title || "Unknown Service"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {booking.date && booking.time ? (
                                <>
                                  <div>{formatDate(booking.date)}</div>
                                  <div className="text-xs">{formatTime(booking.time)}</div>
                                </>
                              ) : (
                                <div className="text-xs text-muted-foreground">Instant booking</div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatPrice(booking.service?.default_price)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadge(booking.status)}>
                                {getStatusLabel(booking.status)}
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
      </main>

      <Footer />
    </div>
  );
}

