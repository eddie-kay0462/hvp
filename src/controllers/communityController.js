import * as communityService from '../services/communityService.js';

const getCommunity = async (req) => communityService.getCommunity(req.params.slug);

const joinCommunity = async (req) => {
  const userId = req.user?.id;
  if (!userId) return { status: 401, msg: 'Unauthorized: user not found', data: null };
  return communityService.joinCommunity(userId, req.params.slug);
};

const getMyCommunities = async (req) => {
  const userId = req.user?.id;
  if (!userId) return { status: 401, msg: 'Unauthorized: user not found', data: null };
  return communityService.getUserCommunities(userId);
};

export default {
  getCommunity,
  joinCommunity,
  getMyCommunities,
};
