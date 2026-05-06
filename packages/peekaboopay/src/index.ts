/**
 * peekaboopay — Private payments for web3
 *
 * One install, everything included.
 *
 * ```
 * npm install peekaboopay
 * ```
 *
 * Choose your chain adapter:
 * - BittensorAdapter — Bittensor EVM (chain 964), shielded TAO
 * - RailgunAdapter — Ethereum, BSC, Polygon, Arbitrum via Railgun
 *
 * Or use higher-level integrations:
 * - createShieldedFetch — x402 HTTP-native private payments
 * - MCP Server — 10 privacy tools for AI agents
 */

// Core
export * from "@peekaboopay/types";
export * from "@peekaboopay/core";
export * from "@peekaboopay/crypto";
export * from "@peekaboopay/sdk";

// Chain adapters
export { BittensorAdapter } from "@peekaboopay/adapter-bittensor";
export type { BittensorAdapterConfig } from "@peekaboopay/adapter-bittensor";
export {
	BITTENSOR_MAINNET,
	BITTENSOR_TESTNET,
	MAINNET_CONTRACTS,
} from "@peekaboopay/adapter-bittensor";

export { RailgunAdapter } from "@peekaboopay/adapter-railgun";
export type { RailgunAdapterConfig } from "@peekaboopay/adapter-railgun";

// x402
export {
	createShieldedFetch,
	shieldedPaymentMiddleware,
	SHIELDED_SCHEME,
} from "@peekaboopay/x402";
export type {
	ShieldedClientConfig,
	ShieldedMiddlewareConfig,
	ShieldedPaymentRequirement,
	ShieldedPaymentPayload,
} from "@peekaboopay/x402";
