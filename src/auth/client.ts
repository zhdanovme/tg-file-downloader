/**
 * Telegram client wrapper
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { AuthError } from '../utils/errors.js';
import logger from '../utils/logger.js';

let clientInstance: TelegramClient | null = null;

/**
 * Get API credentials from environment
 */
function getApiCredentials(): { apiId: number; apiHash: string } {
  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;

  if (!apiId || !apiHash) {
    throw new AuthError(
      'Telegram API credentials not found. Please set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env file',
      'MISSING_CREDENTIALS'
    );
  }

  return {
    apiId: parseInt(apiId, 10),
    apiHash,
  };
}

/**
 * Initialize Telegram client
 */
export async function initClient(sessionString: string = ''): Promise<TelegramClient> {
  const { apiId, apiHash } = getApiCredentials();

  const session = new StringSession(sessionString);

  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
    useWSS: false,
  });

  clientInstance = client;

  logger.debug('Telegram client initialized', {
    hasSession: sessionString.length > 0,
  });

  return client;
}

/**
 * Get current client instance
 */
export function getClient(): TelegramClient {
  if (!clientInstance) {
    throw new AuthError(
      'Telegram client not initialized. Call initClient() first.',
      'CLIENT_NOT_INITIALIZED'
    );
  }

  return clientInstance;
}

/**
 * Close client connection
 */
export async function closeClient(): Promise<void> {
  if (clientInstance) {
    try {
      await clientInstance.disconnect();
      clientInstance = null;
      logger.debug('Telegram client disconnected');
    } catch (error: any) {
      logger.error('Error disconnecting client', { error: error.message });
    }
  }
}

/**
 * Handle Telegram flood wait errors
 */
export async function handleFloodWait(error: any): Promise<void> {
  if (error.errorMessage === 'FLOOD') {
    const seconds = error.seconds || 60;
    logger.warn(`Rate limit hit. Waiting ${seconds} seconds...`);

    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }
}

/**
 * Get session string from client
 */
export function getSessionString(client: TelegramClient): string {
  return (client.session as StringSession).save();
}
