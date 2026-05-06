import type {
	ChainRestrictionRule,
	DisclosureScopeRule,
	PolicyDecision,
	PolicyEngine,
	PolicyModification,
	PolicyRequest,
	PolicyRule,
	PolicyStore,
	SpendLimitRule,
	SpendRecord,
	TimeBoundRule,
	TokenInfo,
	WhitelistRule,
} from "@peekaboopay/types";
import { InMemoryPolicyStore } from "./in-memory-policy-store";

export class PolicyEngineImpl implements PolicyEngine {
	private store: PolicyStore;

	constructor(store?: PolicyStore) {
		this.store = store ?? new InMemoryPolicyStore();
	}

	async addRule(rule: PolicyRule): Promise<void> {
		this.store.setRule(rule);
	}

	async removeRule(ruleId: string): Promise<void> {
		this.store.deleteRule(ruleId);
	}

	async listRules(): Promise<PolicyRule[]> {
		return this.store.listRules();
	}

	async evaluate(operation: PolicyRequest): Promise<PolicyDecision> {
		const enabledRules = this.store
			.listRules()
			.filter((r) => r.enabled);

		const appliedRules: string[] = [];
		const modifications: PolicyModification[] = [];
		let denied = false;
		let reason: string | undefined;

		// Track which spend limits matched so we can accumulate on allow
		const matchedSpendLimits: SpendLimitRule[] = [];

		for (const rule of enabledRules) {
			const result = this.evaluateRule(rule, operation);

			if (result.applies) {
				appliedRules.push(rule.id);

				if (!result.allowed && !denied) {
					denied = true;
					reason = result.reason;
				}

				if (result.modification) {
					modifications.push(result.modification);
				}

				if (rule.type === "spend_limit" && result.applies) {
					matchedSpendLimits.push(rule);
				}
			}
		}

		const allowed = !denied;

		// Only accumulate spend if the operation was allowed
		if (allowed && operation.amount !== undefined) {
			for (const rule of matchedSpendLimits) {
				if (rule.period !== "per_tx") {
					this.accumulateSpend(rule, operation.amount);
				}
			}
		}

		return {
			allowed,
			reason,
			appliedRules,
			modifications: modifications.length > 0 ? modifications : undefined,
		};
	}

	private evaluateRule(
		rule: PolicyRule,
		operation: PolicyRequest,
	): {
		applies: boolean;
		allowed: boolean;
		reason?: string;
		modification?: PolicyModification;
	} {
		switch (rule.type) {
			case "spend_limit":
				return this.evaluateSpendLimit(rule, operation);
			case "time_bound":
				return this.evaluateTimeBound(rule, operation);
			case "whitelist":
				return this.evaluateWhitelist(rule, operation);
			case "chain_restriction":
				return this.evaluateChainRestriction(rule, operation);
			case "disclosure_scope":
				return this.evaluateDisclosureScope(rule, operation);
			default:
				return { applies: false, allowed: true };
		}
	}

	private evaluateSpendLimit(
		rule: SpendLimitRule,
		operation: PolicyRequest,
	): { applies: boolean; allowed: boolean; reason?: string } {
		// Only applies if operation has token and amount
		if (!operation.token || operation.amount === undefined) {
			return { applies: false, allowed: true };
		}

		// Token must match
		if (!this.tokenMatches(operation.token, rule.token)) {
			return { applies: false, allowed: true };
		}

		if (rule.period === "per_tx") {
			if (operation.amount > rule.maxAmount) {
				return {
					applies: true,
					allowed: false,
					reason: `Transaction amount exceeds per-transaction limit of ${rule.maxAmount} (rule: ${rule.name})`,
				};
			}
			return { applies: true, allowed: true };
		}

		// Time-based period: check cumulative spend
		const key = this.spendKey(rule.token, rule.period);
		const windowMs = this.periodToMs(rule.period);
		const now = Date.now();
		const record = this.store.getSpend(key);

		let currentSpend = 0n;
		if (record && now - record.windowStart < windowMs) {
			currentSpend = record.amount;
		}

		if (currentSpend + operation.amount > rule.maxAmount) {
			return {
				applies: true,
				allowed: false,
				reason: `Cumulative ${rule.period} spend would exceed limit of ${rule.maxAmount} (current: ${currentSpend}, requested: ${operation.amount}, rule: ${rule.name})`,
			};
		}

		return { applies: true, allowed: true };
	}

	private evaluateTimeBound(
		rule: TimeBoundRule,
		operation: PolicyRequest,
	): { applies: boolean; allowed: boolean; reason?: string } {
		// Only applies if operation type is in rule's operations list
		if (!rule.operations.includes(operation.operation)) {
			return { applies: false, allowed: true };
		}

		const currentHour = this.getCurrentHour(rule.timezone);
		const { start, end } = rule.allowedHours;

		let withinWindow: boolean;
		if (start === end) {
			// Zero-width window = block all
			withinWindow = false;
		} else if (start < end) {
			// Normal range: e.g., 9-17
			withinWindow = currentHour >= start && currentHour < end;
		} else {
			// Overnight wrap: e.g., 22-6
			withinWindow = currentHour >= start || currentHour < end;
		}

		if (!withinWindow) {
			return {
				applies: true,
				allowed: false,
				reason: `Operation "${operation.operation}" not allowed at current hour ${currentHour} (allowed: ${start}-${end}, rule: ${rule.name})`,
			};
		}

		return { applies: true, allowed: true };
	}

	private evaluateWhitelist(
		rule: WhitelistRule,
		operation: PolicyRequest,
	): { applies: boolean; allowed: boolean; reason?: string } {
		if (!operation.recipient) {
			return { applies: false, allowed: true };
		}

		const recipientLower = operation.recipient.toLowerCase();
		const inList = rule.addresses.some(
			(addr) => addr.toLowerCase() === recipientLower,
		);

		if (rule.mode === "allow" && !inList) {
			return {
				applies: true,
				allowed: false,
				reason: `Recipient ${operation.recipient} is not in the allowlist (rule: ${rule.name})`,
			};
		}

		if (rule.mode === "deny" && inList) {
			return {
				applies: true,
				allowed: false,
				reason: `Recipient ${operation.recipient} is in the denylist (rule: ${rule.name})`,
			};
		}

		return { applies: true, allowed: true };
	}

	private evaluateChainRestriction(
		rule: ChainRestrictionRule,
		operation: PolicyRequest,
	): { applies: boolean; allowed: boolean; reason?: string } {
		if (operation.chainId === undefined) {
			return { applies: false, allowed: true };
		}

		if (!rule.allowedChains.includes(operation.chainId)) {
			return {
				applies: true,
				allowed: false,
				reason: `Chain ${operation.chainId} is not in allowed chains [${rule.allowedChains.join(", ")}] (rule: ${rule.name})`,
			};
		}

		return { applies: true, allowed: true };
	}

	private evaluateDisclosureScope(
		_rule: DisclosureScopeRule,
		operation: PolicyRequest,
	): { applies: boolean; allowed: boolean; reason?: string } {
		// DisclosureScopeRule only applies to disclose operations.
		// PolicyRequest currently lacks an attributes field, so we record the rule
		// as applied but cannot enforce attribute-level filtering yet.
		if (operation.operation !== "disclose") {
			return { applies: false, allowed: true };
		}

		return { applies: true, allowed: true };
	}

	private accumulateSpend(rule: SpendLimitRule, amount: bigint): void {
		if (rule.period === "per_tx") return;
		const key = this.spendKey(rule.token, rule.period);
		const windowMs = this.periodToMs(rule.period);
		const now = Date.now();
		const record = this.store.getSpend(key);

		if (record && now - record.windowStart < windowMs) {
			this.store.setSpend(key, record.amount + amount, record.windowStart);
		} else {
			this.store.setSpend(key, amount, now);
		}
	}

	private tokenMatches(a: TokenInfo, b: TokenInfo): boolean {
		return (
			a.address.toLowerCase() === b.address.toLowerCase() &&
			a.chainId === b.chainId
		);
	}

	private spendKey(token: TokenInfo, period: string): string {
		return `${token.address.toLowerCase()}:${token.chainId}:${period}`;
	}

	private periodToMs(
		period: "hourly" | "daily" | "weekly" | "monthly",
	): number {
		const map: Record<string, number> = {
			hourly: 3_600_000,
			daily: 86_400_000,
			weekly: 604_800_000,
			monthly: 2_592_000_000,
		};
		return map[period];
	}

	private getCurrentHour(timezone: string): number {
		const formatter = new Intl.DateTimeFormat("en-US", {
			hour: "numeric",
			hour12: false,
			timeZone: timezone,
		});
		return Number.parseInt(formatter.format(new Date()), 10);
	}
}
