import type { PASResult, Proof } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

export async function disclose(
	_engine: PASEngine,
	_attributes: string[],
): Promise<PASResult<Proof>> {
	throw new Error("Not implemented");
}
