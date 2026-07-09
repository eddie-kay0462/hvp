import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { SellerDashboardLayout } from "@/layouts/SellerDashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
// Landing page is eager so first paint on the most common entry has no fallback flash.
import Index from "./pages/Index";

// Every other route is code-split: its JS chunk loads on navigation, not at startup.
const Services = lazy(() => import("./pages/Services"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const SellerProfile = lazy(() => import("./pages/SellerProfile"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ListService = lazy(() => import("./pages/ListService"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const SellerInsights = lazy(() => import("./pages/seller/SellerInsights"));
const SellerServices = lazy(() => import("./pages/seller/SellerServices"));
const SellerBookings = lazy(() => import("./pages/seller/SellerBookings"));
const SellerPayments = lazy(() => import("./pages/seller/SellerPayments"));
const SellerProfilePage = lazy(() => import("./pages/seller/SellerProfile"));
const Bookings = lazy(() => import("./pages/Bookings"));
const BookingDetail = lazy(() => import("./pages/BookingDetail"));
const BecomeAHustler = lazy(() => import("./pages/BecomeAHustler"));
const Profile = lazy(() => import("./pages/Profile"));
const Messages = lazy(() => import("./pages/Messages"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const InvoicePage = lazy(() => import("./pages/invoicePage"));
const AdminPendingServices = lazy(() => import("./pages/admin/AdminPendingServices"));
const AdminMomoPayments = lazy(() => import("./pages/admin/AdminMomoPayments"));
const AdminPayoutQueue = lazy(() => import("./pages/admin/AdminPayoutQueue"));
const AdminDisputes = lazy(() => import("./pages/admin/AdminDisputes"));

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
};

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div
      className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
      role="status"
      aria-label="Loading"
    />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/service/:id" element={<ServiceDetail />} />
            <Route path="/sellers/:id" element={<SellerProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/become-a-hustler" element={<BecomeAHustler />} />

            {/* Protected: any authenticated user */}
            <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
            <Route path="/my-bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
            <Route path="/booking/:id" element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/payment/callback" element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>} />
            <Route path="/invoice/:invoiceId" element={<ProtectedRoute><InvoicePage /></ProtectedRoute>} />
            <Route path="/setup-service" element={<ProtectedRoute><ListService /></ProtectedRoute>} />
            <Route path="/list-service" element={<ProtectedRoute><ListService /></ProtectedRoute>} />

            {/* Protected: seller dashboard */}
            <Route path="/seller" element={<ProtectedRoute><SellerDashboardLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<SellerDashboard />} />
              <Route path="insights" element={<SellerInsights />} />
              <Route path="services" element={<SellerServices />} />
              <Route path="bookings" element={<SellerBookings />} />
              <Route path="payments" element={<SellerPayments />} />
              <Route path="profile" element={<SellerProfilePage />} />
            </Route>

            <Route path="/my-services" element={<ProtectedRoute><SellerDashboardLayout /></ProtectedRoute>}>
              <Route index element={<SellerServices />} />
            </Route>

            {/* Protected: admin only */}
            <Route
              path="/admin/services/pending"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPendingServices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payments/momo"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminMomoPayments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payouts/pending"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPayoutQueue />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/disputes"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDisputes />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
