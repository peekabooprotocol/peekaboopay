import { describe, it, expect } from "vitest";
import { secp256k1 } from "@noble/curves/secp256k1";
import {
	deriveKeySet,
	generateKeySet,
	exportViewingKey,
	hasSpendingAuthority,
} from "../keys.js";
import type { PeekabooKeySet } from "../keys.js";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** A fixed 32-byte seed for deterministic tests. */
const FIXED_SEED = new Uint8Array([
	0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c,
	0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
	0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
]);

/** A second fixed seed that differs from FIXED_SEED. */
const ALT_SEED = new Uint8Array([
	0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8, 0xf7, 0xf6, 0xf5, 0xf4,
	0xf3, 0xf2, 0xf1, 0xf0, 0xef, 0xee, 0xed, 0xec, 0xeb, 0xea, 0xe9, 0xe8,
	0xe7, 0xe6, 0xe5, 0xe4, 0xe3, 0xe2, 0xe1, 0xe0,
]);

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe("Key Hierarchy (keys.ts)", () => {
	describe("deriveKeySet", () => {
		it("produces deterministic output from the same seed", () => {
			const ks1 = deriveKeySet(FIXED_SEED);
			const ks2 = deriveKeySet(FIXED_SEED);

			expect(bytesToHex(ks1.spendingKey.privateKey)).toBe(
				bytesToHex(ks2.spendingKey.privateKey),
			);
			expect(bytesToHex(ks1.spendingKey.publicKey)).toBe(
				bytesToHex(ks2.spendingKey.publicKey),
			);
			expect(bytesToHex(ks1.nullifierKey)).toBe(
				bytesToHex(ks2.nullifierKey),
			);
			expect(bytesToHex(ks1.viewingKey.privateKey)).toBe(
				bytesToHex(ks2.viewingKey.privateKey),
			);
			expect(bytesToHex(ks1.viewingKey.publicKey)).toBe(
				bytesToHex(ks2.viewingKey.publicKey),
			);
			expect(bytesToHex(ks1.ecdhKey.privateKey)).toBe(
				bytesToHex(ks2.ecdhKey.privateKey),
			);
			expect(bytesToHex(ks1.ecdhKey.publicKey)).toBe(
				bytesToHex(ks2.ecdhKey.publicKey),
			);
		});

		it("produces different keys for different seeds", () => {
			const ks1 = deriveKeySet(FIXED_SEED);
			const ks2 = deriveKeySet(ALT_SEED);

			expect(bytesToHex(ks1.spendingKey.privateKey)).not.toBe(
				bytesToHex(ks2.spendingKey.privateKey),
			);
			expect(bytesToHex(ks1.viewingKey.privateKey)).not.toBe(
				bytesToHex(ks2.viewingKey.privateKey),
			);
			expect(bytesToHex(ks1.ecdhKey.privateKey)).not.toBe(
				bytesToHex(ks2.ecdhKey.privateKey),
			);
			expect(bytesToHex(ks1.nullifierKey)).not.toBe(
				bytesToHex(ks2.nullifierKey),
			);
		});

		it("spending, viewing, and ECDH keys are all distinct", () => {
			const ks = deriveKeySet(FIXED_SEED);
			const spendHex = bytesToHex(ks.spendingKey.privateKey);
			const viewHex = bytesToHex(ks.viewingKey.privateKey);
			const ecdhHex = bytesToHex(ks.ecdhKey.privateKey);
			const nullHex = bytesToHex(ks.nullifierKey);

			// All four derived private keys must differ from each other
			const all = [spendHex, viewHex, ecdhHex, nullHex];
			expect(new Set(all).size).toBe(4);
		});

		it("throws for invalid seed length", () => {
			expect(() => deriveKeySet(new Uint8Array(16))).toThrow(
				"Seed must be 32 bytes",
			);
			expect(() => deriveKeySet(new Uint8Array(0))).toThrow(
				"Seed must be 32 bytes",
			);
			expect(() => deriveKeySet(new Uint8Array(64))).toThrow(
				"Seed must be 32 bytes",
			);
		});

		it("preserves the original seed in the returned key set", () => {
			const ks = deriveKeySet(FIXED_SEED);
			expect(bytesToHex(ks.seed)).toBe(bytesToHex(FIXED_SEED));
		});
	});

	describe("generateKeySet", () => {
		it("returns a complete key set with valid structure", () => {
			const ks = generateKeySet();

			// Seed
			expect(ks.seed).toBeInstanceOf(Uint8Array);
			expect(ks.seed.length).toBe(32);

			// Spending key
			expect(ks.spendingKey.privateKey).toBeInstanceOf(Uint8Array);
			expect(ks.spendingKey.privateKey.length).toBe(32);
			expect(ks.spendingKey.publicKey).toBeInstanceOf(Uint8Array);
			expect(ks.spendingKey.publicKey.length).toBe(65);

			// Nullifier key
			expect(ks.nullifierKey).toBeInstanceOf(Uint8Array);
			expect(ks.nullifierKey.length).toBe(32);

			// Viewing key
			expect(ks.viewingKey.privateKey).toBeInstanceOf(Uint8Array);
			expect(ks.viewingKey.privateKey.length).toBe(32);
			expect(ks.viewingKey.publicKey).toBeInstanceOf(Uint8Array);
			expect(ks.viewingKey.publicKey.length).toBe(65);

			// ECDH key
			expect(ks.ecdhKey.privateKey).toBeInstanceOf(Uint8Array);
			expect(ks.ecdhKey.privateKey.length).toBe(32);
			expect(ks.ecdhKey.publicKey).toBeInstanceOf(Uint8Array);
			expect(ks.ecdhKey.publicKey.length).toBe(65);
		});

		it("generates unique key sets on each call", () => {
			const ks1 = generateKeySet();
			const ks2 = generateKeySet();

			expect(bytesToHex(ks1.seed)).not.toBe(bytesToHex(ks2.seed));
			expect(bytesToHex(ks1.spendingKey.privateKey)).not.toBe(
				bytesToHex(ks2.spendingKey.privateKey),
			);
		});
	});

	describe("exportViewingKey", () => {
		it("returns hex-encoded viewing and ECDH keys", () => {
			const ks = deriveKeySet(FIXED_SEED);
			const exported = exportViewingKey(ks);

			// All fields are 0x-prefixed hex strings
			expect(exported.viewingPrivateKey).toMatch(/^0x[0-9a-f]{64}$/);
			expect(exported.viewingPublicKey).toMatch(/^0x[0-9a-f]{130}$/);
			expect(exported.ecdhPrivateKey).toMatch(/^0x[0-9a-f]{64}$/);
			expect(exported.ecdhPublicKey).toMatch(/^0x[0-9a-f]{130}$/);
		});

		it("does NOT contain spending key material", () => {
			const ks = deriveKeySet(FIXED_SEED);
			const exported = exportViewingKey(ks);
			const spendingHex = bytesToHex(ks.spendingKey.privateKey);
			const seedHex = bytesToHex(ks.seed);
			const nullifierHex = bytesToHex(ks.nullifierKey);

			// The exported object should not contain the spending key, seed, or nullifier key
			const exportedStr = JSON.stringify(exported);
			expect(exportedStr).not.toContain(spendingHex);
			expect(exportedStr).not.toContain(seedHex);
			expect(exportedStr).not.toContain(nullifierHex);
		});

		it("matches the underlying key bytes", () => {
			const ks = deriveKeySet(FIXED_SEED);
			const exported = exportViewingKey(ks);

			expect(exported.viewingPrivateKey).toBe(
				"0x" + bytesToHex(ks.viewingKey.privateKey),
			);
			expect(exported.viewingPublicKey).toBe(
				"0x" + bytesToHex(ks.viewingKey.publicKey),
			);
			expect(exported.ecdhPrivateKey).toBe(
				"0x" + bytesToHex(ks.ecdhKey.privateKey),
			);
			expect(exported.ecdhPublicKey).toBe(
				"0x" + bytesToHex(ks.ecdhKey.publicKey),
			);
		});
	});

	describe("hasSpendingAuthority", () => {
		it("returns true for a full key set", () => {
			const ks = deriveKeySet(FIXED_SEED);
			expect(hasSpendingAuthority(ks)).toBe(true);
		});

		it("returns false for an empty object", () => {
			expect(hasSpendingAuthority({})).toBe(false);
		});

		it("returns false when spendingKey is undefined", () => {
			const ks = deriveKeySet(FIXED_SEED);
			const viewOnly: Partial<PeekabooKeySet> = {
				viewingKey: ks.viewingKey,
				ecdhKey: ks.ecdhKey,
			};
			expect(hasSpendingAuthority(viewOnly)).toBe(false);
		});

		it("returns false when spendingKey.privateKey is missing", () => {
			const ks = deriveKeySet(FIXED_SEED);
			const partial: Partial<PeekabooKeySet> = {
				spendingKey: {
					privateKey: undefined as unknown as Uint8Array,
					publicKey: ks.spendingKey.publicKey,
				},
			};
			expect(hasSpendingAuthority(partial)).toBe(false);
		});

		it("returns false when spendingKey.privateKey has wrong length", () => {
			const partial: Partial<PeekabooKeySet> = {
				spendingKey: {
					privateKey: new Uint8Array(16), // wrong length
					publicKey: new Uint8Array(65),
				},
			};
			expect(hasSpendingAuthority(partial)).toBe(false);
		});
	});

	describe("ECDH compatibility", () => {
		it("two parties can derive a shared secret using ECDH keys", () => {
			const alice = deriveKeySet(FIXED_SEED);
			const bob = deriveKeySet(ALT_SEED);

			// Alice computes shared secret using her ECDH private key + Bob's ECDH public key
			const sharedAlice = secp256k1.getSharedSecret(
				alice.ecdhKey.privateKey,
				bob.ecdhKey.publicKey,
			);

			// Bob computes shared secret using his ECDH private key + Alice's ECDH public key
			const sharedBob = secp256k1.getSharedSecret(
				bob.ecdhKey.privateKey,
				alice.ecdhKey.publicKey,
			);

			// Both sides must arrive at the same shared point
			expect(bytesToHex(sharedAlice)).toBe(bytesToHex(sharedBob));
		});

		it("shared secret differs when a third party uses a different key", () => {
			const alice = deriveKeySet(FIXED_SEED);
			const bob = deriveKeySet(ALT_SEED);
			const eve = generateKeySet();

			const sharedAliceBob = secp256k1.getSharedSecret(
				alice.ecdhKey.privateKey,
				bob.ecdhKey.publicKey,
			);
			const sharedAliceEve = secp256k1.getSharedSecret(
				alice.ecdhKey.privateKey,
				eve.ecdhKey.publicKey,
			);

			expect(bytesToHex(sharedAliceBob)).not.toBe(
				bytesToHex(sharedAliceEve),
			);
		});
	});

	describe("secp256k1 validity", () => {
		it("all public keys are valid secp256k1 curve points", () => {
			const ks = deriveKeySet(FIXED_SEED);

			// secp256k1.ProjectivePoint.fromHex will throw if the point
			// is not on the curve or is the point at infinity.
			expect(() =>
				secp256k1.ProjectivePoint.fromHex(ks.spendingKey.publicKey),
			).not.toThrow();
			expect(() =>
				secp256k1.ProjectivePoint.fromHex(ks.viewingKey.publicKey),
			).not.toThrow();
			expect(() =>
				secp256k1.ProjectivePoint.fromHex(ks.ecdhKey.publicKey),
			).not.toThrow();
		});

		it("all uncompressed public keys start with 0x04", () => {
			const ks = deriveKeySet(FIXED_SEED);

			expect(ks.spendingKey.publicKey[0]).toBe(0x04);
			expect(ks.viewingKey.publicKey[0]).toBe(0x04);
			expect(ks.ecdhKey.publicKey[0]).toBe(0x04);
		});

		it("public keys correspond to their private keys", () => {
			const ks = deriveKeySet(FIXED_SEED);

			// Re-derive public keys from the private keys and compare
			const spendPub = secp256k1.getPublicKey(
				ks.spendingKey.privateKey,
				false,
			);
			const viewPub = secp256k1.getPublicKey(
				ks.viewingKey.privateKey,
				false,
			);
			const ecdhPub = secp256k1.getPublicKey(
				ks.ecdhKey.privateKey,
				false,
			);

			expect(bytesToHex(ks.spendingKey.publicKey)).toBe(
				bytesToHex(spendPub),
			);
			expect(bytesToHex(ks.viewingKey.publicKey)).toBe(
				bytesToHex(viewPub),
			);
			expect(bytesToHex(ks.ecdhKey.publicKey)).toBe(
				bytesToHex(ecdhPub),
			);
		});

		it("randomly generated key sets also have valid curve points", () => {
			// Test with 5 random key sets
			for (let i = 0; i < 5; i++) {
				const ks = generateKeySet();

				expect(() =>
					secp256k1.ProjectivePoint.fromHex(ks.spendingKey.publicKey),
				).not.toThrow();
				expect(() =>
					secp256k1.ProjectivePoint.fromHex(ks.viewingKey.publicKey),
				).not.toThrow();
				expect(() =>
					secp256k1.ProjectivePoint.fromHex(ks.ecdhKey.publicKey),
				).not.toThrow();

				// Verify pub/priv correspondence
				expect(
					bytesToHex(
						secp256k1.getPublicKey(ks.spendingKey.privateKey, false),
					),
				).toBe(bytesToHex(ks.spendingKey.publicKey));
			}
		});
	});
});
