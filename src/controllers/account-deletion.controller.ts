// ============================================================
// ACCOUNT DELETION CONTROLLER
// File: controllers/account-deletion.controller.ts
// ============================================================

import { Response } from 'express';
import { AuthRequest, ApiResponse, NotificationType } from '../types';
import AccountDeletionRequest from '../models/AccountDeletionRequest';
import User from '../models/User';
import VendorProfile from '../models/VendorProfile';
import Product from '../models/Product';
import Order from '../models/Order';
import { AppError } from '../middleware/error';
import { logger } from '../utils/logger';
import { notificationService } from '../services/notification.service';

export class AccountDeletionController {
  /**
   * Request account deletion (User)
   */
  async requestAccountDeletion(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { reason, additionalDetails } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    // Check if there's already a pending request
    const existingRequest = await AccountDeletionRequest.findOne({
      user: userId,
      status: 'pending',
    });

    if (existingRequest) {
      throw new AppError('You already have a pending deletion request', 400);
    }

    // Check user role and get additional context
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const deletionRequest = await AccountDeletionRequest.create({
      user: userId,
      userEmail: user.email,
      userFullName: `${user.firstName} ${user.lastName}`,
      reason,
      additionalDetails,
      userRole: user.role,
    });

    // If user is a vendor, check for pending orders
    if (user.role === 'vendor') {
      const pendingOrders = await Order.countDocuments({
        'items.vendor': userId,
        status: { $in: ['pending', 'confirmed', 'processing', 'shipped', 'in_transit'] },
      });

      if (pendingOrders > 0) {
        deletionRequest.hasPendingOrders = true;
        deletionRequest.pendingOrdersCount = pendingOrders;
        await deletionRequest.save();
      }
    }

    logger.info(`Account deletion requested: ${userId}`);

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
  async getDeletionRequestStatus(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const deletionRequest = await AccountDeletionRequest.findOne({
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
  async cancelDeletionRequest(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    const deletionRequest = await AccountDeletionRequest.findOne({
      user: userId,
      status: 'pending',
    });

    if (!deletionRequest) {
      throw new AppError('No pending deletion request found', 404);
    }

    deletionRequest.status = 'cancelled';
    await deletionRequest.save();

    logger.info(`Account deletion cancelled: ${userId}`);

    res.json({
      success: true,
      message: 'Deletion request cancelled successfully',
    });
  }

  /**
   * Get all deletion requests (Admin)
   */
  async getAllDeletionRequests(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const deletionRequests = await AccountDeletionRequest.find(filter)
      .populate('user', 'firstName lastName email role')
      .populate('processedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AccountDeletionRequest.countDocuments(filter);

    // Normalize: if user was hard-deleted, fall back to stored userEmail/userFullName
    const normalized = deletionRequests.map((req: any) => {
      const obj = req.toObject ? req.toObject() : { ...req };
      if (!obj.user) {
        obj.user = {
          _id: null,
          firstName: obj.userFullName?.split(' ')[0] || 'Deleted',
          lastName: obj.userFullName?.split(' ').slice(1).join(' ') || 'User',
          email: obj.userEmail || '(account deleted)',
          role: obj.userRole,
        };
      }
      return obj;
    });

    res.json({
      success: true,
      data: {
        deletionRequests: normalized,
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
  async approveDeletionRequest(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { requestId } = req.params;
    const adminId = req.user?.id;

    if (!adminId) {
      throw new AppError('Authentication required', 401);
    }

    const deletionRequest = await AccountDeletionRequest.findById(requestId).populate('user');

    if (!deletionRequest) {
      throw new AppError('Deletion request not found', 404);
    }

    if (deletionRequest.status !== 'pending') {
      throw new AppError('This deletion request has already been processed', 400);
    }

    const user = deletionRequest.user as any;

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Start deletion process
    try {
      // 1. If vendor, handle vendor-specific cleanup
      if (user.role === 'vendor') {
        // Check for pending orders
        const pendingOrders = await Order.countDocuments({
          'items.vendor': user._id,
          status: { $in: ['pending', 'confirmed', 'processing', 'shipped', 'in_transit'] },
        });

        if (pendingOrders > 0) {
          throw new AppError(
            `Cannot delete account with ${pendingOrders} pending orders. Please complete or cancel them first.`,
            400
          );
        }

        // Deactivate all products
        await Product.updateMany(
          { vendor: user._id },
          { status: 'inactive' }
        );

        // Delete vendor profile
        await VendorProfile.findOneAndDelete({ user: user._id });
      }

      // 2. Anonymize completed orders (keep for records)
      await Order.updateMany(
        { user: user._id },
        {
          $set: {
            'shippingAddress.fullName': 'Deleted User',
            'shippingAddress.phone': 'N/A',
          },
        }
      );

      // 3. Delete user account
      await User.findByIdAndDelete(user._id);

      // 4. Notify all admins about the deletion
      const admins = await User.find({
        role: { $in: ['admin', 'super_admin', 'financial_admin'] },
      }).select('_id');
      const adminIds = admins.map((a: any) => a._id.toString());
      if (adminIds.length > 0) {
        await notificationService.sendToMany({
          userIds: adminIds,
          type: NotificationType.ACCOUNT,
          title: 'Account Deleted',
          message: `Account for ${user.firstName} ${user.lastName} (${user.email}, ${user.role}) has been permanently deleted.`,
          data: { deletedUserEmail: user.email, deletedUserRole: user.role },
        });
      }

      // 5. Update deletion request
      deletionRequest.status = 'approved';
      deletionRequest.processedBy = adminId as any;
      deletionRequest.processedAt = new Date();
      await deletionRequest.save();

      logger.info(`Account deleted by admin: ${user._id} by ${adminId}`);

      res.json({
        success: true,
        message: 'Account deletion approved and processed successfully',
      });
    } catch (error: any) {
      // If deletion fails, update request status
      deletionRequest.status = 'rejected';
      deletionRequest.processedBy = adminId as any;
      deletionRequest.processedAt = new Date();
      deletionRequest.rejectionReason = error.message || 'Failed to process deletion';
      await deletionRequest.save();

      throw error;
    }
  }

  /**
   * Reject account deletion (Admin)
   */
  async rejectDeletionRequest(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { requestId } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      throw new AppError('Authentication required', 401);
    }

    if (!rejectionReason) {
      throw new AppError('Rejection reason is required', 400);
    }

    const deletionRequest = await AccountDeletionRequest.findById(requestId);

    if (!deletionRequest) {
      throw new AppError('Deletion request not found', 404);
    }

    if (deletionRequest.status !== 'pending') {
      throw new AppError('This deletion request has already been processed', 400);
    }

    deletionRequest.status = 'rejected';
    deletionRequest.rejectionReason = rejectionReason;
    deletionRequest.processedBy = adminId as any;
    deletionRequest.processedAt = new Date();
    await deletionRequest.save();

    logger.info(`Account deletion rejected: ${deletionRequest.user} by ${adminId}`);

    res.json({
      success: true,
      message: 'Account deletion request rejected',
    });
  }
}

export const accountDeletionController = new AccountDeletionController();