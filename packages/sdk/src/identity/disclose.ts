import type { PASResult, Proof } from "@pas/types";
import type { PASEngine } from "@pas/core";

export async function disclose(
	_engine: PASEngine,
	_attributes: string[],
): Promise<PASResult<Proof>> {
	throw new Error("Not implemented");
}
