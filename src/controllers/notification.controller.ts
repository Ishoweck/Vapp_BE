import { Response } from 'express';
import { AuthRequest, ApiResponse, NotificationType } from '../types';
import { Notification } from '../models/Additional';
import User from '../models/User';
import { AppError } from '../middleware/error';

export class NotificationController {
  /**
   * Get user notifications
   */
  async getNotifications(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = { user: req.user?.id };
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.read !== undefined) {
      filter.read = req.query.read === 'true';
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      user: req.user?.id,
      read: false,
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
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
   * Mark notification as read
   */
  async markAsRead(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      user: req.user?.id,
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    notification.read = true;
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    await Notification.updateMany({ user: req.user?.id, read: false }, { read: true });

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      user: req.user?.id,
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  }

  /**
   * Clear all notifications
   */
  async clearAll(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    await Notification.deleteMany({ user: req.user?.id });

    res.json({
      success: true,
      message: 'All notifications cleared',
    });
  }

  /**
   * Register FCM token for push notifications
   */
  async registerFcmToken(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { token } = req.body;

    if (!token) {
      throw new AppError('FCM token is required', 400);
    }

    await User.findByIdAndUpdate(req.user?.id, {
      $addToSet: { fcmTokens: token },
    });

    res.json({
      success: true,
      message: 'FCM token registered',
    });
  }

  /**
   * Unregister FCM token
   */
  async unregisterFcmToken(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { token } = req.body;

    if (!token) {
      throw new AppError('FCM token is required', 400);
    }

    await User.findByIdAndUpdate(req.user?.id, {
      $pull: { fcmTokens: token },
    });

    res.json({
      success: true,
      message: 'FCM token removed',
    });
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const unreadCount = await Notification.countDocuments({
      user: req.user?.id,
      read: false,
    });

    res.json({
      success: true,
      data: { unreadCount },
    });
  }

  /**
   * Create notification (internal helper)
   */
  static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
    link?: string
  ): Promise<void> {
    await Notification.create({
      user: userId,
      type,
      title,
      message,
      data,
      link,
    });
  }
}

export const notificationController = new NotificationController();
