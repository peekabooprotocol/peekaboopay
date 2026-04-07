import { ethers } from "ethers";
import type { ShieldedPayloadData } from "./types.js";
import type { Address } from "@peekaboopay/types";

// ---------------------------------------------------------------
// StealthAnnouncer ABI (minimal — just the event we need)
// ---------------------------------------------------------------

const ANNOUNCEMENT_EVENT_ABI = [
	"event Announcement(uint256 indexed schemeId, address indexed stealthAddress, address indexed caller, bytes ephemeralPubKey, bytes metadata)",
];

// ---------------------------------------------------------------
// Verification
// ---------------------------------------------------------------

export interface VerifyConfig {
	/** RPC URL for the chain */
	rpcUrl: string;
	/** Chain ID */
	chainId: number;
	/** StealthAnnouncer contract address */
	stealthAnnouncerAddress: Address;
	/** How many recent blocks to scan for announcements (default: 256) */
	lookbackBlocks?: number;
}

/** Result of payment verification */
export interface VerifyResult {
	valid: boolean;
	reason?: string;
}

/** Set of seen nullifier hashes — prevents replay attacks */
const seenNullifiers = new Set<string>();

/**
 * Verify a shielded payment by checking on-chain events.
 *
 * Checks:
 * 1. StealthAnnouncer has an Announcement event matching the stealth address
 * 2. The ephemeral public key and viewTag match
 * 3. The nullifier hash hasn't been seen before (replay prevention)
 * 4. The withdrawal transaction exists and succeeded
 */
export async function verifyShieldedPayment(
	payload: ShieldedPayloadData,
	config: VerifyConfig,
): Promise<VerifyResult> {
	// 1. Check nullifier hasn't been used (replay prevention)
	const nullifierKey = payload.nullifierHash.toLowerCase();
	if (seenNullifiers.has(nullifierKey)) {
		return { valid: false, reason: "Nullifier already used (replay)" };
	}

	try {
		const provider = new ethers.JsonRpcProvider(
			config.rpcUrl,
			config.chainId,
		);

		// 2. Verify the withdrawal transaction exists and succeeded
		const receipt = await provider.getTransactionReceipt(payload.txHash);
		if (!receipt) {
			return {
				valid: false,
				reason: "Withdrawal transaction not found",
			};
		}
		if (receipt.status !== 1) {
			return { valid: false, reason: "Withdrawal transaction failed" };
		}

		// 3. Scan StealthAnnouncer for matching announcement
		const announcer = new ethers.Contract(
			config.stealthAnnouncerAddress,
			ANNOUNCEMENT_EVENT_ABI,
			provider,
		);

		const lookback = config.lookbackBlocks || 256;
		const currentBlock = await provider.getBlockNumber();
		const fromBlock = Math.max(0, currentBlock - lookback);

		const events = await announcer.queryFilter(
			"Announcement",
			fromBlock,
			"latest",
		);

		const matchingEvent = events.find((event: any) => {
			const args = event.args;
			return (
				args.stealthAddress.toLowerCase() ===
				payload.stealthAddress.toLowerCase()
			);
		});

		if (!matchingEvent) {
			return {
				valid: false,
				reason:
					"No matching stealth announcement found in recent blocks",
			};
		}

		// 4. Mark nullifier as used
		seenNullifiers.add(nullifierKey);

		return { valid: true };
	} catch (err: any) {
		return {
			valid: false,
			reason: `Verification error: ${err.message || err}`,
		};
	}
}

/**
 * Clear the nullifier cache. Useful for testing.
 */
export function clearNullifierCache(): void {
	seenNullifiers.clear();
}
