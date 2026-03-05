"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = exports.isFirebaseInitialized = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const logger_1 = require("../utils/logger");
let firebaseInitialized = false;
const initializeFirebase = () => {
    if (firebaseInitialized)
        return;
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        if (!projectId || !privateKey || !clientEmail) {
            logger_1.logger.warn('Firebase credentials not configured — push notifications disabled');
            return;
        }
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert({
                projectId,
                privateKey,
                clientEmail,
            }),
        });
        firebaseInitialized = true;
        logger_1.logger.info('Firebase Admin SDK initialized');
    }
    catch (error) {
        logger_1.logger.error('Firebase initialization error:', error.message);
    }
};
initializeFirebase();
const isFirebaseInitialized = () => firebaseInitialized;
exports.isFirebaseInitialized = isFirebaseInitialized;
const sendPushNotification = async (tokens, title, body, data) => {
    if (!firebaseInitialized || tokens.length === 0)
        return;
    try {
        const message = {
            tokens,
            notification: {
                title,
                body,
            },
            data: data || {},
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'vendorspot_notifications',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        };
        const response = await firebase_admin_1.default.messaging().sendEachForMulticast(message);
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            logger_1.logger.warn(`Push notification failed for ${failedTokens.length} token(s)`);
        }
        logger_1.logger.info(`Push sent: ${response.successCount}/${tokens.length} succeeded`);
    }
    catch (error) {
        logger_1.logger.error('Push notification error:', error.message);
    }
};
exports.sendPushNotification = sendPushNotification;
exports.default = firebase_admin_1.default;
//# sourceMappingURL=firebase.js.map