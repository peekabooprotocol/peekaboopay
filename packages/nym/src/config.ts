/**
 * Nym mixnet configuration and network defaults.
 */

export interface NymConfig {
	/** Transport mode */
	mode: "mixfetch" | "socks5" | "auto";
	/** Nym validator/API URL */
	nymApiUrl?: string;
	/** SOCKS5 proxy host (default: 127.0.0.1) */
	socks5Host?: string;
	/** SOCKS5 proxy port (default: 1080) */
	socks5Port?: number;
	/** Enable debug logging */
	debug?: boolean;
}

export const DEFAULT_NYM_API_URL = "https://validator.nymtech.net/api";
export const DEFAULT_SOCKS5_HOST = "127.0.0.1";
export const DEFAULT_SOCKS5_PORT = 1080;

/**
 * Auto-detect best transport mode.
 * Returns "mixfetch" if @nymproject/sdk is available, otherwise "socks5".
 */
export async function detectMode(): Promise<"mixfetch" | "socks5"> {
	try {
		// Use a variable so TypeScript doesn't try to resolve the module at build time
		const nymSdk = "@nymproject/sdk";
		await import(/* @vite-ignore */ nymSdk);
		return "mixfetch";
	} catch {
		return "socks5";
	}
}
