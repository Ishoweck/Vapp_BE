import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class AffiliateController {
    /**
     * Activate affiliate account
     */
    activateAffiliate(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Generate affiliate link for product
     */
    generateAffiliateLink(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Generate general affiliate link
     */
    generateGeneralLink(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Track affiliate click
     */
    trackClick(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get affiliate dashboard
     */
    /**
   * Get affiliate dashboard
   */
    getAffiliateDashboard(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get affiliate earnings
     */
    getAffiliateEarnings(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get all affiliates (Admin only)
     */
    getAllAffiliates(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get affiliate leaderboard
     */
    getAffiliateLeaderboard(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const affiliateController: AffiliateController;
//# sourceMappingURL=affiliate.controller.d.ts.map