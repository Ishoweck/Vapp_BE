"use strict";
// controllers/reward.controller.ts - UPDATED WITH POINTS TRANSACTION TRACKING
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardController = exports.RewardController = void 0;
const User_1 = __importDefault(require("../models/User"));
const Order_1 = __importDefault(require("../models/Order"));
const PointsTransaction_1 = __importDefault(require("../models/PointsTransaction"));
const Additional_1 = require("../models/Additional");
const error_1 = require("../middleware/error");
const notification_service_1 = require("../services/notification.service");
const logger_1 = require("../utils/logger");
class RewardController {
    /**
     * Get user points and rewards
     */
    async getUserPoints(req, res) {
        const user = await User_1.default.findById(req.user?.id);
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        // Calculate tier based on points
        let tier = 'Bronze';
        if (user.points >= 10000) {
            tier = 'Diamond';
        }
        else if (user.points >= 5000) {
            tier = 'Platinum';
        }
        else if (user.points >= 2000) {
            tier = 'Gold';
        }
        else if (user.points >= 500) {
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
        const currentTier = tierThresholds[tier];
        const pointsToNext = currentTier.next ? currentTier.next - (user.points || 0) : 0;
        res.json({
            success: true,
            data: {
                points: user.points || 0,
                tier,
                pointsToNextTier: pointsToNext,
                badges: user.badges || [],
                achievements: user.achievements || [],
            },
        });
    }
    /**
     * Award points to user with transaction tracking
     */
    async awardPoints(userId, points, activity, description, metadata) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            return;
        }
        // Update user points
        user.points = (user.points || 0) + points;
        await user.save();
        // Create transaction record
        await PointsTransaction_1.default.create({
            user: userId,
            type: 'earn',
            activity,
            points,
            description,
            metadata,
        });
        // Notify user
        try {
            await notification_service_1.notificationService.pointsEarned(userId, points, description);
        }
        catch (error) {
            logger_1.logger.error('Error sending points notification:', error);
        }
        logger_1.logger.info(`Points awarded: ${points} to user ${userId} - ${description}`);
    }
    /**
     * Redeem points for cash
     */
    async redeemPoints(req, res) {
        const { points } = req.body;
        const user = await User_1.default.findById(req.user?.id);
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        if ((user.points || 0) < points) {
            throw new error_1.AppError('Insufficient points', 400);
        }
        if (points < 100) {
            throw new error_1.AppError('Minimum redemption is 100 points', 400);
        }
        // Conversion rate: 100 points = ₦100
        const cashValue = points;
        // Deduct points
        user.points = (user.points || 0) - points;
        await user.save();
        // Create transaction record for redemption
        await PointsTransaction_1.default.create({
            user: user._id,
            type: 'spend',
            activity: 'redemption',
            points: -points,
            description: `Redeemed ${points} points for ₦${cashValue}`,
            metadata: { cashValue },
        });
        // Add to wallet
        let wallet = await Additional_1.Wallet.findOne({ user: user._id });
        if (!wallet) {
            wallet = await Additional_1.Wallet.create({ user: user._id });
        }
        wallet.balance += cashValue;
        wallet.totalEarned += cashValue;
        wallet.transactions.push({
            type: 'credit',
            amount: cashValue,
            purpose: 'reward',
            reference: `POINTS-REDEEM-${Date.now()}`,
            description: `Redeemed ${points} points`,
            status: 'completed',
            timestamp: new Date(),
        });
        await wallet.save();
        logger_1.logger.info(`Points redeemed: ${points} by user ${req.user?.id}`);
        // Notify user
        try {
            await notification_service_1.notificationService.pointsRedeemed(req.user.id, points, cashValue);
        }
        catch (error) {
            logger_1.logger.error('Error sending redeem notification:', error);
        }
        res.json({
            success: true,
            message: 'Points redeemed successfully',
            data: {
                pointsRedeemed: points,
                cashValue,
                remainingPoints: user.points,
                newBalance: wallet.balance,
            },
        });
    }
    /**
     * Award badge to user
     */
    async awardBadge(userId, badge) {
        const user = await User_1.default.findById(userId);
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
                await notification_service_1.notificationService.badgeEarned(userId, badge);
            }
            catch (error) {
                logger_1.logger.error('Error sending badge notification:', error);
            }
            logger_1.logger.info(`Badge awarded: ${badge} to user ${userId}`);
        }
    }
    /**
     * Get points history from transactions
     */
    async getPointsHistory(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        // Get transactions from PointsTransaction model
        const transactions = await PointsTransaction_1.default.find({ user: req.user?.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        // Get total count for pagination
        const total = await PointsTransaction_1.default.countDocuments({ user: req.user?.id });
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
    async getLeaderboard(req, res) {
        const { period = 'all-time', type = 'points' } = req.query;
        let users;
        if (type === 'points') {
            users = await User_1.default.find({ points: { $gt: 0 } })
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
        }
        else {
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
    async getAvailableRewards(req, res) {
        const user = await User_1.default.findById(req.user?.id);
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        // Define available rewards
        const rewards = [
            {
                id: 'cash-100',
                name: '₦100 Cash',
                description: 'Redeem 100 points for ₦100',
                pointsCost: 100,
                available: (user.points || 0) >= 100,
            },
            {
                id: 'cash-500',
                name: '₦500 Cash',
                description: 'Redeem 500 points for ₦500',
                pointsCost: 500,
                available: (user.points || 0) >= 500,
            },
            {
                id: 'cash-1000',
                name: '₦1,000 Cash',
                description: 'Redeem 1,000 points for ₦1,000',
                pointsCost: 1000,
                available: (user.points || 0) >= 1000,
            },
            {
                id: 'cash-5000',
                name: '₦5,000 Cash',
                description: 'Redeem 5,000 points for ₦5,000',
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
    async checkBadges(userId) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            return;
        }
        const badges = user.badges || [];
        // First Purchase Badge
        const orderCount = await Order_1.default.countDocuments({
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
        const orders = await Order_1.default.find({
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
    async awardOrderPoints(orderId) {
        const order = await Order_1.default.findById(orderId);
        if (!order || order.paymentStatus !== 'completed') {
            return;
        }
        // Award 1 point per ₦100 spent
        const points = Math.floor(order.total / 100);
        if (points > 0) {
            await this.awardPoints(order.user.toString(), points, 'purchase', `Order ${order.orderNumber}`, { orderId: order._id, orderTotal: order.total });
        }
        // Check for badge awards
        await this.checkBadges(order.user.toString());
    }
}
exports.RewardController = RewardController;
exports.rewardController = new RewardController();
//# sourceMappingURL=reward.controller.js.map