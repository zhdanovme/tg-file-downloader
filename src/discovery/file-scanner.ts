/**
 * File scanner - scans files in a specific group
 */

import { TelegramClient } from 'telegram';
import { Api } from 'telegram';
import { FileEntry, TelegramGroup } from '../types/index.js';
import { handleFloodWait } from '../auth/client.js';
import logger from '../utils/logger.js';

/**
 * Scan files in a specific group
 */
export async function scanFilesInGroup(
  client: TelegramClient,
  group: TelegramGroup,
  limit: number = 1000
): Promise<FileEntry[]> {
  try {
    logger.debug(`Scanning files in group: ${group.name}`, {
      groupId: group.id,
      handle: group.handle,
    });

    let messages;
    try {
      // Get messages with document filter
      messages = await client.getMessages(group.id, {
        limit,
        filter: new Api.InputMessagesFilterDocument(),
      });
    } catch (error: any) {
      // Handle rate limiting
      if (error.errorMessage === 'FLOOD') {
        await handleFloodWait(error);
        // Retry after waiting
        messages = await client.getMessages(group.id, {
          limit,
          filter: new Api.InputMessagesFilterDocument(),
        });
      } else {
        throw error;
      }
    }

    const files: FileEntry[] = [];

    for (const message of messages) {
      if (message.media && message.media instanceof Api.MessageMediaDocument) {
        const document = message.media.document;

        if (document instanceof Api.Document) {
          // Extract file attributes
          const attributes = document.attributes || [];
          let fileName = 'unknown';
          let mimeType = document.mimeType;

          for (const attr of attributes) {
            if (attr instanceof Api.DocumentAttributeFilename) {
              fileName = attr.fileName;
            }
          }

          const extension = getFileExtension(fileName);

          const file: FileEntry = {
            id: `${group.id}:${message.id}`,
            groupId: group.id,
            name: fileName,
            size: Number(document.size),
            mimeType,
            extension,
            telegramFileId: document.id.toString(),
            messageId: message.id,
            uploadedAt: message.date ? new Date(message.date * 1000).toISOString() : undefined,
            discoveredAt: new Date().toISOString(),
            downloadStatus: 'pending',
          };

          files.push(file);
        }
      }
    }

    logger.debug(`Found ${files.length} files in group: ${group.name}`);

    return files;
  } catch (error: any) {
    logger.error(`Failed to scan files in group: ${group.name}`, {
      error: error.message,
      groupId: group.id,
    });
    throw error;
  }
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string | undefined {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[0] : undefined;
}
