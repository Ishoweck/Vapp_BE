// routes/dispute.routes.ts
import { Router } from 'express';
import { disputeController } from '../controllers/dispute.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';
import { DisputeReason } from '../models/Dispute';

const router = Router();

// All dispute routes require authentication
router.use(authenticate);

// ============================================================
// VALIDATION
// ============================================================

const createDisputeValidation = [
  body('orderId')
    .isMongoId()
    .withMessage('Valid order ID is required'),
  body('reason')
    .isIn(Object.values(DisputeReason))
    .withMessage(`Reason must be one of: ${Object.values(DisputeReason).join(', ')}`),
  body('description')
    .isString()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('evidence')
    .optional()
    .isArray()
    .withMessage('Evidence must be an array of image URLs'),
  body('vendorId')
    .optional()
    .isMongoId()
    .withMessage('Valid vendor ID required'),
  body('disputedItems')
    .optional()
    .isArray()
    .withMessage('Disputed items must be an array'),
];

const vendorRespondValidation = [
  body('message')
    .isString()
    .isLength({ min: 5, max: 2000 })
    .withMessage('Response message must be between 5 and 2000 characters'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array of URLs'),
];

const addMessageValidation = [
  body('message')
    .isString()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message is required (max 2000 characters)'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array of URLs'),
];

const resolveDisputeValidation = [
  body('refundType')
    .isIn(['full', 'partial', 'none'])
    .withMessage('Refund type must be "full", "partial", or "none"'),
  body('refundAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Refund amount must be a positive number'),
  body('resolution')
    .isString()
    .isLength({ min: 5, max: 2000 })
    .withMessage('Resolution note is required (5-2000 characters)'),
];

// ============================================================
// CUSTOMER ROUTES
// ============================================================

// Open a dispute
router.post(
  '/',
  validate(createDisputeValidation),
  asyncHandler(disputeController.createDispute.bind(disputeController))
);

// Get my disputes
router.get(
  '/my-disputes',
  asyncHandler(disputeController.getMyDisputes.bind(disputeController))
);

// Add message to dispute thread (customer or vendor)
router.post(
  '/:id/messages',
  validate(addMessageValidation),
  asyncHandler(disputeController.addMessage.bind(disputeController))
);

// Get single dispute (customer, vendor, or admin)
router.get(
  '/:id',
  asyncHandler(disputeController.getDispute.bind(disputeController))
);

// ============================================================
// VENDOR ROUTES
// ============================================================

// Get disputes against vendor
router.get(
  '/vendor/disputes',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(disputeController.getVendorDisputes.bind(disputeController))
);

// Vendor respond to dispute
router.post(
  '/:id/vendor-respond',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(vendorRespondValidation),
  asyncHandler(disputeController.vendorRespond.bind(disputeController))
);

// ============================================================
// ADMIN ROUTES
// ============================================================

// Get all disputes (admin)
router.get(
  '/admin/all',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(disputeController.getAllDisputes.bind(disputeController))
);

// Mark dispute as under review
router.put(
  '/:id/review',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(disputeController.markUnderReview.bind(disputeController))
);

// Resolve dispute (full refund, partial refund, or reject)
router.put(
  '/:id/resolve',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(resolveDisputeValidation),
  asyncHandler(disputeController.resolveDispute.bind(disputeController))
);

// Admin add message/note
router.post(
  '/:id/admin-message',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(addMessageValidation),
  asyncHandler(disputeController.adminAddMessage.bind(disputeController))
);

export default router;