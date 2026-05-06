import type { PolicyRule } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

/**
 * Set (add) policy rules on the engine's policy engine.
 *
 * Each rule is added individually. Existing rules with the same ID
 * will be overwritten by the store implementation.
 */
export async function setPolicy(engine: PASEngine, rules: PolicyRule[]): Promise<void> {
	for (const rule of rules) {
		await engine.policyEngine.addRule(rule);
	}
}

/**
 * Retrieve all currently configured policy rules.
 */
export async function getPolicies(engine: PASEngine): Promise<PolicyRule[]> {
	return engine.policyEngine.listRules();
}
