import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { SellerDashboardLayout } from "@/layouts/SellerDashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import SellerProfile from "./pages/SellerProfile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import SetUpService from "./pages/SetUpService";
import ListService from "./pages/ListService";
import NotFound from "./pages/NotFound";
import SellerDashboard from "./pages/seller/SellerDashboard";
import SellerInsights from "./pages/seller/SellerInsights";
import SellerServices from "./pages/seller/SellerServices";
import SellerBookings from "./pages/seller/SellerBookings";
import SellerPayments from "./pages/seller/SellerPayments";
import SellerProfilePage from "./pages/seller/SellerProfile";
import Bookings from "./pages/Bookings";
import BookingDetail from "./pages/BookingDetail";
import BecomeAHustler from "./pages/BecomeAHustler";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import PaymentCallback from "./pages/PaymentCallback";
import InvoicePage from "./pages/invoicePage";
import AdminPendingServices from "./pages/admin/AdminPendingServices";
import AdminMomoPayments from "./pages/admin/AdminMomoPayments";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/service/:id" element={<ServiceDetail />} />
            <Route path="/sellers/:id" element={<SellerProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
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
            <Route path="/setup-service" element={<ProtectedRoute><SetUpService /></ProtectedRoute>} />
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

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
