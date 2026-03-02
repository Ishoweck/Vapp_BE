import admin from 'firebase-admin';
import { logger } from '../utils/logger';

let firebaseInitialized = false;

const initializeFirebase = (): void => {
  if (firebaseInitialized) return;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      logger.warn('Firebase credentials not configured — push notifications disabled');
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });

    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized');
  } catch (error: any) {
    logger.error('Firebase initialization error:', error.message);
  }
};

initializeFirebase();

export const isFirebaseInitialized = (): boolean => firebaseInitialized;

export const sendPushNotification = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  if (!firebaseInitialized || tokens.length === 0) return;

  try {
    const message: admin.messaging.MulticastMessage = {
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

    const response = await admin.messaging().sendEachForMulticast(message);

    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      logger.warn(`Push notification failed for ${failedTokens.length} token(s)`);
    }

    logger.info(`Push sent: ${response.successCount}/${tokens.length} succeeded`);
  } catch (error: any) {
    logger.error('Push notification error:', error.message);
  }
};

export default admin;
