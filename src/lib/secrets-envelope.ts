import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ENVELOPE_ALGO = "aes-256-gcm";
const ENVELOPE_VERSION = "aes-256-gcm+envelope-v1";
const IV_LENGTH_BYTES = 12;

interface EncodedCipherPayload {
  iv: string;
  tag: string;
  data: string;
}

function deriveKey(material: string): Buffer {
  return createHash("sha256").update(material).digest();
}

function encodeCipherPayload(payload: EncodedCipherPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function decodeCipherPayload(encoded: string): EncodedCipherPayload {
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const parsed = JSON.parse(decoded) as Partial<EncodedCipherPayload>;
  if (
    typeof parsed.iv !== "string" ||
    typeof parsed.tag !== "string" ||
    typeof parsed.data !== "string"
  ) {
    throw new Error("Invalid encrypted payload envelope");
  }

  return {
    iv: parsed.iv,
    tag: parsed.tag,
    data: parsed.data
  };
}

function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ENVELOPE_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return encodeCipherPayload({
    iv: iv.toString("base64"),
    tag: authTag.toString("base64"),
    data: encrypted.toString("base64")
  });
}

function decryptWithKey(encodedPayload: string, key: Buffer): string {
  const payload = decodeCipherPayload(encodedPayload);
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.tag, "base64");
  const encrypted = Buffer.from(payload.data, "base64");

  const decipher = createDecipheriv(ENVELOPE_ALGO, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export interface EncryptedProjectSecret {
  ciphertext: string;
  dek_encrypted: string;
  dek_kms_key_id: string;
  algo: string;
}

export function encryptProjectSecretValue(
  value: string,
  masterKeyMaterial: string,
  keyId = "local:SECRETS_MASTER_KEY"
): EncryptedProjectSecret {
  const masterKey = deriveKey(masterKeyMaterial);
  const dek = randomBytes(32);

  const ciphertext = encryptWithKey(value, dek);
  const dek_encrypted = encryptWithKey(dek.toString("base64"), masterKey);

  return {
    ciphertext,
    dek_encrypted,
    dek_kms_key_id: keyId,
    algo: ENVELOPE_VERSION
  };
}

export function decryptProjectSecretValue(
  encrypted: Pick<EncryptedProjectSecret, "ciphertext" | "dek_encrypted">,
  masterKeyMaterial: string
): string {
  const masterKey = deriveKey(masterKeyMaterial);
  const dekBase64 = decryptWithKey(encrypted.dek_encrypted, masterKey);
  const dek = Buffer.from(dekBase64, "base64");
  return decryptWithKey(encrypted.ciphertext, dek);
}

export function buildSecretMaskedPreview(rawValue: string): string {
  const normalized = rawValue.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "****";
  }

  if (normalized.length <= 4) {
    return `${normalized[0] ?? "*"}***`;
  }

  const start = normalized.slice(0, 2);
  const end = normalized.slice(-2);
  return `${start}${"*".repeat(Math.max(4, Math.min(12, normalized.length - 4)))}${end}`;
}
