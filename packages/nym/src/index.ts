/**
 * @peekaboopay/nym — Network-level privacy for ethers.js RPC via the Nym mixnet.
 *
 * @example
 * ```ts
 * import { createNymProvider } from "@peekaboopay/nym";
 *
 * const provider = await createNymProvider({
 *   rpcUrl: "https://lite.chain.opentensor.ai",
 *   chainId: 964,
 *   nym: { mode: "auto" },
 * });
 *
 * const block = await provider.send("eth_blockNumber", []);
 * await provider.disconnect();
 * ```
 */

// Provider (primary API surface)
export { createNymProvider, NymWrappedProvider } from "./provider.js";
export type { NymProviderConfig, NymProviderInfo } from "./provider.js";

// Client lifecycle
export { createNymClient, getNymClient } from "./client.js";
export type { NymClient } from "./client.js";

// Configuration & defaults
export {
	detectMode,
	DEFAULT_NYM_API_URL,
	DEFAULT_SOCKS5_HOST,
	DEFAULT_SOCKS5_PORT,
} from "./config.js";
export type { NymConfig } from "./config.js";
