import type { Hex, Address } from "@peekaboopay/types";

// ---------------------------------------------------------------
// x402 base types (minimal subset — avoids hard dep on @x402/core)
// ---------------------------------------------------------------

/** x402 payment requirement — what the server demands */
export interface PaymentRequirement {
	scheme: string;
	network: string;
	amount: string;
	asset: string;
	payTo: string;
	maxTimeoutSeconds: number;
	extra?: Record<string, unknown>;
}

/** x402 PAYMENT-REQUIRED header payload */
export interface PaymentRequired {
	x402Version: number;
	accepts: PaymentRequirement[];
	error?: string;
}

/** x402 PAYMENT-SIGNATURE header payload */
export interface PaymentPayload {
	x402Version: number;
	scheme: string;
	network: string;
	payload: Record<string, unknown>;
}

/** x402 PAYMENT-RESPONSE header payload */
export interface PaymentResponse {
	success: boolean;
	network: string;
	txHash?: string;
	error?: string;
}

// ---------------------------------------------------------------
// Shielded scheme types
// ---------------------------------------------------------------

/** Scheme identifier */
export const SHIELDED_SCHEME = "shielded" as const;

/** Extra fields in ShieldedPaymentRequirement */
export interface ShieldedExtra {
	/** StealthAnnouncer contract address on the target chain */
	stealthAnnouncerAddress: Address;
	/** ShieldedPool contract address on the target chain */
	shieldedPoolAddress: Address;
	/** Server's secp256k1 public key for stealth address derivation (uncompressed, 0x04...) */
	recipientPublicKey: Hex;
	/** Index signature for x402 compatibility */
	[key: string]: unknown;
}

/** Payment requirement for the shielded scheme */
export interface ShieldedPaymentRequirement extends PaymentRequirement {
	scheme: typeof SHIELDED_SCHEME;
	extra: ShieldedExtra;
}

/** Payload sent by the client proving shielded payment */
export interface ShieldedPayloadData {
	/** Stealth address where funds were sent */
	stealthAddress: Address;
	/** Ephemeral public key for recipient to derive stealth private key */
	ephemeralPublicKey: Hex;
	/** viewTag for fast-scan filtering (1 byte) */
	viewTag: Hex;
	/** Withdrawal transaction hash */
	txHash: Hex;
	/** Nullifier hash — unique per spend, prevents replay */
	nullifierHash: Hex;
	/** Amount paid in base units (wei) */
	amount: string;
	/** Index signature for x402 compatibility */
	[key: string]: unknown;
}

/** Full payment payload for the shielded scheme */
export interface ShieldedPaymentPayload extends PaymentPayload {
	scheme: typeof SHIELDED_SCHEME;
	payload: ShieldedPayloadData;
}

// ---------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------

/** Configuration for the shielded payment client */
export interface ShieldedClientConfig {
	/** Function to execute a shielded transfer and return proof data */
	pay: (params: ShieldedPayRequest) => Promise<ShieldedPayResult>;
}

/** Request to make a shielded payment */
export interface ShieldedPayRequest {
	/** Recipient's public key for stealth address generation */
	recipientPublicKey: Hex;
	/** Amount in base units (wei) */
	amount: string;
	/** Token/asset address */
	asset: string;
	/** Chain ID */
	chainId: number;
}

/** Result of a shielded payment */
export interface ShieldedPayResult {
	stealthAddress: Address;
	ephemeralPublicKey: Hex;
	viewTag: Hex;
	txHash: Hex;
	nullifierHash: Hex;
}

/** Configuration for the shielded payment middleware */
export interface ShieldedMiddlewareConfig {
	/** RPC URL for the target chain */
	rpcUrl: string;
	/** Chain ID */
	chainId: number;
	/** StealthAnnouncer contract address */
	stealthAnnouncerAddress: Address;
	/** ShieldedPool contract address */
	shieldedPoolAddress: Address;
	/** Server's secp256k1 public key (uncompressed) */
	recipientPublicKey: Hex;
	/** Route payment requirements: path → { asset, amount } */
	routes: Record<
		string,
		{
			asset: string;
			amount: string;
			description?: string;
		}
	>;
}
