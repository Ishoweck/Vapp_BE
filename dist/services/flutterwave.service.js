"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.flutterwaveService = exports.FlutterwaveService = void 0;
// services/flutterwave.service.ts
// Flutterwave payment integration service
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';
class FlutterwaveService {
    constructor() {
        this.headers = {
            Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
            'Content-Type': 'application/json',
        };
        if (!FLUTTERWAVE_SECRET_KEY) {
            logger_1.logger.warn('⚠️ FLUTTERWAVE_SECRET_KEY is not set!');
        }
        else {
            logger_1.logger.info('✅ Flutterwave Secret Key is set');
        }
    }
    /**
     * Initialize a payment — returns a hosted payment link
     */
    async initializePayment(params) {
        try {
            logger_1.logger.info('💳 Initializing Flutterwave payment:', {
                tx_ref: params.tx_ref,
                amount: params.amount,
                currency: params.currency || 'NGN',
                email: params.customer.email,
            });
            const payload = {
                tx_ref: params.tx_ref,
                amount: params.amount,
                currency: params.currency || 'NGN',
                redirect_url: params.redirect_url,
                customer: params.customer,
                meta: params.meta || {},
                customizations: params.customizations || {
                    title: 'VendorSpot',
                    description: 'Payment for your order',
                },
                payment_options: 'card,banktransfer,ussd',
            };
            logger_1.logger.info('📤 Flutterwave request payload:', payload);
            const response = await axios_1.default.post(`${FLUTTERWAVE_BASE_URL}/payments`, payload, { headers: this.headers });
            logger_1.logger.info('📥 Flutterwave response:', {
                status: response.data.status,
                message: response.data.message,
                hasLink: !!response.data.data?.link,
            });
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || 'Flutterwave payment initialization failed');
            }
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('❌ Flutterwave initializePayment error:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });
            throw error;
        }
    }
    /**
     * Verify a payment by transaction ID
     */
    async verifyPayment(transactionId) {
        try {
            logger_1.logger.info('🔍 Verifying Flutterwave payment:', { transactionId });
            const response = await axios_1.default.get(`${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`, { headers: this.headers });
            logger_1.logger.info('📥 Flutterwave verification response:', {
                status: response.data.status,
                paymentStatus: response.data.data?.status,
                amount: response.data.data?.amount,
                currency: response.data.data?.currency,
                tx_ref: response.data.data?.tx_ref,
            });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('❌ Flutterwave verifyPayment error:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });
            throw error;
        }
    }
    /**
     * Verify payment by tx_ref (order reference)
     * Useful when you only have the tx_ref and not the transaction_id
     */
    async verifyPaymentByRef(txRef) {
        try {
            logger_1.logger.info('🔍 Verifying Flutterwave payment by tx_ref:', { txRef });
            // First, find the transaction by tx_ref
            const response = await axios_1.default.get(`${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${txRef}`, { headers: this.headers });
            logger_1.logger.info('📥 Flutterwave verify by ref response:', {
                status: response.data.status,
                paymentStatus: response.data.data?.status,
                amount: response.data.data?.amount,
            });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('❌ Flutterwave verifyPaymentByRef error:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });
            throw error;
        }
    }
}
exports.FlutterwaveService = FlutterwaveService;
exports.flutterwaveService = new FlutterwaveService();
//# sourceMappingURL=flutterwave.service.js.map