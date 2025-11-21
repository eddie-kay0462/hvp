import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  ChevronLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  DollarSign, 
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  Star,
} from "lucide-react";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Booking {
  id: string;
  buyer_id: string;
  service_id: string;
  date: string | null;
  time: string | null;
  status: "pending" | "accepted" | "in_progress" | "delivered" | "completed" | "cancelled";
  created_at: string;
  payment_status?: string | null;
  payment_captured_at?: string | null;
  payment_released_at?: string | null;
  payment_amount?: number | null;
  payment_transaction_id?: string | null;
  service?: {
    id: string;
    title: string;
    description: string;
    category: string;
    default_price: number | null;
    express_price: number | null;
  };
  buyer?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profile_pic: string | null;
  };
  seller?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profile_pic: string | null;
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
    delivered: "Delivered - Awaiting Your Confirmation",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
};

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [hasReview, setHasReview] = useState<boolean | null>(null);
  const [checkingReview, setCheckingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchBookingDetails();
    }
  }, [id, user]);

  useEffect(() => {
    // Check if user has already reviewed when booking is completed
    if (booking && booking.status === "completed" && booking.buyer_id === user?.id && user && id) {
      const checkReview = async () => {
        try {
          setCheckingReview(true);
          const result = await api.reviews.checkExisting(id) as any;
          if (result.status === 200) {
            setHasReview(result.data?.hasReview || false);
          }
        } catch (error: any) {
          console.error("Error checking for existing review:", error);
        } finally {
          setCheckingReview(false);
        }
      };
      checkReview();
    }
  }, [booking?.status, booking?.buyer_id, user?.id, user, id]);

  const fetchBookingDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const result = await api.bookings.getById(id) as any;

      if (result.status === 200) {
        setBooking(result.data);
        
        // Fetch additional details (buyer and seller info)
        await fetchAdditionalDetails(result.data);
      } else {
        toast.error(result.msg || "Failed to load booking details");
        navigate("/bookings");
      }
    } catch (error: any) {
      console.error("Error fetching booking details:", error);
      toast.error(error.message || "Failed to load booking details");
      navigate("/bookings");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdditionalDetails = async (bookingData: any) => {
    try {
      // Fetch buyer info
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: buyerData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, profile_pic")
        .eq("id", bookingData.buyer_id)
        .single();

      // Fetch seller info via service
      let sellerData = null;
      if (bookingData.service_id) {
        const { data: serviceData } = await supabase
          .from("services")
          .select("user_id")
          .eq("id", bookingData.service_id)
          .single();

        if (serviceData?.user_id) {
          const { data: seller } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, profile_pic")
            .eq("id", serviceData.user_id)
            .single();
          sellerData = seller;
        }
      }

      setBooking((prev) => ({
        ...prev!,
        buyer: buyerData || undefined,
        seller: sellerData || undefined,
      }));
    } catch (error) {
      console.error("Error fetching additional details:", error);
    }
  };

  const handleAccept = async () => {
    if (!booking || !id) return;

    try {
      setUpdating(true);
      const result = await api.bookings.accept(id) as any;

      if (result.status === 200) {
        toast.success("Booking accepted!");
        fetchBookingDetails();
      } else {
        toast.error(result.msg || "Failed to accept booking");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to accept booking");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!booking || !id) return;

    try {
      setUpdating(true);
      const result = await (api.bookings as any).updateStatus?.(id, newStatus) as any;

      if (!result) {
        // Fallback: if updateStatus doesn't exist, use accept or cancel
        if (newStatus === "cancelled") {
          const cancelResult = await (api.bookings as any).cancel?.(id) as any;
          if (cancelResult?.status === 200) {
            toast.success("Booking cancelled");
            fetchBookingDetails();
            return;
          }
        }
        toast.error("Status update endpoint not available");
        return;
      }

      if (result.status === 200) {
        toast.success(`Booking marked as ${getStatusLabel(newStatus).toLowerCase()}`);
        fetchBookingDetails();
      } else {
        toast.error(result.msg || "Failed to update booking status");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update booking status");
    } finally {
      setUpdating(false);
    }
  };

  const checkExistingReview = async () => {
    if (!id || !user) return;

    try {
      setCheckingReview(true);
      const result = await api.reviews.checkExisting(id) as any;

      if (result.status === 200) {
        setHasReview(result.data?.hasReview || false);
      }
    } catch (error: any) {
      console.error("Error checking for existing review:", error);
    } finally {
      setCheckingReview(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!booking || !id) return;

    try {
      setUpdating(true);
      const result = await (api.bookings as any).confirm?.(id) as any;

      if (!result) {
        toast.error("Confirmation endpoint not available");
        return;
      }

      if (result.status === 200) {
        toast.success("Booking confirmed! Payment has been released to the seller.");
        fetchBookingDetails();
        // Check for existing review after completion
        setTimeout(() => checkExistingReview(), 500);
      } else {
        toast.error(result.msg || "Failed to confirm booking completion");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm booking completion");
    } finally {
      setUpdating(false);
    }
  };

  const handleReviewSuccess = () => {
    setHasReview(true);
    setShowReviewForm(false);
    fetchBookingDetails(); // Refresh to show the review
  };

  const handleCancel = async () => {
    if (!booking || !id) return;

    try {
      setUpdating(true);
      const result = await (api.bookings as any).cancel?.(id) as any;

      if (!result) {
        // Fallback: use status update
        await handleStatusUpdate("cancelled");
        return;
      }

      if (result.status === 200) {
        toast.success("Booking cancelled");
        fetchBookingDetails();
      } else {
        toast.error(result.msg || "Failed to cancel booking");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel booking");
    } finally {
      setUpdating(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "Price on request";
    return `GH₵${price.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
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

  const getUserName = (person: { first_name?: string | null; last_name?: string | null } | undefined) => {
    if (!person) return "Unknown";
    if (person.first_name && person.last_name) {
      return `${person.first_name} ${person.last_name}`;
    }
    return person.first_name || person.last_name || "Unknown";
  };

  // Check if current user is buyer or seller
  const isBuyer = booking?.buyer_id === user?.id;
  const isSeller = booking?.service?.user_id === user?.id || booking?.seller?.id === user?.id;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 bg-background">
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-96 w-full mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 bg-background flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Booking not found</h2>
            <Button onClick={() => navigate("/bookings")}>Go to My Bookings</Button>
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
          {/* Back button */}
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Booking Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Booking Info Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Booking Details</CardTitle>
                    <Badge variant={getStatusBadge(booking.status)}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Service Info */}
                  {booking.service && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Service</h3>
                      <div className="space-y-2">
                        <p className="text-foreground">{booking.service.title}</p>
                        {booking.service.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {booking.service.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 pt-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {formatPrice(booking.service.default_price)}
                            </span>
                          </div>
                          {booking.service.express_price && (
                            <div className="text-sm text-muted-foreground">
                              Express: {formatPrice(booking.service.express_price)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4" />

                  {/* Date & Time */}
                  {booking.date && booking.time ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Date</p>
                          <p className="text-muted-foreground">{formatDate(booking.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Time</p>
                          <p className="text-muted-foreground">{formatTime(booking.time)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/50 rounded-md">
                      <p className="text-sm text-muted-foreground">
                        Instant booking - no specific date/time scheduled. The seller will coordinate with you.
                      </p>
                    </div>
                  )}

                  {/* Created Date */}
                  {booking.created_at && (
                    <div className="text-sm text-muted-foreground pt-2">
                      Booked on {formatDate(booking.created_at)}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Buyer/Seller Info */}
              {(booking.buyer || booking.seller) && (
                <Card>
                  <CardHeader>
                    <CardTitle>{isBuyer ? "Seller Information" : "Buyer Information"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isBuyer && booking.seller ? (
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={booking.seller.profile_pic || undefined} />
                          <AvatarFallback>
                            {getUserName(booking.seller).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{getUserName(booking.seller)}</p>
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate(`/sellers/${booking.seller?.id}`)}
                          >
                            View Profile
                          </Button>
                        </div>
                      </div>
                    ) : booking.buyer ? (
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={booking.buyer.profile_pic || undefined} />
                          <AvatarFallback>
                            {getUserName(booking.buyer).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{getUserName(booking.buyer)}</p>
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate(`/sellers/${booking.buyer?.id}`)}
                          >
                            View Profile
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Seller Actions */}
                  {isSeller && booking.status === "pending" && (
                    <>
                      <Button
                        onClick={handleAccept}
                        disabled={updating}
                        className="w-full"
                      >
                        {updating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Accept Booking
                          </>
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            disabled={updating}
                            className="w-full"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject Booking
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Booking</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to reject this booking? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleStatusUpdate("cancelled")}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Reject
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}

                  {isSeller && booking.status === "accepted" && (
                    <Button
                      onClick={() => handleStatusUpdate("in_progress")}
                      disabled={updating}
                      className="w-full"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Mark as In Progress"
                      )}
                    </Button>
                  )}

                  {isSeller && booking.status === "in_progress" && (
                    <Button
                      onClick={() => handleStatusUpdate("delivered")}
                      disabled={updating}
                      className="w-full"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark as Delivered
                        </>
                      )}
                    </Button>
                  )}

                  {/* Buyer confirmation when delivered */}
                  {isBuyer && booking.status === "delivered" && (
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Service Delivered
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          The seller has marked this service as delivered. Please review and confirm if you're satisfied. Payment will be released upon your confirmation.
                        </p>
                      </div>
                      <Button
                        onClick={handleConfirmCompletion}
                        disabled={updating}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {updating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Confirm Completion & Release Payment
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Buyer/Seller Cancel Actions */}
                  {(isBuyer || isSeller) &&
                    (booking.status === "pending" || booking.status === "accepted") && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={updating}
                            className="w-full"
                          >
                            {updating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Booking
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel this booking? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleCancel}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Cancel Booking
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                  {/* Delivered Status (Seller view) */}
                  {isSeller && booking.status === "delivered" && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800 text-center">
                      <CheckCircle2 className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Awaiting Buyer Confirmation
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        The buyer will confirm completion to release payment
                      </p>
                    </div>
                  )}

                  {/* Completed Status */}
                  {booking.status === "completed" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-md text-center">
                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium">Booking Completed</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Payment has been released to the seller
                        </p>
                      </div>

                      {/* Review Section for Buyers */}
                      {isBuyer && (
                        <div>
                          {checkingReview ? (
                            <div className="p-4 bg-muted rounded-md text-center">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                              <p className="text-xs text-muted-foreground">Checking review status...</p>
                            </div>
                          ) : hasReview ? (
                            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800 text-center">
                              <Star className="h-6 w-6 text-green-500 mx-auto mb-2 fill-green-500" />
                              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                Review Submitted
                              </p>
                              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                Thank you for your feedback!
                              </p>
                            </div>
                          ) : showReviewForm ? (
                            <ReviewForm
                              bookingId={id}
                              onSuccess={handleReviewSuccess}
                              onCancel={() => setShowReviewForm(false)}
                            />
                          ) : (
                            <Button
                              onClick={() => setShowReviewForm(true)}
                              className="w-full"
                              variant="outline"
                            >
                              <Star className="mr-2 h-4 w-4" />
                              Leave a Review
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cancelled Status */}
                  {booking.status === "cancelled" && (
                    <div className="p-4 bg-destructive/10 rounded-md text-center">
                      <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                      <p className="text-sm font-medium text-destructive">Booking Cancelled</p>
                    </div>
                  )}

                  {/* View Service Button */}
                  {booking.service_id && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/service/${booking.service_id}`)}
                    >
                      View Service Details
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

