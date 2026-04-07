import type {
	ShieldedMiddlewareConfig,
	ShieldedPaymentPayload,
	ShieldedPayloadData,
} from "./types.js";
import {
	X402_HEADERS,
	buildPaymentRequired,
	encodeHeader,
	decodeHeader,
} from "./scheme.js";
import { verifyShieldedPayment } from "./verify.js";
import type { Address } from "@peekaboopay/types";

// ---------------------------------------------------------------
// Generic middleware types (framework-agnostic)
// ---------------------------------------------------------------

/** Minimal request interface (works with Express, Hono, etc.) */
export interface MiddlewareRequest {
	method: string;
	path: string;
	url: string;
	headers: {
		get?: (name: string) => string | null | undefined;
		[key: string]: unknown;
	};
}

/** Minimal response helpers */
export interface MiddlewareResponse {
	status: (code: number) => MiddlewareResponse;
	setHeader: (name: string, value: string) => MiddlewareResponse;
	json: (body: unknown) => void;
	send: (body: string) => void;
}

/** Next function for middleware chaining */
export type NextFunction = () => void | Promise<void>;

// ---------------------------------------------------------------
// Shielded Payment Middleware
// ---------------------------------------------------------------

/**
 * Create middleware that gates routes behind shielded x402 payments.
 *
 * @example
 * ```ts
 * import express from "express";
 * import { shieldedPaymentMiddleware } from "@peekaboopay/x402";
 *
 * const app = express();
 *
 * app.use(shieldedPaymentMiddleware({
 *   rpcUrl: "https://lite.chain.opentensor.ai",
 *   chainId: 964,
 *   stealthAnnouncerAddress: "0xE5e3d47BF0aE09E7D4F6b36A5da285254CCfE0F7",
 *   shieldedPoolAddress: "0xf42E35258a682D4726880c3c453c4b96821f2b04",
 *   recipientPublicKey: "0x04...",
 *   routes: {
 *     "GET /api/data": { asset: "0x0000000000000000000000000000000000000000", amount: "1000000000000000000" },
 *     "POST /api/inference": { asset: "0x0000000000000000000000000000000000000000", amount: "5000000000000000000" },
 *   }
 * }));
 * ```
 */
export function shieldedPaymentMiddleware(config: ShieldedMiddlewareConfig) {
	return async function middleware(
		req: MiddlewareRequest,
		res: MiddlewareResponse,
		next: NextFunction,
	): Promise<void> {
		// Check if this route requires payment
		const routeKey = `${req.method} ${req.path}`;
		const routeConfig = config.routes[routeKey];

		if (!routeConfig) {
			// Route not gated — pass through
			return next();
		}

		// Check for payment signature header
		const getHeader = (name: string): string | null | undefined => {
			if (typeof req.headers.get === "function") {
				return req.headers.get(name);
			}
			// Express-style: headers are lowercase properties
			return req.headers[name] as string | undefined;
		};

		const paymentSig = getHeader(X402_HEADERS.PAYMENT_SIGNATURE);

		if (!paymentSig) {
			// No payment — return 402 with requirements
			const paymentRequired = buildPaymentRequired(
				config.chainId,
				routeConfig.amount,
				routeConfig.asset,
				{
					stealthAnnouncerAddress: config.stealthAnnouncerAddress,
					shieldedPoolAddress: config.shieldedPoolAddress,
					recipientPublicKey: config.recipientPublicKey,
				},
			);

			res.status(402);
			res.setHeader(
				X402_HEADERS.PAYMENT_REQUIRED,
				encodeHeader(paymentRequired),
			);
			res.json({
				error: "Payment Required",
				message: "This endpoint requires a shielded x402 payment",
				scheme: "shielded",
				amount: routeConfig.amount,
				asset: routeConfig.asset,
			});
			return;
		}

		// Decode and verify the payment
		let payload: ShieldedPaymentPayload;
		try {
			payload = decodeHeader<ShieldedPaymentPayload>(paymentSig);
		} catch {
			res.status(400);
			res.json({ error: "Invalid payment signature encoding" });
			return;
		}

		if (payload.scheme !== "shielded") {
			res.status(400);
			res.json({
				error: `Unsupported scheme: ${payload.scheme}. Expected: shielded`,
			});
			return;
		}

		// Verify amount matches
		if (payload.payload.amount !== routeConfig.amount) {
			res.status(402);
			res.json({
				error: "Payment amount mismatch",
				expected: routeConfig.amount,
				received: payload.payload.amount,
			});
			return;
		}

		// Verify on-chain
		const result = await verifyShieldedPayment(payload.payload, {
			rpcUrl: config.rpcUrl,
			chainId: config.chainId,
			stealthAnnouncerAddress: config.stealthAnnouncerAddress,
		});

		if (!result.valid) {
			res.status(402);
			res.json({
				error: "Payment verification failed",
				reason: result.reason,
			});
			return;
		}

		// Payment verified — set response header and continue
		res.setHeader(
			X402_HEADERS.PAYMENT_RESPONSE,
			encodeHeader({
				success: true,
				network: payload.network,
				txHash: payload.payload.txHash,
			}),
		);

		return next();
	};
}
