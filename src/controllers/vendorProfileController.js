import * as vendorProfileService from '../services/vendorProfileService.js';

const UNAUTHORIZED = { status: 401, msg: 'Unauthorized: user not found', data: null };

const getPublicProfile = async (req) =>
  vendorProfileService.getPublicVendorProfile(req.params.sellerId);

const getMyProfile = async (req) => {
  const userId = req.user?.id;
  if (!userId) return UNAUTHORIZED;
  return vendorProfileService.getMyVendorProfile(userId);
};

const updateMyContact = async (req) => {
  const userId = req.user?.id;
  if (!userId) return UNAUTHORIZED;
  return vendorProfileService.updateMyContact(userId, req.body);
};

const createPortfolioItem = async (req) => {
  const userId = req.user?.id;
  if (!userId) return UNAUTHORIZED;
  return vendorProfileService.createPortfolioItem(userId, req.body);
};

const updatePortfolioItem = async (req) => {
  const userId = req.user?.id;
  if (!userId) return UNAUTHORIZED;
  return vendorProfileService.updatePortfolioItem(userId, req.params.itemId, req.body);
};

const deletePortfolioItem = async (req) => {
  const userId = req.user?.id;
  if (!userId) return UNAUTHORIZED;
  return vendorProfileService.deletePortfolioItem(userId, req.params.itemId);
};

export default {
  getPublicProfile,
  getMyProfile,
  updateMyContact,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
};
