// Types
export {
	SHIELDED_SCHEME,
} from "./types.js";
export type {
	PaymentRequired,
	PaymentRequirement,
	PaymentPayload,
	PaymentResponse,
	ShieldedPaymentRequirement,
	ShieldedPaymentPayload,
	ShieldedPayloadData,
	ShieldedExtra,
	ShieldedClientConfig,
	ShieldedPayRequest,
	ShieldedPayResult,
	ShieldedMiddlewareConfig,
} from "./types.js";

// Scheme helpers
export {
	X402_VERSION,
	X402_HEADERS,
	buildPaymentRequired,
	buildPaymentPayload,
	encodeHeader,
	decodeHeader,
	findShieldedRequirement,
	parseChainId,
} from "./scheme.js";

// Client
export { createShieldedFetch } from "./client.js";

// Server middleware
export { shieldedPaymentMiddleware } from "./middleware.js";
export type {
	MiddlewareRequest,
	MiddlewareResponse,
	NextFunction,
} from "./middleware.js";

// Verification
export {
	verifyShieldedPayment,
	clearNullifierCache,
} from "./verify.js";
export type { VerifyConfig, VerifyResult } from "./verify.js";
