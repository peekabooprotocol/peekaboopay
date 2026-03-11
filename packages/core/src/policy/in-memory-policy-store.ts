import type { PolicyRule, PolicyStore, SpendRecord } from "@pas/types";

/**
 * In-memory implementation of PolicyStore.
 *
 * Uses Maps for rule and spend tracking storage.
 */
export class InMemoryPolicyStore implements PolicyStore {
	private rules: Map<string, PolicyRule> = new Map();
	private spendTracker: Map<string, SpendRecord> = new Map();

	setRule(rule: PolicyRule): void {
		this.rules.set(rule.id, rule);
	}

	getRule(id: string): PolicyRule | undefined {
		return this.rules.get(id);
	}

	deleteRule(id: string): void {
		this.rules.delete(id);
	}

	listRules(): PolicyRule[] {
		return Array.from(this.rules.values()).sort(
			(a, b) => a.priority - b.priority,
		);
	}

	getSpend(key: string): SpendRecord | undefined {
		return this.spendTracker.get(key);
	}

	setSpend(key: string, amount: bigint, windowStart: number): void {
		this.spendTracker.set(key, { amount, windowStart });
	}
}
