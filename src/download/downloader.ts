/**
 * File downloader - handles downloading individual files from Telegram
 */

import { TelegramClient } from 'telegram';
import { Api } from 'telegram';
import fs from 'fs/promises';
import path from 'path';
import { FileEntry, Configuration } from '../types/index.js';
import { DownloadError } from '../utils/errors.js';
import { ensureDir, sanitizeFilename } from '../utils/file.js';
import { handleFloodWait } from '../auth/client.js';
import logger from '../utils/logger.js';

export interface DownloadOptions {
  config: Configuration;
  onProgress?: (downloaded: number, total: number) => void;
}

export interface DownloadResult {
  success: boolean;
  file: FileEntry;
  downloadPath?: string;
  error?: string;
}

/**
 * Download a single file from Telegram
 */
export async function downloadFile(
  client: TelegramClient,
  file: FileEntry,
  groupHandle: string,
  options: DownloadOptions
): Promise<DownloadResult> {
  try {
    logger.info('Starting file download', {
      fileId: file.id,
      name: file.name,
      size: file.size,
    });

    // Determine output directory
    const config = options.config;
    const baseDir = config.download?.outputDir || './data/downloads';
    const outputDir = config.download?.organizeByGroup
      ? path.join(baseDir, sanitizeFilename(groupHandle || file.groupId))
      : baseDir;

    // Ensure directory exists
    await ensureDir(outputDir);

    // Determine output file path
    const sanitizedFilename = sanitizeFilename(file.name);
    const outputPath = path.join(outputDir, sanitizedFilename);

    // Check if file already exists
    if (!config.download?.overwriteExisting) {
      try {
        await fs.access(outputPath);
        logger.info('File already exists, skipping download', { path: outputPath });
        return {
          success: true,
          file,
          downloadPath: outputPath,
        };
      } catch {
        // File doesn't exist, continue with download
      }
    }

    // Download file
    const tempPath = `${outputPath}.part`;

    try {
      // Get the file from Telegram
      // Try to get entity by ID (it will use the session cache)
      let entity;
      try {
        entity = await client.getEntity(parseInt(file.groupId, 10));
      } catch (error: any) {
        // If that fails, log error and throw
        logger.error('Failed to get entity', {
          groupId: file.groupId,
          error: error.message,
        });
        throw new DownloadError(
          `Could not find group with ID ${file.groupId}. The group may have been deleted or access was revoked.`,
          'ENTITY_NOT_FOUND'
        );
      }

      const messages = await client.getMessages(entity, {
        ids: [file.messageId],
      });

      if (!messages || messages.length === 0) {
        throw new DownloadError(
          `Message not found for file ${file.id}`,
          'MESSAGE_NOT_FOUND'
        );
      }

      const msg = messages[0];
      if (!msg.media || !(msg.media instanceof Api.MessageMediaDocument)) {
        throw new DownloadError(
          `Message does not contain a document for file ${file.id}`,
          'NOT_A_DOCUMENT'
        );
      }

      // Download file using downloadMedia
      const buffer = await client.downloadMedia(msg, {
        progressCallback: (downloaded, total) => {
          if (options.onProgress) {
            options.onProgress(Number(downloaded), Number(total));
          }
        },
      });

      if (!buffer) {
        throw new DownloadError(
          `Failed to download file ${file.id}`,
          'DOWNLOAD_FAILED'
        );
      }

      // Write buffer to file
      await fs.writeFile(tempPath, buffer as Buffer);

      // Verify download completed
      const stats = await fs.stat(tempPath);
      if (stats.size !== file.size) {
        throw new DownloadError(
          `Downloaded size (${stats.size}) does not match expected size (${file.size}) for file ${file.id}`,
          'SIZE_MISMATCH'
        );
      }

      // Rename temp file to final name
      await fs.rename(tempPath, outputPath);

      logger.info('File download completed', {
        fileId: file.id,
        path: outputPath,
        size: stats.size,
      });

      return {
        success: true,
        file,
        downloadPath: outputPath,
      };
    } catch (error: any) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  } catch (error: any) {
    logger.error('File download failed', {
      fileId: file.id,
      error: error.message,
    });

    return {
      success: false,
      file,
      error: error.message,
    };
  }
}

/**
 * Download file with retry logic
 */
export async function downloadFileWithRetry(
  client: TelegramClient,
  file: FileEntry,
  groupHandle: string,
  options: DownloadOptions
): Promise<DownloadResult> {
  const maxAttempts = options.config.download?.retryAttempts || 3;
  const retryDelay = options.config.download?.retryDelay || 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    logger.debug('Download attempt', { attempt, maxAttempts, fileId: file.id });

    const result = await downloadFile(client, file, groupHandle, options);

    if (result.success) {
      return result;
    }

    // Don't retry on the last attempt
    if (attempt < maxAttempts) {
      logger.info('Retrying download after delay', {
        fileId: file.id,
        attempt,
        delay: retryDelay,
      });
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  // All attempts failed
  return {
    success: false,
    file,
    error: `Failed after ${maxAttempts} attempts`,
  };
}
