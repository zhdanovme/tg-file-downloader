/**
 * Configuration file generator
 */

import { Configuration } from '../types/index.js';
import fs from 'fs/promises';
import { getDefaultConfig } from './defaults.js';
import { atomicWrite } from '../utils/file.js';
import logger from '../utils/logger.js';

/**
 * Generate default configuration file with comments
 */
export function generateDefaultConfigWithComments(): string {
  return `{
  "$schema": "./node_modules/tg-downloader/config.schema.json",

  "groups": {
    "include": [
      "@example_group",
      "@another_group"
    ],
    "exclude": []
  },

  "files": {
    "include": [
      "*.pdf",
      "*.zip",
      "*.tar.gz"
    ],
    "exclude": [
      "*.tmp",
      "*.part"
    ],
    "minSize": 0,
    "maxSize": null
  },

  "download": {
    "outputDir": "./data/downloads",
    "organizeByGroup": true,
    "overwriteExisting": false,
    "chunkSize": 524288,
    "concurrency": 3,
    "retryAttempts": 3,
    "retryDelay": 5000
  },

  "session": {
    "encryptSession": true,
    "sessionTimeout": 86400000
  }
}`;
}

/**
 * Generate example configuration with explanatory comments
 */
export function generateExampleConfig(): string {
  return `{
  "$schema": "./node_modules/tg-downloader/config.schema.json",

  "groups": {
    "include": [
      // Include groups by handle (username)
      "@example_group",
      "@another_group"
      // Leave empty to include all groups
    ],
    "exclude": [
      // Exclude specific groups
      "@spam_group"
    ]
  },

  "files": {
    "include": [
      // Include files matching these patterns (glob syntax)
      "*.pdf",
      "*.zip",
      "*.tar.gz",
      "documents/**/*.docx"
    ],
    "exclude": [
      // Exclude files matching these patterns
      "*.tmp",
      "*.part"
    ],
    "minSize": 0,        // Minimum file size in bytes (0 = no limit)
    "maxSize": null      // Maximum file size in bytes (null = no limit)
  },

  "download": {
    "outputDir": "./data/downloads",     // Where to save downloaded files
    "organizeByGroup": true,             // Create subdirectories for each group
    "overwriteExisting": false,          // Skip files that already exist
    "chunkSize": 524288,                 // Download chunk size (512 KB)
    "concurrency": 3,                    // Number of concurrent downloads
    "retryAttempts": 3,                  // Retry failed downloads
    "retryDelay": 5000                   // Delay between retries (ms)
  },

  "session": {
    "encryptSession": true,              // Encrypt session files
    "sessionTimeout": 86400000           // Session timeout (24 hours)
  }
}`;
}

/**
 * Create default configuration file
 */
export async function createDefaultConfigFile(
  configPath: string,
  withComments: boolean = false
): Promise<void> {
  try {
    const content = withComments
      ? generateExampleConfig()
      : generateDefaultConfigWithComments();

    await atomicWrite(configPath, content);

    logger.info('Default configuration file created', { path: configPath });
  } catch (error: any) {
    logger.error('Failed to create configuration file', {
      error: error.message,
      path: configPath,
    });
    throw error;
  }
}

/**
 * Check if configuration file exists
 */
export async function configFileExists(configPath: string): Promise<boolean> {
  try {
    await fs.access(configPath);
    return true;
  } catch {
    return false;
  }
}
