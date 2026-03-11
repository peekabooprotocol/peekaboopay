import type { DisclosureRequest, PASResult, Proof } from "@pas/types";
import type { PASEngine } from "@pas/core";

export async function prove(
	_engine: PASEngine,
	_credentialId: string,
	_disclosure: DisclosureRequest,
): Promise<PASResult<Proof>> {
	throw new Error("Not implemented");
}
