#!/usr/bin/env node

/**
 * CLI entry point for Telegram file downloader
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
const packageJsonPath = path.join(__dirname, '../../package.json');
const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

const program = new Command();

program
  .name('tg-downloader')
  .description('CLI tool to download files from Telegram groups')
  .version(packageJson.version);

// Global options
program
  .option('-c, --config <path>', 'Path to configuration file', './data/config.json')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress all output except errors')
  .option('-j, --json', 'Output results as JSON');

// Register commands
const { createAuthCommand, createLogoutCommand } = await import('./commands/auth.js');
const { createDiscoverCommand } = await import('./commands/discover.js');
const { createConfigCommand } = await import('./commands/config.js');
const { createDownloadCommand } = await import('./commands/download.js');
const { createStatusCommand } = await import('./commands/status.js');
const { createRunCommand } = await import('./commands/run.js');

program.addCommand(createRunCommand());
program.addCommand(createAuthCommand());
program.addCommand(createDiscoverCommand());
program.addCommand(createConfigCommand());
program.addCommand(createDownloadCommand());
program.addCommand(createStatusCommand());
program.addCommand(createLogoutCommand());

// If no command specified, run the full workflow
if (!process.argv.slice(2).length || (process.argv.slice(2).length === 1 && process.argv[2].startsWith('-'))) {
  // Add 'run' command to argv and parse
  process.argv.splice(2, 0, 'run');
}

program.parse(process.argv);
