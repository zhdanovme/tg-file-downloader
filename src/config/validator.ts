/**
 * Configuration validation utilities
 */

import { Configuration } from '../types/index.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Validate group handles format
 */
export function validateHandles(handles: string[]): void {
  const handlePattern = /^[a-zA-Z0-9_]+$/;

  for (const handle of handles) {
    if (!handlePattern.test(handle)) {
      throw new ValidationError(
        `Invalid group handle format: "${handle}". Handles must contain only letters, numbers, and underscores.`,
        'INVALID_HANDLE'
      );
    }
  }
}

/**
 * Validate glob patterns
 */
export function validateGlobPatterns(patterns: string[]): void {
  for (const pattern of patterns) {
    if (pattern.trim().length === 0) {
      throw new ValidationError(
        'Empty glob pattern is not allowed',
        'INVALID_PATTERN'
      );
    }
  }
}

/**
 * Validate file paths
 */
export function validatePaths(config: Configuration): void {
  if (config.download?.outputDir && config.download.outputDir.trim().length === 0) {
    throw new ValidationError(
      'Download output directory cannot be empty',
      'INVALID_PATH'
    );
  }
}

/**
 * Check for large exclude lists and warn
 */
export function checkLargeExcludeList(config: Configuration): string[] {
  const warnings: string[] = [];

  if (config.groups?.exclude && config.groups.exclude.length > 50) {
    warnings.push(
      `Large exclude list (${config.groups.exclude.length} groups) may impact performance`
    );
  }

  if (config.files?.exclude && config.files.exclude.length > 100) {
    warnings.push(
      `Large file exclude list (${config.files.exclude.length} patterns) may impact performance`
    );
  }

  return warnings;
}

/**
 * Check for conflicting rules
 */
export function checkConflictingRules(config: Configuration): string[] {
  const warnings: string[] = [];

  // If both include and exclude are specified for groups
  if (
    config.groups?.include &&
    config.groups.include.length > 0 &&
    config.groups?.exclude &&
    config.groups.exclude.length > 0
  ) {
    warnings.push(
      'Both include and exclude lists specified for groups. Include list will take precedence.'
    );
  }

  return warnings;
}

/**
 * Validate entire configuration
 */
export function validateConfig(config: Configuration): string[] {
  const warnings: string[] = [];

  // Validate handles
  if (config.groups?.include) {
    validateHandles(config.groups.include);
  }
  if (config.groups?.exclude) {
    validateHandles(config.groups.exclude);
  }

  // Validate glob patterns
  if (config.files?.include) {
    validateGlobPatterns(config.files.include);
  }
  if (config.files?.exclude) {
    validateGlobPatterns(config.files.exclude);
  }

  // Validate paths
  validatePaths(config);

  // Validate concurrency
  if (
    config.download?.concurrency !== undefined &&
    (config.download.concurrency < 1 || config.download.concurrency > 10)
  ) {
    throw new ValidationError(
      'Concurrency must be between 1 and 10',
      'INVALID_CONCURRENCY'
    );
  }

  // Validate file size limits
  if (config.files?.minSize !== undefined && config.files.minSize < 0) {
    throw new ValidationError(
      'Minimum file size cannot be negative',
      'INVALID_FILE_SIZE'
    );
  }

  if (
    config.files?.maxSize !== undefined &&
    config.files.maxSize !== null &&
    config.files.maxSize < 0
  ) {
    throw new ValidationError(
      'Maximum file size cannot be negative',
      'INVALID_FILE_SIZE'
    );
  }

  if (
    config.files?.minSize !== undefined &&
    config.files?.maxSize !== undefined &&
    config.files.maxSize !== null &&
    config.files.minSize > config.files.maxSize
  ) {
    throw new ValidationError(
      'Minimum file size cannot be greater than maximum file size',
      'INVALID_FILE_SIZE'
    );
  }

  // Collect warnings
  warnings.push(...checkLargeExcludeList(config));
  warnings.push(...checkConflictingRules(config));

  return warnings;
}
