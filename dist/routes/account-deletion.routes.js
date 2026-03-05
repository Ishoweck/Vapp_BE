"use strict";
// ============================================================
// ACCOUNT DELETION ROUTES
// File: routes/account-deletion.routes.ts
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const account_deletion_controller_1 = require("../controllers/account-deletion.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// ============================================================
// USER ROUTES (Authenticated users)
// ============================================================
router.use(auth_1.authenticate);
const requestDeletionValidation = [
    (0, express_validator_1.body)('reason')
        .isIn([
        'privacy_concerns',
        'not_using_anymore',
        'found_alternative',
        'too_many_emails',
        'bad_experience',
        'technical_issues',
        'account_security',
        'other',
    ])
        .withMessage('Invalid deletion reason'),
    (0, express_validator_1.body)('additionalDetails')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Additional details must be less than 1000 characters'),
];
/**
 * POST /api/v1/account-deletion/request
 * Request account deletion
 */
router.post('/request', (0, validation_1.validate)(requestDeletionValidation), (0, error_1.asyncHandler)(account_deletion_controller_1.accountDeletionController.requestAccountDeletion.bind(account_deletion_controller_1.accountDeletionController)));
/**
 * GET /api/v1/account-deletion/status
 * Get deletion request status
 */
router.get('/status', (0, error_1.asyncHandler)(account_deletion_controller_1.accountDeletionController.getDeletionRequestStatus.bind(account_deletion_controller_1.accountDeletionController)));
/**
 * POST /api/v1/account-deletion/cancel
 * Cancel deletion request
 */
router.post('/cancel', (0, error_1.asyncHandler)(account_deletion_controller_1.accountDeletionController.cancelDeletionRequest.bind(account_deletion_controller_1.accountDeletionController)));
// ============================================================
// ADMIN ROUTES
// ============================================================
/**
 * GET /api/v1/account-deletion/admin/requests
 * Get all deletion requests (Admin only)
 * Query: ?page=1&limit=20&status=pending
 */
router.get('/admin/requests', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(account_deletion_controller_1.accountDeletionController.getAllDeletionRequests.bind(account_deletion_controller_1.accountDeletionController)));
/**
 * POST /api/v1/account-deletion/admin/approve/:requestId
 * Approve deletion request (Admin only)
 */
router.post('/admin/approve/:requestId', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(account_deletion_controller_1.accountDeletionController.approveDeletionRequest.bind(account_deletion_controller_1.accountDeletionController)));
const rejectDeletionValidation = [
    (0, express_validator_1.body)('rejectionReason')
        .notEmpty()
        .withMessage('Rejection reason is required')
        .isLength({ max: 500 })
        .withMessage('Rejection reason must be less than 500 characters'),
];
/**
 * POST /api/v1/account-deletion/admin/reject/:requestId
 * Reject deletion request (Admin only)
 */
router.post('/admin/reject/:requestId', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, validation_1.validate)(rejectDeletionValidation), (0, error_1.asyncHandler)(account_deletion_controller_1.accountDeletionController.rejectDeletionRequest.bind(account_deletion_controller_1.accountDeletionController)));
exports.default = router;
//# sourceMappingURL=account-deletion.routes.js.map