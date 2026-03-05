import admin from 'firebase-admin';
export declare const isFirebaseInitialized: () => boolean;
export declare const sendPushNotification: (tokens: string[], title: string, body: string, data?: Record<string, string>) => Promise<void>;
export default admin;
//# sourceMappingURL=firebase.d.ts.map