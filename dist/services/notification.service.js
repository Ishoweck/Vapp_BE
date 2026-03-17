"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.setSocketInstance = void 0;
const types_1 = require("../types");
const Additional_1 = require("../models/Additional");
const User_1 = __importDefault(require("../models/User"));
const firebase_1 = require("../config/firebase");
const logger_1 = require("../utils/logger");
// Socket.io instance - set from server.ts after initialization
let ioInstance = null;
const setSocketInstance = (io) => {
    ioInstance = io;
};
exports.setSocketInstance = setSocketInstance;
class NotificationService {
    /**
     * Send notification to a single user (in-app + push)
     */
    async send(options) {
        const { userId, type, title, message, data, link } = options;
        try {
            // 1. Create in-app notification
            const notification = await Additional_1.Notification.create({
                user: userId,
                type,
                title,
                message,
                data,
                link,
            });
            // 2. Emit real-time socket event so frontend updates instantly
            if (ioInstance) {
                const unreadCount = await Additional_1.Notification.countDocuments({ user: userId, read: false });
                ioInstance.to(`user_${userId}`).emit('new_notification', {
                    notification: {
                        _id: notification._id,
                        type,
                        title,
                        message,
                        data,
                        link,
                        read: false,
                        createdAt: notification.createdAt,
                    },
                    unreadCount,
                });
            }
            // 3. Send push notification
            const user = await User_1.default.findById(userId).select('fcmTokens');
            if (user?.fcmTokens && user.fcmTokens.length > 0) {
                const pushData = {
                    type,
                    ...(link ? { link } : {}),
                    ...(data ? { payload: JSON.stringify(data) } : {}),
                };
                await (0, firebase_1.sendPushNotification)(user.fcmTokens, title, message, pushData);
            }
            logger_1.logger.info(`Notification sent to ${userId}: [${type}] ${title}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to send notification to ${userId}:`, error.message);
        }
    }
    /**
     * Send notification to multiple users
     */
    async sendToMany(options) {
        const { userIds, type, title, message, data, link } = options;
        const uniqueIds = [...new Set(userIds)];
        // Batch create in-app notifications
        const docs = uniqueIds.map((userId) => ({
            user: userId,
            type,
            title,
            message,
            data,
            link,
        }));
        try {
            await Additional_1.Notification.insertMany(docs);
        }
        catch (error) {
            logger_1.logger.error('Bulk notification insert error:', error.message);
        }
        // Emit real-time socket events to each user
        if (ioInstance) {
            for (const userId of uniqueIds) {
                try {
                    const unreadCount = await Additional_1.Notification.countDocuments({ user: userId, read: false });
                    ioInstance.to(`user_${userId}`).emit('new_notification', {
                        notification: { type, title, message, data, link, read: false, createdAt: new Date() },
                        unreadCount,
                    });
                }
                catch (err) {
                    // Don't block on socket errors
                }
            }
        }
        // Send push notifications
        try {
            const users = await User_1.default.find({
                _id: { $in: uniqueIds },
                fcmTokens: { $exists: true, $not: { $size: 0 } },
            }).select('fcmTokens');
            const allTokens = users.flatMap((u) => u.fcmTokens);
            if (allTokens.length > 0) {
                const pushData = {
                    type,
                    ...(link ? { link } : {}),
                    ...(data ? { payload: JSON.stringify(data) } : {}),
                };
                await (0, firebase_1.sendPushNotification)(allTokens, title, message, pushData);
            }
        }
        catch (error) {
            logger_1.logger.error('Bulk push notification error:', error.message);
        }
        logger_1.logger.info(`Notification sent to ${uniqueIds.length} users: [${type}] ${title}`);
    }
    // ================================================================
    // ORDER NOTIFICATIONS
    // ================================================================
    async orderPlaced(orderId, orderNumber, total, customerId, vendorIds) {
        // Notify customer
        await this.send({
            userId: customerId,
            type: types_1.NotificationType.ORDER,
            title: 'Order Confirmed',
            message: `Your order #${orderNumber} for ₦${total.toLocaleString()} has been placed successfully.`,
            data: { orderId, orderNumber },
            link: `/orders/${orderId}`,
        });
        // Notify each vendor
        await this.sendToMany({
            userIds: vendorIds,
            type: types_1.NotificationType.ORDER,
            title: 'New Order Received',
            message: `You have a new order #${orderNumber}. Please review and process it.`,
            data: { orderId, orderNumber },
            link: `/vendor/orders/${orderId}`,
        });
    }
    async orderStatusUpdated(orderId, orderNumber, status, customerId) {
        const statusMessages = {
            confirmed: 'Your order has been confirmed by the vendor.',
            processing: 'Your order is being prepared for shipment.',
            shipped: 'Your order has been shipped! Track your delivery.',
            in_transit: 'Your order is on the way.',
            delivered: 'Your order has been delivered. Enjoy!',
            cancelled: 'Your order has been cancelled.',
            refunded: 'Your order has been refunded.',
        };
        const message = statusMessages[status] || `Your order status has been updated to ${status}.`;
        await this.send({
            userId: customerId,
            type: types_1.NotificationType.ORDER,
            title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: `Order #${orderNumber}: ${message}`,
            data: { orderId, orderNumber, status },
            link: `/orders/${orderId}`,
        });
    }
    async orderCancelled(orderId, orderNumber, customerId, vendorIds, cancelledBy) {
        if (cancelledBy === 'customer') {
            // Notify vendors
            await this.sendToMany({
                userIds: vendorIds,
                type: types_1.NotificationType.ORDER,
                title: 'Order Cancelled',
                message: `Order #${orderNumber} has been cancelled by the customer.`,
                data: { orderId, orderNumber },
                link: `/vendor/orders/${orderId}`,
            });
        }
        else {
            // Notify customer
            await this.send({
                userId: customerId,
                type: types_1.NotificationType.ORDER,
                title: 'Order Cancelled',
                message: `Order #${orderNumber} has been cancelled. A refund has been initiated.`,
                data: { orderId, orderNumber },
                link: `/orders/${orderId}`,
            });
        }
    }
    // ================================================================
    // PAYMENT NOTIFICATIONS
    // ================================================================
    async paymentCompleted(orderId, orderNumber, amount, userId) {
        await this.send({
            userId,
            type: types_1.NotificationType.PAYMENT,
            title: 'Payment Successful',
            message: `Payment of ₦${amount.toLocaleString()} for order #${orderNumber} was successful.`,
            data: { orderId, orderNumber, amount },
            link: `/orders/${orderId}`,
        });
    }
    async walletTopUp(userId, amount, newBalance) {
        await this.send({
            userId,
            type: types_1.NotificationType.PAYMENT,
            title: 'Wallet Top-Up Successful',
            message: `₦${amount.toLocaleString()} has been added to your wallet. New balance: ₦${newBalance.toLocaleString()}.`,
            data: { amount, newBalance },
            link: '/wallet',
        });
    }
    async walletWithdrawalRequested(userId, amount) {
        await this.send({
            userId,
            type: types_1.NotificationType.PAYMENT,
            title: 'Withdrawal Requested',
            message: `Your withdrawal of ₦${amount.toLocaleString()} is being processed. It will be completed within 1-3 business days.`,
            data: { amount },
            link: '/wallet',
        });
    }
    async walletWithdrawalProcessed(userId, amount, status) {
        const title = status === 'completed' ? 'Withdrawal Completed' : 'Withdrawal Failed';
        const message = status === 'completed'
            ? `Your withdrawal of ₦${amount.toLocaleString()} has been completed.`
            : `Your withdrawal of ₦${amount.toLocaleString()} failed. The amount has been returned to your wallet.`;
        await this.send({
            userId,
            type: types_1.NotificationType.PAYMENT,
            title,
            message,
            data: { amount, status },
            link: '/wallet',
        });
    }
    async walletTransfer(senderId, recipientId, amount, senderName, recipientName) {
        // Notify sender
        await this.send({
            userId: senderId,
            type: types_1.NotificationType.PAYMENT,
            title: 'Transfer Sent',
            message: `You sent ₦${amount.toLocaleString()} to ${recipientName}.`,
            data: { amount, recipientName },
            link: '/wallet',
        });
        // Notify recipient
        await this.send({
            userId: recipientId,
            type: types_1.NotificationType.PAYMENT,
            title: 'Transfer Received',
            message: `You received ₦${amount.toLocaleString()} from ${senderName}.`,
            data: { amount, senderName },
            link: '/wallet',
        });
    }
    async refundIssued(userId, orderNumber, amount) {
        await this.send({
            userId,
            type: types_1.NotificationType.PAYMENT,
            title: 'Refund Issued',
            message: `A refund of ₦${amount.toLocaleString()} for order #${orderNumber} has been credited to your wallet.`,
            data: { orderNumber, amount },
            link: '/wallet',
        });
    }
    // ================================================================
    // DELIVERY NOTIFICATIONS
    // ================================================================
    async deliveryStatusUpdate(orderId, orderNumber, status, customerId) {
        const statusMessages = {
            picked_up: 'Your package has been picked up by the courier.',
            in_transit: 'Your package is on the way!',
            delivered: 'Your package has been delivered!',
            failed: 'Delivery attempt failed. The courier will try again.',
        };
        const message = statusMessages[status] || `Delivery status updated: ${status}`;
        await this.send({
            userId: customerId,
            type: types_1.NotificationType.DELIVERY,
            title: 'Delivery Update',
            message: `Order #${orderNumber}: ${message}`,
            data: { orderId, orderNumber, status },
            link: `/orders/${orderId}`,
        });
    }
    // ================================================================
    // REVIEW NOTIFICATIONS
    // ================================================================
    async newReviewOnProduct(vendorId, productName, rating, reviewerName) {
        await this.send({
            userId: vendorId,
            type: types_1.NotificationType.REVIEW,
            title: 'New Review',
            message: `${reviewerName} left a ${rating}-star review on "${productName}".`,
            data: { productName, rating },
            link: '/vendor/reviews',
        });
    }
    async reviewReminder(userId, orderId, orderNumber, productName) {
        await this.send({
            userId,
            type: types_1.NotificationType.REVIEW,
            title: 'Review Your Purchase',
            message: `How was "${productName}" from order #${orderNumber}? Share your experience!`,
            data: { orderId, orderNumber, productName },
            link: `/orders/${orderId}/review`,
        });
    }
    // ================================================================
    // PROMOTION NOTIFICATIONS
    // ================================================================
    async newProductFromFollowedVendor(followerIds, vendorName, productName, productId) {
        if (followerIds.length === 0)
            return;
        await this.sendToMany({
            userIds: followerIds,
            type: types_1.NotificationType.PROMOTION,
            title: 'New Arrival',
            message: `${vendorName} just listed "${productName}". Check it out!`,
            data: { productId, vendorName },
            link: `/products/${productId}`,
        });
    }
    async priceDrop(userIds, productName, oldPrice, newPrice, productId) {
        if (userIds.length === 0)
            return;
        await this.sendToMany({
            userIds,
            type: types_1.NotificationType.PROMOTION,
            title: 'Price Drop',
            message: `"${productName}" dropped from ₦${oldPrice.toLocaleString()} to ₦${newPrice.toLocaleString()}!`,
            data: { productId, oldPrice, newPrice },
            link: `/products/${productId}`,
        });
    }
    async dealOrOffer(userIds, title, message, data) {
        if (userIds.length === 0)
            return;
        await this.sendToMany({
            userIds,
            type: types_1.NotificationType.PROMOTION,
            title,
            message,
            data,
        });
    }
    // ================================================================
    // REWARD / POINTS NOTIFICATIONS
    // ================================================================
    async pointsEarned(userId, points, reason) {
        await this.send({
            userId,
            type: types_1.NotificationType.SYSTEM,
            title: 'Points Earned',
            message: `You earned ${points} points for ${reason}!`,
            data: { points, reason },
            link: '/rewards',
        });
    }
    async badgeEarned(userId, badge) {
        const badgeNames = {
            'first-purchase': 'First Purchase',
            'loyal-customer': 'Loyal Customer',
            'vip-customer': 'VIP Customer',
            'high-spender': 'High Spender',
        };
        await this.send({
            userId,
            type: types_1.NotificationType.SYSTEM,
            title: 'New Badge Unlocked',
            message: `Congratulations! You earned the "${badgeNames[badge] || badge}" badge!`,
            data: { badge },
            link: '/rewards',
        });
    }
    async pointsRedeemed(userId, points, cashValue) {
        await this.send({
            userId,
            type: types_1.NotificationType.SYSTEM,
            title: 'VCredits Earned!',
            message: `You converted ${points} points to ${cashValue.toLocaleString()} VCredits. Use them to pay for orders!`,
            data: { points, vCredits: cashValue },
            link: '/wallet',
        });
    }
    // ================================================================
    // ACCOUNT NOTIFICATIONS
    // ================================================================
    async welcomeNotification(userId, firstName) {
        await this.send({
            userId,
            type: types_1.NotificationType.ACCOUNT,
            title: 'Welcome to VendorSpot!',
            message: `Hi ${firstName}! Your account is now active. Start shopping or set up your vendor profile.`,
            data: {},
            link: '/',
        });
    }
    async vendorVerified(userId) {
        await this.send({
            userId,
            type: types_1.NotificationType.ACCOUNT,
            title: 'Vendor Account Verified',
            message: 'Your vendor account has been verified! You can now start listing products.',
            data: {},
            link: '/vendor/products',
        });
    }
    async vendorRejected(userId, reason) {
        await this.send({
            userId,
            type: types_1.NotificationType.ACCOUNT,
            title: 'Vendor Verification Update',
            message: reason
                ? `Your vendor application needs attention: ${reason}`
                : 'Your vendor application was not approved. Please update your documents and try again.',
            data: { reason },
            link: '/vendor/profile',
        });
    }
    // ================================================================
    // DISPUTE NOTIFICATIONS
    // ================================================================
    async disputeCreated(orderId, orderNumber, vendorId, buyerId) {
        await this.send({
            userId: vendorId,
            type: types_1.NotificationType.ORDER,
            title: 'Dispute Filed',
            message: `A dispute has been filed for order #${orderNumber}. Please review and respond.`,
            data: { orderId, orderNumber },
            link: `/vendor/disputes`,
        });
        await this.send({
            userId: buyerId,
            type: types_1.NotificationType.ORDER,
            title: 'Dispute Submitted',
            message: `Your dispute for order #${orderNumber} has been submitted. We'll keep you updated.`,
            data: { orderId, orderNumber },
            link: `/disputes`,
        });
    }
    async disputeResolved(orderId, orderNumber, vendorId, buyerId, resolution) {
        const message = `The dispute for order #${orderNumber} has been resolved: ${resolution}`;
        await this.send({
            userId: vendorId,
            type: types_1.NotificationType.ORDER,
            title: 'Dispute Resolved',
            message,
            data: { orderId, orderNumber, resolution },
            link: `/vendor/disputes`,
        });
        await this.send({
            userId: buyerId,
            type: types_1.NotificationType.ORDER,
            title: 'Dispute Resolved',
            message,
            data: { orderId, orderNumber, resolution },
            link: `/disputes`,
        });
    }
    // ================================================================
    // REFERRAL NOTIFICATIONS
    // ================================================================
    async referralSignup(referrerId, refereeName) {
        await this.send({
            userId: referrerId,
            type: types_1.NotificationType.SYSTEM,
            title: 'Referral Success',
            message: `${refereeName} just signed up using your referral code! You'll earn rewards when they make their first purchase.`,
            data: { refereeName },
            link: '/rewards',
        });
    }
    async referralPurchase(referrerId, commission) {
        await this.send({
            userId: referrerId,
            type: types_1.NotificationType.SYSTEM,
            title: 'Referral Commission',
            message: `You earned ₦${commission.toLocaleString()} from a referral purchase!`,
            data: { commission },
            link: '/wallet',
        });
    }
    // ================================================================
    // VENDOR SALES NOTIFICATION
    // ================================================================
    async vendorSaleCompleted(vendorId, orderNumber, amount, commission) {
        await this.send({
            userId: vendorId,
            type: types_1.NotificationType.PAYMENT,
            title: 'Sale Completed',
            message: `Order #${orderNumber} completed! ₦${commission.toLocaleString()} has been added to your wallet.`,
            data: { orderNumber, amount, commission },
            link: '/vendor/wallet',
        });
    }
}
exports.notificationService = new NotificationService();
//# sourceMappingURL=notification.service.js.map