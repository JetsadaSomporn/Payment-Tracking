import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Senior-level encryption utility for protecting sensitive fields in the database.
 * Uses AES-256-GCM for authenticated encryption.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard for GCM

const ENCRYPTION_SECRET = process.env.INTERNAL_ENCRYPTION_SECRET;
const SALT = process.env.INTERNAL_ENCRYPTION_SALT;

let cachedKey: Buffer | null = null;

export function encryptField(text: string): string {
  if (!text) return text;
  
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptField(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(":")) return encryptedText;
  
  try {
    const [ivHex, authTagHex, encryptedDataHex] = encryptedText.split(":");
    
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encryptedData = Buffer.from(encryptedDataHex, "hex");
    
    const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);
    
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption failed:", error);
    return "[DECRYPTION_FAILED]";
  }
}

export function hashField(text: string | null | undefined): string | null {
  if (!text) return null;

  return createHmac("sha256", getKey())
    .update(text.trim())
    .digest("hex");
}

function getKey() {
  if (cachedKey) {
    return cachedKey;
  }

  if (!ENCRYPTION_SECRET || !SALT) {
    throw new Error(
      "CRITICAL: INTERNAL_ENCRYPTION_SECRET and INTERNAL_ENCRYPTION_SALT must be defined. " +
      "Encryption cannot proceed with missing or default keys.",
    );
  }

  cachedKey = scryptSync(ENCRYPTION_SECRET, SALT, 32);
  return cachedKey;
}
