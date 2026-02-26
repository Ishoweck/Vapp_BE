// controllers/dispute.controller.ts
import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest, ApiResponse, PaymentStatus, TransactionType, WalletPurpose, OrderStatus } from '../types';
import Dispute, { DisputeStatus, DisputeReason } from '../models/Dispute';
import Order from '../models/Order';
import User from '../models/User';
import { Wallet } from '../models/Additional';
import { AppError } from '../middleware/error';
import { logger } from '../utils/logger';

// Generate dispute number (e.g., DSP-20260225-XXXX)
function generateDisputeNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DSP-${dateStr}-${random}`;
}

const DISPUTE_WINDOW_DAYS = 7;

export class DisputeController {
  /**
   * Open a dispute on an order (Customer)
   */
  async createDispute(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { orderId, reason, description, evidence, disputedItems } = req.body;

    logger.info('🔴 ============================================');
    logger.info('🔴 CREATE DISPUTE STARTED');
    logger.info('🔴 ============================================');

    // Find the order
    const order = await Order.findOne({
      _id: orderId,
      user: req.user?.id,
    }).populate('items.product', 'name images');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Must be a delivered or confirmed order
    if (![OrderStatus.DELIVERED, OrderStatus.CONFIRMED, 'shipped', 'in_transit'].includes(order.status as any)) {
      throw new AppError(
        `Cannot dispute an order with status "${order.status}". Order must be delivered or in transit.`,
        400
      );
    }

    // Payment must be completed
    if (order.paymentStatus !== PaymentStatus.COMPLETED) {
      throw new AppError('Cannot dispute an order with incomplete payment', 400);
    }

    // Check 7-day dispute window from delivery/last status update
    const orderDate = order.updatedAt || order.createdAt;
    const disputeDeadline = new Date(orderDate);
    disputeDeadline.setDate(disputeDeadline.getDate() + DISPUTE_WINDOW_DAYS);

    if (new Date() > disputeDeadline) {
      throw new AppError(
        `Dispute window has expired. Disputes must be opened within ${DISPUTE_WINDOW_DAYS} days of delivery.`,
        400
      );
    }

    // Check for existing open dispute on this order
    const existingDispute = await Dispute.findOne({
      order: orderId,
      user: req.user?.id,
      status: {
        $in: [
          DisputeStatus.OPEN,
          DisputeStatus.VENDOR_RESPONDED,
          DisputeStatus.UNDER_REVIEW,
        ],
      },
    });

    if (existingDispute) {
      throw new AppError(
        `An active dispute (${existingDispute.disputeNumber}) already exists for this order`,
        400
      );
    }

    // Determine the vendor(s) — use first vendor for single-vendor, or specified vendor
    const vendorId = req.body.vendorId || order.items[0]?.vendor?.toString();
    if (!vendorId) {
      throw new AppError('Could not determine vendor for dispute', 400);
    }

    // Build disputed items list
    let itemsInDispute = disputedItems;
    if (!itemsInDispute || itemsInDispute.length === 0) {
      // Default to all items from this vendor
      itemsInDispute = order.items
        .filter((item: any) => {
          const itemVendor = typeof item.vendor === 'object'
            ? (item.vendor as any)._id?.toString()
            : item.vendor?.toString();
          return itemVendor === vendorId;
        })
        .map((item: any) => ({
          product: item.product._id || item.product,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        }));
    }

    const disputeNumber = generateDisputeNumber();

    const dispute = await Dispute.create({
      disputeNumber,
      order: order._id,
      orderNumber: order.orderNumber,
      user: req.user?.id,
      vendor: vendorId,
      reason,
      description,
      evidence: evidence || [],
      status: DisputeStatus.OPEN,
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
    order.status = 'disputed' as any;
    await order.save();

    logger.info(`✅ Dispute created: ${disputeNumber} for order ${order.orderNumber}`);

    res.status(201).json({
      success: true,
      message: 'Dispute opened successfully. The vendor will be notified.',
      data: { dispute },
    });
  }

  /**
   * Get customer's disputes
   */
  async getMyDisputes(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = { user: req.user?.id };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const disputes = await Dispute.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('order', 'orderNumber total status')
      .populate('vendor', 'firstName lastName');

    const total = await Dispute.countDocuments(filter);

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
  async getDispute(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const dispute = await Dispute.findById(req.params.id)
      .populate('order', 'orderNumber total status items shippingAddress')
      .populate('user', 'firstName lastName email phone')
      .populate('vendor', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName')
      .populate('messages.sender', 'firstName lastName');

    if (!dispute) {
      throw new AppError('Dispute not found', 404);
    }

    // Access control: customer, vendor, or admin
    const userId = req.user?.id;
    const isCustomer = dispute.user._id?.toString() === userId || (dispute.user as any).toString() === userId;
    const isVendor = dispute.vendor._id?.toString() === userId || (dispute.vendor as any).toString() === userId;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

    if (!isCustomer && !isVendor && !isAdmin) {
      throw new AppError('Not authorized to view this dispute', 403);
    }

    res.json({
      success: true,
      data: { dispute },
    });
  }

  /**
   * Get vendor's disputes
   */
  async getVendorDisputes(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = { vendor: req.user?.id };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const disputes = await Dispute.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('order', 'orderNumber total status')
      .populate('user', 'firstName lastName');

    const total = await Dispute.countDocuments(filter);

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
  async vendorRespond(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { message, attachments } = req.body;

    const dispute = await Dispute.findOne({
      _id: req.params.id,
      vendor: req.user?.id,
    });

    if (!dispute) {
      throw new AppError('Dispute not found', 404);
    }

    if ([DisputeStatus.RESOLVED_FULL_REFUND, DisputeStatus.RESOLVED_PARTIAL_REFUND, DisputeStatus.REJECTED, DisputeStatus.CLOSED].includes(dispute.status)) {
      throw new AppError('This dispute has already been resolved', 400);
    }

    dispute.messages.push({
      sender: req.user?.id,
      senderRole: 'vendor',
      message,
      attachments: attachments || [],
      createdAt: new Date(),
    } as any);

    if (dispute.status === DisputeStatus.OPEN) {
      dispute.status = DisputeStatus.VENDOR_RESPONDED;
    }

    await dispute.save();

    logger.info(`✅ Vendor responded to dispute ${dispute.disputeNumber}`);

    res.json({
      success: true,
      message: 'Response submitted successfully',
      data: { dispute },
    });
  }

  /**
   * Customer adds a message to the dispute thread
   */
  async addMessage(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { message, attachments } = req.body;

    const dispute = await Dispute.findOne({
      _id: req.params.id,
      $or: [
        { user: req.user?.id },
        { vendor: req.user?.id },
      ],
    });

    if (!dispute) {
      throw new AppError('Dispute not found', 404);
    }

    if ([DisputeStatus.RESOLVED_FULL_REFUND, DisputeStatus.RESOLVED_PARTIAL_REFUND, DisputeStatus.REJECTED, DisputeStatus.CLOSED].includes(dispute.status)) {
      throw new AppError('This dispute has been resolved and is closed for messages', 400);
    }

    const senderRole = dispute.user.toString() === req.user?.id ? 'customer' : 'vendor';

    dispute.messages.push({
      sender: req.user?.id,
      senderRole,
      message,
      attachments: attachments || [],
      createdAt: new Date(),
    } as any);

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
  async getAllDisputes(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.reason) {
      filter.reason = req.query.reason;
    }

    const disputes = await Dispute.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('order', 'orderNumber total status')
      .populate('user', 'firstName lastName email')
      .populate('vendor', 'firstName lastName email');

    const total = await Dispute.countDocuments(filter);

    // Stats for admin dashboard
    const stats = {
      open: await Dispute.countDocuments({ status: DisputeStatus.OPEN }),
      vendorResponded: await Dispute.countDocuments({ status: DisputeStatus.VENDOR_RESPONDED }),
      underReview: await Dispute.countDocuments({ status: DisputeStatus.UNDER_REVIEW }),
      resolved: await Dispute.countDocuments({
        status: { $in: [DisputeStatus.RESOLVED_FULL_REFUND, DisputeStatus.RESOLVED_PARTIAL_REFUND] },
      }),
      rejected: await Dispute.countDocuments({ status: DisputeStatus.REJECTED }),
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
  async markUnderReview(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const dispute = await Dispute.findById(req.params.id);

    if (!dispute) {
      throw new AppError('Dispute not found', 404);
    }

    if (![DisputeStatus.OPEN, DisputeStatus.VENDOR_RESPONDED].includes(dispute.status)) {
      throw new AppError(`Cannot review a dispute with status "${dispute.status}"`, 400);
    }

    dispute.status = DisputeStatus.UNDER_REVIEW;
    await dispute.save();

    logger.info(`🔍 Dispute ${dispute.disputeNumber} marked as under review by admin ${req.user?.id}`);

    res.json({
      success: true,
      message: 'Dispute marked as under review',
      data: { dispute },
    });
  }

  /**
   * Admin: Resolve dispute (full refund, partial refund, or reject)
   */
  async resolveDispute(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { refundType, refundAmount, resolution } = req.body;

    logger.info('⚖️ ============================================');
    logger.info('⚖️ RESOLVE DISPUTE STARTED');
    logger.info('⚖️ ============================================');

    const dispute = await Dispute.findById(req.params.id)
      .populate('order')
      .populate('user', 'firstName lastName email');

    if (!dispute) {
      throw new AppError('Dispute not found', 404);
    }

    if ([DisputeStatus.RESOLVED_FULL_REFUND, DisputeStatus.RESOLVED_PARTIAL_REFUND, DisputeStatus.REJECTED, DisputeStatus.CLOSED].includes(dispute.status)) {
      throw new AppError('This dispute has already been resolved', 400);
    }

    const order = dispute.order as any;
    if (!order) {
      throw new AppError('Associated order not found', 404);
    }

    // Calculate max refundable amount (order total)
    const maxRefund = order.total;

    logger.info('📋 Dispute resolution:', {
      disputeNumber: dispute.disputeNumber,
      orderNumber: dispute.orderNumber,
      refundType,
      refundAmount,
      maxRefund,
    });

    let finalRefundAmount = 0;

    if (refundType === 'full') {
      finalRefundAmount = maxRefund;
      dispute.status = DisputeStatus.RESOLVED_FULL_REFUND;
    } else if (refundType === 'partial') {
      if (!refundAmount || refundAmount <= 0) {
        throw new AppError('Partial refund requires a valid refund amount', 400);
      }
      if (refundAmount > maxRefund) {
        throw new AppError(`Refund amount cannot exceed order total (₦${maxRefund})`, 400);
      }
      finalRefundAmount = refundAmount;
      dispute.status = DisputeStatus.RESOLVED_PARTIAL_REFUND;
    } else if (refundType === 'none') {
      dispute.status = DisputeStatus.REJECTED;
    } else {
      throw new AppError('Invalid refund type. Must be "full", "partial", or "none"', 400);
    }

    dispute.resolvedBy = new mongoose.Types.ObjectId(req.user?.id);
    dispute.resolution = resolution;
    dispute.refundAmount = finalRefundAmount;
    dispute.refundType = refundType;

    // Add admin resolution message to thread
    dispute.messages.push({
      sender: req.user?.id,
      senderRole: 'admin',
      message: `Dispute resolved: ${refundType === 'none' ? 'Rejected' : `${refundType} refund of ₦${finalRefundAmount.toLocaleString()}`}. ${resolution || ''}`,
      createdAt: new Date(),
    } as any);

    await dispute.save();

    // Process refund to customer's wallet
    if (finalRefundAmount > 0) {
      logger.info(`💰 Processing refund of ₦${finalRefundAmount} to customer wallet...`);

      let wallet = await Wallet.findOne({ user: dispute.user });

      if (!wallet) {
        // Create wallet if it doesn't exist
        wallet = await Wallet.create({
          user: dispute.user,
          balance: 0,
          totalSpent: 0,
          transactions: [],
        });
      }

      wallet.balance += finalRefundAmount;
      wallet.transactions.push({
        type: TransactionType.CREDIT,
        amount: finalRefundAmount,
        purpose: WalletPurpose.REFUND,
        reference: `DSP-REF-${dispute.disputeNumber}`,
        description: `Dispute refund (${refundType}) for order ${dispute.orderNumber}`,
        relatedOrder: order._id,
        status: 'completed',
        timestamp: new Date(),
      } as any);
      await wallet.save();

      logger.info('✅ Refund credited to wallet');

      // Update order payment status
      if (refundType === 'full') {
        order.paymentStatus = PaymentStatus.REFUNDED;
        order.refundAmount = finalRefundAmount;
        order.refundReason = `Dispute: ${dispute.reason} — ${resolution || 'Full refund approved'}`;
      } else {
        // Partial refund — keep payment as completed but record the partial refund
        order.refundAmount = (order.refundAmount || 0) + finalRefundAmount;
        order.refundReason = `Dispute: ${dispute.reason} — Partial refund of ₦${finalRefundAmount}`;
      }
      order.status = OrderStatus.CANCELLED;
      await order.save();
    } else {
      // Rejected — restore order to previous status if it was disputed
      if (order.status === 'disputed') {
        // Restore to delivered since dispute was rejected
        order.status = OrderStatus.DELIVERED;
        await order.save();
      }
    }

    logger.info('⚖️ ============================================');
    logger.info(`⚖️ DISPUTE ${dispute.disputeNumber} RESOLVED: ${refundType}`);
    logger.info('⚖️ ============================================');

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
  async adminAddMessage(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { message, attachments } = req.body;

    const dispute = await Dispute.findById(req.params.id);

    if (!dispute) {
      throw new AppError('Dispute not found', 404);
    }

    dispute.messages.push({
      sender: req.user?.id,
      senderRole: 'admin',
      message,
      attachments: attachments || [],
      createdAt: new Date(),
    } as any);

    await dispute.save();

    res.json({
      success: true,
      message: 'Admin message added',
      data: { dispute },
    });
  }
}

export const disputeController = new DisputeController();