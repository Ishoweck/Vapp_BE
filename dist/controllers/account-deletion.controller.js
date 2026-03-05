"use strict";
// ============================================================
// ACCOUNT DELETION CONTROLLER
// File: controllers/account-deletion.controller.ts
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountDeletionController = exports.AccountDeletionController = void 0;
const AccountDeletionRequest_1 = __importDefault(require("../models/AccountDeletionRequest"));
const User_1 = __importDefault(require("../models/User"));
const VendorProfile_1 = __importDefault(require("../models/VendorProfile"));
const Product_1 = __importDefault(require("../models/Product"));
const Order_1 = __importDefault(require("../models/Order"));
const error_1 = require("../middleware/error");
const logger_1 = require("../utils/logger");
class AccountDeletionController {
    /**
     * Request account deletion (User)
     */
    async requestAccountDeletion(req, res) {
        const { reason, additionalDetails } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            throw new error_1.AppError('Authentication required', 401);
        }
        // Check if there's already a pending request
        const existingRequest = await AccountDeletionRequest_1.default.findOne({
            user: userId,
            status: 'pending',
        });
        if (existingRequest) {
            throw new error_1.AppError('You already have a pending deletion request', 400);
        }
        // Check user role and get additional context
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        const deletionRequest = await AccountDeletionRequest_1.default.create({
            user: userId,
            reason,
            additionalDetails,
            userRole: user.role,
        });
        // If user is a vendor, check for pending orders
        if (user.role === 'vendor') {
            const pendingOrders = await Order_1.default.countDocuments({
                'items.vendor': userId,
                status: { $in: ['pending', 'confirmed', 'processing', 'shipped', 'in_transit'] },
            });
            if (pendingOrders > 0) {
                deletionRequest.hasPendingOrders = true;
                deletionRequest.pendingOrdersCount = pendingOrders;
                await deletionRequest.save();
            }
        }
        logger_1.logger.info(`Account deletion requested: ${userId}`);
        res.status(201).json({
            success: true,
            message: 'Account deletion request submitted successfully. Our team will review your request.',
            data: {
                deletionRequest: {
                    id: deletionRequest._id,
                    status: deletionRequest.status,
                    reason: deletionRequest.reason,
                    createdAt: deletionRequest.createdAt,
                },
            },
        });
    }
    /**
     * Get user's deletion request status (User)
     */
    async getDeletionRequestStatus(req, res) {
        const userId = req.user?.id;
        if (!userId) {
            throw new error_1.AppError('Authentication required', 401);
        }
        const deletionRequest = await AccountDeletionRequest_1.default.findOne({
            user: userId,
        })
            .sort({ createdAt: -1 })
            .select('status reason additionalDetails createdAt processedAt rejectionReason');
        if (!deletionRequest) {
            res.json({
                success: true,
                data: {
                    hasRequest: false,
                    deletionRequest: null,
                },
            });
            return;
        }
        res.json({
            success: true,
            data: {
                hasRequest: true,
                deletionRequest: {
                    id: deletionRequest._id,
                    status: deletionRequest.status,
                    reason: deletionRequest.reason,
                    additionalDetails: deletionRequest.additionalDetails,
                    createdAt: deletionRequest.createdAt,
                    processedAt: deletionRequest.processedAt,
                    rejectionReason: deletionRequest.rejectionReason,
                },
            },
        });
    }
    /**
     * Cancel deletion request (User)
     */
    async cancelDeletionRequest(req, res) {
        const userId = req.user?.id;
        if (!userId) {
            throw new error_1.AppError('Authentication required', 401);
        }
        const deletionRequest = await AccountDeletionRequest_1.default.findOne({
            user: userId,
            status: 'pending',
        });
        if (!deletionRequest) {
            throw new error_1.AppError('No pending deletion request found', 404);
        }
        deletionRequest.status = 'cancelled';
        await deletionRequest.save();
        logger_1.logger.info(`Account deletion cancelled: ${userId}`);
        res.json({
            success: true,
            message: 'Deletion request cancelled successfully',
        });
    }
    /**
     * Get all deletion requests (Admin)
     */
    async getAllDeletionRequests(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const filter = {};
        if (status) {
            filter.status = status;
        }
        const deletionRequests = await AccountDeletionRequest_1.default.find(filter)
            .populate('user', 'firstName lastName email role')
            .populate('processedBy', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await AccountDeletionRequest_1.default.countDocuments(filter);
        res.json({
            success: true,
            data: {
                deletionRequests,
            },
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    /**
     * Approve account deletion (Admin)
     */
    async approveDeletionRequest(req, res) {
        const { requestId } = req.params;
        const adminId = req.user?.id;
        if (!adminId) {
            throw new error_1.AppError('Authentication required', 401);
        }
        const deletionRequest = await AccountDeletionRequest_1.default.findById(requestId).populate('user');
        if (!deletionRequest) {
            throw new error_1.AppError('Deletion request not found', 404);
        }
        if (deletionRequest.status !== 'pending') {
            throw new error_1.AppError('This deletion request has already been processed', 400);
        }
        const user = deletionRequest.user;
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        // Start deletion process
        try {
            // 1. If vendor, handle vendor-specific cleanup
            if (user.role === 'vendor') {
                // Check for pending orders
                const pendingOrders = await Order_1.default.countDocuments({
                    'items.vendor': user._id,
                    status: { $in: ['pending', 'confirmed', 'processing', 'shipped', 'in_transit'] },
                });
                if (pendingOrders > 0) {
                    throw new error_1.AppError(`Cannot delete account with ${pendingOrders} pending orders. Please complete or cancel them first.`, 400);
                }
                // Deactivate all products
                await Product_1.default.updateMany({ vendor: user._id }, { status: 'inactive' });
                // Delete vendor profile
                await VendorProfile_1.default.findOneAndDelete({ user: user._id });
            }
            // 2. Anonymize completed orders (keep for records)
            await Order_1.default.updateMany({ user: user._id }, {
                $set: {
                    'shippingAddress.fullName': 'Deleted User',
                    'shippingAddress.phone': 'N/A',
                },
            });
            // 3. Delete user account
            await User_1.default.findByIdAndDelete(user._id);
            // 4. Update deletion request
            deletionRequest.status = 'approved';
            deletionRequest.processedBy = adminId;
            deletionRequest.processedAt = new Date();
            await deletionRequest.save();
            logger_1.logger.info(`Account deleted by admin: ${user._id} by ${adminId}`);
            res.json({
                success: true,
                message: 'Account deletion approved and processed successfully',
            });
        }
        catch (error) {
            // If deletion fails, update request status
            deletionRequest.status = 'rejected';
            deletionRequest.processedBy = adminId;
            deletionRequest.processedAt = new Date();
            deletionRequest.rejectionReason = error.message || 'Failed to process deletion';
            await deletionRequest.save();
            throw error;
        }
    }
    /**
     * Reject account deletion (Admin)
     */
    async rejectDeletionRequest(req, res) {
        const { requestId } = req.params;
        const { rejectionReason } = req.body;
        const adminId = req.user?.id;
        if (!adminId) {
            throw new error_1.AppError('Authentication required', 401);
        }
        if (!rejectionReason) {
            throw new error_1.AppError('Rejection reason is required', 400);
        }
        const deletionRequest = await AccountDeletionRequest_1.default.findById(requestId);
        if (!deletionRequest) {
            throw new error_1.AppError('Deletion request not found', 404);
        }
        if (deletionRequest.status !== 'pending') {
            throw new error_1.AppError('This deletion request has already been processed', 400);
        }
        deletionRequest.status = 'rejected';
        deletionRequest.rejectionReason = rejectionReason;
        deletionRequest.processedBy = adminId;
        deletionRequest.processedAt = new Date();
        await deletionRequest.save();
        logger_1.logger.info(`Account deletion rejected: ${deletionRequest.user} by ${adminId}`);
        res.json({
            success: true,
            message: 'Account deletion request rejected',
        });
    }
}
exports.AccountDeletionController = AccountDeletionController;
exports.accountDeletionController = new AccountDeletionController();
//# sourceMappingURL=account-deletion.controller.js.map