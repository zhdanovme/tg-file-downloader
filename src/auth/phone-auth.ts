/**
 * Phone number authentication for Telegram
 */

import { TelegramClient } from 'telegram';
import readline from 'readline';
import { AuthError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Create readline interface for user input
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for input
 */
async function prompt(question: string): Promise<string> {
  const rl = createReadlineInterface();

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Authenticate using phone number and verification code
 */
export async function authenticateWithPhone(
  client: TelegramClient,
  phoneNumber?: string
): Promise<void> {
  try {
    logger.info('Starting phone number authentication...');

    await client.start({
      phoneNumber: async () => {
        if (phoneNumber) {
          console.log(`Using phone number: ${phoneNumber}`);
          return phoneNumber;
        }

        const phone = await prompt('Enter your phone number (with country code, e.g., +1234567890): ');

        if (!phone || !phone.startsWith('+')) {
          throw new AuthError(
            'Invalid phone number format. Must start with + and include country code.',
            'INVALID_PHONE'
          );
        }

        return phone;
      },
      password: async () => {
        return await prompt('Enter your 2FA password (if enabled): ');
      },
      phoneCode: async () => {
        return await prompt('Enter the verification code sent to your Telegram app: ');
      },
      onError: (error) => {
        logger.error('Phone authentication error', { error: error.message });
        throw new AuthError(
          `Authentication failed: ${error.message}`,
          'PHONE_AUTH_FAILED'
        );
      },
    });

    logger.info('Phone authentication successful');
  } catch (error: any) {
    logger.error('Phone authentication failed', { error: error.message });

    if (error.message.includes('PHONE_NUMBER_INVALID')) {
      throw new AuthError(
        'Invalid phone number format',
        'INVALID_PHONE'
      );
    }

    if (error.message.includes('PHONE_CODE_INVALID')) {
      throw new AuthError(
        'Invalid verification code',
        'INVALID_CODE'
      );
    }

    if (error.message.includes('TIMEOUT')) {
      throw new AuthError(
        'Authentication timeout. Please try again.',
        'TIMEOUT'
      );
    }

    throw new AuthError(
      `Authentication failed: ${error.message}`,
      'AUTH_FAILED'
    );
  }
}
