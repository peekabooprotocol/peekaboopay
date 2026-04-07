import type { PolicyRule } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

export async function setPolicy(_engine: PASEngine, _rules: PolicyRule[]): Promise<void> {
	throw new Error("Not implemented");
}

export async function getPolicies(_engine: PASEngine): Promise<PolicyRule[]> {
	throw new Error("Not implemented");
}
