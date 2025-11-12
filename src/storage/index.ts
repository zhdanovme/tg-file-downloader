/**
 * Storage module barrel export
 */

export {
  loadDataFile,
  saveDataFile,
  createDataFile,
  updateStatistics,
  upsertGroup,
  upsertFile,
} from './data-file.js';

export {
  loadSession,
  saveSession,
  deleteSession,
  sessionExists,
} from './session-file.js';

export { encrypt, decrypt, deriveKey } from './encryption.js';
