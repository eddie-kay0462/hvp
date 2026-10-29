import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CAMPUS } from "@/config/appMode";
import api from "@/lib/api";
import CampusHome from "./pages/CampusHome";

// Campus sites are discovery-only. Auth and listing pages are shared with the
// main marketplace; Navbar/Footer switch to campus versions on their own.
const Services = lazy(() => import("@/pages/Services"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const ListService = lazy(() => import("@/pages/ListService"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const SellerServices = lazy(() => import("@/pages/seller/SellerServices"));
const CampusServiceDetail = lazy(() => import("./pages/CampusServiceDetail"));
const VendorPage = lazy(() => import("./pages/VendorPage"));
const CampusDashboardLayout = lazy(() => import("./pages/dashboard/CampusDashboardLayout"));
const ProfileTab = lazy(() => import("./pages/dashboard/ProfileTab"));
const PortfolioTab = lazy(() => import("./pages/dashboard/PortfolioTab"));

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
};

/**
 * Anyone signed in on a campus site belongs to that campus, so their services
 * show up in its catalog. Joining is idempotent; run it once per user per tab.
 */
const JoinCampus = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user || !CAMPUS) return;
    const key = `joined:${CAMPUS.slug}:${user.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // Storage unavailable (private mode) — joining again is harmless.
    }
    api.communities
      .join(CAMPUS.slug)
      .then(() => {
        try {
          sessionStorage.setItem(key, "1");
        } catch {
          /* ignore */
        }
      })
      .catch((err) => console.error(`Failed to join ${CAMPUS?.slug}:`, err));
  }, [user]);
  return null;
};

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" role="status" aria-label="Loading" />
  </div>
);

const toDashboard = <Navigate to="/dashboard" replace />;

const CampusApp = () => {
  useEffect(() => {
    if (CAMPUS) document.title = `Hustle Village · ${CAMPUS.shortName}`;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <JoinCampus />
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<CampusHome />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/service/:id" element={<CampusServiceDetail />} />
                  <Route path="/sellers/:id" element={<VendorPage />} />

                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  <Route path="/list-service" element={<ProtectedRoute><ListService /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><CampusDashboardLayout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="profile" replace />} />
                    <Route path="profile" element={<ProfileTab />} />
                    <Route path="portfolio" element={<PortfolioTab />} />
                    <Route path="services" element={<SellerServices />} />
                  </Route>

                  {/* Main-marketplace paths that shared pages link to */}
                  <Route path="/setup-service" element={<Navigate to="/list-service" replace />} />
                  <Route path="/my-services" element={<Navigate to="/dashboard/services" replace />} />
                  <Route path="/seller/services" element={<Navigate to="/dashboard/services" replace />} />
                  <Route path="/seller/profile" element={<Navigate to="/dashboard/profile" replace />} />
                  <Route path="/seller/*" element={toDashboard} />
                  <Route path="/profile" element={toDashboard} />
                  <Route path="/bookings" element={toDashboard} />
                  <Route path="/my-bookings" element={toDashboard} />
                  <Route path="/become-a-hustler" element={<Navigate to="/signup" replace />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default CampusApp;
