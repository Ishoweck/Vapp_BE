import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class RewardController {
    private redemptionLocks;
    /**
     * Get user points and rewards
     */
    getUserPoints(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Award points to user with transaction tracking
     */
    awardPoints(userId: string, points: number, activity: 'login' | 'purchase' | 'review' | 'share' | 'referral' | 'bonus' | 'other', description: string, metadata?: any): Promise<void>;
    /**
     * Redeem points for cash
     */
    redeemPoints(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Award badge to user
     */
    awardBadge(userId: string, badge: string): Promise<void>;
    /**
     * Get points history from transactions
     */
    getPointsHistory(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get leaderboard
     */
    getLeaderboard(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get available rewards
     */
    getAvailableRewards(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Check and award automatic badges
     */
    checkBadges(userId: string): Promise<void>;
    /**
     * Award points after order completion
     */
    awardOrderPoints(orderId: string): Promise<void>;
}
export declare const rewardController: RewardController;
//# sourceMappingURL=reward.controller.d.ts.map