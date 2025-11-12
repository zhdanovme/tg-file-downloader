/**
 * Discovery orchestrator - coordinates group and file scanning
 */

import { TelegramClient } from 'telegram';
import { Configuration, DataFile, TelegramGroup, FileEntry } from '../types/index.js';
import { loadConfigOrDefault } from '../config/index.js';
import { loadDataFile, saveDataFile, createDataFile, upsertGroup, upsertFile } from '../storage/index.js';
import { scanGroups } from './group-scanner.js';
import { scanFilesInGroup } from './file-scanner.js';
import { applyGroupFilters, applyFileFilters } from './filter.js';
import { displayGroupProgress, displayFileProgress, stopProgress, displayDiscoverySummary } from './progress.js';
import logger from '../utils/logger.js';

export interface DiscoveryOptions {
  configPath?: string;
  dataFilePath?: string;
  update?: boolean;
  groupsOnly?: boolean;
  showProgress?: boolean;
}

export interface DiscoveryResult {
  groups: TelegramGroup[];
  files: FileEntry[];
  dataFile: DataFile;
}

/**
 * Discover files from Telegram groups
 */
export async function discoverFiles(
  client: TelegramClient,
  options: DiscoveryOptions = {}
): Promise<DiscoveryResult> {
  const {
    configPath = './data/config.json',
    dataFilePath = './data/data.json',
    update = false,
    groupsOnly = false,
    showProgress = true,
  } = options;

  try {
    logger.info('Starting file discovery...', { options });

    // Load configuration
    const config = await loadConfigOrDefault(configPath);
    logger.debug('Configuration loaded', { config });

    // Load or create data file
    let dataFile: DataFile = update
      ? await loadDataFile(dataFilePath)
      : createDataFile();

    // Scan groups
    logger.info('Scanning groups...');
    const allGroups = await scanGroups(client);

    // Apply filters
    const filteredGroups = applyGroupFilters(allGroups, config);
    logger.info(`Groups after filtering: ${filteredGroups.length}/${allGroups.length}`);

    // Update data file with groups
    for (const group of filteredGroups) {
      dataFile = upsertGroup(dataFile, group);
    }

    if (groupsOnly) {
      // Save and return early if only scanning groups
      await saveDataFile(dataFilePath, dataFile);
      logger.info('Groups-only discovery completed');

      return {
        groups: filteredGroups,
        files: [],
        dataFile,
      };
    }

    // Scan files in each group
    logger.info('Scanning files in groups...');
    const allFiles: FileEntry[] = [];

    for (let i = 0; i < filteredGroups.length; i++) {
      const group = filteredGroups[i];

      if (showProgress) {
        displayGroupProgress(i + 1, filteredGroups.length, group.name);
      }

      try {
        const files = await scanFilesInGroup(client, group);
        allFiles.push(...files);

        logger.debug(`Scanned ${files.length} files from group: ${group.name}`);
      } catch (error: any) {
        logger.error(`Failed to scan group: ${group.name}`, {
          error: error.message,
          groupId: group.id,
        });
        // Continue with next group
      }
    }

    if (showProgress) {
      stopProgress();
    }

    // Apply file filters
    const filteredFiles = applyFileFilters(allFiles, config);
    logger.info(`Files after filtering: ${filteredFiles.length}/${allFiles.length}`);

    // Update data file with files
    for (const file of filteredFiles) {
      dataFile = upsertFile(dataFile, file);
    }

    // Save data file
    await saveDataFile(dataFilePath, dataFile, update);

    logger.info('Discovery completed successfully', {
      groups: filteredGroups.length,
      files: filteredFiles.length,
      totalSize: dataFile.statistics.totalSize,
    });

    // Display summary
    if (showProgress) {
      displayDiscoverySummary(
        filteredGroups,
        filteredFiles.length,
        dataFile.statistics.totalSize
      );
    }

    return {
      groups: filteredGroups,
      files: filteredFiles,
      dataFile,
    };
  } catch (error: any) {
    logger.error('Discovery failed', { error: error.message });
    stopProgress();
    throw error;
  }
}
