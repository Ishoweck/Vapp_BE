import { Response } from 'express';
/**
 * GET /admin/dashboard
 * Platform overview stats - accessible by all admin roles
 */
export declare const getDashboard: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/analytics/revenue
 * Revenue analytics with date range
 */
export declare const getRevenueAnalytics: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/analytics/users
 * User growth analytics
 */
export declare const getUserAnalytics: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/analytics/orders
 * Order analytics
 */
export declare const getOrderAnalytics: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /admin/admins/create
 * Create a new admin account
 */
export declare const createAdmin: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/admins
 * List all admin users
 */
export declare const getAllAdmins: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/admins/:id/role
 * Update an admin's role
 */
export declare const updateAdminRole: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * DELETE /admin/admins/:id
 * Remove admin privileges (reverts to customer)
 */
export declare const removeAdmin: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/users
 * List all users with filtering, pagination, search
 */
export declare const getAllUsers: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/users/:id
 * Get detailed user info including wallet, orders, vendor profile
 */
export declare const getUserDetails: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/users/:id/status
 * Update user status (active, suspended, inactive)
 */
export declare const updateUserStatus: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/users/:id/role
 * Update user role (SUPER_ADMIN only)
 */
export declare const updateUserRole: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * DELETE /admin/users/:id
 * Delete a user account
 */
export declare const deleteUser: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/vendors
 * List all vendors with filtering
 */
export declare const getAllVendors: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/vendors/:id
 * Get detailed vendor profile with analytics
 */
export declare const getVendorDetails: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/vendors/:id/verify
 * Verify or reject vendor KYC
 */
export declare const verifyVendor: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/vendors/:id/status
 * Toggle vendor active status
 */
export declare const toggleVendorStatus: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/vendors/:id/commission
 * Update vendor commission rate
 */
export declare const updateVendorCommission: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/products
 * List all products with filtering
 */
export declare const getAllProducts: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/products/:id
 * Get detailed product info
 */
export declare const getProductDetails: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/products/:id/status
 * Update product status (approve, reject, deactivate)
 */
export declare const updateProductStatus: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/products/:id/featured
 * Toggle product featured status
 */
export declare const toggleProductFeatured: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * DELETE /admin/products/:id
 * Delete a product
 */
export declare const deleteProduct: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/orders
 * List all orders with filtering
 */
export declare const getAllOrders: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/orders/:id
 * Get detailed order info
 */
export declare const getOrderDetails: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/orders/:id/status
 * Update order status
 */
export declare const updateOrderStatus: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /admin/orders/:id/refund
 * Process order refund
 */
export declare const processRefund: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/finance/overview
 * Financial overview - total revenue, commissions, withdrawals, etc.
 */
export declare const getFinancialOverview: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/finance/transactions
 * All wallet transactions across the platform
 */
export declare const getAllTransactions: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/finance/withdrawals
 * Pending withdrawal requests
 */
export declare const getPendingWithdrawals: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /admin/finance/withdrawals/:walletId/:transactionId/process
 * Process a pending withdrawal (approve or reject)
 */
export declare const processWithdrawal: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/reviews
 * List all reviews with filtering
 */
export declare const getAllReviews: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/reviews/:id/status
 * Approve or reject a review
 */
export declare const updateReviewStatus: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * DELETE /admin/reviews/:id
 * Delete a review
 */
export declare const deleteReview: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/disputes
 * List all disputes
 */
export declare const getAllDisputes: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/disputes/:id
 * Get dispute details
 */
export declare const getDisputeDetails: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/disputes/:id/review
 * Mark dispute as under review
 */
export declare const markDisputeUnderReview: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/disputes/:id/resolve
 * Resolve dispute with refund decision
 */
export declare const resolveDispute: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /admin/disputes/:id/message
 * Add admin message to dispute
 */
export declare const addDisputeMessage: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/coupons
 * List all coupons
 */
export declare const getAllCoupons: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /admin/coupons
 * Create a new coupon
 */
export declare const createCoupon: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/coupons/:id
 * Update coupon
 */
export declare const updateCoupon: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * DELETE /admin/coupons/:id
 * Delete coupon
 */
export declare const deleteCoupon: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/categories
 * List all categories (including inactive)
 */
export declare const getAllCategories: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /admin/categories
 * Create a new category
 */
export declare const createCategory: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/categories/:id
 * Update category
 */
export declare const updateCategory: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * DELETE /admin/categories/:id
 * Delete category
 */
export declare const deleteCategory: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /admin/notifications/broadcast
 * Broadcast notification to all users or a segment
 */
export declare const broadcastNotification: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/notifications
 * Get notification send history (latest system-level notifications)
 */
export declare const getNotificationHistory: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/account-deletions
 * List all account deletion requests
 */
export declare const getAccountDeletionRequests: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /admin/account-deletions/:id/approve
 * Approve account deletion request
 */
export declare const approveAccountDeletion: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /admin/account-deletions/:id/reject
 * Reject account deletion request
 */
export declare const rejectAccountDeletion: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/affiliates
 * List all affiliates with stats
 */
export declare const getAllAffiliates: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/affiliates/:userId/status
 * Toggle affiliate status
 */
export declare const toggleAffiliateStatus: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/challenges
 * List all challenges
 */
export declare const getAllChallenges: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /admin/challenges
 * Create a new challenge
 */
export declare const createChallenge: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /admin/challenges/:id
 * Update challenge
 */
export declare const updateChallenge: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * DELETE /admin/challenges/:id
 * Delete challenge
 */
export declare const deleteChallenge: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/reports/sales
 * Sales report with filters
 */
export declare const getSalesReport: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/reports/vendors
 * Vendor performance report
 */
export declare const getVendorReport: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/reports/products
 * Product performance report
 */
export declare const getProductReport: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/activity-log
 * Get recent platform activity
 */
export declare const getActivityLog: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /admin/search
 * Global admin search across users, products, orders, vendors
 */
export declare const globalSearch: (req: import("express").Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=admin.controller.d.ts.map