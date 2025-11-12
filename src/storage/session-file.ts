/**
 * Session file management with encryption support
 */

import fs from 'fs/promises';
import path from 'path';
import { SessionFile } from '../types/index.js';
import { ensureDir, fileExists } from '../utils/file.js';
import { encrypt, decrypt } from './encryption.js';
import logger from '../utils/logger.js';

const SESSION_FILENAME = 'telegram-session.enc';

/**
 * Load session from file
 */
export async function loadSession(
  sessionPath: string,
  encrypted: boolean = true,
  password?: string
): Promise<SessionFile | null> {
  const filePath = path.join(sessionPath, SESSION_FILENAME);

  try {
    if (!(await fileExists(filePath))) {
      return null;
    }

    const content = await fs.readFile(filePath, 'utf-8');

    let sessionData: SessionFile;

    if (encrypted) {
      const decrypted = decrypt(content, password);
      sessionData = JSON.parse(decrypted);
    } else {
      sessionData = JSON.parse(content);
    }

    // Update last used timestamp
    sessionData.lastUsedAt = new Date().toISOString();

    // Save updated timestamp
    await saveSession(sessionPath, sessionData, encrypted, password);

    logger.debug('Session loaded successfully', {
      userId: sessionData.userId,
      createdAt: sessionData.createdAt,
    });

    return sessionData;
  } catch (error: any) {
    logger.error('Failed to load session', { error: error.message });
    throw error;
  }
}

/**
 * Save session to file
 */
export async function saveSession(
  sessionPath: string,
  session: SessionFile,
  encrypted: boolean = true,
  password?: string
): Promise<void> {
  await ensureDir(sessionPath);

  const filePath = path.join(sessionPath, SESSION_FILENAME);
  const content = JSON.stringify(session, null, 2);

  try {
    const dataToWrite = encrypted ? encrypt(content, password) : content;
    await fs.writeFile(filePath, dataToWrite, 'utf-8');

    logger.debug('Session saved successfully', {
      userId: session.userId,
      encrypted,
    });
  } catch (error: any) {
    logger.error('Failed to save session', { error: error.message });
    throw error;
  }
}

/**
 * Delete session file
 */
export async function deleteSession(sessionPath: string): Promise<void> {
  const filePath = path.join(sessionPath, SESSION_FILENAME);

  try {
    if (await fileExists(filePath)) {
      await fs.unlink(filePath);
      logger.info('Session deleted successfully');
    }
  } catch (error: any) {
    logger.error('Failed to delete session', { error: error.message });
    throw error;
  }
}

/**
 * Check if session exists
 */
export async function sessionExists(sessionPath: string): Promise<boolean> {
  const filePath = path.join(sessionPath, SESSION_FILENAME);
  return await fileExists(filePath);
}
