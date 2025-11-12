/**
 * Discover command implementation
 */

import { Command } from 'commander';
import { authenticate } from '../../auth/index.js';
import { discoverFiles } from '../../discovery/index.js';
import { handleError, displaySuccess, jsonOutput, displayError, initializeApp } from '../utils.js';
import { ensureAuthenticated } from '../utils.js';
import logger from '../../utils/logger.js';

export function createDiscoverCommand(): Command {
  const command = new Command('discover');

  command
    .description('Discover files in Telegram groups')
    .option('-o, --output <path>', 'Output data file path', './data/data.json')
    .option('-u, --update', 'Update existing data file (preserve download status)', false)
    .option('--groups-only', 'Only discover groups, skip file scanning', false)
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

        // Authenticate
        client = await authenticate({
          sessionPath: './data/session',
          encryptSession: true,
        });

        logger.info('Starting discovery...');

        // Discover files
        const result = await discoverFiles(client, {
          configPath: globalOpts.config,
          dataFilePath: options.output,
          update: options.update,
          groupsOnly: options.groupsOnly,
          showProgress: !globalOpts.quiet && !globalOpts.json,
        });

        // Output result
        if (globalOpts.json) {
          jsonOutput({
            success: true,
            statistics: {
              groups: result.groups.length,
              files: result.files.length,
              totalSize: result.dataFile.statistics.totalSize,
              discovered: result.files.length,
              skipped: 0,
            },
            dataFile: options.output,
            duration: 0, // TODO: track actual duration
          });
        } else if (!globalOpts.quiet) {
          displaySuccess(`Discovery completed! Data saved to: ${options.output}`);
        }

        await client.disconnect();
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
