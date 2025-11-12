/**
 * Config command implementation
 */

import { Command } from 'commander';
import { loadConfig } from '../../config/loader.js';
import { validateConfig } from '../../config/validator.js';
import { createDefaultConfigFile, configFileExists } from '../../config/generator.js';
import {
  handleError,
  displaySuccess,
  displayWarning,
  displayInfo,
  jsonOutput,
  initializeApp,
} from '../utils.js';
import logger from '../../utils/logger.js';
import chalk from 'chalk';

export function createConfigCommand(): Command {
  const command = new Command('config');

  command
    .description('Manage configuration')
    .addCommand(createConfigInitCommand())
    .addCommand(createConfigValidateCommand())
    .addCommand(createConfigShowCommand());

  return command;
}

/**
 * Config init subcommand - create default configuration
 */
function createConfigInitCommand(): Command {
  const command = new Command('init');

  command
    .description('Create default configuration file')
    .option('-o, --output <path>', 'Output configuration file path', './data/config.json')
    .option('-f, --force', 'Overwrite existing configuration file', false)
    .option('-e, --example', 'Generate configuration with explanatory comments', false)
    .action(async (options, cmd) => {
      const globalOpts = cmd.parent.parent.opts();

      try {
        // Initialize app
        await initializeApp();

        // Check if file already exists
        const exists = await configFileExists(options.output);

        if (exists && !options.force) {
          if (globalOpts.json) {
            jsonOutput({
              success: false,
              error: {
                code: 'CONFIG_EXISTS',
                message: `Configuration file already exists: ${options.output}`,
              },
            });
          } else {
            displayWarning(`Configuration file already exists: ${options.output}`);
            displayInfo('Use --force to overwrite');
          }
          process.exit(1);
        }

        // Create configuration file
        await createDefaultConfigFile(options.output, options.example);

        // Output result
        if (globalOpts.json) {
          jsonOutput({
            success: true,
            configPath: options.output,
            withComments: options.example,
          });
        } else {
          displaySuccess(`Configuration file created: ${options.output}`);
          if (options.example) {
            displayInfo('Configuration includes explanatory comments');
          }
          console.log('\nNext steps:');
          console.log(`  1. Edit ${options.output} to customize your settings`);
          console.log(`  2. Run: tg-downloader config validate`);
          console.log('  3. Run: tg-downloader discover');
        }

        process.exit(0);
      } catch (error: any) {
        handleError(error, globalOpts.json);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Config validate subcommand - validate configuration file
 */
function createConfigValidateCommand(): Command {
  const command = new Command('validate');

  command
    .description('Validate configuration file')
    .option('-c, --config <path>', 'Configuration file path', './data/config.json')
    .action(async (options, cmd) => {
      const globalOpts = cmd.parent.parent.opts();

      try {
        // Initialize app
        await initializeApp();

        logger.info('Validating configuration...', { path: options.config });

        // Load and validate configuration
        const config = await loadConfig(options.config);

        // Additional validation warnings
        const warnings = validateConfig(config);

        // Output result
        if (globalOpts.json) {
          jsonOutput({
            success: true,
            valid: true,
            warnings: warnings.length > 0 ? warnings : undefined,
            config,
          });
        } else {
          displaySuccess('Configuration is valid');

          if (warnings.length > 0) {
            console.log(chalk.yellow('\nWarnings:'));
            warnings.forEach((warning) => displayWarning(warning));
          }

          // Display configuration summary
          console.log(chalk.blue('\nConfiguration Summary:'));
          console.log(`  Groups Include: ${config.groups?.include?.length || 0} patterns`);
          console.log(`  Groups Exclude: ${config.groups?.exclude?.length || 0} patterns`);
          console.log(`  Files Include: ${config.files?.include?.length || 0} patterns`);
          console.log(`  Files Exclude: ${config.files?.exclude?.length || 0} patterns`);
          console.log(`  Output Directory: ${config.download?.outputDir}`);
          console.log(`  Organize by Group: ${config.download?.organizeByGroup}`);
          console.log(`  Concurrency: ${config.download?.concurrency}`);
        }

        process.exit(0);
      } catch (error: any) {
        handleError(error, globalOpts.json);
        process.exit(1);
      }
    });

  return command;
}

/**
 * Config show subcommand - display current configuration
 */
function createConfigShowCommand(): Command {
  const command = new Command('show');

  command
    .description('Display current configuration')
    .option('-c, --config <path>', 'Configuration file path', './data/config.json')
    .action(async (options, cmd) => {
      const globalOpts = cmd.parent.parent.opts();

      try {
        // Initialize app
        await initializeApp();

        // Load configuration
        const config = await loadConfig(options.config);

        // Output result
        if (globalOpts.json) {
          jsonOutput({
            success: true,
            config,
          });
        } else {
          console.log(chalk.blue('\nCurrent Configuration:'));
          console.log(JSON.stringify(config, null, 2));
        }

        process.exit(0);
      } catch (error: any) {
        handleError(error, globalOpts.json);
        process.exit(1);
      }
    });

  return command;
}
