import type { DisclosureRequest, PASResult, Proof } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

export async function prove(
	_engine: PASEngine,
	_credentialId: string,
	_disclosure: DisclosureRequest,
): Promise<PASResult<Proof>> {
	throw new Error("Not implemented");
}
