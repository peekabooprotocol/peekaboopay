import type {
	Address,
	Hex,
	PublicKey,
	AddressDerivation,
	StealthAddressResult,
	StealthAnnouncement,
} from "@pas/types";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";

/**
 * ECDH-based stealth address derivation (ERC-5564 pattern).
 *
 * Generates one-time stealth addresses so each transaction uses a fresh,
 * unlinkable address. The recipient can scan announcements using their
 * private key to discover payments addressed to them.
 */
export class AddressDerivationImpl implements AddressDerivation {
	/**
	 * Generate a stealth address for a recipient.
	 *
	 * 1. Generate ephemeral keypair
	 * 2. ECDH shared secret = ephemeralPriv × recipientPub
	 * 3. Hash shared secret → scalar offset
	 * 4. Stealth pubkey = recipientPubKey + offset × G
	 * 5. Stealth address = keccak256(stealthPubKey)[12:32]
	 * 6. ViewTag = first byte of hashed secret (fast scanning filter)
	 */
	generateStealthAddress(recipientPubKey: PublicKey): StealthAddressResult {
		// 1. Random ephemeral keypair
		const ephemeralPrivKey = secp256k1.utils.randomPrivateKey();
		const ephemeralPubKeyBytes = secp256k1.getPublicKey(ephemeralPrivKey, false);

		// 2. ECDH: shared secret x-coordinate
		const sharedSecretFull = secp256k1.getSharedSecret(
			ephemeralPrivKey,
			this.fromHex(recipientPubKey),
			false,
		);
		// Skip the 0x04 prefix byte, take x-coordinate (bytes 1-32)
		const sharedSecretX = sharedSecretFull.slice(1, 33);

		// 3. Hash the shared secret
		const hashedSecret = keccak_256(sharedSecretX);

		// 4. Compute stealth public key: recipientPoint + hash*G
		const recipientPoint = secp256k1.ProjectivePoint.fromHex(
			this.fromHex(recipientPubKey),
		);
		const hashScalar = this.bytesToBigInt(hashedSecret) % secp256k1.CURVE.n;
		const offsetPoint = secp256k1.ProjectivePoint.BASE.multiply(hashScalar);
		const stealthPubKeyPoint = recipientPoint.add(offsetPoint);
		const stealthPubKeyBytes = stealthPubKeyPoint.toRawBytes(false);

		// 5. Derive Ethereum address: keccak256(pubkey_without_prefix)[12:]
		const pubKeyHash = keccak_256(stealthPubKeyBytes.slice(1));
		const addressBytes = pubKeyHash.slice(12);

		// 6. View tag: first byte of hashed secret
		const viewTag = `0x${hashedSecret[0].toString(16).padStart(2, "0")}` as Hex;

		return {
			stealthAddress: this.toHex(addressBytes) as Address,
			ephemeralPublicKey: this.toHex(ephemeralPubKeyBytes) as PublicKey,
			viewTag,
		};
	}

	/**
	 * Scan announcements to find payments addressed to us.
	 *
	 * @param scanKey — the recipient's private key (used for ECDH)
	 * @param announcements — stealth address announcements to scan
	 * @returns addresses that belong to the scanKey holder
	 */
	scanForPayments(scanKey: Hex, announcements: StealthAnnouncement[]): Address[] {
		const scanKeyBytes = this.fromHex(scanKey);
		const scanPubKeyBytes = secp256k1.getPublicKey(scanKeyBytes, false);
		const scanPubKeyPoint = secp256k1.ProjectivePoint.fromHex(scanPubKeyBytes);

		const matches: Address[] = [];

		for (const announcement of announcements) {
			const ephPubBytes = this.fromHex(announcement.ephemeralPublicKey);

			// ECDH: shared secret = scanKey × ephemeralPub
			const sharedSecretFull = secp256k1.getSharedSecret(
				scanKeyBytes,
				ephPubBytes,
				false,
			);
			const sharedSecretX = sharedSecretFull.slice(1, 33);
			const hashedSecret = keccak_256(sharedSecretX);

			// Fast filter: check view tag
			const expectedViewTag =
				`0x${hashedSecret[0].toString(16).padStart(2, "0")}` as Hex;
			if (
				expectedViewTag.toLowerCase() !==
				announcement.viewTag.toLowerCase()
			) {
				continue;
			}

			// Full derivation: compute expected stealth address
			const hashScalar =
				this.bytesToBigInt(hashedSecret) % secp256k1.CURVE.n;
			const offsetPoint =
				secp256k1.ProjectivePoint.BASE.multiply(hashScalar);
			const expectedStealthPubKey = scanPubKeyPoint.add(offsetPoint);
			const expectedStealthPubKeyBytes =
				expectedStealthPubKey.toRawBytes(false);

			const pubKeyHash = keccak_256(expectedStealthPubKeyBytes.slice(1));
			const addressBytes = pubKeyHash.slice(12);
			const expectedAddress = this.toHex(addressBytes) as Address;

			// Compare with announcement
			if (
				expectedAddress.toLowerCase() ===
				announcement.stealthAddress.toLowerCase()
			) {
				matches.push(announcement.stealthAddress);
			}
		}

		return matches;
	}

	private toHex(bytes: Uint8Array): Hex {
		const hex = Array.from(bytes)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		return `0x${hex}` as Hex;
	}

	private fromHex(hex: Hex): Uint8Array {
		const str = hex.startsWith("0x") ? hex.slice(2) : hex;
		const bytes = new Uint8Array(str.length / 2);
		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = Number.parseInt(str.slice(i * 2, i * 2 + 2), 16);
		}
		return bytes;
	}

	private bytesToBigInt(bytes: Uint8Array): bigint {
		let result = 0n;
		for (const byte of bytes) {
			result = (result << 8n) + BigInt(byte);
		}
		return result;
	}
}
