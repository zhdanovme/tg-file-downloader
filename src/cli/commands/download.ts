/**
 * Download command implementation
 */

import { Command } from 'commander';
import { authenticate } from '../../auth/index.js';
import { loadConfigOrDefault } from '../../config/loader.js';
import { DownloadManager } from '../../download/index.js';
import {
  handleError,
  displaySuccess,
  displayError,
  displayInfo,
  jsonOutput,
  ensureAuthenticated,
  initializeApp,
} from '../utils.js';
import logger from '../../utils/logger.js';

export function createDownloadCommand(): Command {
  const command = new Command('download');

  command
    .description('Download files from Telegram groups')
    .option('-d, --data <path>', 'Data file path', './data/data.json')
    .option('-r, --resume', 'Resume failed downloads', true)
    .action(async (options, cmd) => {
      const globalOpts = cmd.parent.opts();
      let client;

      try {
        // Initialize app
        await initializeApp();

        // Check authentication
        const authResult = await ensureAuthenticated(
          './data/session',
          globalOpts.json
        );

        if (!authResult.authenticated) {
          if (globalOpts.json) {
            jsonOutput({
              success: false,
              error: {
                code: 'NOT_AUTHENTICATED',
                message: 'Not authenticated. Please run "tg-downloader auth" first.',
              },
            });
          } else {
            displayError('Not authenticated. Please run "tg-downloader auth" first.');
          }
          process.exit(1);
        }

        // Load configuration
        const config = await loadConfigOrDefault(globalOpts.config);

        // Authenticate
        client = await authenticate({
          sessionPath: './data/session',
          encryptSession: true,
        });

        logger.info('Starting download...', {
          dataFile: options.data,
          resume: options.resume,
        });

        // Create download manager
        const manager = new DownloadManager(client, {
          config,
          dataFilePath: options.data,
          showProgress: !globalOpts.quiet && !globalOpts.json,
          resumeExisting: options.resume,
        });

        // Start downloads
        const stats = await manager.start();

        // Disconnect client
        await client.disconnect();

        // Output result
        if (globalOpts.json) {
          jsonOutput({
            success: true,
            statistics: stats,
          });
        } else if (!globalOpts.quiet) {
          displaySuccess('Download completed!');
          displayInfo(`Completed: ${stats.completed} files`);
          if (stats.failed > 0) {
            displayInfo(`Failed: ${stats.failed} files`);
          }
          if (stats.skipped > 0) {
            displayInfo(`Skipped: ${stats.skipped} files`);
          }
        }

        process.exit(0);
      } catch (error: any) {
        if (client) {
          await client.disconnect();
        }
        handleError(error, globalOpts.json);
        process.exit(1);
      }
    });

  return command;
}
