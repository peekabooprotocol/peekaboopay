import type { Credential, PASResult } from "@pas/types";
import type { PASEngine } from "@pas/core";

export async function storeCredential(
	_engine: PASEngine,
	_credential: Credential,
): Promise<PASResult<string>> {
	throw new Error("Not implemented");
}
