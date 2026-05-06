// Poseidon hashing
export {
	getPoseidon,
	poseidonHash1,
	poseidonHash2,
	hashLeftRight,
} from "./poseidon.js";

// Commitment & nullifier generation
export {
	randomFieldElement,
	computeCommitment,
	computeNullifierHash,
	generateDeposit,
} from "./commitment.js";

// Off-chain Merkle tree
export { MerkleTree } from "./merkle-tree.js";
export type { MerkleProof } from "./merkle-tree.js";

// Groth16 proof generation
export { generateWithdrawProof, verifyWithdrawProof } from "./proof.js";
export type {
	WithdrawProofInput,
	Groth16Proof,
	WithdrawProofResult,
	ArtifactPaths,
} from "./proof.js";

// Utilities
export { toBytes32Hex, fromBytes32Hex, randomCommitment } from "./utils.js";
