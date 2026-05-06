/**
 * Nym-wrapped ethers.js JSON-RPC provider.
 *
 * Creates a provider that routes RPC traffic through the Nym mixnet for
 * network-level privacy.
 *
 * - **mixFetch mode** — HTTP requests are tunnelled through the Nym SDK's
 *   built-in mixFetch transport.
 * - **SOCKS5 mode** — the provider is created normally; the caller is
 *   expected to run a `nym-socks5-client` externally and set HTTP_PROXY /
 *   ALL_PROXY at the OS level.
 */

import { ethers } from "ethers";
import type { NymConfig } from "./config.js";
import { createNymClient, type NymClient } from "./client.js";
import {
	DEFAULT_NYM_API_URL,
	DEFAULT_SOCKS5_HOST,
	DEFAULT_SOCKS5_PORT,
} from "./config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NymProviderConfig {
	/** Target RPC endpoint (e.g. https://lite.chain.opentensor.ai) */
	rpcUrl: string;
	/** Chain ID of the target network */
	chainId: number;
	/** Nym transport configuration (all fields optional) */
	nym?: Partial<NymConfig>;
}

export interface NymProviderInfo {
	mode: "mixfetch" | "socks5";
	rpcUrl: string;
	chainId: number;
	selfAddress: string | null;
	socks5Url?: string;
	active: boolean;
}

// ---------------------------------------------------------------------------
// NymWrappedProvider
// ---------------------------------------------------------------------------

/**
 * An ethers-compatible provider that tunnels JSON-RPC calls through the
 * Nym mixnet.
 *
 * In **mixFetch** mode every `send()` call serialises the request and
 * pushes it through the Nym SDK's `mixFetch` function.
 *
 * In **SOCKS5** mode the underlying `ethers.JsonRpcProvider` is used
 * directly — the SOCKS5 proxy must be configured at the OS/process level.
 */
export class NymWrappedProvider {
	readonly provider: ethers.JsonRpcProvider;
	readonly nymClient: NymClient;
	readonly mode: "mixfetch" | "socks5";
	readonly rpcUrl: string;
	readonly chainId: number;

	private _nextId = 1;

	constructor(
		provider: ethers.JsonRpcProvider,
		nymClient: NymClient,
		config: NymProviderConfig,
	) {
		this.provider = provider;
		this.nymClient = nymClient;
		this.mode = nymClient.mode;
		this.rpcUrl = config.rpcUrl;
		this.chainId = config.chainId;
	}

	// -----------------------------------------------------------------------
	// Core RPC
	// -----------------------------------------------------------------------

	/** Send a JSON-RPC call, routing through Nym when in mixFetch mode. */
	async send(method: string, params: any[]): Promise<any> {
		if (this.mode === "mixfetch" && this.nymClient.client) {
			return this.sendViaMixFetch(method, params);
		}
		// SOCKS5 or fallback — delegate to the underlying ethers provider
		return this.provider.send(method, params);
	}

	// -----------------------------------------------------------------------
	// Convenience helpers
	// -----------------------------------------------------------------------

	/** Return the underlying `ethers.JsonRpcProvider` (for adapter compat). */
	getEthersProvider(): ethers.JsonRpcProvider {
		return this.provider;
	}

	/** Disconnect from the Nym network and release resources. */
	async disconnect(): Promise<void> {
		await this.nymClient.disconnect();
	}

	/** `true` when the Nym mixFetch transport is actively routing traffic. */
	isNymActive(): boolean {
		return this.mode === "mixfetch" && this.nymClient.client !== null;
	}

	/** Return a snapshot of connection metadata. */
	getInfo(): NymProviderInfo {
		return {
			mode: this.mode,
			rpcUrl: this.rpcUrl,
			chainId: this.chainId,
			selfAddress: this.nymClient.selfAddress,
			socks5Url: this.nymClient.socks5Url,
			active: this.isNymActive(),
		};
	}

	// -----------------------------------------------------------------------
	// Internal
	// -----------------------------------------------------------------------

	private async sendViaMixFetch(
		method: string,
		params: any[],
	): Promise<any> {
		const id = this._nextId++;
		const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });

		const response = await this.nymClient.client.client.mixFetch(
			this.rpcUrl,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body,
			},
		);

		const json = await response.json();

		if (json.error) {
			throw new Error(json.error.message || "RPC error");
		}

		return json.result;
	}
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an ethers.js provider routed through the Nym mixnet.
 *
 * ```ts
 * const provider = await createNymProvider({
 *   rpcUrl: "https://lite.chain.opentensor.ai",
 *   chainId: 964,
 *   nym: { mode: "auto" },
 * });
 *
 * const block = await provider.send("eth_blockNumber", []);
 * ```
 */
export async function createNymProvider(
	config: NymProviderConfig,
): Promise<NymWrappedProvider> {
	const nymConfig: NymConfig = {
		mode: config.nym?.mode || "auto",
		nymApiUrl: config.nym?.nymApiUrl || DEFAULT_NYM_API_URL,
		socks5Host: config.nym?.socks5Host || DEFAULT_SOCKS5_HOST,
		socks5Port: config.nym?.socks5Port || DEFAULT_SOCKS5_PORT,
		debug: config.nym?.debug || false,
	};

	const client = await createNymClient(nymConfig);

	const network = new ethers.Network(
		`nym-${nymConfig.mode === "socks5" ? "socks5-" : ""}${config.chainId}`,
		config.chainId,
	);
	const baseProvider = new ethers.JsonRpcProvider(config.rpcUrl, network, {
		staticNetwork: network,
	});

	return new NymWrappedProvider(baseProvider, client, config);
}
