// ⚠️ FOR DEVELOPMENT ONLY - DELETE BEFORE PRODUCTION ⚠️
// This page allows previewing the seller dashboard without authentication
// Used for UI/UX testing and development purposes only

import { SellerDashboardLayout } from "@/layouts/SellerDashboardLayout";
import { Outlet, Routes, Route } from "react-router-dom";
import SellerDashboard from "./seller/SellerDashboard";
import SellerServices from "./seller/SellerServices";
import SellerBookings from "./seller/SellerBookings";
import SellerPayments from "./seller/SellerPayments";
import SellerProfilePage from "./seller/SellerProfile";

// Mock seller data for preview
export const MOCK_SELLER = {
  email: "preview.seller@ashesi.edu.gh",
  id: "preview-seller-123",
  name: "Preview Seller",
};

const SellerDashboardPreview = () => {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <SellerDashboardLayout />
    </div>
  );
};

export default SellerDashboardPreview;
