import { Response } from 'express';
import { AuthRequest, ApiResponse, NotificationType } from '../types';
export declare class NotificationController {
    /**
     * Get user notifications
     */
    getNotifications(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Mark notification as read
     */
    markAsRead(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Mark all as read
     */
    markAllAsRead(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Delete notification
     */
    deleteNotification(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Clear all notifications
     */
    clearAll(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Register FCM token for push notifications
     */
    registerFcmToken(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Unregister FCM token
     */
    unregisterFcmToken(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get unread notification count
     */
    getUnreadCount(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Create notification (internal helper)
     */
    static createNotification(userId: string, type: NotificationType, title: string, message: string, data?: any, link?: string): Promise<void>;
}
export declare const notificationController: NotificationController;
//# sourceMappingURL=notification.controller.d.ts.map