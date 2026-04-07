import type { Credential, PASResult } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

export async function storeCredential(
	_engine: PASEngine,
	_credential: Credential,
): Promise<PASResult<string>> {
	throw new Error("Not implemented");
}
