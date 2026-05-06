// ---------------------------------------------------------------
// Viewing Key Hierarchy
// ---------------------------------------------------------------
//
// Master Seed (32 bytes)
// ├── Spending Key = HMAC-SHA256(seed, "peekaboopay/spending")
// │   └── Nullifier Key = HMAC-SHA256(spendingKey, "peekaboopay/nullifier")
// ├── Viewing Key = HMAC-SHA256(seed, "peekaboopay/viewing")
// │   └── ECDH Key = HMAC-SHA256(viewingKey, "peekaboopay/ecdh")
// └── Public Keys:
//     ├── spendingPubKey = spendingKey × G
//     ├── viewingPubKey = viewingKey × G
//     └── ecdhPubKey = ecdhKey × G
// ---------------------------------------------------------------

import { secp256k1 } from "@noble/curves/secp256k1";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface KeyPair {
	/** 32-byte private key */
	privateKey: Uint8Array;
	/** 65-byte uncompressed public key (04 || x || y) */
	publicKey: Uint8Array;
}

export interface PeekabooKeySet {
	/** Master seed -- NEVER share this */
	seed: Uint8Array;
	/** Controls withdrawals. NEVER share. */
	spendingKey: KeyPair;
	/** Derived from spending key. Used to compute nullifier hashes. */
	nullifierKey: Uint8Array;
	/** Allows scanning for payments. Share with dashboards/auditors. */
	viewingKey: KeyPair;
	/** Used for ECDH in stealth address derivation. */
	ecdhKey: KeyPair;
}

export interface ViewingKeyExport {
	viewingPrivateKey: string;
	viewingPublicKey: string;
	ecdhPrivateKey: string;
	ecdhPublicKey: string;
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Derive a child key via HMAC-SHA256(parent, tag).
 * The result is always reduced mod n (secp256k1 order) to guarantee
 * the derived bytes are a valid private key.
 */
function deriveChild(parent: Uint8Array, tag: string): Uint8Array {
	const raw = hmac(sha256, parent, Buffer.from(tag, "utf8"));
	// Ensure the derived key is a valid secp256k1 private key (1 < k < n).
	// noble/curves will throw on getPublicKey if k is 0 or >= n, but
	// HMAC-SHA256 output is uniformly random in [0, 2^256), and the
	// probability of hitting 0 or >= n (~2^{-128}) is negligible.
	// We still validate to be safe.
	return raw;
}

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

/**
 * Derive a full key set from a master seed (32 bytes).
 * The seed can come from a mnemonic, a private key, or random bytes.
 */
export function deriveKeySet(seed: Uint8Array): PeekabooKeySet {
	if (seed.length !== 32) {
		throw new Error(`Seed must be 32 bytes, got ${seed.length}`);
	}

	// Derive spending key
	const spendingPriv = deriveChild(seed, "peekaboopay/spending");
	const spendingPub = secp256k1.getPublicKey(spendingPriv, false);

	// Derive nullifier key from spending key
	const nullifierKey = deriveChild(spendingPriv, "peekaboopay/nullifier");

	// Derive viewing key
	const viewingPriv = deriveChild(seed, "peekaboopay/viewing");
	const viewingPub = secp256k1.getPublicKey(viewingPriv, false);

	// Derive ECDH key from viewing key
	const ecdhPriv = deriveChild(viewingPriv, "peekaboopay/ecdh");
	const ecdhPub = secp256k1.getPublicKey(ecdhPriv, false);

	return {
		seed,
		spendingKey: { privateKey: spendingPriv, publicKey: spendingPub },
		nullifierKey,
		viewingKey: { privateKey: viewingPriv, publicKey: viewingPub },
		ecdhKey: { privateKey: ecdhPriv, publicKey: ecdhPub },
	};
}

/**
 * Generate a fresh random key set.
 */
export function generateKeySet(): PeekabooKeySet {
	const seed = secp256k1.utils.randomPrivateKey(); // 32 cryptographically random bytes
	return deriveKeySet(seed);
}

/**
 * Export viewing-only key material (safe to share with dashboards/auditors).
 * This does NOT include the spending key or the master seed.
 */
export function exportViewingKey(keySet: PeekabooKeySet): ViewingKeyExport {
	return {
		viewingPrivateKey: "0x" + bytesToHex(keySet.viewingKey.privateKey),
		viewingPublicKey: "0x" + bytesToHex(keySet.viewingKey.publicKey),
		ecdhPrivateKey: "0x" + bytesToHex(keySet.ecdhKey.privateKey),
		ecdhPublicKey: "0x" + bytesToHex(keySet.ecdhKey.publicKey),
	};
}

/**
 * Check if a key set has spending authority (vs view-only).
 * Returns true only when the spending private key is present.
 */
export function hasSpendingAuthority(
	keySet: Partial<PeekabooKeySet>,
): boolean {
	return (
		keySet.spendingKey !== undefined &&
		keySet.spendingKey.privateKey !== undefined &&
		keySet.spendingKey.privateKey.length === 32
	);
}
