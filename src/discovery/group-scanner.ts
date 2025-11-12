/**
 * Group scanner - fetches all user's Telegram groups
 */

import { TelegramClient } from 'telegram';
import { Api } from 'telegram';
import { TelegramGroup } from '../types/index.js';
import { handleFloodWait } from '../auth/client.js';
import logger from '../utils/logger.js';

/**
 * Scan all groups the user has joined
 */
export async function scanGroups(client: TelegramClient): Promise<TelegramGroup[]> {
  try {
    logger.info('Scanning groups...');

    let dialogs;
    try {
      dialogs = await client.getDialogs({ limit: 500 });
    } catch (error: any) {
      // Handle rate limiting
      if (error.errorMessage === 'FLOOD') {
        await handleFloodWait(error);
        // Retry after waiting
        dialogs = await client.getDialogs({ limit: 500 });
      } else {
        throw error;
      }
    }

    const groups: TelegramGroup[] = [];

    for (const dialog of dialogs) {
      const entity = dialog.entity;

      // Filter only groups, channels, and supergroups
      if (
        entity instanceof Api.Channel ||
        entity instanceof Api.Chat
      ) {
        const group: TelegramGroup = {
          id: entity.id.toString(),
          handle: 'username' in entity ? entity.username : undefined,
          name: entity.title || 'Unnamed Group',
          type: getGroupType(entity),
          memberCount: 'participantsCount' in entity ? entity.participantsCount : undefined,
          accessHash: 'accessHash' in entity ? entity.accessHash?.toString() || '' : '',
          discoveredAt: new Date().toISOString(),
        };

        groups.push(group);
      }
    }

    logger.info(`Found ${groups.length} groups`, {
      groups: groups.map(g => ({ id: g.id, name: g.name, handle: g.handle })),
    });

    return groups;
  } catch (error: any) {
    logger.error('Failed to scan groups', { error: error.message });
    throw error;
  }
}

/**
 * Determine group type from entity
 */
function getGroupType(entity: Api.Channel | Api.Chat): 'group' | 'channel' | 'supergroup' {
  if (entity instanceof Api.Chat) {
    return 'group';
  }

  if (entity instanceof Api.Channel) {
    if (entity.broadcast) {
      return 'channel';
    }
    if (entity.megagroup) {
      return 'supergroup';
    }
    return 'channel';
  }

  return 'group';
}
