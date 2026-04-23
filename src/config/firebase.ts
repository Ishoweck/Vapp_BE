import { logger } from '../utils/logger';

/**
 * Send push notifications via Expo Push Notification Service.
 * Tokens are Expo push tokens (format: ExponentPushToken[xxx]).
 */
export const sendPushNotification = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  if (tokens.length === 0) return;

  // Filter to only valid Expo push tokens
  const validTokens = tokens.filter(
    (token) => typeof token === 'string' && token.startsWith('ExponentPushToken')
  );

  if (validTokens.length === 0) {
    logger.warn('No valid Expo push tokens to send to');
    return;
  }

  // Build messages for Expo push API (max 100 per request)
  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default' as const,
    title,
    body,
    data: data || {},
    priority: 'high' as const,
    channelId: 'default',
  }));

  // Send in chunks of 100 (Expo's limit)
  const chunks: typeof messages[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json() as { errors?: any[]; data?: Array<{ status: string }> };

      if (result.errors) {
        logger.warn('Expo push errors:', JSON.stringify(result.errors));
      }

      const successCount = result.data?.filter((r) => r.status === 'ok').length ?? 0;
      const failCount = (result.data?.length ?? 0) - successCount;

      if (failCount > 0) {
        logger.warn(`Push notification failed for ${failCount} token(s)`);
      }

      logger.info(`Push sent: ${successCount}/${chunk.length} succeeded`);
    } catch (error: any) {
      logger.error('Push notification error:', error.message);
    }
  }
};

// Keep backward compatibility - no longer needed but some imports may reference it
export const isFirebaseInitialized = (): boolean => true;
export default {};
