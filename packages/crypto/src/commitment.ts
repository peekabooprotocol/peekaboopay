import * as nodeCrypto from "crypto";
import { poseidonHash1, poseidonHash2 } from "./poseidon.js";

// ---------------------------------------------------------------
// Commitment & Nullifier
// ---------------------------------------------------------------

/**
 * Generate a random field element (< BN128 scalar field order).
 * Uses Node.js crypto for secure randomness.
 */
export function randomFieldElement(): bigint {
	const bytes = nodeCrypto.randomBytes(31); // 31 bytes to stay well under field order
	return BigInt("0x" + bytes.toString("hex"));
}

/**
 * Compute commitment = Poseidon(nullifier, secret).
 * Matches the Withdraw circuit: commitmentHasher.inputs[0] = nullifier, inputs[1] = secret.
 */
export async function computeCommitment(
	nullifier: bigint,
	secret: bigint,
): Promise<bigint> {
	return poseidonHash2(nullifier, secret);
}

/**
 * Compute nullifierHash = Poseidon(nullifier).
 * Matches the Withdraw circuit: nullifierHasher.inputs[0] = nullifier.
 */
export async function computeNullifierHash(
	nullifier: bigint,
): Promise<bigint> {
	return poseidonHash1(nullifier);
}

/**
 * Generate a random deposit (nullifier, secret, commitment, nullifierHash).
 */
export async function generateDeposit() {
	const nullifier = randomFieldElement();
	const secret = randomFieldElement();
	const commitment = await computeCommitment(nullifier, secret);
	const nullifierHash = await computeNullifierHash(nullifier);
	return { nullifier, secret, commitment, nullifierHash };
}
