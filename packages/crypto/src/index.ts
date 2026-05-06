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

// Note encryption (ECDH + AES-256-GCM)
export {
	encryptNote,
	decryptNote,
	tryDecryptNote,
	deriveViewingPublicKey,
	generateViewingKeyPair,
} from "./encryption.js";
export type { EncryptedNote, DecryptedNote } from "./encryption.js";

// Utilities
export { toBytes32Hex, fromBytes32Hex, randomCommitment } from "./utils.js";

// Key hierarchy (viewing key separation)
export {
	deriveKeySet,
	generateKeySet,
	exportViewingKey,
	hasSpendingAuthority,
} from "./keys.js";
export type {
	KeyPair,
	PeekabooKeySet,
	ViewingKeyExport,
} from "./keys.js";

// Compliance proofs (Proof of Innocence)
export {
	SanctionedSet,
	generateComplianceAttestation,
	verifyComplianceAttestation,
} from "./compliance.js";
export type {
	ExclusionProof,
	ComplianceAttestation,
	ComplianceVerification,
} from "./compliance.js";

// Multi-denomination pool helpers
export {
	DENOMINATIONS,
	TAO_DENOMINATIONS,
	ETH_DENOMINATIONS,
	denominationLabel,
	suggestDenomination,
	isExactlyDenominatable,
	totalDepositsNeeded,
} from "./denominations.js";
export type { DenominationSplit } from "./denominations.js";
