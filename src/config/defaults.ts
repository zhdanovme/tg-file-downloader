/**
 * Default configuration values
 */

import { Configuration } from '../types/index.js';

export function getDefaultConfig(): Configuration {
  return {
    groups: {
      include: [],
      exclude: [],
    },
    files: {
      include: [],
      exclude: [],
      minSize: 0,
      maxSize: null,
    },
    download: {
      outputDir: './data/downloads',
      organizeByGroup: true,
      overwriteExisting: false,
      chunkSize: 524288, // 512 KB
      concurrency: 3,
      retryAttempts: 3,
      retryDelay: 5000, // 5 seconds
    },
    session: {
      encryptSession: true,
      sessionTimeout: 86400000, // 24 hours
    },
  };
}
