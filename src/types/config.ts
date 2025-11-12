/**
 * Configuration type definitions for Telegram file downloader
 */

export interface Configuration {
  groups?: GroupFilters;
  files?: FileFilters;
  download?: DownloadSettings;
  session?: SessionSettings;
}

export interface GroupFilters {
  /** Telegram handles to include (if empty, include all) */
  include?: string[];
  /** Telegram handles to exclude */
  exclude?: string[];
}

export interface FileFilters {
  /** Glob patterns for files to include (e.g., "*.pdf") */
  include?: string[];
  /** Glob patterns for files to exclude */
  exclude?: string[];
  /** Minimum file size in bytes */
  minSize?: number;
  /** Maximum file size in bytes (null = no limit) */
  maxSize?: number | null;
}

export interface DownloadSettings {
  /** Download output directory (default: "./data/downloads") */
  outputDir?: string;
  /** Organize downloads by group handle (default: true) */
  organizeByGroup?: boolean;
  /** Overwrite existing files (default: false) */
  overwriteExisting?: boolean;
  /** Download chunk size in bytes (default: 524288 = 512 KB) */
  chunkSize?: number;
  /** Number of concurrent downloads (default: 3) */
  concurrency?: number;
  /** Number of retry attempts for failed downloads (default: 3) */
  retryAttempts?: number;
  /** Delay between retry attempts in milliseconds (default: 5000) */
  retryDelay?: number;
}

export interface SessionSettings {
  /** Whether to encrypt session (default: true) */
  encryptSession?: boolean;
  /** Session timeout in milliseconds (default: 86400000 = 24 hours) */
  sessionTimeout?: number;
}
