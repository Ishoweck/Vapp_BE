"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationController = exports.NotificationController = void 0;
const Additional_1 = require("../models/Additional");
const User_1 = __importDefault(require("../models/User"));
const error_1 = require("../middleware/error");
class NotificationController {
    /**
     * Get user notifications
     */
    async getNotifications(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = { user: req.user?.id };
        if (req.query.type) {
            filter.type = req.query.type;
        }
        if (req.query.read !== undefined) {
            filter.read = req.query.read === 'true';
        }
        const notifications = await Additional_1.Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await Additional_1.Notification.countDocuments(filter);
        const unreadCount = await Additional_1.Notification.countDocuments({
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
    async markAsRead(req, res) {
        const { notificationId } = req.params;
        const notification = await Additional_1.Notification.findOne({
            _id: notificationId,
            user: req.user?.id,
        });
        if (!notification) {
            throw new error_1.AppError('Notification not found', 404);
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
    async markAllAsRead(req, res) {
        await Additional_1.Notification.updateMany({ user: req.user?.id, read: false }, { read: true });
        res.json({
            success: true,
            message: 'All notifications marked as read',
        });
    }
    /**
     * Delete notification
     */
    async deleteNotification(req, res) {
        const { notificationId } = req.params;
        const notification = await Additional_1.Notification.findOne({
            _id: notificationId,
            user: req.user?.id,
        });
        if (!notification) {
            throw new error_1.AppError('Notification not found', 404);
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
    async clearAll(req, res) {
        await Additional_1.Notification.deleteMany({ user: req.user?.id });
        res.json({
            success: true,
            message: 'All notifications cleared',
        });
    }
    /**
     * Register FCM token for push notifications
     */
    async registerFcmToken(req, res) {
        const { token } = req.body;
        if (!token) {
            throw new error_1.AppError('FCM token is required', 400);
        }
        await User_1.default.findByIdAndUpdate(req.user?.id, {
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
    async unregisterFcmToken(req, res) {
        const { token } = req.body;
        if (!token) {
            throw new error_1.AppError('FCM token is required', 400);
        }
        await User_1.default.findByIdAndUpdate(req.user?.id, {
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
    async getUnreadCount(req, res) {
        const unreadCount = await Additional_1.Notification.countDocuments({
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
    static async createNotification(userId, type, title, message, data, link) {
        await Additional_1.Notification.create({
            user: userId,
            type,
            title,
            message,
            data,
            link,
        });
    }
}
exports.NotificationController = NotificationController;
exports.notificationController = new NotificationController();
//# sourceMappingURL=notification.controller.js.map