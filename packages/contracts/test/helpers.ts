import { ethers } from "hardhat";
import { AbiCoder } from "ethers";
import * as path from "path";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface MerkleProof {
	pathElements: bigint[];
	pathIndices: number[];
}

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

// ---------------------------------------------------------------
// Poseidon Hashing (matches circomlib exactly)
// ---------------------------------------------------------------

let poseidonInstance: any = null;

/**
 * Lazily initialize the Poseidon hasher.
 * Must be called before any Poseidon operations.
 */
async function getPoseidon() {
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

// ---------------------------------------------------------------
// Commitment & Nullifier
// ---------------------------------------------------------------

/**
 * Generate a random field element (< BN128 scalar field order).
 * Uses crypto.getRandomValues for secure randomness.
 */
export function randomFieldElement(): bigint {
	const bytes = ethers.randomBytes(31); // 31 bytes to stay well under field order
	return BigInt("0x" + Buffer.from(bytes).toString("hex"));
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

// ---------------------------------------------------------------
// Off-chain Merkle Tree (Poseidon)
// ---------------------------------------------------------------

/**
 * Incremental Merkle tree using Poseidon hashing.
 * Mirrors the on-chain IncrementalMerkleTree exactly.
 */
export class MerkleTree {
	levels: number;
	private leaves: bigint[];
	private zeroValues: bigint[];

	constructor(levels: number) {
		this.levels = levels;
		this.leaves = [];
		this.zeroValues = [];
	}

	/**
	 * Initialize zero values (must be called before use).
	 */
	async init(): Promise<void> {
		// zeros[0] = 0, zeros[i] = Poseidon(zeros[i-1], zeros[i-1])
		this.zeroValues = [0n];
		let current = 0n;
		for (let i = 1; i <= this.levels; i++) {
			current = await poseidonHash2(current, current);
			this.zeroValues.push(current);
		}
	}

	/**
	 * Insert a leaf and return its index.
	 */
	insert(leaf: bigint): number {
		const index = this.leaves.length;
		if (index >= 2 ** this.levels) {
			throw new Error("Merkle tree is full");
		}
		this.leaves.push(leaf);
		return index;
	}

	/**
	 * Compute the current Merkle root.
	 */
	async getRoot(): Promise<bigint> {
		let currentLevel = [...this.leaves];

		// Pad to full width at each level
		for (let level = 0; level < this.levels; level++) {
			const nextLevel: bigint[] = [];
			const levelSize = currentLevel.length;

			for (let i = 0; i < Math.ceil(levelSize / 2); i++) {
				const left = currentLevel[i * 2];
				const right =
					i * 2 + 1 < levelSize
						? currentLevel[i * 2 + 1]
						: this.zeroValues[level];
				nextLevel.push(await poseidonHash2(left, right));
			}

			// If no pairs at all (empty level), use zero hash at next level
			if (nextLevel.length === 0) {
				return this.zeroValues[this.levels];
			}

			// Pad remaining with zero hashes at the next level
			currentLevel = nextLevel;
		}

		return currentLevel[0];
	}

	/**
	 * Get the Merkle proof for a given leaf index.
	 * Returns pathElements (sibling nodes) and pathIndices (0=left, 1=right).
	 */
	async getProof(leafIndex: number): Promise<MerkleProof> {
		if (leafIndex >= this.leaves.length) {
			throw new Error(`Leaf index ${leafIndex} not inserted`);
		}

		const pathElements: bigint[] = [];
		const pathIndices: number[] = [];
		let currentIndex = leafIndex;

		// Build the tree level by level to find siblings
		let currentLevel = [...this.leaves];

		for (let level = 0; level < this.levels; level++) {
			// Is current node a left child (even) or right child (odd)?
			const isRight = currentIndex % 2 === 1;
			pathIndices.push(isRight ? 1 : 0);

			// Sibling is on the other side
			const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

			if (siblingIndex < currentLevel.length) {
				pathElements.push(currentLevel[siblingIndex]);
			} else {
				pathElements.push(this.zeroValues[level]);
			}

			// Build the next level
			const nextLevel: bigint[] = [];
			for (let i = 0; i < currentLevel.length; i += 2) {
				const left = currentLevel[i];
				const right =
					i + 1 < currentLevel.length
						? currentLevel[i + 1]
						: this.zeroValues[level];
				nextLevel.push(await poseidonHash2(left, right));
			}

			currentLevel = nextLevel;
			currentIndex = Math.floor(currentIndex / 2);
		}

		return { pathElements, pathIndices };
	}
}

// ---------------------------------------------------------------
// Groth16 Proof Generation
// ---------------------------------------------------------------

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
 */
export async function generateWithdrawProof(
	input: WithdrawProofInput,
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
		WASM_PATH,
		ZKEY_PATH,
	);

	// Convert proof to contract-compatible format
	const groth16Proof: Groth16Proof = {
		pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
		pB: [
			[BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
			[BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
		],
		pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
	};

	// ABI-encode the proof for the contract's _verifyProof
	const proofBytes = AbiCoder.defaultAbiCoder().encode(
		["uint256[2]", "uint256[2][2]", "uint256[2]"],
		[groth16Proof.pA, groth16Proof.pB, groth16Proof.pC],
	);

	return {
		proof: groth16Proof,
		publicSignals: publicSignals.map((s: string) => BigInt(s)),
		proofBytes,
	};
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
	const deposit = await generateDeposit();
	return toBytes32Hex(deposit.commitment);
}

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
	const pool = await PoolFactory.deploy(levels, await verifier.getAddress());
	await pool.waitForDeployment();

	return { pool, verifier };
}
