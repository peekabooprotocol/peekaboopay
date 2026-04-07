import { ethers } from "hardhat";
import { AbiCoder } from "ethers";
import * as path from "path";

// ---------------------------------------------------------------
// Re-export all crypto primitives from @peekaboopay/crypto
// ---------------------------------------------------------------

export {
	poseidonHash1,
	poseidonHash2,
	hashLeftRight,
	randomFieldElement,
	computeCommitment,
	computeNullifierHash,
	generateDeposit,
	MerkleTree,
	toBytes32Hex,
	fromBytes32Hex,
	randomCommitment,
} from "@peekaboopay/crypto";

export type {
	MerkleProof,
	WithdrawProofInput,
	Groth16Proof,
	WithdrawProofResult,
} from "@peekaboopay/crypto";

// ---------------------------------------------------------------
// Groth16 Proof Generation (test-specific, uses hardcoded paths)
// ---------------------------------------------------------------

import type { WithdrawProofInput } from "@peekaboopay/crypto";
import { MerkleTree, generateDeposit, toBytes32Hex } from "@peekaboopay/crypto";

const WASM_PATH = path.join(
	__dirname,
	"..",
	"circuits",
	"build",
	"withdraw_test_js",
	"withdraw_test.wasm",
);

const ZKEY_PATH = path.join(
	__dirname,
	"..",
	"circuits",
	"build",
	"withdraw_test.zkey",
);

/**
 * Generate a Groth16 proof for the withdraw circuit.
 * Uses test circuit artifacts (5-level tree).
 */
export async function generateWithdrawProof(
	input: WithdrawProofInput,
) {
	const { generateWithdrawProof: generate } = await import("@peekaboopay/crypto");
	return generate(input, { wasmPath: WASM_PATH, zkeyPath: ZKEY_PATH });
}

/**
 * Full workflow: create deposit, insert into tree, generate proof.
 * Returns everything needed for a contract withdrawal.
 */
export async function prepareWithdrawal(
	tree: MerkleTree,
	recipient: string,
	amount: bigint,
) {
	// 1. Generate deposit
	const deposit = await generateDeposit();

	// 2. Insert commitment into off-chain tree
	const leafIndex = tree.insert(deposit.commitment);

	// 3. Get Merkle proof
	const merkleProof = await tree.getProof(leafIndex);

	// 4. Get current root
	const root = await tree.getRoot();

	// 5. Generate ZK proof
	const proofInput: WithdrawProofInput = {
		nullifier: deposit.nullifier,
		secret: deposit.secret,
		pathElements: merkleProof.pathElements,
		pathIndices: merkleProof.pathIndices,
		root,
		nullifierHash: deposit.nullifierHash,
		recipient: BigInt(recipient),
		amount,
	};

	const proofResult = await generateWithdrawProof(proofInput);

	return {
		deposit,
		leafIndex,
		merkleProof,
		root,
		proofResult,
		// Convenience: values ready for contract call
		commitment: toBytes32Hex(deposit.commitment),
		nullifierHash: toBytes32Hex(deposit.nullifierHash),
		rootHex: toBytes32Hex(root),
		proofBytes: proofResult.proofBytes,
	};
}

// ---------------------------------------------------------------
// Hardhat-specific deploy helpers (test-only)
// ---------------------------------------------------------------

/**
 * Deploy PoseidonT3 library using the bytecode from poseidon-solidity.
 * Returns the deployed library address.
 */
async function deployPoseidonT3(): Promise<string> {
	const [signer] = await ethers.getSigners();
	const PoseidonT3 = require("poseidon-solidity/deploy/PoseidonT3");

	// Deploy the library using its pre-compiled bytecode
	const tx = await signer.sendTransaction({
		data: PoseidonT3.bytecode,
	});
	const receipt = await tx.wait();
	return receipt!.contractAddress!;
}

/**
 * Deploy the Groth16Verifier and ShieldedPool contracts together.
 * Handles PoseidonT3 library linking automatically.
 * Returns both contract instances.
 */
export async function deployPoolWithVerifier(levels: number) {
	// Step 1: Deploy PoseidonT3 library
	const poseidonAddr = await deployPoseidonT3();

	// Step 2: Deploy the Groth16 verifier
	const VerifierFactory = await ethers.getContractFactory("Groth16Verifier");
	const verifier = await VerifierFactory.deploy();
	await verifier.waitForDeployment();

	// Step 3: Deploy ShieldedPool with library linking
	const PoolFactory = await ethers.getContractFactory("ShieldedPool", {
		libraries: {
			"poseidon-solidity/PoseidonT3.sol:PoseidonT3": poseidonAddr,
		},
	});
	const [signer] = await ethers.getSigners();
	const pool = await PoolFactory.deploy(
		levels,
		await verifier.getAddress(),
		signer.address, // fee recipient = deployer in tests
		50, // 0.5% fee
	);
	await pool.waitForDeployment();

	return { pool, verifier };
}
