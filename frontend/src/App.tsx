import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SellerDashboardLayout } from "@/layouts/SellerDashboardLayout";
import Index from "./pages/Index";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import SellerProfile from "./pages/SellerProfile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import ListService from "./pages/ListService";
import NotFound from "./pages/NotFound";
import SellerDashboard from "./pages/seller/SellerDashboard";
import SellerServices from "./pages/seller/SellerServices";
import SellerBookings from "./pages/seller/SellerBookings";
import SellerPayments from "./pages/seller/SellerPayments";
import SellerProfilePage from "./pages/seller/SellerProfile";
import SellerDashboardPreview from "./pages/SellerDashboardPreview";
import Bookings from "./pages/Bookings";
import BookingDetail from "./pages/BookingDetail";
import BecomeAHustler from "./pages/BecomeAHustler";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/service/:id" element={<ServiceDetail />} />
            <Route path="/sellers/:id" element={<SellerProfile />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/my-bookings" element={<Bookings />} />
            <Route path="/booking/:id" element={<BookingDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/become-a-hustler" element={<BecomeAHustler />} />
            <Route path="/list-service" element={<ListService />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:conversationId" element={<Messages />} />
            
            {/* ⚠️ DEVELOPMENT PREVIEW - DELETE BEFORE PRODUCTION ⚠️ */}
            <Route path="/seller-dashboard-preview" element={<SellerDashboardPreview />}>
              <Route index element={<SellerDashboard />} />
              <Route path="services" element={<SellerServices />} />
              <Route path="bookings" element={<SellerBookings />} />
              <Route path="payments" element={<SellerPayments />} />
              <Route path="profile" element={<SellerProfilePage />} />
            </Route>
            
            {/* Seller Dashboard Routes */}
            <Route path="/seller" element={<SellerDashboardLayout />}>
              <Route path="dashboard" element={<SellerDashboard />} />
              <Route path="services" element={<SellerServices />} />
              <Route path="bookings" element={<SellerBookings />} />
              <Route path="payments" element={<SellerPayments />} />
              <Route path="profile" element={<SellerProfilePage />} />
            </Route>
            
            {/* My Services route - redirects to seller services */}
            <Route path="/my-services" element={<SellerDashboardLayout />}>
              <Route index element={<SellerServices />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
