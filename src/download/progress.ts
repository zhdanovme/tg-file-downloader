/**
 * Download progress tracking
 */

import cliProgress from 'cli-progress';
import chalk from 'chalk';
import { formatBytes } from '../utils/format.js';

/**
 * Download progress tracker
 */
export class DownloadProgress {
  private bar: cliProgress.SingleBar;
  private total: number;
  private completed: number;
  private failed: number;
  private currentFile: string;
  private currentFileProgress: number;

  constructor(total: number) {
    this.total = total;
    this.completed = 0;
    this.failed = 0;
    this.currentFile = '';
    this.currentFileProgress = 0;

    this.bar = new cliProgress.SingleBar(
      {
        format:
          chalk.cyan('{bar}') +
          ' | {percentage}% | {value}/{total} files | ' +
          chalk.yellow('Current: {currentFile}') +
          ' ({fileProgress}%)',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
      },
      cliProgress.Presets.shades_classic
    );
  }

  /**
   * Start progress display
   */
  start(): void {
    this.bar.start(this.total, 0, {
      currentFile: 'Initializing...',
      fileProgress: 0,
    });
  }

  /**
   * Stop progress display
   */
  stop(): void {
    this.bar.stop();

    // Display summary
    console.log('\n' + chalk.blue('Download Summary:'));
    console.log(chalk.green(`  ✓ Completed: ${this.completed}`));
    if (this.failed > 0) {
      console.log(chalk.red(`  ✗ Failed: ${this.failed}`));
    }
    console.log(chalk.gray(`  Total: ${this.total}`));
  }

  /**
   * Update progress for current file
   */
  updateFileProgress(filename: string, downloaded: number, total: number): void {
    this.currentFile = filename;
    this.currentFileProgress = Math.floor((downloaded / total) * 100);

    this.bar.update(this.completed, {
      currentFile: this.truncate(filename, 40),
      fileProgress: this.currentFileProgress,
    });
  }

  /**
   * Increment completed count
   */
  incrementCompleted(): void {
    this.completed++;
    this.bar.update(this.completed, {
      currentFile: 'Ready...',
      fileProgress: 0,
    });
  }

  /**
   * Increment failed count
   */
  incrementFailed(): void {
    this.failed++;
    this.completed++; // Count as processed
    this.bar.update(this.completed, {
      currentFile: 'Ready...',
      fileProgress: 0,
    });
  }

  /**
   * Truncate filename for display
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + '...';
  }
}
