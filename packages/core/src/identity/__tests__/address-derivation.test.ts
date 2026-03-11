import { describe, it, expect, beforeEach } from "vitest";
import { AddressDerivationImpl } from "../address-derivation";
import { secp256k1 } from "@noble/curves/secp256k1";
import type { Address, Hex, PublicKey } from "@pas/types";
import type { StealthAnnouncement } from "@pas/types";

/** Helper: derive an uncompressed public key hex from a private key hex */
function pubKeyFromPriv(privHex: string): PublicKey {
	const privBytes = hexToBytes(privHex);
	const pubBytes = secp256k1.getPublicKey(privBytes, false);
	return `0x${bytesToHex(pubBytes)}` as PublicKey;
}

function hexToBytes(hex: string): Uint8Array {
	const str = hex.startsWith("0x") ? hex.slice(2) : hex;
	const bytes = new Uint8Array(str.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(str.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

// Fixed keypair for deterministic tests
const RECIPIENT_PRIV =
	"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const RECIPIENT_PUB = pubKeyFromPriv(RECIPIENT_PRIV.slice(2));

// Second keypair (attacker / unrelated party)
const OTHER_PRIV =
	"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

describe("AddressDerivationImpl", () => {
	let derivation: AddressDerivationImpl;

	beforeEach(() => {
		derivation = new AddressDerivationImpl();
	});

	describe("generateStealthAddress", () => {
		it("returns a valid result structure", () => {
			const result = derivation.generateStealthAddress(RECIPIENT_PUB);

			expect(result).toHaveProperty("stealthAddress");
			expect(result).toHaveProperty("ephemeralPublicKey");
			expect(result).toHaveProperty("viewTag");
		});

		it("stealthAddress is a valid 20-byte hex address", () => {
			const result = derivation.generateStealthAddress(RECIPIENT_PUB);

			expect(result.stealthAddress).toMatch(/^0x[0-9a-f]{40}$/);
		});

		it("ephemeralPublicKey is a valid 65-byte uncompressed public key", () => {
			const result = derivation.generateStealthAddress(RECIPIENT_PUB);

			// Uncompressed pubkey: 0x04 prefix + 64 bytes (128 hex chars)
			expect(result.ephemeralPublicKey).toMatch(/^0x04[0-9a-f]{128}$/);
		});

		it("viewTag is a single-byte hex value", () => {
			const result = derivation.generateStealthAddress(RECIPIENT_PUB);

			expect(result.viewTag).toMatch(/^0x[0-9a-f]{2}$/);
		});

		it("produces unique stealth addresses on each call", () => {
			const results = Array.from({ length: 10 }, () =>
				derivation.generateStealthAddress(RECIPIENT_PUB),
			);

			const addresses = results.map((r) => r.stealthAddress);
			const unique = new Set(addresses);
			expect(unique.size).toBe(10);
		});

		it("produces unique ephemeral public keys on each call", () => {
			const results = Array.from({ length: 5 }, () =>
				derivation.generateStealthAddress(RECIPIENT_PUB),
			);

			const pubKeys = results.map((r) => r.ephemeralPublicKey);
			const unique = new Set(pubKeys);
			expect(unique.size).toBe(5);
		});
	});

	describe("scanForPayments", () => {
		it("round-trip: recipient can discover their stealth address", () => {
			// Generate stealth address for the recipient
			const result = derivation.generateStealthAddress(RECIPIENT_PUB);

			const announcement: StealthAnnouncement = {
				ephemeralPublicKey: result.ephemeralPublicKey,
				stealthAddress: result.stealthAddress,
				viewTag: result.viewTag,
			};

			// Recipient scans using their private key
			const matches = derivation.scanForPayments(RECIPIENT_PRIV, [
				announcement,
			]);

			expect(matches).toHaveLength(1);
			expect(matches[0].toLowerCase()).toBe(
				result.stealthAddress.toLowerCase(),
			);
		});

		it("wrong private key does not match", () => {
			const result = derivation.generateStealthAddress(RECIPIENT_PUB);

			const announcement: StealthAnnouncement = {
				ephemeralPublicKey: result.ephemeralPublicKey,
				stealthAddress: result.stealthAddress,
				viewTag: result.viewTag,
			};

			// Different private key should not find the payment
			const matches = derivation.scanForPayments(OTHER_PRIV, [
				announcement,
			]);

			expect(matches).toHaveLength(0);
		});

		it("returns empty array for empty announcements", () => {
			const matches = derivation.scanForPayments(RECIPIENT_PRIV, []);
			expect(matches).toEqual([]);
		});

		it("filters multiple announcements correctly", () => {
			// Two stealth addresses for our recipient
			const ours1 = derivation.generateStealthAddress(RECIPIENT_PUB);
			const ours2 = derivation.generateStealthAddress(RECIPIENT_PUB);

			// One stealth address for a different recipient
			const otherPub = pubKeyFromPriv(OTHER_PRIV.slice(2));
			const theirs = derivation.generateStealthAddress(otherPub);

			const announcements: StealthAnnouncement[] = [
				{
					ephemeralPublicKey: ours1.ephemeralPublicKey,
					stealthAddress: ours1.stealthAddress,
					viewTag: ours1.viewTag,
				},
				{
					ephemeralPublicKey: theirs.ephemeralPublicKey,
					stealthAddress: theirs.stealthAddress,
					viewTag: theirs.viewTag,
				},
				{
					ephemeralPublicKey: ours2.ephemeralPublicKey,
					stealthAddress: ours2.stealthAddress,
					viewTag: ours2.viewTag,
				},
			];

			const matches = derivation.scanForPayments(
				RECIPIENT_PRIV,
				announcements,
			);

			expect(matches).toHaveLength(2);
			expect(matches.map((m) => m.toLowerCase())).toContain(
				ours1.stealthAddress.toLowerCase(),
			);
			expect(matches.map((m) => m.toLowerCase())).toContain(
				ours2.stealthAddress.toLowerCase(),
			);
		});

		it("rejects announcement with tampered viewTag", () => {
			const result = derivation.generateStealthAddress(RECIPIENT_PUB);

			// Flip the viewTag to something wrong
			const wrongTag =
				result.viewTag === ("0xff" as Hex)
					? ("0x00" as Hex)
					: ("0xff" as Hex);

			const announcement: StealthAnnouncement = {
				ephemeralPublicKey: result.ephemeralPublicKey,
				stealthAddress: result.stealthAddress,
				viewTag: wrongTag,
			};

			const matches = derivation.scanForPayments(RECIPIENT_PRIV, [
				announcement,
			]);

			// ViewTag mismatch causes fast rejection
			expect(matches).toHaveLength(0);
		});

		it("rejects announcement with tampered stealth address", () => {
			const result = derivation.generateStealthAddress(RECIPIENT_PUB);

			const fakeAddress =
				"0x0000000000000000000000000000000000000001" as Address;

			const announcement: StealthAnnouncement = {
				ephemeralPublicKey: result.ephemeralPublicKey,
				stealthAddress: fakeAddress,
				viewTag: result.viewTag,
			};

			const matches = derivation.scanForPayments(RECIPIENT_PRIV, [
				announcement,
			]);

			// Address won't match even if viewTag passes
			expect(matches).toHaveLength(0);
		});
	});

	describe("determinism", () => {
		it("same shared secret produces same stealth address derivation", () => {
			// This verifies the derivation math is consistent:
			// generate an address, then scan with the matching key
			// and confirm the scan re-derives the same address.
			// (We already test this in round-trip, but this checks 20 iterations)
			for (let i = 0; i < 20; i++) {
				const result = derivation.generateStealthAddress(RECIPIENT_PUB);

				const announcement: StealthAnnouncement = {
					ephemeralPublicKey: result.ephemeralPublicKey,
					stealthAddress: result.stealthAddress,
					viewTag: result.viewTag,
				};

				const matches = derivation.scanForPayments(RECIPIENT_PRIV, [
					announcement,
				]);
				expect(matches).toHaveLength(1);
			}
		});
	});
});
