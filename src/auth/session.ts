/**
 * Session management for Telegram authentication
 */

import { TelegramClient } from 'telegram';
import { SessionFile } from '../types/index.js';
import { loadSession as loadSessionFile, saveSession as saveSessionFile, deleteSession as deleteSessionFile, sessionExists } from '../storage/index.js';
import { getSessionString } from './client.js';
import { AuthError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Load existing session
 */
export async function loadSession(
  sessionPath: string,
  encrypted: boolean = true
): Promise<string> {
  try {
    const sessionFile = await loadSessionFile(sessionPath, encrypted);

    if (!sessionFile) {
      return '';
    }

    logger.debug('Session loaded', {
      userId: sessionFile.userId,
      age: Date.now() - new Date(sessionFile.createdAt).getTime(),
    });

    return sessionFile.sessionString;
  } catch (error: any) {
    logger.warn('Failed to load session, will create new one', {
      error: error.message,
    });
    return '';
  }
}

/**
 * Save current session
 */
export async function saveSession(
  client: TelegramClient,
  sessionPath: string,
  encrypted: boolean = true
): Promise<void> {
  try {
    const sessionString = getSessionString(client);

    // Get user info
    const me = await client.getMe();

    const sessionFile: SessionFile = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      sessionString,
      userId: me.id?.toString(),
      phoneNumber: me.phone ? `+***${me.phone.slice(-4)}` : undefined,
    };

    await saveSessionFile(sessionPath, sessionFile, encrypted);

    logger.info('Session saved successfully', {
      userId: sessionFile.userId,
    });
  } catch (error: any) {
    logger.error('Failed to save session', { error: error.message });
    throw new AuthError(
      'Failed to save session',
      'SESSION_WRITE_ERROR'
    );
  }
}

/**
 * Delete session
 */
export async function deleteSession(sessionPath: string): Promise<void> {
  try {
    await deleteSessionFile(sessionPath);
    logger.info('Session deleted successfully');
  } catch (error: any) {
    logger.error('Failed to delete session', { error: error.message });
    throw new AuthError(
      'Failed to delete session',
      'SESSION_DELETE_ERROR'
    );
  }
}

/**
 * Validate session by checking if client is connected and authorized
 */
export async function validateSession(client: TelegramClient): Promise<boolean> {
  try {
    if (!client.connected) {
      await client.connect();
    }

    const me = await client.getMe();
    return !!me;
  } catch (error) {
    logger.debug('Session validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Check if session file exists
 */
export async function checkSessionExists(sessionPath: string): Promise<boolean> {
  return await sessionExists(sessionPath);
}
