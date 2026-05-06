// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface WithdrawProofInput {
	// Private inputs
	nullifier: bigint;
	secret: bigint;
	pathElements: bigint[];
	pathIndices: number[];
	// Public inputs
	root: bigint;
	nullifierHash: bigint;
	recipient: bigint;
	amount: bigint;
}

export interface Groth16Proof {
	pA: [bigint, bigint];
	pB: [[bigint, bigint], [bigint, bigint]];
	pC: [bigint, bigint];
}

export interface WithdrawProofResult {
	proof: Groth16Proof;
	publicSignals: bigint[];
	proofBytes: string; // ABI-encoded for contract call
}

export interface ArtifactPaths {
	wasmPath: string;
	zkeyPath: string;
}

// ---------------------------------------------------------------
// Groth16 Proof Generation
// ---------------------------------------------------------------

/**
 * ABI-encode a Groth16 proof for on-chain verification.
 * Encodes as (uint256[2], uint256[2][2], uint256[2]).
 */
function abiEncodeProof(proof: Groth16Proof): string {
	// Manual ABI encoding for (uint256[2], uint256[2][2], uint256[2])
	// This avoids importing ethers just for ABI encoding
	const parts: string[] = [];
	const encode256 = (v: bigint) => v.toString(16).padStart(64, "0");

	// pA[0], pA[1]
	parts.push(encode256(proof.pA[0]));
	parts.push(encode256(proof.pA[1]));
	// pB[0][0], pB[0][1], pB[1][0], pB[1][1]
	parts.push(encode256(proof.pB[0][0]));
	parts.push(encode256(proof.pB[0][1]));
	parts.push(encode256(proof.pB[1][0]));
	parts.push(encode256(proof.pB[1][1]));
	// pC[0], pC[1]
	parts.push(encode256(proof.pC[0]));
	parts.push(encode256(proof.pC[1]));

	return "0x" + parts.join("");
}

/**
 * Generate a Groth16 proof for the withdraw circuit.
 * Requires circuit artifacts (WASM + zkey) at the specified paths.
 */
export async function generateWithdrawProof(
	input: WithdrawProofInput,
	artifacts: ArtifactPaths,
): Promise<WithdrawProofResult> {
	const snarkjs = await import("snarkjs");

	// Prepare circuit input signals
	const circuitInput = {
		// Private inputs
		nullifier: input.nullifier.toString(),
		secret: input.secret.toString(),
		pathElements: input.pathElements.map((e) => e.toString()),
		pathIndices: input.pathIndices.map((i) => i.toString()),
		// Public inputs
		root: input.root.toString(),
		nullifierHash: input.nullifierHash.toString(),
		recipient: input.recipient.toString(),
		amount: input.amount.toString(),
	};

	// Generate proof using snarkjs
	const { proof, publicSignals } = await snarkjs.groth16.fullProve(
		circuitInput,
		artifacts.wasmPath,
		artifacts.zkeyPath,
	);

	// Convert proof to contract-compatible format
	// Note: pB indices are swapped for the BN128 pairing check
	const groth16Proof: Groth16Proof = {
		pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
		pB: [
			[BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
			[BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
		],
		pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
	};

	// ABI-encode the proof for the contract's _verifyProof
	const proofBytes = abiEncodeProof(groth16Proof);

	return {
		proof: groth16Proof,
		publicSignals: publicSignals.map((s: string) => BigInt(s)),
		proofBytes,
	};
}

/**
 * Verify a Groth16 proof off-chain using snarkjs.
 * Requires the verification key JSON.
 */
export async function verifyWithdrawProof(
	proof: Groth16Proof,
	publicSignals: bigint[],
	verificationKeyPath: string,
): Promise<boolean> {
	const snarkjs = await import("snarkjs");
	const fs = await import("fs");

	const vkey = JSON.parse(fs.readFileSync(verificationKeyPath, "utf-8"));

	// Convert back to snarkjs format
	const snarkProof = {
		pi_a: [proof.pA[0].toString(), proof.pA[1].toString(), "1"],
		pi_b: [
			[proof.pB[0][1].toString(), proof.pB[0][0].toString()],
			[proof.pB[1][1].toString(), proof.pB[1][0].toString()],
			["1", "0"],
		],
		pi_c: [proof.pC[0].toString(), proof.pC[1].toString(), "1"],
		protocol: "groth16",
		curve: "bn128",
	};

	const signals = publicSignals.map((s) => s.toString());

	return snarkjs.groth16.verify(vkey, signals, snarkProof);
}
