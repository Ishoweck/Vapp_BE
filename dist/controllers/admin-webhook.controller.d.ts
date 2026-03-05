import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class AdminWebhookController {
    /**
     * Simulate webhook for vendor's own order (vendors only)
     */
    simulateVendorOwnWebhook(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Simulate webhook for testing (sandbox only)
     * This allows admins to trigger status updates manually for testing
     */
    simulateWebhook(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get order shipment details for webhook simulation
     * Helps admins find the correct order_id to use
     */
    getOrderShipmentDetails(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Simulate webhook for specific vendor in multi-vendor order
     */
    simulateVendorWebhook(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Test webhook endpoint configuration
     */
    testWebhookEndpoint(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const adminWebhookController: AdminWebhookController;
//# sourceMappingURL=admin-webhook.controller.d.ts.map