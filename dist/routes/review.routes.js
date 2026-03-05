"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const review_controller_1 = require("../controllers/review.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
const createReviewValidation = [
    (0, express_validator_1.body)('productId').notEmpty().withMessage('Product ID is required'),
    (0, express_validator_1.body)('orderId').notEmpty().withMessage('Order ID is required'),
    (0, express_validator_1.body)('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    (0, express_validator_1.body)('comment').notEmpty().withMessage('Comment is required'),
];
// Public routes
router.get('/product/:productId', (0, error_1.asyncHandler)(review_controller_1.reviewController.getProductReviews.bind(review_controller_1.reviewController)));
// Authenticated routes
router.use(auth_1.authenticate);
router.post('/', (0, validation_1.validate)(createReviewValidation), (0, error_1.asyncHandler)(review_controller_1.reviewController.createReview.bind(review_controller_1.reviewController)));
router.get('/my-reviews', (0, error_1.asyncHandler)(review_controller_1.reviewController.getUserReviews.bind(review_controller_1.reviewController)));
router.put('/:reviewId', (0, error_1.asyncHandler)(review_controller_1.reviewController.updateReview.bind(review_controller_1.reviewController)));
router.delete('/:reviewId', (0, error_1.asyncHandler)(review_controller_1.reviewController.deleteReview.bind(review_controller_1.reviewController)));
router.post('/:reviewId/helpful', (0, error_1.asyncHandler)(review_controller_1.reviewController.markHelpful.bind(review_controller_1.reviewController)));
router.post('/:reviewId/report', (0, express_validator_1.body)('reason').notEmpty().withMessage('Report reason is required'), (0, error_1.asyncHandler)(review_controller_1.reviewController.reportReview.bind(review_controller_1.reviewController)));
exports.default = router;
//# sourceMappingURL=review.routes.js.map