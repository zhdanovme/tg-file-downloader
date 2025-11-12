/**
 * Authentication module facade
 */

import { TelegramClient } from 'telegram';
import { initClient, closeClient, getClient } from './client.js';
import { authenticateWithQR } from './qr-auth.js';
import { authenticateWithPhone } from './phone-auth.js';
import { loadSession, saveSession, deleteSession, validateSession, checkSessionExists } from './session.js';
import { AuthError } from '../utils/errors.js';
import logger from '../utils/logger.js';

export type AuthMethod = 'qr' | 'phone';

export interface AuthOptions {
  method?: AuthMethod;
  phoneNumber?: string;
  sessionPath?: string;
  encryptSession?: boolean;
}

/**
 * Main authentication function
 */
export async function authenticate(options: AuthOptions = {}): Promise<TelegramClient> {
  const {
    method = 'qr',
    phoneNumber,
    sessionPath = './data/session',
    encryptSession = true,
  } = options;

  try {
    // Check if session already exists
    const hasSession = await checkSessionExists(sessionPath);
    if (hasSession) {
      logger.info('Existing session found, validating...');

      const sessionString = await loadSession(sessionPath, encryptSession);
      const client = await initClient(sessionString);

      await client.connect();

      const isValid = await validateSession(client);
      if (isValid) {
        const me = await client.getMe();
        logger.info('Session is valid, already authenticated', {
          userId: me.id?.toString(),
          username: me.username,
        });

        return client;
      } else {
        logger.warn('Session invalid, re-authenticating...');
        await closeClient();
      }
    }

    // Initialize new client
    const client = await initClient();

    // Authenticate based on method
    if (method === 'qr') {
      await authenticateWithQR(client);
    } else if (method === 'phone') {
      await authenticateWithPhone(client, phoneNumber);
    } else {
      throw new AuthError(
        `Invalid authentication method: ${method}`,
        'INVALID_METHOD'
      );
    }

    // Save session
    await saveSession(client, sessionPath, encryptSession);

    logger.info('Authentication completed successfully');

    return client;
  } catch (error: any) {
    logger.error('Authentication failed', { error: error.message });
    await closeClient();
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export async function checkAuthentication(
  sessionPath: string = './data/session',
  encryptSession: boolean = true
): Promise<{
  authenticated: boolean;
  user?: { id: string; username?: string; name: string };
}> {
  try {
    const hasSession = await checkSessionExists(sessionPath);
    if (!hasSession) {
      return { authenticated: false };
    }

    const sessionString = await loadSession(sessionPath, encryptSession);
    const client = await initClient(sessionString);

    await client.connect();

    const isValid = await validateSession(client);
    if (!isValid) {
      await closeClient();
      return { authenticated: false };
    }

    const me = await client.getMe();
    await closeClient();

    return {
      authenticated: true,
      user: {
        id: me.id?.toString() || '',
        username: me.username,
        name: `${me.firstName || ''} ${me.lastName || ''}`.trim(),
      },
    };
  } catch (error) {
    logger.debug('Authentication check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { authenticated: false };
  }
}

/**
 * Logout and clear session
 */
export async function logout(sessionPath: string = './data/session'): Promise<void> {
  try {
    await closeClient();
    await deleteSession(sessionPath);
    logger.info('Logged out successfully');
  } catch (error: any) {
    logger.error('Logout failed', { error: error.message });
    throw error;
  }
}

// Re-export for convenience
export { getClient, closeClient };
