/**
 * CLI utility functions
 */

import chalk from 'chalk';
import { BaseError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Handle and display error
 */
export function handleError(error: Error | BaseError, jsonOutput: boolean = false): void {
  if (jsonOutput) {
    const errorObj: any = {
      success: false,
      error: {
        message: error.message,
        name: error.name,
      },
    };

    if (error instanceof BaseError && error.code) {
      errorObj.error.code = error.code;
    }

    console.log(JSON.stringify(errorObj, null, 2));
  } else {
    console.error(chalk.red('✗'), chalk.red(`Error: ${error.message}`));

    if (error instanceof BaseError && error.code) {
      console.error(chalk.gray(`  Code: ${error.code}`));
    }
  }

  logger.error('Command failed', {
    error: error.message,
    stack: error.stack,
  });
}

/**
 * Output JSON result
 */
export function jsonOutput(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Display success message
 */
export function displaySuccess(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Display error message
 */
export function displayError(message: string): void {
  console.error(chalk.red('✗'), message);
}

/**
 * Display warning message
 */
export function displayWarning(message: string): void {
  console.warn(chalk.yellow('⚠'), message);
}

/**
 * Display info message
 */
export function displayInfo(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Confirm prompt (simple yes/no)
 */
export async function confirmPrompt(message: string): Promise<boolean> {
  // For now, always return true (can be enhanced with readline in future)
  console.log(chalk.cyan('?'), message, chalk.gray('(yes/no)'));

  // Simple implementation - would need readline for actual input
  // For automation, we'll assume yes
  return true;
}

/**
 * Format command output based on flags
 */
export interface OutputOptions {
  json?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}

export function shouldShowOutput(options: OutputOptions): boolean {
  return !options.quiet && !options.json;
}

/**
 * Exit with code
 */
export function exitWithCode(code: number): void {
  process.exit(code);
}

/**
 * Ensure user is authenticated to Telegram
 */
export async function ensureAuthenticated(
  sessionPath: string,
  jsonOutput: boolean = false
): Promise<{ authenticated: boolean; user?: any }> {
  const { checkAuthentication } = await import('../auth/index.js');
  return await checkAuthentication(sessionPath, true);
}

/**
 * Initialize application before running commands
 */
export async function initializeApp(): Promise<void> {
  const { initDataDirectory } = await import('../utils/init.js');
  await initDataDirectory('./data');
}
