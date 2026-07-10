import express from 'express';
import sellerController from '../controllers/sellerController.js';
import { responseHandler } from '../middleware/responseHandler.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/sellers/setup
 * @desc    Complete seller setup with business info
 * @access  Private
 */
// Public: trust stats for the seller/service page (no auth).
router.get('/:sellerId/stats', responseHandler(sellerController.getPublicSellerStats));

router.post('/setup', verifyToken, responseHandler(sellerController.setupSeller));
router.post('/create-service', verifyToken, responseHandler(sellerController.createService));
router.put("/edit-service/:serviceId" , verifyToken,responseHandler(sellerController.editService));
router.put("/toggleServiceStatus/:serviceId" , verifyToken,responseHandler(sellerController.toggleService));
export default router;
 