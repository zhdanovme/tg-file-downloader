/**
 * Application initialization utilities
 */

import fs from 'fs/promises';
import path from 'path';
import { ensureDir } from './file.js';
import logger from './logger.js';

/**
 * Initialize data directory structure
 */
export async function initDataDirectory(basePath: string = './data'): Promise<void> {
  try {
    // Create main data directory
    await ensureDir(basePath);

    // Create subdirectories
    const subdirs = [
      'session',  // Session files
      'logs',     // Log files
      'downloads' // Downloaded files
    ];

    for (const subdir of subdirs) {
      const subdirPath = path.join(basePath, subdir);
      await ensureDir(subdirPath);
    }

    logger.debug('Data directory initialized', { basePath, subdirs });
  } catch (error: any) {
    logger.error('Failed to initialize data directory', {
      error: error.message,
      basePath
    });
    throw error;
  }
}

/**
 * Verify required environment variables are set
 */
export function verifyEnvironment(): { valid: boolean; missing: string[] } {
  const required = ['TELEGRAM_API_ID', 'TELEGRAM_API_HASH'];
  const missing: string[] = [];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Display environment setup instructions
 */
export function displayEnvironmentHelp(): void {
  console.log('\nMissing required environment variables!\n');
  console.log('Please set the following in your .env file:');
  console.log('  TELEGRAM_API_ID=your_api_id');
  console.log('  TELEGRAM_API_HASH=your_api_hash');
  console.log('\nTo obtain API credentials:');
  console.log('  1. Visit https://my.telegram.org/auth');
  console.log('  2. Log in with your phone number');
  console.log('  3. Go to "API development tools"');
  console.log('  4. Create a new application');
  console.log('  5. Copy the API ID and API Hash to your .env file\n');
}
