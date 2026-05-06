import type { DisclosureRequest, PASResult, Proof } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

/**
 * Generate a zero-knowledge proof for a stored credential.
 *
 * Delegates to the backend's generateProof method with a "withdraw" circuit,
 * passing the credential ID and requested disclosure attributes as inputs.
 */
export async function prove(
	engine: PASEngine,
	credentialId: string,
	disclosure: DisclosureRequest,
): Promise<PASResult<Proof>> {
	const backend = engine.getBackend();
	return backend.generateProof({
		circuit: "withdraw",
		inputs: {
			credentialId,
			attributes: disclosure.attributes,
			predicates: disclosure.predicates,
		},
	});
}
