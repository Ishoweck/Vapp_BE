// services/flutterwave.service.ts
// Flutterwave payment integration service
import axios from 'axios';
import { logger } from '../utils/logger';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || '';
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

interface FlutterwavePaymentParams {
  tx_ref: string;
  amount: number;
  currency?: string;
  redirect_url: string;
  customer: {
    email: string;
    name?: string;
    phonenumber?: string;
  };
  meta?: Record<string, any>;
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
}

interface FlutterwaveResponse {
  status: string;
  message: string;
  data: {
    link: string;
    [key: string]: any;
  };
}

interface FlutterwaveVerifyResponse {
  status: string;
  message: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    charged_amount: number;
    status: string;
    payment_type: string;
    created_at: string;
    customer: {
      id: number;
      email: string;
      name: string;
      phone_number: string;
    };
    [key: string]: any;
  };
}

export class FlutterwaveService {
  private headers = {
    Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };

  constructor() {
    if (!FLUTTERWAVE_SECRET_KEY) {
      logger.warn('⚠️ FLUTTERWAVE_SECRET_KEY is not set!');
    } else {
      logger.info('✅ Flutterwave Secret Key is set');
    }
  }

  /**
   * Initialize a payment — returns a hosted payment link
   */
  async initializePayment(params: FlutterwavePaymentParams): Promise<FlutterwaveResponse> {
    try {
      logger.info('💳 Initializing Flutterwave payment:', {
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

      logger.info('📤 Flutterwave request payload:', payload);

      const response = await axios.post(
        `${FLUTTERWAVE_BASE_URL}/payments`,
        payload,
        { headers: this.headers }
      );

      logger.info('📥 Flutterwave response:', {
        status: response.data.status,
        message: response.data.message,
        hasLink: !!response.data.data?.link,
      });

      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Flutterwave payment initialization failed');
      }

      return response.data;
    } catch (error: any) {
      logger.error('❌ Flutterwave initializePayment error:', {
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
  async verifyPayment(transactionId: string): Promise<FlutterwaveVerifyResponse> {
    try {
      logger.info('🔍 Verifying Flutterwave payment:', { transactionId });

      const response = await axios.get(
        `${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`,
        { headers: this.headers }
      );

      logger.info('📥 Flutterwave verification response:', {
        status: response.data.status,
        paymentStatus: response.data.data?.status,
        amount: response.data.data?.amount,
        currency: response.data.data?.currency,
        tx_ref: response.data.data?.tx_ref,
      });

      return response.data;
    } catch (error: any) {
      logger.error('❌ Flutterwave verifyPayment error:', {
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
  async verifyPaymentByRef(txRef: string): Promise<FlutterwaveVerifyResponse> {
    try {
      logger.info('🔍 Verifying Flutterwave payment by tx_ref:', { txRef });

      // First, find the transaction by tx_ref
      const response = await axios.get(
        `${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${txRef}`,
        { headers: this.headers }
      );

      logger.info('📥 Flutterwave verify by ref response:', {
        status: response.data.status,
        paymentStatus: response.data.data?.status,
        amount: response.data.data?.amount,
      });

      return response.data;
    } catch (error: any) {
      logger.error('❌ Flutterwave verifyPaymentByRef error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  }
}

export const flutterwaveService = new FlutterwaveService();