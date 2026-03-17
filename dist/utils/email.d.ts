interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}
export declare const sendEmail: (options: EmailOptions) => Promise<void>;
export declare const sendOTPEmail: (email: string, otp: string) => Promise<void>;
export declare const sendPasswordResetEmail: (email: string, resetCode: string) => Promise<void>;
export declare const sendWelcomeEmail: (email: string, name: string) => Promise<void>;
export declare const sendOrderConfirmationEmail: (email: string, orderNumber: string, total: number) => Promise<void>;
export declare const sendFounderWelcomeEmail: (email: string) => Promise<void>;
export declare const sendBuyerFounderWelcomeEmail: (email: string, firstName: string) => Promise<void>;
export declare const sendProductPostingGuideEmail: (email: string) => Promise<void>;
export {};
//# sourceMappingURL=email.d.ts.map