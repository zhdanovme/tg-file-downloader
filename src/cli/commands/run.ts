/**
 * Run command - executes full workflow: auth → discover → download
 */

import { Command } from 'commander';
import { authenticate } from '../../auth/index.js';
import { loadConfigOrDefault } from '../../config/loader.js';
import { discoverFiles } from '../../discovery/index.js';
import { DownloadManager } from '../../download/index.js';
import {
  handleError,
  displaySuccess,
  displayError,
  displayInfo,
  jsonOutput,
  initializeApp,
  ensureAuthenticated,
} from '../utils.js';
import logger from '../../utils/logger.js';

export function createRunCommand(): Command {
  const command = new Command('run');

  command
    .description('Run full workflow: authenticate, discover, and download files')
    .option('-d, --data <path>', 'Data file path', './data/data.json')
    .action(async (options, cmd) => {
      const globalOpts = cmd.parent.opts();
      let client;

      try {
        // Initialize app
        await initializeApp();

        displayInfo('Starting full workflow: auth → discover → download\n');

        // Step 1: Authentication
        displayInfo('Step 1/3: Authentication');
        const authStatus = await ensureAuthenticated('./data/session', globalOpts.json);

        if (!authStatus.authenticated) {
          displayInfo('Not authenticated. Please complete authentication...');
          // We can't auto-authenticate without user interaction
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

        displaySuccess('Already authenticated\n');

        // Load configuration
        const config = await loadConfigOrDefault(globalOpts.config);

        // Authenticate client
        client = await authenticate({
          sessionPath: './data/session',
          encryptSession: true,
        });

        // Step 2: Discovery
        displayInfo('Step 2/3: Discovery');
        logger.info('Starting discovery...', { dataFile: options.data });

        const discoveryResult = await discoverFiles(client, {
          configPath: globalOpts.config,
          dataFilePath: options.data,
          update: true,
          groupsOnly: false,
          showProgress: !globalOpts.quiet && !globalOpts.json,
        });

        if (!globalOpts.quiet && !globalOpts.json) {
          displaySuccess('Discovery completed!');
          displayInfo(`Groups: ${discoveryResult.groups.length}`);
          displayInfo(`Files: ${discoveryResult.files.length}\n`);
        }

        // Step 3: Download
        displayInfo('Step 3/3: Download');
        logger.info('Starting download...', {
          dataFile: options.data,
          resume: true,
        });

        const downloadManager = new DownloadManager(client, {
          config,
          dataFilePath: options.data,
          showProgress: !globalOpts.quiet && !globalOpts.json,
          resumeExisting: true,
        });

        const downloadStats = await downloadManager.start();

        // Disconnect client
        await client.disconnect();

        // Output final result
        if (globalOpts.json) {
          jsonOutput({
            success: true,
            discovery: {
              groups: discoveryResult.groups.length,
              files: discoveryResult.files.length,
            },
            download: downloadStats,
          });
        } else if (!globalOpts.quiet) {
          displaySuccess('\nFull workflow completed!');
          displayInfo(`\nDiscovery: ${discoveryResult.files.length} files found`);
          displayInfo(`Download: ${downloadStats.completed} files completed`);
          if (downloadStats.failed > 0) {
            displayInfo(`Failed: ${downloadStats.failed} files`);
          }
          if (downloadStats.skipped > 0) {
            displayInfo(`Skipped: ${downloadStats.skipped} files`);
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
