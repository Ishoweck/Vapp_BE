import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class OAuthController {
    /**
     * Google OAuth Login
     */
    googleLogin(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Apple OAuth Login
     */
    appleLogin(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Award daily login points with streak tracking
     */
    private awardDailyLoginPoints;
    /**
     * Generate random password for OAuth users
     */
    private generateRandomPassword;
}
export declare const oauthController: OAuthController;
//# sourceMappingURL=oauthController.d.ts.map