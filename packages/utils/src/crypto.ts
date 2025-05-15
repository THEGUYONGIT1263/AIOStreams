import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from 'crypto';
import { deflateSync, inflateSync } from 'zlib';
import { Settings } from './settings';
import JSONCrush from 'jsoncrush';
import { createLogger } from './logger';

const logger = createLogger('crypto');

export const loadSecretKey = (log: boolean = false): Buffer | string => {
  const secretKey = Settings.SECRET_KEY;
  if (!secretKey) {
    console.error('No secret key provided');
    throw new Error('No secret key provided');
  }
  // must be 64 characters long and hex

  if (secretKey.length === 32) {
    // backwards compatibility
    if (log)
      logger.warn(
        'Secret key is 32 characters long, consider updating to a 64 character key and reconfiguring for better security'
      );
    return secretKey;
  } else if (secretKey.length !== 64) {
    if (log) logger.error('Secret key must be 64 characters long');
    throw new Error('Secret key must be 64 characters long');
  }

  if (!/^[0-9a-fA-F]+$/.test(secretKey)) {
    if (log) logger.error('Secret key must be a hex string (0-9, a-f)');
    throw new Error('Secret key must be a hex string (0-9, a-f)');
  }

  return Buffer.from(secretKey, 'hex');
};

const pad = (data: Buffer, blockSize: number): Buffer => {
  const padding = blockSize - (data.length % blockSize);
  return Buffer.concat([data, Buffer.alloc(padding, padding)]);
};

const unpad = (data: Buffer): Buffer => {
  const padding = data[data.length - 1];
  return data.subarray(0, data.length - padding);
};

export const crushJson = (data: string): string => {
  return JSONCrush.crush(data);
};

export const uncrushJson = (data: string): string => {
  return JSONCrush.uncrush(data);
};

export const compressData = (data: string): Buffer => {
  return deflateSync(Buffer.from(data, 'utf-8'), {
    level: 9,
  });
};

export const decompressData = (data: Buffer): string => {
  return inflateSync(data).toString('utf-8');
};

export const encryptData = (data: Buffer): { iv: string; data: string } => {
  const secretKey = loadSecretKey();

  // Then encrypt the compressed data
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', secretKey, iv);

  // Ensure proper padding
  const paddedData = pad(data, 16);
  const encryptedData = Buffer.concat([
    cipher.update(paddedData),
    cipher.final(),
  ]);

  return {
    iv: iv.toString('base64'),
    data: encryptedData.toString('base64'),
  };
};

export const decryptData = (encryptedData: Buffer, iv: Buffer): Buffer => {
  const secretKey = loadSecretKey();
  const decipher = createDecipheriv('aes-256-cbc', secretKey, iv);

  // Decrypt the data
  const decryptedPaddedData = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  // Remove padding
  const decryptedData = unpad(decryptedPaddedData);

  return decryptedData;
};

export function parseAndDecryptString(data: string): string | null {
  try {
    if (data.startsWith('E-') || data.startsWith('E2-')) {
      const eVersion = data.startsWith('E2-') ? 2 : 1;
      const encoding = eVersion === 1 ? 'hex' : 'base64';
      const [ivHex, encryptedHex] = data
        .replace('E-', '')
        .replace('E2-', '')
        .split('-')
        .map(decodeURIComponent);
      const iv = Buffer.from(ivHex, encoding);
      const encrypted = Buffer.from(encryptedHex, encoding);
      const decrypted = decryptData(encrypted, iv);
      const decompressed = decompressData(decrypted);
      return decompressed;
    }
    return data;
  } catch (error: any) {
    logger.error(`Failed to decrypt data: ${error.message}`);
    return null;
  }
}

export function getTextHash(text: string): string {
  const hash = createHash('sha256');
  hash.update(text);
  return hash.digest('hex');
}

export function isValueEncrypted(value?: string): boolean {
  if (!value) return false;
  const tests =
    /^E2-[^-]+-[^-]+$/.test(value) ||
    /^E-[0-9a-fA-F]{32}-[0-9a-fA-F]+$/.test(value);
  return tests;
}
