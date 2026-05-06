// ---------------------------------------------------------------
// Poseidon Hashing (matches circomlib exactly)
// ---------------------------------------------------------------

let poseidonInstance: any = null;

/**
 * Lazily initialize the Poseidon hasher.
 * Must be called before any Poseidon operations.
 */
export async function getPoseidon() {
	if (!poseidonInstance) {
		const { buildPoseidon } = await import("circomlibjs");
		poseidonInstance = await buildPoseidon();
	}
	return poseidonInstance;
}

/**
 * Hash two field elements using Poseidon(2).
 * Matches circomlib's Poseidon(2) and poseidon-solidity's PoseidonT3.
 */
export async function poseidonHash2(
	left: bigint,
	right: bigint,
): Promise<bigint> {
	const poseidon = await getPoseidon();
	const h = poseidon([left, right]);
	return BigInt(poseidon.F.toString(h));
}

/**
 * Hash a single field element using Poseidon(1).
 * Used for nullifierHash = Poseidon(nullifier).
 */
export async function poseidonHash1(input: bigint): Promise<bigint> {
	const poseidon = await getPoseidon();
	const h = poseidon([input]);
	return BigInt(poseidon.F.toString(h));
}

/**
 * Hash left || right using Poseidon — matches IncrementalMerkleTree.hashLeftRight().
 * Returns as hex string (bytes32 format).
 */
export async function hashLeftRight(
	left: string,
	right: string,
): Promise<string> {
	const result = await poseidonHash2(BigInt(left), BigInt(right));
	return toBytes32Hex(result);
}

// Inline import to avoid circular deps
function toBytes32Hex(value: bigint): string {
	return "0x" + value.toString(16).padStart(64, "0");
}
