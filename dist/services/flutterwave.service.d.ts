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
export declare class FlutterwaveService {
    private headers;
    constructor();
    /**
     * Initialize a payment — returns a hosted payment link
     */
    initializePayment(params: FlutterwavePaymentParams): Promise<FlutterwaveResponse>;
    /**
     * Verify a payment by transaction ID
     */
    verifyPayment(transactionId: string): Promise<FlutterwaveVerifyResponse>;
    /**
     * Verify payment by tx_ref (order reference)
     * Useful when you only have the tx_ref and not the transaction_id
     */
    verifyPaymentByRef(txRef: string): Promise<FlutterwaveVerifyResponse>;
}
export declare const flutterwaveService: FlutterwaveService;
export {};
//# sourceMappingURL=flutterwave.service.d.ts.map