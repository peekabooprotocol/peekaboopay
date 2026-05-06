/**
 * Lit Protocol client wrapper for Peek-a-boo.
 * Manages connection to the Lit threshold network.
 */

export type LitNetwork = "datil-test" | "datil" | "datil-dev";

export interface LitClientConfig {
  network: LitNetwork;
  debug?: boolean;
}

let litClient: any = null;

/**
 * Create and connect to the Lit network.
 * Returns the connected LitNodeClient instance.
 */
export async function createLitClient(config: LitClientConfig): Promise<any> {
  if (litClient) return litClient;

  const { LitNodeClient } = await import("@lit-protocol/lit-node-client");

  litClient = new LitNodeClient({
    litNetwork: config.network,
    debug: config.debug || false,
  });

  await litClient.connect();
  return litClient;
}

/**
 * Get the current Lit client (must call createLitClient first).
 */
export function getLitClient(): any {
  if (!litClient)
    throw new Error(
      "Lit client not initialized. Call createLitClient() first.",
    );
  return litClient;
}

/**
 * Disconnect from the Lit network and clean up.
 */
export async function disconnectLit(): Promise<void> {
  if (litClient) {
    await litClient.disconnect();
    litClient = null;
  }
}

/**
 * Reset internal state (for testing only).
 * @internal
 */
export function _resetLitClient(): void {
  litClient = null;
}
