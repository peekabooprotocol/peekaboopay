import type {
	PaymentRequired,
	ShieldedClientConfig,
	ShieldedPayRequest,
} from "./types.js";
import {
	X402_HEADERS,
	findShieldedRequirement,
	buildPaymentPayload,
	encodeHeader,
	decodeHeader,
	parseChainId,
} from "./scheme.js";

// ---------------------------------------------------------------
// Shielded Fetch — x402 client wrapper
// ---------------------------------------------------------------

/**
 * Create a fetch wrapper that automatically handles x402 shielded payments.
 *
 * When a server responds with 402 Payment Required and accepts the "shielded"
 * scheme, the wrapper:
 * 1. Parses the PAYMENT-REQUIRED header
 * 2. Calls your `pay` function to execute a shielded transfer
 * 3. Retries the request with the PAYMENT-SIGNATURE header
 *
 * @example
 * ```ts
 * const shieldedFetch = createShieldedFetch({
 *   pay: async (params) => {
 *     const result = await pasClient.pay({
 *       token: { address: params.asset, symbol: "TAO", decimals: 18, chainId: params.chainId },
 *       amount: BigInt(params.amount),
 *       recipient: params.recipientPublicKey,
 *     });
 *     // Return stealth address details
 *     return { stealthAddress, ephemeralPublicKey, viewTag, txHash, nullifierHash };
 *   }
 * });
 *
 * // Use like normal fetch — payments happen automatically
 * const response = await shieldedFetch("https://api.example.com/data");
 * ```
 */
export function createShieldedFetch(config: ShieldedClientConfig) {
	return async function shieldedFetch(
		input: string | URL | Request,
		init?: RequestInit,
	): Promise<Response> {
		// Make the initial request
		const response = await fetch(input, init);

		// If not 402, return as-is
		if (response.status !== 402) {
			return response;
		}

		// Extract PAYMENT-REQUIRED header
		const paymentRequiredHeader = response.headers.get(
			X402_HEADERS.PAYMENT_REQUIRED,
		);
		if (!paymentRequiredHeader) {
			return response; // 402 but no x402 header — not an x402 response
		}

		// Decode and find shielded requirement
		const paymentRequired =
			decodeHeader<PaymentRequired>(paymentRequiredHeader);
		const requirement = findShieldedRequirement(paymentRequired);

		if (!requirement) {
			return response; // Server doesn't accept shielded scheme
		}

		// Extract chain ID from network identifier
		const chainId = parseChainId(requirement.network);

		// Execute the shielded payment
		const payRequest: ShieldedPayRequest = {
			recipientPublicKey: requirement.extra.recipientPublicKey,
			amount: requirement.amount,
			asset: requirement.asset,
			chainId,
		};

		const payResult = await config.pay(payRequest);

		// Build the payment payload
		const payload = buildPaymentPayload(chainId, {
			stealthAddress: payResult.stealthAddress,
			ephemeralPublicKey: payResult.ephemeralPublicKey,
			viewTag: payResult.viewTag,
			txHash: payResult.txHash,
			nullifierHash: payResult.nullifierHash,
			amount: requirement.amount,
		});

		// Retry the original request with payment proof
		const retryHeaders = new Headers(init?.headers);
		retryHeaders.set(
			X402_HEADERS.PAYMENT_SIGNATURE,
			encodeHeader(payload),
		);

		return fetch(input, {
			...init,
			headers: retryHeaders,
		});
	};
}
