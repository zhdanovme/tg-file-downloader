/**
 * Data model type definitions for Telegram file downloader
 */

export type GroupType = 'group' | 'channel' | 'supergroup';

export type DownloadStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

export interface TelegramGroup {
  /** Telegram's unique group ID (always available) */
  id: string;
  /** Username/handle (e.g., "mygroup" for @mygroup) */
  handle?: string;
  /** Display name of the group */
  name: string;
  /** Type of group */
  type: GroupType;
  /** Number of members (may be unavailable) */
  memberCount?: number;
  /** Telegram access hash (required for API calls) */
  accessHash: string;
  /** ISO 8601 timestamp of when group was discovered */
  discoveredAt: string;
}

export interface FileEntry {
  /** Unique identifier (format: groupId:messageId) */
  id: string;
  /** Reference to parent TelegramGroup.id */
  groupId: string;
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type (e.g., "application/pdf") */
  mimeType?: string;
  /** File extension (e.g., ".pdf") */
  extension?: string;
  /** Telegram's file ID for download */
  telegramFileId: string;
  /** Message ID containing the file */
  messageId: number;
  /** ISO 8601 timestamp when file was uploaded to Telegram */
  uploadedAt?: string;
  /** ISO 8601 timestamp when we discovered this file */
  discoveredAt: string;
  /** Current download state */
  downloadStatus: DownloadStatus;
  /** ISO 8601 timestamp when download completed */
  downloadedAt?: string;
  /** Local path where file was saved */
  downloadPath?: string;
  /** Error message if download failed */
  errorMessage?: string;
}

export interface Statistics {
  /** Total number of groups */
  totalGroups: number;
  /** Total number of files */
  totalFiles: number;
  /** Total size of all files in bytes */
  totalSize: number;
  /** Files not yet downloaded */
  pendingFiles: number;
  /** Files successfully downloaded */
  completedFiles: number;
  /** Files that failed to download */
  failedFiles: number;
  /** Total size of downloaded files in bytes */
  totalDownloadedSize: number;
}

export interface DataFile {
  /** Schema version (e.g., "1.0.0") */
  version: string;
  /** ISO 8601 timestamp of first creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  lastUpdatedAt: string;
  /** All discovered groups */
  groups: TelegramGroup[];
  /** All discovered files */
  files: FileEntry[];
  /** Summary statistics */
  statistics: Statistics;
}

export interface SessionFile {
  /** Schema version */
  version: string;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp of last use */
  lastUsedAt: string;
  /** Telegram StringSession (base64) */
  sessionString: string;
  /** User ID if authenticated */
  userId?: string;
  /** Phone number used for auth (masked) */
  phoneNumber?: string;
}
