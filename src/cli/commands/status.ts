/**
 * Status command implementation
 */

import { Command } from 'commander';
import { loadDataFile } from '../../storage/data-file.js';
import { formatBytes, formatTimestamp } from '../../utils/format.js';
import {
  handleError,
  displayInfo,
  jsonOutput,
  initializeApp,
} from '../utils.js';
import logger from '../../utils/logger.js';
import chalk from 'chalk';

export function createStatusCommand(): Command {
  const command = new Command('status');

  command
    .description('Display download status and statistics')
    .option('-d, --data <path>', 'Data file path', './data/data.json')
    .option('--detailed', 'Show detailed file list', false)
    .action(async (options, cmd) => {
      const globalOpts = cmd.parent.opts();

      try {
        // Initialize app
        await initializeApp();

        // Load data file
        const dataFile = await loadDataFile(options.data);

        // Calculate statistics
        const stats = dataFile.statistics;
        const pending = dataFile.files.filter((f) => f.downloadStatus === 'pending');
        const inProgress = dataFile.files.filter((f) => f.downloadStatus === 'in-progress');
        const completed = dataFile.files.filter((f) => f.downloadStatus === 'completed');
        const failed = dataFile.files.filter((f) => f.downloadStatus === 'failed');

        // Output result
        if (globalOpts.json) {
          jsonOutput({
            success: true,
            statistics: stats,
            statusBreakdown: {
              pending: pending.length,
              inProgress: inProgress.length,
              completed: completed.length,
              failed: failed.length,
            },
            dataFile: options.data,
            lastUpdated: dataFile.lastUpdatedAt,
          });
        } else {
          // Display status summary
          console.log(chalk.blue('\n═══ Download Status ═══\n'));

          console.log(chalk.cyan('Groups:'));
          console.log(`  Total: ${stats.totalGroups}`);

          console.log(chalk.cyan('\nFiles:'));
          console.log(`  Total: ${stats.totalFiles}`);
          console.log(chalk.yellow(`  ⏳ Pending: ${pending.length}`));
          if (inProgress.length > 0) {
            console.log(chalk.blue(`  ⬇️  In Progress: ${inProgress.length}`));
          }
          console.log(chalk.green(`  ✓ Completed: ${completed.length}`));
          if (failed.length > 0) {
            console.log(chalk.red(`  ✗ Failed: ${failed.length}`));
          }

          console.log(chalk.cyan('\nSize:'));
          console.log(`  Total: ${formatBytes(stats.totalSize)}`);
          console.log(`  Downloaded: ${formatBytes(stats.totalDownloadedSize)}`);
          const percentage = stats.totalSize > 0
            ? Math.round((stats.totalDownloadedSize / stats.totalSize) * 100)
            : 0;
          console.log(`  Progress: ${percentage}%`);

          console.log(chalk.cyan('\nData File:'));
          console.log(`  Path: ${options.data}`);
          console.log(`  Last Updated: ${formatTimestamp(dataFile.lastUpdatedAt)}`);

          // Show detailed list if requested
          if (options.detailed) {
            if (failed.length > 0) {
              console.log(chalk.red('\n═══ Failed Files ═══\n'));
              failed.forEach((file) => {
                console.log(chalk.red(`✗ ${file.name}`));
                console.log(chalk.gray(`  Size: ${formatBytes(file.size)}`));
                console.log(chalk.gray(`  Group: ${file.groupId}`));
                if (file.errorMessage) {
                  console.log(chalk.gray(`  Error: ${file.errorMessage}`));
                }
              });
            }

            if (pending.length > 0 && pending.length <= 20) {
              console.log(chalk.yellow('\n═══ Pending Files (next 20) ═══\n'));
              pending.slice(0, 20).forEach((file) => {
                console.log(chalk.yellow(`⏳ ${file.name}`));
                console.log(chalk.gray(`  Size: ${formatBytes(file.size)}`));
                console.log(chalk.gray(`  Group: ${file.groupId}`));
              });
            }
          }

          console.log();
        }

        process.exit(0);
      } catch (error: any) {
        handleError(error, globalOpts.json);
        process.exit(1);
      }
    });

  return command;
}
