import express from 'express';
import sellerController from '../controllers/sellerController.js';
import vendorProfileController from '../controllers/vendorProfileController.js';
import { responseHandler } from '../middleware/responseHandler.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Signed-in vendor's own profile: contact details + portfolio. Declared before
// the /:sellerId routes so "me" is never read as a seller id.
router.get('/me/profile', verifyToken, responseHandler(vendorProfileController.getMyProfile));
router.put('/me/contact', verifyToken, responseHandler(vendorProfileController.updateMyContact));
router.post('/me/portfolio', verifyToken, responseHandler(vendorProfileController.createPortfolioItem));
router.put('/me/portfolio/:itemId', verifyToken, responseHandler(vendorProfileController.updatePortfolioItem));
router.delete('/me/portfolio/:itemId', verifyToken, responseHandler(vendorProfileController.deletePortfolioItem));

// Public: vendor page — bio, contacts, portfolio, communities, live services.
router.get('/:sellerId/public', responseHandler(vendorProfileController.getPublicProfile));

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
 