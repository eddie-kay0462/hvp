import { SellerSidebar } from "@/components/dashboard/SellerSidebar";
import { Outlet, Navigate } from "react-router-dom";
import { useUserType } from "@/hooks/useUserType";

export const SellerDashboardLayout = () => {
  const { loading, canListServices } = useUserType();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading seller dashboard...
      </div>
    );
  }

  if (!canListServices) {
    return <Navigate to="/bookings" replace />;
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <SellerSidebar />
      <main className="min-w-0 flex-1 overflow-auto pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
};
