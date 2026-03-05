"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disputeController = exports.DisputeController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const types_1 = require("../types");
const Dispute_1 = __importStar(require("../models/Dispute"));
const Order_1 = __importDefault(require("../models/Order"));
const Additional_1 = require("../models/Additional");
const error_1 = require("../middleware/error");
const notification_service_1 = require("../services/notification.service");
const logger_1 = require("../utils/logger");
// Generate dispute number (e.g., DSP-20260225-XXXX)
function generateDisputeNumber() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DSP-${dateStr}-${random}`;
}
const DISPUTE_WINDOW_DAYS = 7;
class DisputeController {
    /**
     * Open a dispute on an order (Customer)
     */
    async createDispute(req, res) {
        const { orderId, reason, description, evidence, disputedItems } = req.body;
        logger_1.logger.info('🔴 ============================================');
        logger_1.logger.info('🔴 CREATE DISPUTE STARTED');
        logger_1.logger.info('🔴 ============================================');
        // Find the order
        const order = await Order_1.default.findOne({
            _id: orderId,
            user: req.user?.id,
        }).populate('items.product', 'name images');
        if (!order) {
            throw new error_1.AppError('Order not found', 404);
        }
        // Must be a delivered or confirmed order
        if (![types_1.OrderStatus.DELIVERED, types_1.OrderStatus.CONFIRMED, 'shipped', 'in_transit'].includes(order.status)) {
            throw new error_1.AppError(`Cannot dispute an order with status "${order.status}". Order must be delivered or in transit.`, 400);
        }
        // Payment must be completed
        if (order.paymentStatus !== types_1.PaymentStatus.COMPLETED) {
            throw new error_1.AppError('Cannot dispute an order with incomplete payment', 400);
        }
        // Check 7-day dispute window from delivery/last status update
        const orderDate = order.updatedAt || order.createdAt;
        const disputeDeadline = new Date(orderDate);
        disputeDeadline.setDate(disputeDeadline.getDate() + DISPUTE_WINDOW_DAYS);
        if (new Date() > disputeDeadline) {
            throw new error_1.AppError(`Dispute window has expired. Disputes must be opened within ${DISPUTE_WINDOW_DAYS} days of delivery.`, 400);
        }
        // Check for existing open dispute on this order
        const existingDispute = await Dispute_1.default.findOne({
            order: orderId,
            user: req.user?.id,
            status: {
                $in: [
                    Dispute_1.DisputeStatus.OPEN,
                    Dispute_1.DisputeStatus.VENDOR_RESPONDED,
                    Dispute_1.DisputeStatus.UNDER_REVIEW,
                ],
            },
        });
        if (existingDispute) {
            throw new error_1.AppError(`An active dispute (${existingDispute.disputeNumber}) already exists for this order`, 400);
        }
        // Determine the vendor(s) — use first vendor for single-vendor, or specified vendor
        const vendorId = req.body.vendorId || order.items[0]?.vendor?.toString();
        if (!vendorId) {
            throw new error_1.AppError('Could not determine vendor for dispute', 400);
        }
        // Build disputed items list
        let itemsInDispute = disputedItems;
        if (!itemsInDispute || itemsInDispute.length === 0) {
            // Default to all items from this vendor
            itemsInDispute = order.items
                .filter((item) => {
                const itemVendor = typeof item.vendor === 'object'
                    ? item.vendor._id?.toString()
                    : item.vendor?.toString();
                return itemVendor === vendorId;
            })
                .map((item) => ({
                product: item.product._id || item.product,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
            }));
        }
        const disputeNumber = generateDisputeNumber();
        const dispute = await Dispute_1.default.create({
            disputeNumber,
            order: order._id,
            orderNumber: order.orderNumber,
            user: req.user?.id,
            vendor: vendorId,
            reason,
            description,
            evidence: evidence || [],
            status: Dispute_1.DisputeStatus.OPEN,
            disputedItems: itemsInDispute,
            expiresAt: disputeDeadline,
            messages: [
                {
                    sender: req.user?.id,
                    senderRole: 'customer',
                    message: description,
                    attachments: evidence || [],
                    createdAt: new Date(),
                },
            ],
        });
        // Update order status to reflect dispute
        order.status = 'disputed';
        await order.save();
        logger_1.logger.info(`✅ Dispute created: ${disputeNumber} for order ${order.orderNumber}`);
        // Notify both parties
        try {
            await notification_service_1.notificationService.disputeCreated(order._id.toString(), order.orderNumber, vendorId, req.user.id);
        }
        catch (error) {
            logger_1.logger.error('Error sending dispute notification:', error);
        }
        res.status(201).json({
            success: true,
            message: 'Dispute opened successfully. The vendor will be notified.',
            data: { dispute },
        });
    }
    /**
     * Get customer's disputes
     */
    async getMyDisputes(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = { user: req.user?.id };
        if (req.query.status) {
            filter.status = req.query.status;
        }
        const disputes = await Dispute_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('order', 'orderNumber total status')
            .populate('vendor', 'firstName lastName');
        const total = await Dispute_1.default.countDocuments(filter);
        res.json({
            success: true,
            data: { disputes },
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    /**
     * Get single dispute (customer or involved vendor)
     */
    async getDispute(req, res) {
        const dispute = await Dispute_1.default.findById(req.params.id)
            .populate('order', 'orderNumber total status items shippingAddress')
            .populate('user', 'firstName lastName email phone')
            .populate('vendor', 'firstName lastName email')
            .populate('resolvedBy', 'firstName lastName')
            .populate('messages.sender', 'firstName lastName');
        if (!dispute) {
            throw new error_1.AppError('Dispute not found', 404);
        }
        // Access control: customer, vendor, or admin
        const userId = req.user?.id;
        const isCustomer = dispute.user._id?.toString() === userId || dispute.user.toString() === userId;
        const isVendor = dispute.vendor._id?.toString() === userId || dispute.vendor.toString() === userId;
        const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
        if (!isCustomer && !isVendor && !isAdmin) {
            throw new error_1.AppError('Not authorized to view this dispute', 403);
        }
        res.json({
            success: true,
            data: { dispute },
        });
    }
    /**
     * Get vendor's disputes
     */
    async getVendorDisputes(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = { vendor: req.user?.id };
        if (req.query.status) {
            filter.status = req.query.status;
        }
        const disputes = await Dispute_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('order', 'orderNumber total status')
            .populate('user', 'firstName lastName');
        const total = await Dispute_1.default.countDocuments(filter);
        res.json({
            success: true,
            data: { disputes },
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    /**
     * Vendor responds to a dispute
     */
    async vendorRespond(req, res) {
        const { message, attachments } = req.body;
        const dispute = await Dispute_1.default.findOne({
            _id: req.params.id,
            vendor: req.user?.id,
        });
        if (!dispute) {
            throw new error_1.AppError('Dispute not found', 404);
        }
        if ([Dispute_1.DisputeStatus.RESOLVED_FULL_REFUND, Dispute_1.DisputeStatus.RESOLVED_PARTIAL_REFUND, Dispute_1.DisputeStatus.REJECTED, Dispute_1.DisputeStatus.CLOSED].includes(dispute.status)) {
            throw new error_1.AppError('This dispute has already been resolved', 400);
        }
        dispute.messages.push({
            sender: req.user?.id,
            senderRole: 'vendor',
            message,
            attachments: attachments || [],
            createdAt: new Date(),
        });
        if (dispute.status === Dispute_1.DisputeStatus.OPEN) {
            dispute.status = Dispute_1.DisputeStatus.VENDOR_RESPONDED;
        }
        await dispute.save();
        logger_1.logger.info(`✅ Vendor responded to dispute ${dispute.disputeNumber}`);
        res.json({
            success: true,
            message: 'Response submitted successfully',
            data: { dispute },
        });
    }
    /**
     * Customer adds a message to the dispute thread
     */
    async addMessage(req, res) {
        const { message, attachments } = req.body;
        const dispute = await Dispute_1.default.findOne({
            _id: req.params.id,
            $or: [
                { user: req.user?.id },
                { vendor: req.user?.id },
            ],
        });
        if (!dispute) {
            throw new error_1.AppError('Dispute not found', 404);
        }
        if ([Dispute_1.DisputeStatus.RESOLVED_FULL_REFUND, Dispute_1.DisputeStatus.RESOLVED_PARTIAL_REFUND, Dispute_1.DisputeStatus.REJECTED, Dispute_1.DisputeStatus.CLOSED].includes(dispute.status)) {
            throw new error_1.AppError('This dispute has been resolved and is closed for messages', 400);
        }
        const senderRole = dispute.user.toString() === req.user?.id ? 'customer' : 'vendor';
        dispute.messages.push({
            sender: req.user?.id,
            senderRole,
            message,
            attachments: attachments || [],
            createdAt: new Date(),
        });
        await dispute.save();
        res.json({
            success: true,
            message: 'Message added',
            data: { dispute },
        });
    }
    /**
     * Admin: Get all disputes
     */
    async getAllDisputes(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.reason) {
            filter.reason = req.query.reason;
        }
        const disputes = await Dispute_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('order', 'orderNumber total status')
            .populate('user', 'firstName lastName email')
            .populate('vendor', 'firstName lastName email');
        const total = await Dispute_1.default.countDocuments(filter);
        // Stats for admin dashboard
        const stats = {
            open: await Dispute_1.default.countDocuments({ status: Dispute_1.DisputeStatus.OPEN }),
            vendorResponded: await Dispute_1.default.countDocuments({ status: Dispute_1.DisputeStatus.VENDOR_RESPONDED }),
            underReview: await Dispute_1.default.countDocuments({ status: Dispute_1.DisputeStatus.UNDER_REVIEW }),
            resolved: await Dispute_1.default.countDocuments({
                status: { $in: [Dispute_1.DisputeStatus.RESOLVED_FULL_REFUND, Dispute_1.DisputeStatus.RESOLVED_PARTIAL_REFUND] },
            }),
            rejected: await Dispute_1.default.countDocuments({ status: Dispute_1.DisputeStatus.REJECTED }),
        };
        res.json({
            success: true,
            data: { disputes, stats },
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    /**
     * Admin: Mark dispute as under review
     */
    async markUnderReview(req, res) {
        const dispute = await Dispute_1.default.findById(req.params.id);
        if (!dispute) {
            throw new error_1.AppError('Dispute not found', 404);
        }
        if (![Dispute_1.DisputeStatus.OPEN, Dispute_1.DisputeStatus.VENDOR_RESPONDED].includes(dispute.status)) {
            throw new error_1.AppError(`Cannot review a dispute with status "${dispute.status}"`, 400);
        }
        dispute.status = Dispute_1.DisputeStatus.UNDER_REVIEW;
        await dispute.save();
        logger_1.logger.info(`🔍 Dispute ${dispute.disputeNumber} marked as under review by admin ${req.user?.id}`);
        res.json({
            success: true,
            message: 'Dispute marked as under review',
            data: { dispute },
        });
    }
    /**
     * Admin: Resolve dispute (full refund, partial refund, or reject)
     */
    async resolveDispute(req, res) {
        const { refundType, refundAmount, resolution } = req.body;
        logger_1.logger.info('⚖️ ============================================');
        logger_1.logger.info('⚖️ RESOLVE DISPUTE STARTED');
        logger_1.logger.info('⚖️ ============================================');
        const dispute = await Dispute_1.default.findById(req.params.id)
            .populate('order')
            .populate('user', 'firstName lastName email');
        if (!dispute) {
            throw new error_1.AppError('Dispute not found', 404);
        }
        if ([Dispute_1.DisputeStatus.RESOLVED_FULL_REFUND, Dispute_1.DisputeStatus.RESOLVED_PARTIAL_REFUND, Dispute_1.DisputeStatus.REJECTED, Dispute_1.DisputeStatus.CLOSED].includes(dispute.status)) {
            throw new error_1.AppError('This dispute has already been resolved', 400);
        }
        const order = dispute.order;
        if (!order) {
            throw new error_1.AppError('Associated order not found', 404);
        }
        // Calculate max refundable amount (order total)
        const maxRefund = order.total;
        logger_1.logger.info('📋 Dispute resolution:', {
            disputeNumber: dispute.disputeNumber,
            orderNumber: dispute.orderNumber,
            refundType,
            refundAmount,
            maxRefund,
        });
        let finalRefundAmount = 0;
        if (refundType === 'full') {
            finalRefundAmount = maxRefund;
            dispute.status = Dispute_1.DisputeStatus.RESOLVED_FULL_REFUND;
        }
        else if (refundType === 'partial') {
            if (!refundAmount || refundAmount <= 0) {
                throw new error_1.AppError('Partial refund requires a valid refund amount', 400);
            }
            if (refundAmount > maxRefund) {
                throw new error_1.AppError(`Refund amount cannot exceed order total (₦${maxRefund})`, 400);
            }
            finalRefundAmount = refundAmount;
            dispute.status = Dispute_1.DisputeStatus.RESOLVED_PARTIAL_REFUND;
        }
        else if (refundType === 'none') {
            dispute.status = Dispute_1.DisputeStatus.REJECTED;
        }
        else {
            throw new error_1.AppError('Invalid refund type. Must be "full", "partial", or "none"', 400);
        }
        dispute.resolvedBy = new mongoose_1.default.Types.ObjectId(req.user?.id);
        dispute.resolution = resolution;
        dispute.refundAmount = finalRefundAmount;
        dispute.refundType = refundType;
        // Add admin resolution message to thread
        dispute.messages.push({
            sender: req.user?.id,
            senderRole: 'admin',
            message: `Dispute resolved: ${refundType === 'none' ? 'Rejected' : `${refundType} refund of ₦${finalRefundAmount.toLocaleString()}`}. ${resolution || ''}`,
            createdAt: new Date(),
        });
        await dispute.save();
        // Process refund to customer's wallet
        if (finalRefundAmount > 0) {
            logger_1.logger.info(`💰 Processing refund of ₦${finalRefundAmount} to customer wallet...`);
            let wallet = await Additional_1.Wallet.findOne({ user: dispute.user });
            if (!wallet) {
                // Create wallet if it doesn't exist
                wallet = await Additional_1.Wallet.create({
                    user: dispute.user,
                    balance: 0,
                    totalSpent: 0,
                    transactions: [],
                });
            }
            wallet.balance += finalRefundAmount;
            wallet.transactions.push({
                type: types_1.TransactionType.CREDIT,
                amount: finalRefundAmount,
                purpose: types_1.WalletPurpose.REFUND,
                reference: `DSP-REF-${dispute.disputeNumber}`,
                description: `Dispute refund (${refundType}) for order ${dispute.orderNumber}`,
                relatedOrder: order._id,
                status: 'completed',
                timestamp: new Date(),
            });
            await wallet.save();
            logger_1.logger.info('✅ Refund credited to wallet');
            // Update order payment status
            if (refundType === 'full') {
                order.paymentStatus = types_1.PaymentStatus.REFUNDED;
                order.refundAmount = finalRefundAmount;
                order.refundReason = `Dispute: ${dispute.reason} — ${resolution || 'Full refund approved'}`;
            }
            else {
                // Partial refund — keep payment as completed but record the partial refund
                order.refundAmount = (order.refundAmount || 0) + finalRefundAmount;
                order.refundReason = `Dispute: ${dispute.reason} — Partial refund of ₦${finalRefundAmount}`;
            }
            order.status = types_1.OrderStatus.CANCELLED;
            await order.save();
        }
        else {
            // Rejected — restore order to previous status if it was disputed
            if (order.status === 'disputed') {
                // Restore to delivered since dispute was rejected
                order.status = types_1.OrderStatus.DELIVERED;
                await order.save();
            }
        }
        // Notify both parties about resolution
        try {
            const resolutionMessage = refundType === 'none'
                ? 'Rejected — no refund issued.'
                : `${refundType === 'full' ? 'Full' : 'Partial'} refund of ₦${finalRefundAmount.toLocaleString()} issued.`;
            await notification_service_1.notificationService.disputeResolved(order._id.toString(), dispute.orderNumber, dispute.vendor.toString(), dispute.user.toString(), resolutionMessage);
        }
        catch (error) {
            logger_1.logger.error('Error sending dispute resolution notification:', error);
        }
        logger_1.logger.info('⚖️ ============================================');
        logger_1.logger.info(`⚖️ DISPUTE ${dispute.disputeNumber} RESOLVED: ${refundType}`);
        logger_1.logger.info('⚖️ ============================================');
        res.json({
            success: true,
            message: refundType === 'none'
                ? 'Dispute rejected'
                : `Dispute resolved with ${refundType} refund of ₦${finalRefundAmount.toLocaleString()}`,
            data: {
                dispute,
                refundAmount: finalRefundAmount,
                refundType,
            },
        });
    }
    /**
     * Admin: Add a message/note to a dispute
     */
    async adminAddMessage(req, res) {
        const { message, attachments } = req.body;
        const dispute = await Dispute_1.default.findById(req.params.id);
        if (!dispute) {
            throw new error_1.AppError('Dispute not found', 404);
        }
        dispute.messages.push({
            sender: req.user?.id,
            senderRole: 'admin',
            message,
            attachments: attachments || [],
            createdAt: new Date(),
        });
        await dispute.save();
        res.json({
            success: true,
            message: 'Admin message added',
            data: { dispute },
        });
    }
}
exports.DisputeController = DisputeController;
exports.disputeController = new DisputeController();
//# sourceMappingURL=dispute.controller.js.map