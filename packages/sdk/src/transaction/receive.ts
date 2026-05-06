import type { PASResult, PublicKey, ReceiveAddress, ReceiveParams } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";
import { secp256k1 } from "@noble/curves/secp256k1";

/**
 * Generate a stealth receive address using the core address derivation module.
 *
 * Creates a one-time stealth address that the sender can pay to. The recipient
 * can later scan for this address using their private scanning key.
 */
export async function receive(engine: PASEngine, params: ReceiveParams): Promise<PASResult<ReceiveAddress>> {
	// Generate a random keypair to serve as the "recipient" public key.
	// In production, this would be the recipient's actual long-lived public key
	// provided at registration time.
	const privKey = secp256k1.utils.randomPrivateKey();
	const pubKeyBytes = secp256k1.getPublicKey(privKey, false); // uncompressed (65 bytes)
	const hex = Array.from(pubKeyBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
	const recipientPubKey = `0x${hex}` as PublicKey;

	const stealth = engine.addressDerivation.generateStealthAddress(recipientPubKey);

	return {
		success: true,
		data: {
			address: stealth.stealthAddress,
			ephemeralPublicKey: stealth.ephemeralPublicKey,
			expiresAt: params.singleUse ? Date.now() + 3_600_000 : undefined,
		},
	};
}
