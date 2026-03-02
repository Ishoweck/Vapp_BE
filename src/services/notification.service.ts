import { NotificationType } from '../types';
import { Notification } from '../models/Additional';
import User from '../models/User';
import { sendPushNotification } from '../config/firebase';
import { logger } from '../utils/logger';

interface NotifyOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
}

interface NotifyManyOptions {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
}

class NotificationService {
  /**
   * Send notification to a single user (in-app + push)
   */
  async send(options: NotifyOptions): Promise<void> {
    const { userId, type, title, message, data, link } = options;

    try {
      // 1. Create in-app notification
      await Notification.create({
        user: userId,
        type,
        title,
        message,
        data,
        link,
      });

      // 2. Send push notification
      const user = await User.findById(userId).select('fcmTokens');
      if (user?.fcmTokens && user.fcmTokens.length > 0) {
        const pushData: Record<string, string> = {
          type,
          ...(link ? { link } : {}),
          ...(data ? { payload: JSON.stringify(data) } : {}),
        };
        await sendPushNotification(user.fcmTokens, title, message, pushData);
      }

      logger.info(`Notification sent to ${userId}: [${type}] ${title}`);
    } catch (error: any) {
      logger.error(`Failed to send notification to ${userId}:`, error.message);
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToMany(options: NotifyManyOptions): Promise<void> {
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
      await Notification.insertMany(docs);
    } catch (error: any) {
      logger.error('Bulk notification insert error:', error.message);
    }

    // Send push notifications
    try {
      const users = await User.find({
        _id: { $in: uniqueIds },
        fcmTokens: { $exists: true, $not: { $size: 0 } },
      }).select('fcmTokens');

      const allTokens = users.flatMap((u) => u.fcmTokens);
      if (allTokens.length > 0) {
        const pushData: Record<string, string> = {
          type,
          ...(link ? { link } : {}),
          ...(data ? { payload: JSON.stringify(data) } : {}),
        };
        await sendPushNotification(allTokens, title, message, pushData);
      }
    } catch (error: any) {
      logger.error('Bulk push notification error:', error.message);
    }

    logger.info(`Notification sent to ${uniqueIds.length} users: [${type}] ${title}`);
  }

  // ================================================================
  // ORDER NOTIFICATIONS
  // ================================================================

  async orderPlaced(orderId: string, orderNumber: string, total: number, customerId: string, vendorIds: string[]): Promise<void> {
    // Notify customer
    await this.send({
      userId: customerId,
      type: NotificationType.ORDER,
      title: 'Order Confirmed',
      message: `Your order #${orderNumber} for ₦${total.toLocaleString()} has been placed successfully.`,
      data: { orderId, orderNumber },
      link: `/orders/${orderId}`,
    });

    // Notify each vendor
    await this.sendToMany({
      userIds: vendorIds,
      type: NotificationType.ORDER,
      title: 'New Order Received',
      message: `You have a new order #${orderNumber}. Please review and process it.`,
      data: { orderId, orderNumber },
      link: `/vendor/orders/${orderId}`,
    });
  }

  async orderStatusUpdated(orderId: string, orderNumber: string, status: string, customerId: string): Promise<void> {
    const statusMessages: Record<string, string> = {
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
      type: NotificationType.ORDER,
      title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Order #${orderNumber}: ${message}`,
      data: { orderId, orderNumber, status },
      link: `/orders/${orderId}`,
    });
  }

  async orderCancelled(orderId: string, orderNumber: string, customerId: string, vendorIds: string[], cancelledBy: 'customer' | 'vendor'): Promise<void> {
    if (cancelledBy === 'customer') {
      // Notify vendors
      await this.sendToMany({
        userIds: vendorIds,
        type: NotificationType.ORDER,
        title: 'Order Cancelled',
        message: `Order #${orderNumber} has been cancelled by the customer.`,
        data: { orderId, orderNumber },
        link: `/vendor/orders/${orderId}`,
      });
    } else {
      // Notify customer
      await this.send({
        userId: customerId,
        type: NotificationType.ORDER,
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

  async paymentCompleted(orderId: string, orderNumber: string, amount: number, userId: string): Promise<void> {
    await this.send({
      userId,
      type: NotificationType.PAYMENT,
      title: 'Payment Successful',
      message: `Payment of ₦${amount.toLocaleString()} for order #${orderNumber} was successful.`,
      data: { orderId, orderNumber, amount },
      link: `/orders/${orderId}`,
    });
  }

  async walletTopUp(userId: string, amount: number, newBalance: number): Promise<void> {
    await this.send({
      userId,
      type: NotificationType.PAYMENT,
      title: 'Wallet Top-Up Successful',
      message: `₦${amount.toLocaleString()} has been added to your wallet. New balance: ₦${newBalance.toLocaleString()}.`,
      data: { amount, newBalance },
      link: '/wallet',
    });
  }

  async walletWithdrawalRequested(userId: string, amount: number): Promise<void> {
    await this.send({
      userId,
      type: NotificationType.PAYMENT,
      title: 'Withdrawal Requested',
      message: `Your withdrawal of ₦${amount.toLocaleString()} is being processed. It will be completed within 1-3 business days.`,
      data: { amount },
      link: '/wallet',
    });
  }

  async walletWithdrawalProcessed(userId: string, amount: number, status: 'completed' | 'failed'): Promise<void> {
    const title = status === 'completed' ? 'Withdrawal Completed' : 'Withdrawal Failed';
    const message = status === 'completed'
      ? `Your withdrawal of ₦${amount.toLocaleString()} has been completed.`
      : `Your withdrawal of ₦${amount.toLocaleString()} failed. The amount has been returned to your wallet.`;

    await this.send({
      userId,
      type: NotificationType.PAYMENT,
      title,
      message,
      data: { amount, status },
      link: '/wallet',
    });
  }

  async walletTransfer(senderId: string, recipientId: string, amount: number, senderName: string, recipientName: string): Promise<void> {
    // Notify sender
    await this.send({
      userId: senderId,
      type: NotificationType.PAYMENT,
      title: 'Transfer Sent',
      message: `You sent ₦${amount.toLocaleString()} to ${recipientName}.`,
      data: { amount, recipientName },
      link: '/wallet',
    });

    // Notify recipient
    await this.send({
      userId: recipientId,
      type: NotificationType.PAYMENT,
      title: 'Transfer Received',
      message: `You received ₦${amount.toLocaleString()} from ${senderName}.`,
      data: { amount, senderName },
      link: '/wallet',
    });
  }

  async refundIssued(userId: string, orderNumber: string, amount: number): Promise<void> {
    await this.send({
      userId,
      type: NotificationType.PAYMENT,
      title: 'Refund Issued',
      message: `A refund of ₦${amount.toLocaleString()} for order #${orderNumber} has been credited to your wallet.`,
      data: { orderNumber, amount },
      link: '/wallet',
    });
  }

  // ================================================================
  // DELIVERY NOTIFICATIONS
  // ================================================================

  async deliveryStatusUpdate(orderId: string, orderNumber: string, status: string, customerId: string): Promise<void> {
    const statusMessages: Record<string, string> = {
      picked_up: 'Your package has been picked up by the courier.',
      in_transit: 'Your package is on the way!',
      delivered: 'Your package has been delivered!',
      failed: 'Delivery attempt failed. The courier will try again.',
    };

    const message = statusMessages[status] || `Delivery status updated: ${status}`;

    await this.send({
      userId: customerId,
      type: NotificationType.DELIVERY,
      title: 'Delivery Update',
      message: `Order #${orderNumber}: ${message}`,
      data: { orderId, orderNumber, status },
      link: `/orders/${orderId}`,
    });
  }

  // ================================================================
  // REVIEW NOTIFICATIONS
  // ================================================================

  async newReviewOnProduct(vendorId: string, productName: string, rating: number, reviewerName: string): Promise<void> {
    await this.send({
      userId: vendorId,
      type: NotificationType.REVIEW,
      title: 'New Review',
      message: `${reviewerName} left a ${rating}-star review on "${productName}".`,
      data: { productName, rating },
      link: '/vendor/reviews',
    });
  }

  async reviewReminder(userId: string, orderId: string, orderNumber: string, productName: string): Promise<void> {
    await this.send({
      userId,
      type: NotificationType.REVIEW,
      title: 'Review Your Purchase',
      message: `How was "${productName}" from order #${orderNumber}? Share your experience!`,
      data: { orderId, orderNumber, productName },
      link: `/orders/${orderId}/review`,
    });
  }

  // ================================================================
  // PROMOTION NOTIFICATIONS
  // ================================================================

  async newProductFromFollowedVendor(followerIds: string[], vendorName: string, productName: string, productId: string): Promise<void> {
    if (followerIds.length === 0) return;

    await this.sendToMany({
      userIds: followerIds,
      type: NotificationType.PROMOTION,
      title: 'New Arrival',
      message: `${vendorName} just listed "${productName}". Check it out!`,
      data: { productId, vendorName },
      link: `/products/${productId}`,
    });
  }

  async priceDrop(userIds: string[], productName: string, oldPrice: number, newPrice: number, productId: string): Promise<void> {
    if (userIds.length === 0) return;

    await this.sendToMany({
      userIds,
      type: NotificationType.PROMOTION,
      title: 'Price Drop',
      message: `"${productName}" dropped from ₦${oldPrice.toLocaleString()} to ₦${newPrice.toLocaleString()}!`,
      data: { productId, oldPrice, newPrice },
      link: `/products/${productId}`,
    });
  }

  async dealOrOffer(userIds: string[], title: string, message: string, data?: Record<string, any>): Promise<void> {
    if (userIds.length === 0) return;

    await this.sendToMany({
      userIds,
      type: NotificationType.PROMOTION,
      title,
      message,
      data,
    });
  }

  // ================================================================
  // REWARD / POINTS NOTIFICATIONS
  // ================================================================

  async pointsEarned(userId: string, points: number, reason: string): Promise<void> {
    await this.send({
      userId,
      type: NotificationType.SYSTEM,
      title: 'Points Earned',
      message: `You earned ${points} points for ${reason}!`,
      data: { points, reason },
      link: '/rewards',
    });
  }

  async badgeEarned(userId: string, badge: string): Promise<void> {
    const badgeNames: Record<string, string> = {
      'first-purchase': 'First Purchase',
      'loyal-customer': 'Loyal Customer',
      'vip-customer': 'VIP Customer',
      'high-spender': 'High Spender',
    };

    await this.send({
      userId,
      type: NotificationType.SYSTEM,
      title: 'New Badge Unlocked',
      message: `Congratulations! You earned the "${badgeNames[badge] || badge}" badge!`,
      data: { badge },
      link: '/rewards',
    });
  }

  async pointsRedeemed(userId: string, points: number, cashValue: number): Promise<void> {
    await this.send({
      userId,
      type: NotificationType.SYSTEM,
      title: 'Points Redeemed',
      message: `You redeemed ${points} points for ₦${cashValue.toLocaleString()}. The amount has been added to your wallet.`,
      data: { points, cashValue },
      link: '/wallet',
    });
  }

  // ================================================================
  // ACCOUNT NOTIFICATIONS
  // ================================================================

  async welcomeNotification(userId: string, firstName: string): Promise<void> {
    await this.send({
      userId,
      type: NotificationType.ACCOUNT,
      title: 'Welcome to VendorSpot!',
      message: `Hi ${firstName}! Your account is now active. Start shopping or set up your vendor profile.`,
      data: {},
      link: '/',
    });
  }

  async vendorVerified(userId: string): Promise<void> {
    await this.send({
      userId,
      type: NotificationType.ACCOUNT,
      title: 'Vendor Account Verified',
      message: 'Your vendor account has been verified! You can now start listing products.',
      data: {},
      link: '/vendor/products',
    });
  }

  async vendorRejected(userId: string, reason?: string): Promise<void> {
    await this.send({
      userId,
      type: NotificationType.ACCOUNT,
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

  async disputeCreated(orderId: string, orderNumber: string, vendorId: string, buyerId: string): Promise<void> {
    await this.send({
      userId: vendorId,
      type: NotificationType.ORDER,
      title: 'Dispute Filed',
      message: `A dispute has been filed for order #${orderNumber}. Please review and respond.`,
      data: { orderId, orderNumber },
      link: `/vendor/disputes`,
    });

    await this.send({
      userId: buyerId,
      type: NotificationType.ORDER,
      title: 'Dispute Submitted',
      message: `Your dispute for order #${orderNumber} has been submitted. We'll keep you updated.`,
      data: { orderId, orderNumber },
      link: `/disputes`,
    });
  }

  async disputeResolved(orderId: string, orderNumber: string, vendorId: string, buyerId: string, resolution: string): Promise<void> {
    const message = `The dispute for order #${orderNumber} has been resolved: ${resolution}`;

    await this.send({
      userId: vendorId,
      type: NotificationType.ORDER,
      title: 'Dispute Resolved',
      message,
      data: { orderId, orderNumber, resolution },
      link: `/vendor/disputes`,
    });

    await this.send({
      userId: buyerId,
      type: NotificationType.ORDER,
      title: 'Dispute Resolved',
      message,
      data: { orderId, orderNumber, resolution },
      link: `/disputes`,
    });
  }

  // ================================================================
  // REFERRAL NOTIFICATIONS
  // ================================================================

  async referralSignup(referrerId: string, refereeName: string): Promise<void> {
    await this.send({
      userId: referrerId,
      type: NotificationType.SYSTEM,
      title: 'Referral Success',
      message: `${refereeName} just signed up using your referral code! You'll earn rewards when they make their first purchase.`,
      data: { refereeName },
      link: '/rewards',
    });
  }

  async referralPurchase(referrerId: string, commission: number): Promise<void> {
    await this.send({
      userId: referrerId,
      type: NotificationType.SYSTEM,
      title: 'Referral Commission',
      message: `You earned ₦${commission.toLocaleString()} from a referral purchase!`,
      data: { commission },
      link: '/wallet',
    });
  }

  // ================================================================
  // VENDOR SALES NOTIFICATION
  // ================================================================

  async vendorSaleCompleted(vendorId: string, orderNumber: string, amount: number, commission: number): Promise<void> {
    await this.send({
      userId: vendorId,
      type: NotificationType.PAYMENT,
      title: 'Sale Completed',
      message: `Order #${orderNumber} completed! ₦${commission.toLocaleString()} has been added to your wallet.`,
      data: { orderNumber, amount, commission },
      link: '/vendor/wallet',
    });
  }
}

export const notificationService = new NotificationService();
