"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/dispute.routes.ts
const express_1 = require("express");
const dispute_controller_1 = require("../controllers/dispute.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const types_1 = require("../types");
const Dispute_1 = require("../models/Dispute");
const router = (0, express_1.Router)();
// All dispute routes require authentication
router.use(auth_1.authenticate);
// ============================================================
// VALIDATION
// ============================================================
const createDisputeValidation = [
    (0, express_validator_1.body)('orderId')
        .isMongoId()
        .withMessage('Valid order ID is required'),
    (0, express_validator_1.body)('reason')
        .isIn(Object.values(Dispute_1.DisputeReason))
        .withMessage(`Reason must be one of: ${Object.values(Dispute_1.DisputeReason).join(', ')}`),
    (0, express_validator_1.body)('description')
        .isString()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description must be between 10 and 2000 characters'),
    (0, express_validator_1.body)('evidence')
        .optional()
        .isArray()
        .withMessage('Evidence must be an array of image URLs'),
    (0, express_validator_1.body)('vendorId')
        .optional()
        .isMongoId()
        .withMessage('Valid vendor ID required'),
    (0, express_validator_1.body)('disputedItems')
        .optional()
        .isArray()
        .withMessage('Disputed items must be an array'),
];
const vendorRespondValidation = [
    (0, express_validator_1.body)('message')
        .isString()
        .isLength({ min: 5, max: 2000 })
        .withMessage('Response message must be between 5 and 2000 characters'),
    (0, express_validator_1.body)('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array of URLs'),
];
const addMessageValidation = [
    (0, express_validator_1.body)('message')
        .isString()
        .isLength({ min: 1, max: 2000 })
        .withMessage('Message is required (max 2000 characters)'),
    (0, express_validator_1.body)('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array of URLs'),
];
const resolveDisputeValidation = [
    (0, express_validator_1.body)('refundType')
        .isIn(['full', 'partial', 'none'])
        .withMessage('Refund type must be "full", "partial", or "none"'),
    (0, express_validator_1.body)('refundAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Refund amount must be a positive number'),
    (0, express_validator_1.body)('resolution')
        .isString()
        .isLength({ min: 5, max: 2000 })
        .withMessage('Resolution note is required (5-2000 characters)'),
];
// ============================================================
// CUSTOMER ROUTES
// ============================================================
// Open a dispute
router.post('/', (0, validation_1.validate)(createDisputeValidation), (0, error_1.asyncHandler)(dispute_controller_1.disputeController.createDispute.bind(dispute_controller_1.disputeController)));
// Get my disputes
router.get('/my-disputes', (0, error_1.asyncHandler)(dispute_controller_1.disputeController.getMyDisputes.bind(dispute_controller_1.disputeController)));
// Add message to dispute thread (customer or vendor)
router.post('/:id/messages', (0, validation_1.validate)(addMessageValidation), (0, error_1.asyncHandler)(dispute_controller_1.disputeController.addMessage.bind(dispute_controller_1.disputeController)));
// Get single dispute (customer, vendor, or admin)
router.get('/:id', (0, error_1.asyncHandler)(dispute_controller_1.disputeController.getDispute.bind(dispute_controller_1.disputeController)));
// ============================================================
// VENDOR ROUTES
// ============================================================
// Get disputes against vendor
router.get('/vendor/disputes', (0, auth_1.authorize)(types_1.UserRole.VENDOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(dispute_controller_1.disputeController.getVendorDisputes.bind(dispute_controller_1.disputeController)));
// Vendor respond to dispute
router.post('/:id/vendor-respond', (0, auth_1.authorize)(types_1.UserRole.VENDOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, validation_1.validate)(vendorRespondValidation), (0, error_1.asyncHandler)(dispute_controller_1.disputeController.vendorRespond.bind(dispute_controller_1.disputeController)));
// ============================================================
// ADMIN ROUTES
// ============================================================
// Get all disputes (admin)
router.get('/admin/all', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(dispute_controller_1.disputeController.getAllDisputes.bind(dispute_controller_1.disputeController)));
// Mark dispute as under review
router.put('/:id/review', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(dispute_controller_1.disputeController.markUnderReview.bind(dispute_controller_1.disputeController)));
// Resolve dispute (full refund, partial refund, or reject)
router.put('/:id/resolve', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, validation_1.validate)(resolveDisputeValidation), (0, error_1.asyncHandler)(dispute_controller_1.disputeController.resolveDispute.bind(dispute_controller_1.disputeController)));
// Admin add message/note
router.post('/:id/admin-message', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, validation_1.validate)(addMessageValidation), (0, error_1.asyncHandler)(dispute_controller_1.disputeController.adminAddMessage.bind(dispute_controller_1.disputeController)));
exports.default = router;
//# sourceMappingURL=dispute.routes.js.map