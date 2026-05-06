import type { Credential, PASResult } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

/**
 * Store a credential in the engine's credential vault.
 *
 * Returns the credential's ID on success for later retrieval/proof generation.
 */
export async function storeCredential(
	engine: PASEngine,
	credential: Credential,
): Promise<PASResult<string>> {
	try {
		await engine.credentialVault.store(credential);
		return { success: true, data: credential.id };
	} catch (err) {
		return {
			success: false,
			error: {
				code: "CREDENTIAL_STORE_FAILED",
				message: err instanceof Error ? err.message : "Failed to store credential",
			},
		};
	}
}
