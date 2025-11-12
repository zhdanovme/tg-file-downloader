/**
 * Data file management for storing discovery and download data
 */

import fs from 'fs/promises';
import path from 'path';
import { DataFile, FileEntry, TelegramGroup, Statistics } from '../types/index.js';
import { atomicWrite, createBackup, fileExists } from '../utils/file.js';
import logger from '../utils/logger.js';

const DATA_VERSION = '1.0.0';

/**
 * Create new empty data file
 */
export function createDataFile(): DataFile {
  const now = new Date().toISOString();

  return {
    version: DATA_VERSION,
    createdAt: now,
    lastUpdatedAt: now,
    groups: [],
    files: [],
    statistics: {
      totalGroups: 0,
      totalFiles: 0,
      totalSize: 0,
      pendingFiles: 0,
      completedFiles: 0,
      failedFiles: 0,
      totalDownloadedSize: 0,
    },
  };
}

/**
 * Calculate statistics from current data
 */
export function updateStatistics(dataFile: DataFile): DataFile {
  const statistics: Statistics = {
    totalGroups: dataFile.groups.length,
    totalFiles: dataFile.files.length,
    totalSize: dataFile.files.reduce((sum, file) => sum + file.size, 0),
    pendingFiles: dataFile.files.filter((f) => f.downloadStatus === 'pending').length,
    completedFiles: dataFile.files.filter((f) => f.downloadStatus === 'completed').length,
    failedFiles: dataFile.files.filter((f) => f.downloadStatus === 'failed').length,
    totalDownloadedSize: dataFile.files
      .filter((f) => f.downloadStatus === 'completed')
      .reduce((sum, file) => sum + file.size, 0),
  };

  return {
    ...dataFile,
    statistics,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Load data file from disk
 */
export async function loadDataFile(filePath: string): Promise<DataFile> {
  try {
    if (!(await fileExists(filePath))) {
      logger.info('Data file not found, creating new one');
      return createDataFile();
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const dataFile: DataFile = JSON.parse(content);

    logger.debug('Data file loaded successfully', {
      groups: dataFile.groups.length,
      files: dataFile.files.length,
    });

    return dataFile;
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      logger.error('Data file is corrupted (invalid JSON)', { error: error.message });

      // Try to restore from backup
      const backupPath = await findLatestBackup(filePath);
      if (backupPath) {
        logger.info('Attempting to restore from backup', { backup: backupPath });
        const content = await fs.readFile(backupPath, 'utf-8');
        return JSON.parse(content);
      }
    }

    throw error;
  }
}

/**
 * Save data file to disk
 */
export async function saveDataFile(
  filePath: string,
  dataFile: DataFile,
  createBackupFirst: boolean = true
): Promise<void> {
  try {
    // Create backup if file exists
    if (createBackupFirst && (await fileExists(filePath))) {
      await createBackup(filePath);
    }

    // Update statistics and timestamp
    const updatedData = updateStatistics(dataFile);

    // Write atomically
    const content = JSON.stringify(updatedData, null, 2);
    await atomicWrite(filePath, content);

    logger.debug('Data file saved successfully', {
      groups: updatedData.groups.length,
      files: updatedData.files.length,
    });
  } catch (error: any) {
    logger.error('Failed to save data file', { error: error.message });
    throw error;
  }
}

/**
 * Find latest backup file
 */
async function findLatestBackup(filePath: string): Promise<string | null> {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);

  try {
    const files = await fs.readdir(dir);
    const backups = files
      .filter((f) => f.startsWith(`${basename}.backup.`))
      .map((f) => path.join(dir, f))
      .sort()
      .reverse();

    return backups.length > 0 ? backups[0] : null;
  } catch {
    return null;
  }
}

/**
 * Add or update group in data file
 */
export function upsertGroup(dataFile: DataFile, group: TelegramGroup): DataFile {
  const existingIndex = dataFile.groups.findIndex((g) => g.id === group.id);

  if (existingIndex >= 0) {
    dataFile.groups[existingIndex] = group;
  } else {
    dataFile.groups.push(group);
  }

  return dataFile;
}

/**
 * Add or update file in data file
 */
export function upsertFile(dataFile: DataFile, file: FileEntry): DataFile {
  const existingIndex = dataFile.files.findIndex((f) => f.id === file.id);

  if (existingIndex >= 0) {
    // Preserve download status if updating
    const existingFile = dataFile.files[existingIndex];
    dataFile.files[existingIndex] = {
      ...file,
      downloadStatus: existingFile.downloadStatus,
      downloadedAt: existingFile.downloadedAt,
      downloadPath: existingFile.downloadPath,
      errorMessage: existingFile.errorMessage,
    };
  } else {
    dataFile.files.push(file);
  }

  return dataFile;
}
