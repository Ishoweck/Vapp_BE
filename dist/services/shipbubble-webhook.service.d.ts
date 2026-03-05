export interface WebhookSimulatorParams {
    orderId: string;
    statusCode: 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'completed' | 'cancelled';
}
export declare class ShipBubbleWebhookService {
    private baseUrl;
    private apiKey;
    private isSandbox;
    /**
     * Simulate webhook event (sandbox only)
     * This triggers ShipBubble to send a webhook to your configured endpoint
     * OR directly simulates the webhook if ShipBubble sandbox is not configured
     */
    simulateWebhook(params: WebhookSimulatorParams): Promise<any>;
    /**
     * Directly simulate webhook by calling our own webhook handler
     * This bypasses ShipBubble entirely for local testing
     */
    private simulateWebhookDirectly;
    /**
     * Test webhook configuration
     * Sends a test webhook to verify your endpoint is working
     */
    testWebhookEndpoint(): Promise<{
        success: boolean;
        message: string;
    }>;
}
export declare const shipBubbleWebhookService: ShipBubbleWebhookService;
//# sourceMappingURL=shipbubble-webhook.service.d.ts.map