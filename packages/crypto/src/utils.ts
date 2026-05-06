// ---------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------

/**
 * Convert a bigint to a bytes32 hex string (0x-prefixed, 64 chars).
 */
export function toBytes32Hex(value: bigint): string {
	return "0x" + value.toString(16).padStart(64, "0");
}

/**
 * Convert a bytes32 hex string to bigint.
 */
export function fromBytes32Hex(hex: string): bigint {
	return BigInt(hex);
}

/**
 * Generate a random commitment as bytes32 hex (for deposit-only tests that
 * don't need proof generation).
 */
export async function randomCommitment(): Promise<string> {
	const { generateDeposit } = await import("./commitment.js");
	const deposit = await generateDeposit();
	return toBytes32Hex(deposit.commitment);
}
