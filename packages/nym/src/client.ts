/**
 * Nym mixnet client lifecycle management.
 *
 * Wraps the @nymproject/sdk client for mixFetch mode and provides a
 * pass-through stub for SOCKS5 mode (proxy runs externally).
 * All Nym SDK types are kept as `any` so the package builds and tests
 * without @nymproject/sdk installed.
 */

import type { NymConfig } from "./config.js";
import {
	DEFAULT_NYM_API_URL,
	DEFAULT_SOCKS5_HOST,
	DEFAULT_SOCKS5_PORT,
} from "./config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NymClient {
	mode: "mixfetch" | "socks5";
	/** Underlying Nym SDK client instance (null in SOCKS5 mode) */
	client: any;
	/** Nym mixnet self-address (null in SOCKS5 mode) */
	selfAddress: string | null;
	/** SOCKS5 proxy URL (only in SOCKS5 mode) */
	socks5Url?: string;
	/** Disconnect from the Nym network */
	disconnect(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

let activeClient: NymClient | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a Nym mixnet client.
 *
 * In **mixFetch** mode the Nym SDK is dynamically imported and a real
 * mixnet client is started.  In **SOCKS5** mode (or when the SDK is
 * unavailable and mode is "auto") only connection metadata is returned —
 * the SOCKS5 proxy must be running externally.
 */
export async function createNymClient(config: NymConfig): Promise<NymClient> {
	// Attempt mixFetch when explicitly requested or in auto mode
	if (config.mode === "mixfetch" || config.mode === "auto") {
		try {
			// Use a variable so TypeScript doesn't try to resolve the module at build time
			const nymSdk = "@nymproject/sdk";
			const sdk: any = await import(/* @vite-ignore */ nymSdk);
			const createFn = sdk.createNymMixnetClient ?? sdk.default?.createNymMixnetClient;
			if (!createFn) {
				throw new Error("createNymMixnetClient not found in @nymproject/sdk");
			}

			const nymSdkClient: any = await createFn();
			await nymSdkClient.client.start({
				nymApiUrl: config.nymApiUrl || DEFAULT_NYM_API_URL,
			});

			const client: NymClient = {
				mode: "mixfetch",
				client: nymSdkClient,
				selfAddress: nymSdkClient.client.selfAddress(),
				async disconnect() {
					await nymSdkClient.client.stop();
					activeClient = null;
				},
			};

			activeClient = client;
			return client;
		} catch (err) {
			// Hard failure when the caller explicitly asked for mixFetch
			if (config.mode === "mixfetch") {
				throw new Error(
					`Failed to create Nym mixFetch client: ${err instanceof Error ? err.message : err}`,
				);
			}
			// Otherwise fall through to SOCKS5
		}
	}

	// SOCKS5 mode (or auto-fallback)
	const socks5Url = `socks5://${config.socks5Host || DEFAULT_SOCKS5_HOST}:${config.socks5Port || DEFAULT_SOCKS5_PORT}`;

	const client: NymClient = {
		mode: "socks5",
		client: null,
		selfAddress: null,
		socks5Url,
		async disconnect() {
			activeClient = null;
		},
	};

	activeClient = client;
	return client;
}

/**
 * Return the currently active Nym client, or `null` if none has been created.
 */
export function getNymClient(): NymClient | null {
	return activeClient;
}
