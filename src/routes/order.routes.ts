// routes/order.routes.ts
import { Router, Response } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validation';
import { UserRole, AuthRequest } from '../types';

const router = Router();

// All order routes require authentication
router.use(authenticate);

// ✅ Shipping address validation (optional for digital products)
const createOrderValidation = [
  body('shippingAddress.street')
    .optional()
    .notEmpty()
    .withMessage('Street address is required for physical products'),
  body('shippingAddress.city')
    .optional()
    .notEmpty()
    .withMessage('City is required for physical products'),
  body('shippingAddress.state')
    .optional()
    .notEmpty()
    .withMessage('State is required for physical products'),
  body('shippingAddress.country')
    .optional()
    .notEmpty()
    .withMessage('Country is required for physical products'),
  // ✅ UPDATED: createOrder is now wallet-only
  // Card payments use /initialize-payment → /confirm-payment flow
  body('paymentMethod')
    .isIn(['wallet'])
    .withMessage('This endpoint only accepts wallet payments. Use /initialize-payment for card payments.'),
  body('deliveryType')
    .optional()
    .isIn(['standard', 'express', 'same_day', 'pickup', 'digital'])
    .withMessage('Invalid delivery type'),
];

// ✅ NEW: Validation for initialize-payment
const initializePaymentValidation = [
  body('paymentMethod')
    .isIn(['paystack', 'flutterwave'])
    .withMessage('Only card payment methods (paystack, flutterwave) can use this endpoint'),
  body('shippingAddress').optional().isObject(),
  body('deliveryType')
    .optional()
    .isIn(['standard', 'express', 'same_day', 'pickup', 'digital'])
    .withMessage('Invalid delivery type'),
];

// ✅ NEW: Validation for confirm-payment
const confirmPaymentValidation = [
  body('provider')
    .isIn(['paystack', 'flutterwave'])
    .withMessage('Valid payment provider required'),
  body('checkoutSnapshot')
    .isObject()
    .withMessage('Checkout snapshot is required'),
];

const cancelOrderValidation = [
  body('cancelReason').notEmpty().withMessage('Cancel reason is required'),
];

const updateStatusValidation = [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
];

const getDeliveryRatesValidation = [
  query('city').notEmpty().withMessage('City is required'),
  query('state').notEmpty().withMessage('State is required'),
  query('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
];

// ============================================================
// GET ROUTES
// ============================================================

// Get delivery rates - BEFORE other routes to prevent conflicts
router.get(
  '/delivery-rates',
  validate(getDeliveryRatesValidation),
  asyncHandler(orderController.getDeliveryRates.bind(orderController))
);

// Payment verification - kept as webhook fallback
router.get(
  '/payment/verify/:reference',
  asyncHandler(orderController.verifyPayment.bind(orderController))
);

// Get user's digital products
router.get('/my-digital-products', asyncHandler(orderController.getUserDigitalProducts.bind(orderController)));

// Customer orders
router.get('/my-orders', asyncHandler(orderController.getUserOrders.bind(orderController)));

// Vendor get single order - BEFORE generic :id
router.get(
  '/vendor/orders/:id',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(orderController.getVendorOrder.bind(orderController))
);

// Vendor orders list
router.get(
  '/vendor/orders',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(orderController.getVendorOrders.bind(orderController))
);

// Track order
router.get('/:id/track', asyncHandler(orderController.trackOrder.bind(orderController)));

// Download digital product
router.get('/:id/download/:itemId', asyncHandler(orderController.downloadDigitalProduct.bind(orderController)));

// Generic get order - AFTER all specific routes
router.get('/:id', asyncHandler(orderController.getOrder.bind(orderController)));

// ============================================================
// POST ROUTES
// ============================================================

// ✅ NEW: Initialize payment (no order created yet)
// For Paystack/Flutterwave card payments — Step 1
router.post(
  '/initialize-payment',
  validate(initializePaymentValidation),
  asyncHandler(orderController.initializePayment.bind(orderController))
);

// ✅ NEW: Confirm payment & create order atomically
// After user pays in WebView — Step 2
router.post(
  '/confirm-payment/:reference',
  validate(confirmPaymentValidation),
  asyncHandler(orderController.confirmPayment.bind(orderController))
);

// Create order — WALLET PAYMENTS ONLY
// Card payments must use /initialize-payment → /confirm-payment flow
router.post(
  '/',
  validate(createOrderValidation),
  asyncHandler(orderController.createOrder.bind(orderController))
);

// Cancel order
router.post(
  '/:id/cancel',
  validate(cancelOrderValidation),
  asyncHandler(orderController.cancelOrder.bind(orderController))
);

// ============================================================
// PUT ROUTES
// ============================================================

// Vendor update order status
router.put(
  '/:id/status',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(updateStatusValidation),
  asyncHandler(orderController.updateOrderStatus.bind(orderController))
);

export default router;