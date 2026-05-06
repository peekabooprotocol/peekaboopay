import { describe, it, expect } from "vitest";
import { secp256k1 } from "@noble/curves/secp256k1";
import {
	encryptNote,
	decryptNote,
	tryDecryptNote,
	deriveViewingPublicKey,
	generateViewingKeyPair,
} from "../encryption.js";
import type { EncryptedNote } from "../encryption.js";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function makeKeyPair() {
	const priv = secp256k1.utils.randomPrivateKey();
	const pub = secp256k1.getPublicKey(priv, false); // uncompressed
	return { priv, pub };
}

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe("Note Encryption (ECDH + AES-256-GCM)", () => {
	// -----------------------------------------------------------
	// Round-trip: encrypt with pub key, decrypt with priv key
	// -----------------------------------------------------------
	describe("round-trip encrypt / decrypt", () => {
		it("should encrypt and decrypt a note correctly", () => {
			const { priv, pub } = makeKeyPair();

			const nullifier = 123456789012345678901234567890n;
			const secret = 987654321098765432109876543210n;
			const amount = 1000000000000000000n; // 1 ETH in wei

			const encrypted = encryptNote(nullifier, secret, amount, pub);
			const decrypted = decryptNote(
				encrypted.ephemeralPublicKey,
				encrypted.encryptedPayload,
				priv,
			);

			expect(decrypted.nullifier).toBe(nullifier);
			expect(decrypted.secret).toBe(secret);
			expect(decrypted.amount).toBe(amount);
		});

		it("should handle zero values", () => {
			const { priv, pub } = makeKeyPair();

			const encrypted = encryptNote(0n, 0n, 0n, pub);
			const decrypted = decryptNote(
				encrypted.ephemeralPublicKey,
				encrypted.encryptedPayload,
				priv,
			);

			expect(decrypted.nullifier).toBe(0n);
			expect(decrypted.secret).toBe(0n);
			expect(decrypted.amount).toBe(0n);
		});

		it("should handle max 256-bit values", () => {
			const { priv, pub } = makeKeyPair();
			const maxU256 = (1n << 256n) - 1n;

			const encrypted = encryptNote(maxU256, maxU256, maxU256, pub);
			const decrypted = decryptNote(
				encrypted.ephemeralPublicKey,
				encrypted.encryptedPayload,
				priv,
			);

			expect(decrypted.nullifier).toBe(maxU256);
			expect(decrypted.secret).toBe(maxU256);
			expect(decrypted.amount).toBe(maxU256);
		});

		it("should handle typical field element sized values", () => {
			const { priv, pub } = makeKeyPair();

			// Typical BN128 field elements (< 2^254)
			const nullifier =
				0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefn;
			const secret =
				0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321n;
			const amount = 0xde0b6b3a7640000n; // 1 ETH

			const encrypted = encryptNote(nullifier, secret, amount, pub);
			const decrypted = decryptNote(
				encrypted.ephemeralPublicKey,
				encrypted.encryptedPayload,
				priv,
			);

			expect(decrypted.nullifier).toBe(nullifier);
			expect(decrypted.secret).toBe(secret);
			expect(decrypted.amount).toBe(amount);
		});
	});

	// -----------------------------------------------------------
	// Wrong key: decryption fails gracefully
	// -----------------------------------------------------------
	describe("wrong key rejection", () => {
		it("should return null via tryDecryptNote with wrong private key", () => {
			const sender = makeKeyPair();
			const wrongKey = makeKeyPair();

			const encrypted = encryptNote(
				42n,
				99n,
				1000n,
				sender.pub,
			);

			const result = tryDecryptNote(
				encrypted.ephemeralPublicKey,
				encrypted.encryptedPayload,
				wrongKey.priv, // wrong key
			);

			expect(result).toBeNull();
		});

		it("should throw via decryptNote with wrong private key", () => {
			const sender = makeKeyPair();
			const wrongKey = makeKeyPair();

			const encrypted = encryptNote(
				42n,
				99n,
				1000n,
				sender.pub,
			);

			expect(() =>
				decryptNote(
					encrypted.ephemeralPublicKey,
					encrypted.encryptedPayload,
					wrongKey.priv,
				),
			).toThrow();
		});
	});

	// -----------------------------------------------------------
	// Multiple notes: each decrypts independently
	// -----------------------------------------------------------
	describe("multiple independent notes", () => {
		it("should encrypt/decrypt multiple notes for the same recipient", () => {
			const { priv, pub } = makeKeyPair();

			const notes = [
				{ nullifier: 1n, secret: 10n, amount: 100n },
				{ nullifier: 2n, secret: 20n, amount: 200n },
				{ nullifier: 3n, secret: 30n, amount: 300n },
			];

			const encryptedNotes = notes.map((n) =>
				encryptNote(n.nullifier, n.secret, n.amount, pub),
			);

			for (let i = 0; i < notes.length; i++) {
				const decrypted = decryptNote(
					encryptedNotes[i].ephemeralPublicKey,
					encryptedNotes[i].encryptedPayload,
					priv,
				);
				expect(decrypted.nullifier).toBe(notes[i].nullifier);
				expect(decrypted.secret).toBe(notes[i].secret);
				expect(decrypted.amount).toBe(notes[i].amount);
			}
		});

		it("should encrypt notes for different recipients", () => {
			const alice = makeKeyPair();
			const bob = makeKeyPair();

			const aliceNote = encryptNote(1n, 2n, 3n, alice.pub);
			const bobNote = encryptNote(4n, 5n, 6n, bob.pub);

			// Alice can decrypt her note
			const aliceDecrypted = decryptNote(
				aliceNote.ephemeralPublicKey,
				aliceNote.encryptedPayload,
				alice.priv,
			);
			expect(aliceDecrypted.nullifier).toBe(1n);
			expect(aliceDecrypted.amount).toBe(3n);

			// Bob can decrypt his note
			const bobDecrypted = decryptNote(
				bobNote.ephemeralPublicKey,
				bobNote.encryptedPayload,
				bob.priv,
			);
			expect(bobDecrypted.nullifier).toBe(4n);
			expect(bobDecrypted.amount).toBe(6n);

			// Alice cannot decrypt Bob's note
			expect(
				tryDecryptNote(
					bobNote.ephemeralPublicKey,
					bobNote.encryptedPayload,
					alice.priv,
				),
			).toBeNull();

			// Bob cannot decrypt Alice's note
			expect(
				tryDecryptNote(
					aliceNote.ephemeralPublicKey,
					aliceNote.encryptedPayload,
					bob.priv,
				),
			).toBeNull();
		});
	});

	// -----------------------------------------------------------
	// Non-deterministic: same inputs produce different ciphertexts
	// -----------------------------------------------------------
	describe("ciphertext non-determinism", () => {
		it("should produce different ciphertexts for the same plaintext", () => {
			const { pub } = makeKeyPair();

			const nullifier = 42n;
			const secret = 99n;
			const amount = 1000n;

			const enc1 = encryptNote(nullifier, secret, amount, pub);
			const enc2 = encryptNote(nullifier, secret, amount, pub);

			// Different ephemeral keys each time
			expect(enc1.ephemeralPublicKey).not.toBe(enc2.ephemeralPublicKey);

			// Different ciphertexts (different ephemeral key => different shared secret => different key + IV)
			expect(enc1.encryptedPayload).not.toBe(enc2.encryptedPayload);
		});
	});

	// -----------------------------------------------------------
	// Payload format validation
	// -----------------------------------------------------------
	describe("payload format", () => {
		it("should produce correctly sized outputs", () => {
			const { pub } = makeKeyPair();

			const encrypted = encryptNote(1n, 2n, 3n, pub);

			// ephemeralPublicKey: 0x + 65 bytes * 2 hex chars = 0x + 130 hex chars
			expect(encrypted.ephemeralPublicKey).toMatch(/^0x[0-9a-f]{130}$/);
			// Starts with 04 (uncompressed point marker)
			expect(encrypted.ephemeralPublicKey.slice(2, 4)).toBe("04");

			// encryptedPayload: 0x + (12 + 16 + 96) bytes * 2 hex chars = 0x + 248 hex chars
			expect(encrypted.encryptedPayload).toMatch(/^0x[0-9a-f]{248}$/);
		});
	});

	// -----------------------------------------------------------
	// Viewing key helpers
	// -----------------------------------------------------------
	describe("viewing key helpers", () => {
		it("deriveViewingPublicKey should match getPublicKey", () => {
			const priv = secp256k1.utils.randomPrivateKey();
			const expected = secp256k1.getPublicKey(priv, false);
			const derived = deriveViewingPublicKey(priv);

			expect(Buffer.from(derived).toString("hex")).toBe(
				Buffer.from(expected).toString("hex"),
			);
		});

		it("generateViewingKeyPair should produce a valid keypair", () => {
			const { privateKey, publicKey } = generateViewingKeyPair();

			// Private key is 32 bytes
			expect(privateKey.length).toBe(32);

			// Public key is 65 bytes (uncompressed)
			expect(publicKey.length).toBe(65);
			expect(publicKey[0]).toBe(0x04);

			// Can encrypt with pub and decrypt with priv
			const encrypted = encryptNote(7n, 8n, 9n, publicKey);
			const decrypted = decryptNote(
				encrypted.ephemeralPublicKey,
				encrypted.encryptedPayload,
				privateKey,
			);
			expect(decrypted.nullifier).toBe(7n);
			expect(decrypted.secret).toBe(8n);
			expect(decrypted.amount).toBe(9n);
		});
	});

	// -----------------------------------------------------------
	// tryDecryptNote scanning simulation
	// -----------------------------------------------------------
	describe("scanning simulation", () => {
		it("should find own notes among many encrypted notes", () => {
			const scanner = makeKeyPair();
			const others = [makeKeyPair(), makeKeyPair(), makeKeyPair()];

			// Simulate 10 on-chain notes, only 2 are for the scanner
			const onChainNotes: Array<{
				encrypted: EncryptedNote;
				expectedAmount: bigint | null;
			}> = [];

			// Note for scanner
			onChainNotes.push({
				encrypted: encryptNote(100n, 200n, 500n, scanner.pub),
				expectedAmount: 500n,
			});

			// Notes for others
			for (const other of others) {
				onChainNotes.push({
					encrypted: encryptNote(
						BigInt(Math.floor(Math.random() * 1e18)),
						BigInt(Math.floor(Math.random() * 1e18)),
						BigInt(Math.floor(Math.random() * 1e18)),
						other.pub,
					),
					expectedAmount: null,
				});
			}

			// Another note for scanner
			onChainNotes.push({
				encrypted: encryptNote(300n, 400n, 750n, scanner.pub),
				expectedAmount: 750n,
			});

			// Scan all notes
			const found = onChainNotes
				.map((n) =>
					tryDecryptNote(
						n.encrypted.ephemeralPublicKey,
						n.encrypted.encryptedPayload,
						scanner.priv,
					),
				)
				.filter((n) => n !== null);

			expect(found).toHaveLength(2);
			expect(found[0]!.amount).toBe(500n);
			expect(found[1]!.amount).toBe(750n);
		});
	});
});
