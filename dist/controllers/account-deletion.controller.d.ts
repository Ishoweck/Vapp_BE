import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class AccountDeletionController {
    /**
     * Request account deletion (User)
     */
    requestAccountDeletion(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get user's deletion request status (User)
     */
    getDeletionRequestStatus(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Cancel deletion request (User)
     */
    cancelDeletionRequest(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get all deletion requests (Admin)
     */
    getAllDeletionRequests(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Approve account deletion (Admin)
     */
    approveDeletionRequest(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Reject account deletion (Admin)
     */
    rejectDeletionRequest(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const accountDeletionController: AccountDeletionController;
//# sourceMappingURL=account-deletion.controller.d.ts.map