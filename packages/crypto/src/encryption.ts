import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";

// ---------------------------------------------------------------
// Note Encryption (ECDH + AES-256-GCM)
// ---------------------------------------------------------------

/**
 * Encrypt a deposit note for a recipient's viewing key.
 *
 * Uses an ephemeral ECDH key exchange to derive a shared secret, then
 * AES-256-GCM for authenticated encryption.  The ephemeral public key is
 * included alongside the ciphertext so the recipient can reconstruct the
 * shared secret with their viewing private key.
 *
 * Plaintext layout: nullifier (32 bytes) + secret (32 bytes) + amount (32 bytes)
 * Payload layout:   iv (12 bytes) + authTag (16 bytes) + ciphertext (96 bytes)
 */
export function encryptNote(
	nullifier: bigint,
	secret: bigint,
	amount: bigint,
	recipientViewingPubKey: Uint8Array, // uncompressed secp256k1 public key (65 bytes)
): EncryptedNote {
	// 1. Generate ephemeral keypair
	const ephemeralPrivKey = secp256k1.utils.randomPrivateKey();
	const ephemeralPubKey = secp256k1.getPublicKey(ephemeralPrivKey, false); // uncompressed

	// 2. ECDH shared secret — use only x-coordinate, hashed with keccak256
	const sharedPoint = secp256k1.getSharedSecret(
		ephemeralPrivKey,
		recipientViewingPubKey,
	);
	const sharedSecretX = sharedPoint.subarray(1, 33); // x-coordinate only
	const cipherKey = keccak_256(sharedSecretX); // 32 bytes = AES-256 key

	// 3. Serialize plaintext: nullifier (32 bytes) + secret (32 bytes) + amount (32 bytes)
	const plaintext = Buffer.alloc(96);
	const nullBuf = Buffer.from(
		nullifier.toString(16).padStart(64, "0"),
		"hex",
	);
	const secBuf = Buffer.from(secret.toString(16).padStart(64, "0"), "hex");
	const amtBuf = Buffer.from(amount.toString(16).padStart(64, "0"), "hex");
	nullBuf.copy(plaintext, 0);
	secBuf.copy(plaintext, 32);
	amtBuf.copy(plaintext, 64);

	// 4. AES-256-GCM encrypt
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", cipherKey, iv);
	const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const authTag = cipher.getAuthTag();

	// 5. Pack: iv (12) + authTag (16) + ciphertext (96)
	const encryptedPayload = Buffer.concat([iv, authTag, encrypted]);

	return {
		ephemeralPublicKey:
			"0x" + Buffer.from(ephemeralPubKey).toString("hex"),
		encryptedPayload: "0x" + encryptedPayload.toString("hex"),
	};
}

/**
 * Decrypt a deposit note using the recipient's viewing private key.
 *
 * Reconstructs the ECDH shared secret from the ephemeral public key and the
 * recipient's private key, then decrypts the AES-256-GCM ciphertext.
 *
 * Throws if the viewing key doesn't match (GCM auth tag check fails).
 */
export function decryptNote(
	ephemeralPublicKeyHex: string,
	encryptedPayloadHex: string,
	viewingPrivateKey: Uint8Array, // 32-byte secp256k1 private key
): DecryptedNote {
	// 1. Parse inputs
	const ephemeralPubKey = Uint8Array.from(
		Buffer.from(ephemeralPublicKeyHex.replace("0x", ""), "hex"),
	);
	const payload = Buffer.from(
		encryptedPayloadHex.replace("0x", ""),
		"hex",
	);

	// 2. ECDH shared secret (same derivation as sender)
	const sharedPoint = secp256k1.getSharedSecret(
		viewingPrivateKey,
		ephemeralPubKey,
	);
	const sharedSecretX = sharedPoint.subarray(1, 33);
	const cipherKey = keccak_256(sharedSecretX);

	// 3. Unpack: iv (12) + authTag (16) + ciphertext (96)
	const iv = payload.subarray(0, 12);
	const authTag = payload.subarray(12, 28);
	const ciphertext = payload.subarray(28);

	// 4. AES-256-GCM decrypt
	const decipher = createDecipheriv(
		"aes-256-gcm",
		Buffer.from(cipherKey),
		iv,
	);
	decipher.setAuthTag(authTag);
	const plaintext = Buffer.concat([
		decipher.update(ciphertext),
		decipher.final(),
	]);

	// 5. Parse plaintext back to bigints
	const nullifier = BigInt(
		"0x" + plaintext.subarray(0, 32).toString("hex"),
	);
	const secret = BigInt(
		"0x" + plaintext.subarray(32, 64).toString("hex"),
	);
	const amount = BigInt(
		"0x" + plaintext.subarray(64, 96).toString("hex"),
	);

	return { nullifier, secret, amount };
}

/**
 * Try to decrypt a note — returns null if the viewing key doesn't match.
 *
 * This is the primary function used for scanning on-chain encrypted note
 * events: iterate over all emitted notes, call tryDecryptNote with the
 * user's viewing key, and collect the ones that succeed.
 */
export function tryDecryptNote(
	ephemeralPublicKeyHex: string,
	encryptedPayloadHex: string,
	viewingPrivateKey: Uint8Array,
): DecryptedNote | null {
	try {
		return decryptNote(
			ephemeralPublicKeyHex,
			encryptedPayloadHex,
			viewingPrivateKey,
		);
	} catch {
		return null; // Decryption failed — note not for this viewer
	}
}

// ---------------------------------------------------------------
// Viewing Key Helpers
// ---------------------------------------------------------------

/**
 * Derive a viewing public key from a viewing private key.
 * The public key is uncompressed (65 bytes, 0x04 prefix).
 */
export function deriveViewingPublicKey(
	viewingPrivateKey: Uint8Array,
): Uint8Array {
	return secp256k1.getPublicKey(viewingPrivateKey, false);
}

/**
 * Generate a fresh random viewing keypair.
 */
export function generateViewingKeyPair(): {
	privateKey: Uint8Array;
	publicKey: Uint8Array;
} {
	const privateKey = secp256k1.utils.randomPrivateKey();
	const publicKey = secp256k1.getPublicKey(privateKey, false);
	return { privateKey, publicKey };
}

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface EncryptedNote {
	/** 0x-prefixed hex, 65 bytes uncompressed secp256k1 public key */
	ephemeralPublicKey: string;
	/** 0x-prefixed hex, 124 bytes (12 iv + 16 tag + 96 ciphertext) */
	encryptedPayload: string;
}

export interface DecryptedNote {
	nullifier: bigint;
	secret: bigint;
	amount: bigint;
}
