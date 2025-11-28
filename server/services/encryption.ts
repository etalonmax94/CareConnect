import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_VERSION_LENGTH = 1;
const CURRENT_KEY_VERSION = 1;

let encryptionKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (encryptionKey) {
    return encryptionKey;
  }

  const keyHex = process.env.CHAT_ENCRYPTION_KEY;
  if (!keyHex) {
    console.warn("CHAT_ENCRYPTION_KEY not set - message encryption disabled");
    throw new Error("CHAT_ENCRYPTION_KEY environment variable is required for message encryption");
  }

  if (keyHex.length !== 64) {
    throw new Error("CHAT_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }

  encryptionKey = Buffer.from(keyHex, "hex");
  return encryptionKey;
}

export function isEncryptionEnabled(): boolean {
  return !!process.env.CHAT_ENCRYPTION_KEY;
}

export function encryptMessage(plaintext: string): string {
  if (!isEncryptionEnabled()) {
    return plaintext;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const keyVersion = Buffer.from([CURRENT_KEY_VERSION]);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const result = Buffer.concat([keyVersion, iv, tag, encrypted]);
  return result.toString("base64");
}

export function decryptMessage(encryptedData: string, messageId?: string): string {
  if (!isEncryptionEnabled()) {
    return encryptedData;
  }

  try {
    const buffer = Buffer.from(encryptedData, "base64");
    
    if (buffer.length < KEY_VERSION_LENGTH + IV_LENGTH + TAG_LENGTH + 1) {
      return encryptedData;
    }

    const keyVersion = buffer[0];
    
    if (keyVersion !== CURRENT_KEY_VERSION) {
      console.error(`[ENCRYPTION AUDIT] Unsupported key version ${keyVersion} for message ${messageId || 'unknown'}`);
      throw new Error(`Unsupported encryption key version: ${keyVersion}`);
    }

    const iv = buffer.subarray(KEY_VERSION_LENGTH, KEY_VERSION_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(KEY_VERSION_LENGTH + IV_LENGTH, KEY_VERSION_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(KEY_VERSION_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted) + decipher.final("utf8");
  } catch (error) {
    console.error(`[ENCRYPTION AUDIT] Decryption failed for message ${messageId || 'unknown'}:`, error);
    throw new Error(`Failed to decrypt message content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function isEncryptedFormat(content: string): boolean {
  if (!content) return false;
  try {
    const buffer = Buffer.from(content, "base64");
    if (buffer.length < KEY_VERSION_LENGTH + IV_LENGTH + TAG_LENGTH + 1) {
      return false;
    }
    const keyVersion = buffer[0];
    return keyVersion >= 1 && keyVersion <= 10;
  } catch {
    return false;
  }
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
