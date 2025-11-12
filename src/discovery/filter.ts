/**
 * Filtering logic for groups and files
 */

import { minimatch } from 'minimatch';
import { TelegramGroup, FileEntry, Configuration } from '../types/index.js';
import logger from '../utils/logger.js';

/**
 * Apply group filters from configuration
 */
export function applyGroupFilters(
  groups: TelegramGroup[],
  config: Configuration
): TelegramGroup[] {
  const { include, exclude } = config.groups || {};

  let filtered = groups;

  // If include list is specified, only keep those groups
  if (include && include.length > 0) {
    filtered = filtered.filter((group) => {
      const handle = group.handle?.toLowerCase();
      return handle && include.some((h) => h.toLowerCase() === handle);
    });

    logger.debug(`Applied include filter: ${filtered.length}/${groups.length} groups kept`);
  }

  // Apply exclude list
  if (exclude && exclude.length > 0) {
    const beforeCount = filtered.length;
    filtered = filtered.filter((group) => {
      const handle = group.handle?.toLowerCase();
      return !handle || !exclude.some((h) => h.toLowerCase() === handle);
    });

    logger.debug(`Applied exclude filter: ${filtered.length}/${beforeCount} groups kept`);
  }

  return filtered;
}

/**
 * Apply file filters from configuration
 */
export function applyFileFilters(
  files: FileEntry[],
  config: Configuration
): FileEntry[] {
  const { include, exclude } = config.files || {};

  let filtered = files;

  // If include patterns specified, only keep matching files
  if (include && include.length > 0) {
    filtered = filtered.filter((file) =>
      include.some((pattern) => minimatch(file.name, pattern, { nocase: true }))
    );

    logger.debug(`Applied include filter: ${filtered.length}/${files.length} files kept`);
  }

  // Apply exclude patterns
  if (exclude && exclude.length > 0) {
    const beforeCount = filtered.length;
    filtered = filtered.filter(
      (file) =>
        !exclude.some((pattern) => minimatch(file.name, pattern, { nocase: true }))
    );

    logger.debug(`Applied exclude filter: ${filtered.length}/${beforeCount} files kept`);
  }

  return filtered;
}

/**
 * Check if group should be processed
 */
export function shouldProcessGroup(group: TelegramGroup, config: Configuration): boolean {
  const { include, exclude } = config.groups || {};

  const handle = group.handle?.toLowerCase();

  // If include list exists, group must be in it
  if (include && include.length > 0) {
    return !!handle && include.some((h) => h.toLowerCase() === handle);
  }

  // If exclude list exists, group must not be in it
  if (exclude && exclude.length > 0) {
    return !handle || !exclude.some((h) => h.toLowerCase() === handle);
  }

  return true;
}

/**
 * Check if file should be processed
 */
export function shouldProcessFile(file: FileEntry, config: Configuration): boolean {
  const { include, exclude } = config.files || {};

  // If include patterns exist, file must match at least one
  if (include && include.length > 0) {
    return include.some((pattern) => minimatch(file.name, pattern, { nocase: true }));
  }

  // If exclude patterns exist, file must not match any
  if (exclude && exclude.length > 0) {
    return !exclude.some((pattern) => minimatch(file.name, pattern, { nocase: true }));
  }

  return true;
}
