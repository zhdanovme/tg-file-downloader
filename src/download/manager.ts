/**
 * Download manager - orchestrates file downloads with concurrency control
 */

import { TelegramClient } from 'telegram';
import { FileEntry, DataFile, Configuration } from '../types/index.js';
import { downloadFileWithRetry, DownloadOptions, DownloadResult } from './downloader.js';
import { loadDataFile, saveDataFile } from '../storage/data-file.js';
import { DownloadProgress } from './progress.js';
import logger from '../utils/logger.js';

export interface DownloadManagerOptions {
  config: Configuration;
  dataFilePath: string;
  showProgress?: boolean;
  resumeExisting?: boolean;
}

export interface DownloadStats {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  totalSize: number;
  downloadedSize: number;
}

/**
 * Download manager for handling multiple concurrent downloads
 */
export class DownloadManager {
  private client: TelegramClient;
  private options: DownloadManagerOptions;
  private dataFile!: DataFile;
  private progress?: DownloadProgress;
  private stats: DownloadStats;

  constructor(client: TelegramClient, options: DownloadManagerOptions) {
    this.client = client;
    this.options = options;
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      totalSize: 0,
      downloadedSize: 0,
    };
  }

  /**
   * Start downloading files
   */
  async start(): Promise<DownloadStats> {
    try {
      // Load data file
      this.dataFile = await loadDataFile(this.options.dataFilePath);

      // Filter files to download
      const filesToDownload = this.getFilesToDownload();

      if (filesToDownload.length === 0) {
        logger.info('No files to download');
        return this.stats;
      }

      this.stats.total = filesToDownload.length;
      this.stats.totalSize = filesToDownload.reduce((sum, f) => sum + f.size, 0);

      logger.info('Starting downloads', {
        total: this.stats.total,
        totalSize: this.stats.totalSize,
      });

      // Initialize progress tracker
      if (this.options.showProgress) {
        this.progress = new DownloadProgress(this.stats.total);
        this.progress.start();
      }

      // Download files with concurrency control
      await this.downloadWithConcurrency(filesToDownload);

      // Stop progress tracker
      if (this.progress) {
        this.progress.stop();
      }

      // Save final data file
      await saveDataFile(this.options.dataFilePath, this.dataFile);

      logger.info('Download completed', this.stats);

      return this.stats;
    } catch (error: any) {
      logger.error('Download manager failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get list of files to download
   */
  private getFilesToDownload(): FileEntry[] {
    if (this.options.resumeExisting) {
      // Download pending and failed files
      return this.dataFile.files.filter(
        (f) => f.downloadStatus === 'pending' || f.downloadStatus === 'failed'
      );
    } else {
      // Only download pending files
      return this.dataFile.files.filter((f) => f.downloadStatus === 'pending');
    }
  }

  /**
   * Download files with concurrency control
   */
  private async downloadWithConcurrency(files: FileEntry[]): Promise<void> {
    const concurrency = this.options.config.download?.concurrency || 3;
    const queue = [...files];
    const active: Promise<void>[] = [];

    while (queue.length > 0 || active.length > 0) {
      // Fill up to concurrency limit
      while (active.length < concurrency && queue.length > 0) {
        const file = queue.shift()!;
        const promise = this.downloadSingleFile(file).then(() => {
          // Remove from active when done
          const index = active.indexOf(promise);
          if (index >= 0) {
            active.splice(index, 1);
          }
        });
        active.push(promise);
      }

      // Wait for at least one to complete
      if (active.length > 0) {
        await Promise.race(active);
      }
    }
  }

  /**
   * Download a single file and update data file
   */
  private async downloadSingleFile(file: FileEntry): Promise<void> {
    try {
      // Find group handle
      const group = this.dataFile.groups.find((g) => g.id === file.groupId);
      const groupHandle = group?.handle || file.groupId;

      // Update file status to in-progress
      this.updateFileStatus(file.id, 'in-progress');
      await saveDataFile(this.options.dataFilePath, this.dataFile);

      // Download file
      const downloadOptions: DownloadOptions = {
        config: this.options.config,
        onProgress: (downloaded, total) => {
          if (this.progress) {
            this.progress.updateFileProgress(file.name, downloaded, total);
          }
        },
      };

      const result = await downloadFileWithRetry(
        this.client,
        file,
        groupHandle,
        downloadOptions
      );

      // Update file status based on result
      if (result.success) {
        this.updateFileStatus(file.id, 'completed', result.downloadPath);
        this.stats.completed++;
        this.stats.downloadedSize += file.size;

        if (this.progress) {
          this.progress.incrementCompleted();
        }
      } else {
        this.updateFileStatus(file.id, 'failed', undefined, result.error);
        this.stats.failed++;

        if (this.progress) {
          this.progress.incrementFailed();
        }
      }

      // Save progress periodically
      await saveDataFile(this.options.dataFilePath, this.dataFile);
    } catch (error: any) {
      logger.error('Failed to download file', {
        fileId: file.id,
        error: error.message,
      });

      this.updateFileStatus(file.id, 'failed', undefined, error.message);
      this.stats.failed++;

      if (this.progress) {
        this.progress.incrementFailed();
      }
    }
  }

  /**
   * Update file status in data file
   */
  private updateFileStatus(
    fileId: string,
    status: FileEntry['downloadStatus'],
    downloadPath?: string,
    errorMessage?: string
  ): void {
    const fileIndex = this.dataFile.files.findIndex((f) => f.id === fileId);
    if (fileIndex >= 0) {
      this.dataFile.files[fileIndex].downloadStatus = status;
      if (downloadPath) {
        this.dataFile.files[fileIndex].downloadPath = downloadPath;
        this.dataFile.files[fileIndex].downloadedAt = new Date().toISOString();
      }
      if (errorMessage) {
        this.dataFile.files[fileIndex].errorMessage = errorMessage;
      }
    }
  }
}
