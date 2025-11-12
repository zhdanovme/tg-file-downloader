/**
 * Auth command implementation
 */

import { Command } from 'commander';
import { authenticate, logout as authLogout } from '../../auth/index.js';
import { handleError, displaySuccess, jsonOutput, initializeApp } from '../utils.js';
import logger from '../../utils/logger.js';

export function createAuthCommand(): Command {
  const command = new Command('auth');

  command
    .description('Authenticate to Telegram account')
    .option('-m, --method <type>', 'Authentication method (qr|phone)', 'qr')
    .option('-p, --phone <number>', 'Phone number (required if method=phone)')
    .option('-s, --session-path <path>', 'Session storage directory', './data/session')
    .action(async (options, cmd) => {
      const globalOpts = cmd.parent.opts();

      try {
        // Initialize app
        await initializeApp();

        logger.info('Starting authentication...', { method: options.method });

        // Validate options
        if (options.method === 'phone' && !options.phone) {
          throw new Error('Phone number is required when using phone authentication method');
        }

        if (options.method !== 'qr' && options.method !== 'phone') {
          throw new Error(`Invalid authentication method: ${options.method}. Must be 'qr' or 'phone'`);
        }

        // Authenticate
        const client = await authenticate({
          method: options.method,
          phoneNumber: options.phone,
          sessionPath: options.sessionPath,
          encryptSession: true,
        });

        // Get user info
        const me = await client.getMe();
        const user = {
          id: me.id?.toString(),
          name: `${me.firstName || ''} ${me.lastName || ''}`.trim(),
          username: me.username,
        };

        await client.disconnect();

        // Output result
        if (globalOpts.json) {
          jsonOutput({
            success: true,
            method: options.method,
            user,
            sessionPath: options.sessionPath,
          });
        } else {
          displaySuccess('Authentication successful!');
          console.log(`  User: ${user.name}${user.username ? ` (@${user.username})` : ''}`);
          console.log(`  User ID: ${user.id}`);
          console.log(`  Session saved to: ${options.sessionPath}`);
        }

        process.exit(0);
      } catch (error: any) {
        handleError(error, globalOpts.json);
        process.exit(1);
      }
    });

  return command;
}

export function createLogoutCommand(): Command {
  const command = new Command('logout');

  command
    .description('Clear authentication session')
    .option('-s, --session-path <path>', 'Session storage directory', './data/session')
    .action(async (options, cmd) => {
      const globalOpts = cmd.parent.opts();

      try {
        // Initialize app
        await initializeApp();

        await authLogout(options.sessionPath);

        if (globalOpts.json) {
          jsonOutput({
            success: true,
            message: 'Logged out successfully',
          });
        } else {
          displaySuccess('Logged out successfully');
          console.log(`  Session removed from: ${options.sessionPath}`);
        }

        process.exit(0);
      } catch (error: any) {
        handleError(error, globalOpts.json);
        process.exit(1);
      }
    });

  return command;
}
