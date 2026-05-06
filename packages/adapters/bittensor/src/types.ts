// ---------------------------------------------------------------
// Internal types for the Bittensor adapter
// ---------------------------------------------------------------

/**
 * A deposit note — tracks the secrets needed to later withdraw.
 */
export interface DepositNote {
	/** Secret nullifier value */
	nullifier: bigint;
	/** Secret blinding factor */
	secret: bigint;
	/** Poseidon(nullifier, secret) — the leaf in the Merkle tree */
	commitment: bigint;
	/** Poseidon(nullifier) — revealed on withdrawal to prevent double-spend */
	nullifierHash: bigint;
	/** Position of the commitment in the Merkle tree */
	leafIndex: number;
	/** Amount deposited (in wei) */
	amount: bigint;
	/** Token address (zero address for native TAO) */
	token: string;
	/** Block timestamp of deposit */
	timestamp: number;
}
