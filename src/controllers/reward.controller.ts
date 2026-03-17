// controllers/reward.controller.ts - UPDATED WITH POINTS TRANSACTION TRACKING

import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import User from '../models/User';
import Order from '../models/Order';
import PointsTransaction from '../models/PointsTransaction';
import { Wallet } from '../models/Additional';
import { AppError } from '../middleware/error';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

export class RewardController {
  // Track in-flight redemptions to prevent double-click
  private redemptionLocks = new Set<string>();

  /**
   * Get user points and rewards
   */
  async getUserPoints(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const currentPoints = user.points || 0;

    // Calculate tier based on current points (drops when points are redeemed)
    let tier = 'Bronze';
    if (currentPoints >= 10000) {
      tier = 'Diamond';
    } else if (currentPoints >= 5000) {
      tier = 'Platinum';
    } else if (currentPoints >= 2000) {
      tier = 'Gold';
    } else if (currentPoints >= 500) {
      tier = 'Silver';
    }

    // Calculate next tier requirements
    const tierThresholds = {
      Bronze: { min: 0, next: 500 },
      Silver: { min: 500, next: 2000 },
      Gold: { min: 2000, next: 5000 },
      Platinum: { min: 5000, next: 10000 },
      Diamond: { min: 10000, next: null },
    };

    const currentTier = tierThresholds[tier as keyof typeof tierThresholds];
    const pointsToNext = currentTier.next ? currentTier.next - currentPoints : 0;

    // Get VCredits balance
    const wallet = await Wallet.findOne({ user: user._id });
    const vCredits = wallet?.vCredits || 0;

    res.json({
      success: true,
      data: {
        points: currentPoints,
        vCredits,
        tier,
        pointsToNextTier: Math.max(0, pointsToNext),
        badges: user.badges || [],
        achievements: user.achievements || [],
      },
    });
  }

  /**
   * Award points to user with transaction tracking
   */
  async awardPoints(
    userId: string,
    points: number,
    activity: 'login' | 'purchase' | 'review' | 'share' | 'referral' | 'bonus' | 'other',
    description: string,
    metadata?: any
  ): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      return;
    }

    // Update user points
    user.points = (user.points || 0) + points;
    await user.save();

    // Create transaction record
    await PointsTransaction.create({
      user: userId,
      type: 'earn',
      activity,
      points,
      description,
      metadata,
    });

    // Notify user
    try {
      await notificationService.pointsEarned(userId, points, description);
    } catch (error) {
      logger.error('Error sending points notification:', error);
    }

    logger.info(`Points awarded: ${points} to user ${userId} - ${description}`);
  }

  /**
   * Redeem points for cash
   */
  async redeemPoints(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { points } = req.body;
    const userId = req.user?.id;

    // Prevent double-click / concurrent redemptions
    if (this.redemptionLocks.has(userId!)) {
      throw new AppError('Redemption already in progress. Please wait.', 429);
    }
    this.redemptionLocks.add(userId!);

    try {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if ((user.points || 0) < points) {
      throw new AppError('Insufficient points', 400);
    }

    if (points < 100) {
      throw new AppError('Minimum redemption is 100 points', 400);
    }

    // Conversion rate: 100 points = ₦100
    const cashValue = points;

    // Atomic deduct using findOneAndUpdate to prevent race conditions
    const updated = await User.findOneAndUpdate(
      { _id: userId, points: { $gte: points } },
      { $inc: { points: -points } },
      { new: true }
    );

    if (!updated) {
      throw new AppError('Insufficient points', 400);
    }

    // Create transaction record for redemption
    await PointsTransaction.create({
      user: user._id,
      type: 'spend',
      activity: 'redemption',
      points: -points,
      description: `Converted ${points} points to ${cashValue} VCredits`,
      metadata: { vCredits: cashValue },
    });

    // Add to wallet as VCredits (separate from cash balance)
    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: user._id });
    }

    wallet.vCredits = (wallet.vCredits || 0) + cashValue;
    wallet.transactions.push({
      type: 'credit',
      amount: cashValue,
      purpose: 'reward',
      reference: `VCREDITS-${Date.now()}`,
      description: `Converted ${points} points to ${cashValue} VCredits`,
      status: 'completed',
      timestamp: new Date(),
    } as any);

    await wallet.save();

    logger.info(`Points redeemed: ${points} by user ${req.user?.id}`);

    // Notify user
    try {
      await notificationService.pointsRedeemed(req.user!.id, points, cashValue);
    } catch (error) {
      logger.error('Error sending redeem notification:', error);
    }

    res.json({
      success: true,
      message: `${points} points converted to ${cashValue.toLocaleString()} VCredits. Use them to pay for orders!`,
      data: {
        pointsRedeemed: points,
        vCreditsEarned: cashValue,
        remainingPoints: updated.points,
        vCreditsBalance: wallet.vCredits,
      },
    });
    } finally {
      this.redemptionLocks.delete(userId!);
    }
  }

  /**
   * Award badge to user
   */
  async awardBadge(userId: string, badge: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      return;
    }

    if (!user.badges) {
      user.badges = [];
    }

    if (!user.badges.includes(badge)) {
      user.badges.push(badge);
      await user.save();

      // Notify user
      try {
        await notificationService.badgeEarned(userId, badge);
      } catch (error) {
        logger.error('Error sending badge notification:', error);
      }

      logger.info(`Badge awarded: ${badge} to user ${userId}`);
    }
  }

  /**
   * Get points history from transactions
   */
  async getPointsHistory(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get transactions from PointsTransaction model
    const transactions = await PointsTransaction.find({ user: req.user?.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await PointsTransaction.countDocuments({ user: req.user?.id });

    // Format history
    const history = transactions.map((transaction) => ({
      date: transaction.createdAt,
      type: transaction.activity,
      description: transaction.description,
      points: transaction.points,
      metadata: transaction.metadata,
    }));

    res.json({
      success: true,
      data: { 
        history,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      },
    });
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { period = 'all-time', type = 'points' } = req.query;

    let users;

    if (type === 'points') {
      users = await User.find({ points: { $gt: 0 } })
        .select('firstName lastName points badges')
        .sort({ points: -1 })
        .limit(50);

      const leaderboard = users.map((user, index) => ({
        rank: index + 1,
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          badges: user.badges || [],
        },
        score: user.points || 0,
      }));

      res.json({
        success: true,
        data: {
          type: 'points',
          period,
          leaderboard,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          type,
          period,
          leaderboard: [],
        },
      });
    }
  }

  /**
   * Get available rewards
   */
  async getAvailableRewards(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Define available rewards
    const rewards = [
      {
        id: 'vcredits-100',
        name: '100 VCredits',
        description: 'Convert 100 points to 100 VCredits',
        pointsCost: 100,
        available: (user.points || 0) >= 100,
      },
      {
        id: 'vcredits-500',
        name: '500 VCredits',
        description: 'Convert 500 points to 500 VCredits',
        pointsCost: 500,
        available: (user.points || 0) >= 500,
      },
      {
        id: 'vcredits-1000',
        name: '1,000 VCredits',
        description: 'Convert 1,000 points to 1,000 VCredits',
        pointsCost: 1000,
        available: (user.points || 0) >= 1000,
      },
      {
        id: 'vcredits-5000',
        name: '5,000 VCredits',
        description: 'Convert 5,000 points to 5,000 VCredits',
        pointsCost: 5000,
        available: (user.points || 0) >= 5000,
      },
    ];

    res.json({
      success: true,
      data: {
        userPoints: user.points || 0,
        rewards,
      },
    });
  }

  /**
   * Check and award automatic badges
   */
  async checkBadges(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      return;
    }

    const badges = user.badges || [];

    // First Purchase Badge
    const orderCount = await Order.countDocuments({
      user: userId,
      paymentStatus: 'completed',
    });
    
    if (orderCount >= 1 && !badges.includes('first-purchase')) {
      await this.awardBadge(userId, 'first-purchase');
    }

    // Loyal Customer (10 orders)
    if (orderCount >= 10 && !badges.includes('loyal-customer')) {
      await this.awardBadge(userId, 'loyal-customer');
    }

    // VIP Customer (50 orders)
    if (orderCount >= 50 && !badges.includes('vip-customer')) {
      await this.awardBadge(userId, 'vip-customer');
    }

    // High Spender (total spending > ₦100,000)
    const orders = await Order.find({
      user: userId,
      paymentStatus: 'completed',
    });
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

    if (totalSpent >= 100000 && !badges.includes('high-spender')) {
      await this.awardBadge(userId, 'high-spender');
    }
  }

  /**
   * Award points after order completion
   */
  async awardOrderPoints(orderId: string): Promise<void> {
    const order = await Order.findById(orderId);
    if (!order || order.paymentStatus !== 'completed') {
      return;
    }

    // Award 1 point per ₦100 spent
    const points = Math.floor(order.total / 100);

    if (points > 0) {
      await this.awardPoints(
        order.user.toString(),
        points,
        'purchase',
        `Order ${order.orderNumber}`,
        { orderId: order._id, orderTotal: order.total }
      );
    }

    // Check for badge awards
    await this.checkBadges(order.user.toString());
  }
}

export const rewardController = new RewardController();