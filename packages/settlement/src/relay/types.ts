// ---------------------------------------------------------------
// Relay Types — All relay-related interfaces and constants
// ---------------------------------------------------------------

/** EIP-712 domain for relay request signatures */
export const RELAY_EIP712_DOMAIN = {
	name: "PeekabooRelay",
	version: "1",
} as const;

/** EIP-712 type definition for relay requests */
export const RELAY_REQUEST_TYPES: Record<string, Array<{ name: string; type: string }>> = {
	RelayRequest: [
		{ name: "from", type: "address" },
		{ name: "to", type: "address" },
		{ name: "data", type: "bytes" },
		{ name: "chainId", type: "uint256" },
		{ name: "maxRelayFeeBps", type: "uint256" },
		{ name: "nonce", type: "uint256" },
		{ name: "deadline", type: "uint256" },
	],
};

/** Basis points denominator (10000 = 100%) */
export const BPS_DENOMINATOR = 10_000;

/** Maximum allowed relay fee: 5% (500 basis points) */
export const MAX_RELAY_FEE_BPS = 500;

// ---------------------------------------------------------------
// Core interfaces
// ---------------------------------------------------------------

/**
 * A relay request signed by a stealth address holder.
 * The relayer submits the transaction and pays gas on behalf of the sender.
 */
export interface RelayRequest {
	/** The stealth address that wants to transact */
	from: string;
	/** Target contract address (e.g., ShieldedPool) */
	to: string;
	/** Encoded transaction data */
	data: string;
	/** Chain ID */
	chainId: number;
	/** Maximum relay fee the sender will accept, in basis points (e.g., 50 = 0.5%) */
	maxRelayFeeBps: number;
	/** EIP-712 signature from the stealth address holder */
	signature: string;
	/** Nonce to prevent replay attacks */
	nonce: number;
	/** Deadline as unix timestamp (seconds). Request is invalid after this time. */
	deadline: number;
}

/** Response returned after a relay request is successfully submitted */
export interface RelayResponse {
	/** Transaction hash of the relayed transaction */
	txHash: string;
	/** Actual relay fee charged in basis points */
	relayFeeBps: number;
	/** Gas cost paid by the relayer (in wei, as a decimal string) */
	gasCost: string;
}

/** Configuration for creating a relay client */
export interface RelayerConfig {
	/** JSON-RPC URL for the target chain */
	rpcUrl: string;
	/** Chain ID */
	chainId: number;
	/** The relayer's private key — used to sign and pay for transactions */
	relayerPrivateKey: string;
	/** Default relay fee in basis points (default: 50 = 0.5%) */
	defaultFeeBps?: number;
	/** Maximum gas price in gwei the relayer is willing to pay (default: 100) */
	maxGasPriceGwei?: number;
}

/** Relay fee estimate for a pending request */
export interface RelayFeeEstimate {
	/** Estimated gas cost in wei */
	gasCostWei: string;
	/** Relay fee in basis points that will be charged */
	relayFeeBps: number;
	/** Total cost in wei (gas + relay fee) */
	totalCostWei: string;
	/** Whether the relayer can afford to submit this transaction */
	relayerCanAfford: boolean;
}

/** Internal state of a relay client */
export interface RelayClientState {
	/** JSON-RPC provider */
	provider: unknown;
	/** Wallet (relayer's signer) */
	wallet: unknown;
	/** Chain ID */
	chainId: number;
	/** Default fee in basis points */
	defaultFeeBps: number;
	/** Max gas price in gwei */
	maxGasPriceGwei: number;
	/** Set of consumed nonces (keyed by sender address) to prevent replay */
	usedNonces: Map<string, Set<number>>;
}

// ---------------------------------------------------------------
// Meta-transaction parameter types
// ---------------------------------------------------------------

/** Parameters for building a withdraw meta-transaction */
export interface WithdrawMetaTxParams {
	/** ShieldedPool contract address */
	poolAddress: string;
	/** The nullifier hash (bytes32 hex) */
	nullifierHash: string;
	/** Recipient address for the withdrawn funds */
	recipient: string;
	/** Withdrawal amount in wei */
	amount: string;
	/** Token address (zero address for native ETH/TAO) */
	token: string;
	/** Merkle root to verify against (bytes32 hex) */
	root: string;
	/** ABI-encoded Groth16 proof */
	proof: string;
	/** Chain ID */
	chainId: number;
	/** Maximum relay fee in basis points */
	maxRelayFeeBps: number;
	/** Nonce for replay protection */
	nonce: number;
	/** Deadline as unix timestamp */
	deadline: number;
}

/** Parameters for building an announce meta-transaction */
export interface AnnounceMetaTxParams {
	/** StealthAnnouncer contract address */
	announcerAddress: string;
	/** Stealth address scheme ID (1 = secp256k1) */
	schemeId: number;
	/** The stealth address being announced */
	stealthAddress: string;
	/** Ephemeral public key used in ECDH derivation */
	ephemeralPubKey: string;
	/** Single-byte view tag for fast scanning */
	viewTag: string;
	/** Optional metadata */
	metadata: string;
	/** Chain ID */
	chainId: number;
	/** Maximum relay fee in basis points */
	maxRelayFeeBps: number;
	/** Nonce for replay protection */
	nonce: number;
	/** Deadline as unix timestamp */
	deadline: number;
}

/** Errors specific to the relay module */
export class RelayError extends Error {
	constructor(
		message: string,
		public readonly code: RelayErrorCode,
		public readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "RelayError";
	}
}

export enum RelayErrorCode {
	/** The relay request signature is invalid */
	INVALID_SIGNATURE = "INVALID_SIGNATURE",
	/** The relay request has expired (past deadline) */
	EXPIRED = "EXPIRED",
	/** The nonce has already been used */
	NONCE_REPLAY = "NONCE_REPLAY",
	/** The requested fee exceeds the maximum allowed */
	FEE_TOO_HIGH = "FEE_TOO_HIGH",
	/** Gas price exceeds the relayer's maximum */
	GAS_PRICE_TOO_HIGH = "GAS_PRICE_TOO_HIGH",
	/** The relayer cannot afford the gas */
	INSUFFICIENT_RELAYER_BALANCE = "INSUFFICIENT_RELAYER_BALANCE",
	/** The on-chain transaction reverted */
	TRANSACTION_REVERTED = "TRANSACTION_REVERTED",
	/** Generic relay failure */
	RELAY_FAILED = "RELAY_FAILED",
}
