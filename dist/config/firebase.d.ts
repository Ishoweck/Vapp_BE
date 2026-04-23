/**
 * Send push notifications via Expo Push Notification Service.
 * Tokens are Expo push tokens (format: ExponentPushToken[xxx]).
 */
export declare const sendPushNotification: (tokens: string[], title: string, body: string, data?: Record<string, string>) => Promise<void>;
export declare const isFirebaseInitialized: () => boolean;
declare const _default: {};
export default _default;
//# sourceMappingURL=firebase.d.ts.map