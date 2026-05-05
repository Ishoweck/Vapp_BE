"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const affiliate_controller_1 = require("../controllers/affiliate.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// Public route — must be registered BEFORE router.use(authenticate)
router.get('/track/:code', (0, error_1.asyncHandler)(affiliate_controller_1.affiliateController.trackClick.bind(affiliate_controller_1.affiliateController)));
// All remaining affiliate routes require authentication
router.use(auth_1.authenticate);
const generateLinkValidation = [
    (0, express_validator_1.body)('productId').notEmpty().withMessage('Product ID is required'),
];
// Activate affiliate account
router.post('/activate', (0, error_1.asyncHandler)(affiliate_controller_1.affiliateController.activateAffiliate.bind(affiliate_controller_1.affiliateController)));
// Generate affiliate links
router.post('/generate-link', (0, validation_1.validate)(generateLinkValidation), (0, error_1.asyncHandler)(affiliate_controller_1.affiliateController.generateAffiliateLink.bind(affiliate_controller_1.affiliateController)));
router.post('/generate-general-link', (0, error_1.asyncHandler)(affiliate_controller_1.affiliateController.generateGeneralLink.bind(affiliate_controller_1.affiliateController)));
// Dashboard and analytics
router.get('/dashboard', (0, error_1.asyncHandler)(affiliate_controller_1.affiliateController.getAffiliateDashboard.bind(affiliate_controller_1.affiliateController)));
router.get('/earnings', (0, error_1.asyncHandler)(affiliate_controller_1.affiliateController.getAffiliateEarnings.bind(affiliate_controller_1.affiliateController)));
// Leaderboard
router.get('/leaderboard', (0, error_1.asyncHandler)(affiliate_controller_1.affiliateController.getAffiliateLeaderboard.bind(affiliate_controller_1.affiliateController)));
// Admin routes
router.get('/admin/all', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(affiliate_controller_1.affiliateController.getAllAffiliates.bind(affiliate_controller_1.affiliateController)));
exports.default = router;
//# sourceMappingURL=affiliate.routes.js.map