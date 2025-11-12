/**
 * File system utilities
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

/**
 * Ensure directory exists, create if it doesn't
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Write file atomically (write to temp, then rename)
 */
export async function atomicWrite(
  filePath: string,
  content: string
): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}`;

  try {
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Create backup of file with timestamp
 */
export async function createBackup(filePath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup.${timestamp}`;

  try {
    await fs.copyFile(filePath, backupPath);
    return backupPath;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, no backup needed
      return '';
    }
    throw error;
  }
}

/**
 * Sanitize filename by removing/replacing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace characters that are invalid in filenames
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\s+/g, '_') // Replace whitespace with underscore
    .substring(0, 255); // Limit to 255 characters
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}
