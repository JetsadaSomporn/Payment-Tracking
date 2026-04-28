import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  randomUUID,
} from "node:crypto";

/**
 * Senior-level encryption utility for protecting sensitive fields in the database.
 * Uses AES-256-GCM for authenticated encryption.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard for GCM

const ENCRYPTION_SECRET = process.env.INTERNAL_ENCRYPTION_SECRET;
const SALT = process.env.INTERNAL_ENCRYPTION_SALT;

const HMAC_SIGNING_KEY = process.env.HMAC_SIGNING_KEY;

let cachedKey: Buffer | null = null;
let cachedHmacKey: Buffer | null = null;

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

function getHmacKey(): Buffer {
  if (cachedHmacKey) {
    return cachedHmacKey;
  }

  if (!HMAC_SIGNING_KEY) {
    throw new Error(
      "CRITICAL: HMAC_SIGNING_KEY must be defined for row-level tamper detection.",
    );
  }

  cachedHmacKey = scryptSync(HMAC_SIGNING_KEY, SALT ?? "spendly-row-sig", 32);
  return cachedHmacKey;
}

/**
 * Row-level fields that contribute to the integrity signature.
 * These are the columns that, if swapped or altered directly in the DB,
 * would indicate tampering.
 */
export type SignableRow = {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  fee: number;
  transaction_date: string;
  title: string;            // encrypted
  bank_name: string | null; // encrypted
  receiver_name: string | null; // encrypted
  reference_no: string | null;  // encrypted
};

/**
 * Compute an HMAC-SHA256 signature over the canonical row values.
 * Used before INSERT / UPDATE to store in `row_signature`.
 *
 * ⚠️  The HMAC key is SEPARATE from the encryption key by design.
 *     Compromising AES does not compromise tamper detection.
 *
 * ⚠️  Fields MUST be concatenated in this exact order with "|" separator.
 *     Any change to field order or delimiter breaks verification of existing rows.
 */
export function signRow(row: SignableRow): string {
  const canonical = [
    row.id,
    row.user_id,
    row.type,
    String(row.amount),
    String(row.fee),
    row.transaction_date,
    row.title,
    row.bank_name ?? "",
    row.receiver_name ?? "",
    row.reference_no ?? "",
  ].join("|");

  return createHmac("sha256", getHmacKey())
    .update(canonical)
    .digest("hex");
}

/**
 * Verify a row's signature against its values.
 *
 * Returns:
 *   - "valid"     → signature matches (or row has no signature = legacy)
 *   - "tampered"  → signature mismatch = data was altered outside the app
 */
export function verifyRowSignature(
  row: SignableRow & { row_signature: string | null },
): "valid" | "tampered" {
  // Legacy rows created before HMAC was enabled have no signature.
  // We treat them as valid to avoid breaking existing data.
  // New rows will always have a signature.
  if (!row.row_signature) {
    return "valid";
  }

  const expected = signRow(row);

  // Constant-time comparison to prevent timing attacks
  try {
    const actual = Buffer.from(row.row_signature, "hex");
    const expectedBuf = Buffer.from(expected, "hex");

    if (actual.length !== expectedBuf.length) {
      return "tampered";
    }

    // timingSafeEqual requires equal-length buffers
    if (!timingSafeEqual(actual, expectedBuf)) {
      return "tampered";
    }
  } catch {
    return "tampered";
  }

  return "valid";
}
