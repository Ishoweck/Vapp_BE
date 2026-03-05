"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminWebhookController = exports.AdminWebhookController = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const error_1 = require("../middleware/error");
const shipbubble_webhook_service_1 = require("../services/shipbubble-webhook.service");
const logger_1 = require("../utils/logger");
class AdminWebhookController {
    /**
     * Simulate webhook for vendor's own order (vendors only)
     */
    async simulateVendorOwnWebhook(req, res) {
        const { orderId, statusCode } = req.body;
        if (!orderId || !statusCode) {
            throw new error_1.AppError('orderId and statusCode are required', 400);
        }
        const validStatuses = ['pending', 'confirmed', 'picked_up', 'in_transit', 'completed', 'cancelled'];
        if (!validStatuses.includes(statusCode)) {
            throw new error_1.AppError(`Invalid status code. Must be one of: ${validStatuses.join(', ')}`, 400);
        }
        logger_1.logger.info('🧪 ============================================');
        logger_1.logger.info('🧪 VENDOR WEBHOOK SIMULATION (OWN ORDER)');
        logger_1.logger.info('🧪 ============================================');
        logger_1.logger.info('👤 Vendor:', req.user?.email);
        logger_1.logger.info('📦 Order ID:', orderId);
        logger_1.logger.info('📊 Status Code:', statusCode);
        try {
            const order = await Order_1.default.findById(orderId);
            if (!order) {
                throw new error_1.AppError('Order not found', 404);
            }
            // Verify vendor has items in this order
            const hasVendorItems = order.items.some(item => item.vendor.toString() === req.user?.id);
            if (!hasVendorItems) {
                throw new error_1.AppError('Not authorized - order does not contain your items', 403);
            }
            // Find vendor's shipment
            const vendorShipment = order.vendorShipments?.find((s) => s.vendor.toString() === req.user?.id);
            if (!vendorShipment?.trackingNumber) {
                throw new error_1.AppError('No tracking number found for your shipment', 400);
            }
            logger_1.logger.info('📦 Simulating webhook for tracking:', vendorShipment.trackingNumber);
            // Simulate the webhook
            const result = await shipbubble_webhook_service_1.shipBubbleWebhookService.simulateWebhook({
                orderId: vendorShipment.trackingNumber,
                statusCode,
            });
            logger_1.logger.info('✅ Webhook simulation completed');
            logger_1.logger.info('🧪 ============================================\n');
            res.json({
                success: true,
                message: 'Shipment status updated successfully',
                data: {
                    trackingNumber: vendorShipment.trackingNumber,
                    newStatus: statusCode,
                    result,
                },
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Vendor webhook simulation failed:', error);
            throw error;
        }
    }
    /**
     * Simulate webhook for testing (sandbox only)
     * This allows admins to trigger status updates manually for testing
     */
    async simulateWebhook(req, res) {
        const { orderId, statusCode } = req.body;
        if (!orderId || !statusCode) {
            throw new error_1.AppError('orderId and statusCode are required', 400);
        }
        const validStatuses = ['pending', 'confirmed', 'picked_up', 'in_transit', 'completed', 'cancelled'];
        if (!validStatuses.includes(statusCode)) {
            throw new error_1.AppError(`Invalid status code. Must be one of: ${validStatuses.join(', ')}`, 400);
        }
        logger_1.logger.info('🧪 ============================================');
        logger_1.logger.info('🧪 ADMIN WEBHOOK SIMULATION REQUEST');
        logger_1.logger.info('🧪 ============================================');
        logger_1.logger.info('👤 Requested by:', req.user?.email);
        logger_1.logger.info('📋 Parameters:', { orderId, statusCode });
        try {
            // Simulate the webhook
            const result = await shipbubble_webhook_service_1.shipBubbleWebhookService.simulateWebhook({
                orderId,
                statusCode,
            });
            logger_1.logger.info('✅ Webhook simulation completed');
            logger_1.logger.info('🧪 ============================================\n');
            res.json({
                success: true,
                message: 'Webhook simulated successfully. Check your webhook endpoint logs.',
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Webhook simulation failed:', error);
            throw new error_1.AppError('Failed to simulate webhook: ' + error.message, 500);
        }
    }
    /**
     * Get order shipment details for webhook simulation
     * Helps admins find the correct order_id to use
     */
    async getOrderShipmentDetails(req, res) {
        const { orderNumber } = req.params;
        const order = await Order_1.default.findOne({ orderNumber })
            .select('orderNumber status vendorShipments trackingNumber');
        if (!order) {
            throw new error_1.AppError('Order not found', 404);
        }
        const shipmentDetails = {
            orderNumber: order.orderNumber,
            currentStatus: order.status,
            trackingNumber: order.trackingNumber,
            vendorShipments: order.vendorShipments?.map((shipment) => ({
                vendorName: shipment.vendorName,
                trackingNumber: shipment.trackingNumber,
                shipmentId: shipment.shipmentId,
                status: shipment.status,
                courier: shipment.courier,
                trackingUrl: shipment.trackingUrl,
            })) || [],
        };
        res.json({
            success: true,
            message: 'Use the trackingNumber or shipmentId for webhook simulation',
            data: shipmentDetails,
        });
    }
    /**
     * Simulate webhook for specific vendor in multi-vendor order
     */
    async simulateVendorWebhook(req, res) {
        const { orderNumber, vendorId, statusCode } = req.body;
        if (!orderNumber || !vendorId || !statusCode) {
            throw new error_1.AppError('orderNumber, vendorId, and statusCode are required', 400);
        }
        const order = await Order_1.default.findOne({ orderNumber });
        if (!order) {
            throw new error_1.AppError('Order not found', 404);
        }
        // Find vendor's shipment
        const vendorShipment = order.vendorShipments?.find((s) => s.vendor.toString() === vendorId);
        if (!vendorShipment) {
            throw new error_1.AppError('Vendor shipment not found in this order', 404);
        }
        if (!vendorShipment.trackingNumber) {
            throw new error_1.AppError('No tracking number found for this vendor shipment', 400);
        }
        logger_1.logger.info('🧪 Simulating webhook for vendor shipment:', {
            orderNumber,
            vendorName: vendorShipment.vendorName,
            trackingNumber: vendorShipment.trackingNumber,
            statusCode,
        });
        try {
            const result = await shipbubble_webhook_service_1.shipBubbleWebhookService.simulateWebhook({
                orderId: vendorShipment.trackingNumber,
                statusCode,
            });
            res.json({
                success: true,
                message: `Webhook simulated for ${vendorShipment.vendorName}'s shipment`,
                data: {
                    vendorName: vendorShipment.vendorName,
                    trackingNumber: vendorShipment.trackingNumber,
                    result,
                },
            });
        }
        catch (error) {
            throw new error_1.AppError('Failed to simulate webhook: ' + error.message, 500);
        }
    }
    /**
     * Test webhook endpoint configuration
     */
    async testWebhookEndpoint(req, res) {
        logger_1.logger.info('🧪 Testing webhook endpoint configuration...');
        logger_1.logger.info('👤 Requested by:', req.user?.email);
        try {
            const result = await shipbubble_webhook_service_1.shipBubbleWebhookService.testWebhookEndpoint();
            res.json({
                success: true,
                message: 'Webhook test initiated. Check your webhook endpoint logs.',
                data: result,
            });
        }
        catch (error) {
            throw new error_1.AppError('Failed to test webhook endpoint: ' + error.message, 500);
        }
    }
}
exports.AdminWebhookController = AdminWebhookController;
exports.adminWebhookController = new AdminWebhookController();
//# sourceMappingURL=admin-webhook.controller.js.map