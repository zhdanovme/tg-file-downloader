/**
 * Encryption utilities for session storage using AES-256-GCM
 */

import crypto from 'crypto';
import os from 'os';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Derive encryption key from machine ID
 */
export function deriveKey(password?: string): Buffer {
  const machineId = getMachineId();
  const salt = crypto.createHash('sha256').update(machineId).digest();

  const keyMaterial = password || machineId;

  return crypto.pbkdf2Sync(keyMaterial, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Get machine-specific identifier
 */
function getMachineId(): string {
  // Use combination of hostname and network interfaces for machine ID
  const hostname = os.hostname();
  const networkInterfaces = os.networkInterfaces();

  const macs: string[] = [];
  for (const iface of Object.values(networkInterfaces)) {
    if (iface) {
      for (const config of iface) {
        if (config.mac && config.mac !== '00:00:00:00:00:00') {
          macs.push(config.mac);
        }
      }
    }
  }

  const uniqueId = `${hostname}-${macs.sort().join('-')}`;
  return crypto.createHash('sha256').update(uniqueId).digest('hex');
}

/**
 * Encrypt data using AES-256-GCM
 * Returns format: {iv}:{authTag}:{encryptedData} (all base64)
 */
export function encrypt(data: string, password?: string): string {
  const key = deriveKey(password);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf-8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt data encrypted with AES-256-GCM
 */
export function decrypt(encryptedData: string, password?: string): string {
  const key = deriveKey(password);

  // Parse the encrypted string
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivBase64, authTagBase64, encryptedBase64] = parts;

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf-8');
  decrypted += decipher.final('utf-8');

  return decrypted;
}
