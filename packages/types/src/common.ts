/** Hex-encoded string */
export type Hex = `0x${string}`;

/** Ethereum address */
export type Address = Hex;

/** Transaction hash */
export type TransactionHash = Hex;

/** Private key */
export type PrivateKey = Hex;

/** Public key */
export type PublicKey = Hex;

/** Chain ID */
export type ChainId = number;

export enum ChainType {
	L1 = "l1",
	L2_BASE = "l2_base",
	L2_ARBITRUM = "l2_arbitrum",
	L2_OPTIMISM = "l2_optimism",
}

/** ERC-20 token representation */
export interface TokenInfo {
	address: Address;
	symbol: string;
	decimals: number;
	chainId: ChainId;
}

/** Standardized result type for all PAS operations */
export type PASResult<T> =
	| { success: true; data: T }
	| { success: false; error: PASError };

export interface PASError {
	code: string;
	message: string;
	details?: unknown;
}
