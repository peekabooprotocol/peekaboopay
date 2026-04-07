import type {
	ShieldedPaymentRequirement,
	ShieldedPaymentPayload,
	ShieldedPayloadData,
	ShieldedExtra,
	PaymentRequired,
	PaymentPayload,
} from "./types.js";
import { SHIELDED_SCHEME } from "./types.js";

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

export const X402_VERSION = 2;

/** HTTP headers used by x402 */
export const X402_HEADERS = {
	PAYMENT_REQUIRED: "payment-required",
	PAYMENT_SIGNATURE: "payment-signature",
	PAYMENT_RESPONSE: "payment-response",
} as const;

// ---------------------------------------------------------------
// Builder helpers
// ---------------------------------------------------------------

/**
 * Build a shielded payment requirement for a server response.
 */
export function buildPaymentRequired(
	chainId: number,
	amount: string,
	asset: string,
	extra: ShieldedExtra,
	maxTimeoutSeconds = 60,
): PaymentRequired {
	const requirement: ShieldedPaymentRequirement = {
		scheme: SHIELDED_SCHEME,
		network: `eip155:${chainId}`,
		amount,
		asset,
		payTo: extra.recipientPublicKey,
		maxTimeoutSeconds,
		extra,
	};

	return {
		x402Version: X402_VERSION,
		accepts: [requirement],
	};
}

/**
 * Build a shielded payment payload for a client request.
 */
export function buildPaymentPayload(
	chainId: number,
	data: ShieldedPayloadData,
): ShieldedPaymentPayload {
	return {
		x402Version: X402_VERSION,
		scheme: SHIELDED_SCHEME,
		network: `eip155:${chainId}`,
		payload: data,
	};
}

// ---------------------------------------------------------------
// Encoding helpers (Base64 JSON for HTTP headers)
// ---------------------------------------------------------------

/** Encode a payment object to Base64 for HTTP headers */
export function encodeHeader(obj: unknown): string {
	const json = JSON.stringify(obj);
	if (typeof btoa === "function") {
		return btoa(json);
	}
	return Buffer.from(json, "utf-8").toString("base64");
}

/** Decode a Base64 HTTP header to a payment object */
export function decodeHeader<T>(encoded: string): T {
	let json: string;
	if (typeof atob === "function") {
		json = atob(encoded);
	} else {
		json = Buffer.from(encoded, "base64").toString("utf-8");
	}
	return JSON.parse(json) as T;
}

// ---------------------------------------------------------------
// Scheme matching
// ---------------------------------------------------------------

/**
 * Find the shielded payment requirement in a PaymentRequired response.
 * Returns undefined if no shielded scheme is accepted.
 */
export function findShieldedRequirement(
	paymentRequired: PaymentRequired,
): ShieldedPaymentRequirement | undefined {
	return paymentRequired.accepts.find(
		(r) => r.scheme === SHIELDED_SCHEME,
	) as ShieldedPaymentRequirement | undefined;
}

/**
 * Parse a chain ID from an x402 network identifier.
 * e.g., "eip155:964" → 964
 */
export function parseChainId(network: string): number {
	const match = network.match(/^eip155:(\d+)$/);
	if (!match) throw new Error(`Invalid EVM network identifier: ${network}`);
	return parseInt(match[1], 10);
}
