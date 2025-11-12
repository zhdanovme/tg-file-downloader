/**
 * QR code authentication for Telegram
 */

import { TelegramClient } from 'telegram';
import qrcode from 'qrcode-terminal';
import { AuthError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Authenticate using QR code
 */
export async function authenticateWithQR(client: TelegramClient): Promise<void> {
  try {
    logger.info('Starting QR code authentication...');
    console.log('\nScan this QR code with your Telegram app:');
    console.log('(Telegram > Settings > Devices > Link Desktop Device)\n');

    // Connect to Telegram first
    await client.connect();

    // Use signInUserWithQrCode for user authentication with QR
    await client.signInUserWithQrCode(
      { apiId: client.apiId, apiHash: client.apiHash },
      {
        qrCode: async (code) => {
          // Generate QR code link
          const qrLink = `tg://login?token=${code.token.toString('base64url')}`;

          // Display QR code in terminal
          qrcode.generate(qrLink, { small: true }, (qr: string) => {
            console.log(qr);
          });

          console.log('\nWaiting for QR code scan...');
        },
        password: async (_hint) => {
          // If 2FA is enabled, this would be called
          // For now, we'll throw an error as we don't support 2FA in QR mode yet
          throw new AuthError(
            '2FA is enabled on your account. Please use phone authentication instead.',
            '2FA_REQUIRED'
          );
        },
        onError: (error: Error) => {
          logger.error('QR code authentication error', { error: error.message });
          throw new AuthError(
            `Authentication failed: ${error.message}`,
            'QR_AUTH_FAILED'
          );
        },
      }
    );

    logger.info('QR code authentication successful');
  } catch (error: any) {
    logger.error('QR code authentication failed', { error: error.message });

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
