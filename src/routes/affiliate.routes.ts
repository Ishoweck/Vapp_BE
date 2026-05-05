import { Router } from 'express';
import { affiliateController } from '../controllers/affiliate.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';

const router = Router();

// Public route — must be registered BEFORE router.use(authenticate)
router.get(
  '/track/:code',
  asyncHandler(affiliateController.trackClick.bind(affiliateController))
);

// All remaining affiliate routes require authentication
router.use(authenticate);

const generateLinkValidation = [
  body('productId').notEmpty().withMessage('Product ID is required'),
];

// Activate affiliate account
router.post(
  '/activate',
  asyncHandler(affiliateController.activateAffiliate.bind(affiliateController))
);

// Generate affiliate links
router.post(
  '/generate-link',
  validate(generateLinkValidation),
  asyncHandler(affiliateController.generateAffiliateLink.bind(affiliateController))
);

router.post(
  '/generate-general-link',
  asyncHandler(affiliateController.generateGeneralLink.bind(affiliateController))
);

// Dashboard and analytics
router.get(
  '/dashboard',
  asyncHandler(affiliateController.getAffiliateDashboard.bind(affiliateController))
);

router.get(
  '/earnings',
  asyncHandler(affiliateController.getAffiliateEarnings.bind(affiliateController))
);

// Leaderboard
router.get(
  '/leaderboard',
  asyncHandler(affiliateController.getAffiliateLeaderboard.bind(affiliateController))
);

// Admin routes
router.get(
  '/admin/all',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(affiliateController.getAllAffiliates.bind(affiliateController))
);

export default router;
