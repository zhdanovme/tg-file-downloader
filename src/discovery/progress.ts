/**
 * Progress reporting for discovery operations
 */

import cliProgress from 'cli-progress';
import chalk from 'chalk';
import { TelegramGroup } from '../types/index.js';
import { formatBytes } from '../utils/format.js';

let groupProgressBar: cliProgress.SingleBar | null = null;
let fileProgressBar: cliProgress.SingleBar | null = null;

/**
 * Display group scanning progress
 */
export function displayGroupProgress(current: number, total: number, groupName?: string): void {
  if (!groupProgressBar) {
    groupProgressBar = new cliProgress.SingleBar({
      format: chalk.cyan('{bar}') + ' {percentage}% | {value}/{total} groups | {groupName}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });

    groupProgressBar.start(total, 0, { groupName: '' });
  }

  groupProgressBar.update(current, { groupName: groupName || '' });

  if (current >= total) {
    groupProgressBar.stop();
    groupProgressBar = null;
  }
}

/**
 * Display file scanning progress
 */
export function displayFileProgress(
  current: number,
  total: number,
  fileName?: string,
  fileSize?: number
): void {
  if (!fileProgressBar) {
    fileProgressBar = new cliProgress.SingleBar({
      format:
        chalk.green('{bar}') +
        ' {percentage}% | {value}/{total} files | {fileName} ({fileSize})',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });

    fileProgressBar.start(total, 0, { fileName: '', fileSize: '' });
  }

  fileProgressBar.update(current, {
    fileName: fileName || '',
    fileSize: fileSize ? formatBytes(fileSize) : '',
  });

  if (current >= total) {
    fileProgressBar.stop();
    fileProgressBar = null;
  }
}

/**
 * Stop all progress bars
 */
export function stopProgress(): void {
  if (groupProgressBar) {
    groupProgressBar.stop();
    groupProgressBar = null;
  }

  if (fileProgressBar) {
    fileProgressBar.stop();
    fileProgressBar = null;
  }
}

/**
 * Display discovery summary
 */
export function displayDiscoverySummary(
  groups: TelegramGroup[],
  totalFiles: number,
  totalSize: number
): void {
  console.log('\n' + chalk.green('✓') + ' Discovery completed successfully!\n');

  console.log(chalk.bold('Summary:'));
  console.log(`  Groups discovered: ${chalk.cyan(groups.length)}`);
  console.log(`  Files discovered: ${chalk.cyan(totalFiles)}`);
  console.log(`  Total size: ${chalk.cyan(formatBytes(totalSize))}`);

  if (groups.length > 0) {
    console.log('\n' + chalk.bold('Groups:'));

    // Show top 10 groups by file count
    const groupsWithFiles = groups.slice(0, 10);
    for (const group of groupsWithFiles) {
      const handle = group.handle ? `@${group.handle}` : group.name;
      console.log(`  ${chalk.cyan('•')} ${handle}`);
    }

    if (groups.length > 10) {
      console.log(`  ${chalk.gray(`... and ${groups.length - 10} more groups`)}`);
    }
  }
}
