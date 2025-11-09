import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	scryptSync,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const _AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get or generate encryption key from environment
 * In production, this should be set via ENCRYPTION_KEY env var
 */
function getEncryptionKey(): Buffer {
	const keyFromEnv = process.env.ENCRYPTION_KEY;

	if (keyFromEnv) {
		// Derive a proper 32-byte key from the environment variable
		const salt = Buffer.from("chiron-encryption-salt"); // Static salt for key derivation
		return scryptSync(keyFromEnv, salt, KEY_LENGTH);
	}

	// For development, generate a consistent key (INSECURE - only for dev)
	console.warn(
		"⚠️  ENCRYPTION_KEY not set. Using development key (INSECURE for production!)",
	);
	const devSalt = Buffer.from("chiron-dev-salt");
	return scryptSync("dev-encryption-key-insecure", devSalt, KEY_LENGTH);
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns base64-encoded string: salt:iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
	try {
		const salt = randomBytes(SALT_LENGTH);
		const iv = randomBytes(IV_LENGTH);
		const key = getEncryptionKey();

		const cipher = createCipheriv(ALGORITHM, key, iv);
		let ciphertext = cipher.update(plaintext, "utf8", "base64");
		ciphertext += cipher.final("base64");

		const authTag = cipher.getAuthTag();

		// Combine salt, IV, auth tag, and ciphertext
		const combined = `${salt.toString("base64")}:${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext}`;
		return combined;
	} catch (error) {
		throw new Error(
			`Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Decrypt a ciphertext string encrypted with encrypt()
 * Expects format: salt:iv:authTag:ciphertext (base64-encoded)
 */
export function decrypt(ciphertext: string): string {
	try {
		const parts = ciphertext.split(":");
		if (parts.length !== 4) {
			throw new Error("Invalid ciphertext format");
		}

		const [_saltB64, ivB64, authTagB64, encryptedData] = parts;
		const iv = Buffer.from(ivB64, "base64");
		const authTag = Buffer.from(authTagB64, "base64");
		const key = getEncryptionKey();

		const decipher = createDecipheriv(ALGORITHM, key, iv);
		decipher.setAuthTag(authTag);

		let plaintext = decipher.update(encryptedData, "base64", "utf8");
		plaintext += decipher.final("utf8");

		return plaintext;
	} catch (error) {
		throw new Error(
			`Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Mask an API key to show only last 4 characters
 */
export function maskApiKey(key: string): string {
	if (key.length <= 4) return "****";
	return `${"*".repeat(key.length - 4)}${key.slice(-4)}`;
}
