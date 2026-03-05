import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class DisputeController {
    /**
     * Open a dispute on an order (Customer)
     */
    createDispute(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get customer's disputes
     */
    getMyDisputes(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get single dispute (customer or involved vendor)
     */
    getDispute(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get vendor's disputes
     */
    getVendorDisputes(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Vendor responds to a dispute
     */
    vendorRespond(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Customer adds a message to the dispute thread
     */
    addMessage(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Admin: Get all disputes
     */
    getAllDisputes(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Admin: Mark dispute as under review
     */
    markUnderReview(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Admin: Resolve dispute (full refund, partial refund, or reject)
     */
    resolveDispute(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Admin: Add a message/note to a dispute
     */
    adminAddMessage(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const disputeController: DisputeController;
//# sourceMappingURL=dispute.controller.d.ts.map