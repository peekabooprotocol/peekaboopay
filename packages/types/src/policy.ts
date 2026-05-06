import type { Address, ChainId, TokenInfo } from "./common";
import type { OperationType } from "./session";

export interface PolicyEngine {
	evaluate(operation: PolicyRequest): Promise<PolicyDecision>;
	addRule(rule: PolicyRule): Promise<void>;
	removeRule(ruleId: string): Promise<void>;
	listRules(): Promise<PolicyRule[]>;
}

export interface PolicyRequest {
	operation: OperationType;
	token?: TokenInfo;
	amount?: bigint;
	recipient?: Address;
	chainId?: ChainId;
	agentId: string;
	sessionId: string;
}

export interface PolicyDecision {
	allowed: boolean;
	reason?: string;
	appliedRules: string[];
	modifications?: PolicyModification[];
}

export interface PolicyModification {
	field: string;
	action: "cap" | "override" | "require_approval";
	value?: unknown;
}

export type PolicyRule =
	| SpendLimitRule
	| DisclosureScopeRule
	| TimeBoundRule
	| WhitelistRule
	| ChainRestrictionRule;

interface BaseRule {
	id: string;
	name: string;
	priority: number;
	enabled: boolean;
}

export interface SpendLimitRule extends BaseRule {
	type: "spend_limit";
	token: TokenInfo;
	maxAmount: bigint;
	period: "per_tx" | "hourly" | "daily" | "weekly" | "monthly";
}

export interface DisclosureScopeRule extends BaseRule {
	type: "disclosure_scope";
	allowedAttributes: string[];
	deniedAttributes: string[];
}

export interface TimeBoundRule extends BaseRule {
	type: "time_bound";
	operations: OperationType[];
	allowedHours: { start: number; end: number };
	timezone: string;
}

export interface WhitelistRule extends BaseRule {
	type: "whitelist";
	addresses: Address[];
	mode: "allow" | "deny";
}

export interface ChainRestrictionRule extends BaseRule {
	type: "chain_restriction";
	allowedChains: ChainId[];
}

/** Accumulated spend within a time window. */
export interface SpendRecord {
	amount: bigint;
	windowStart: number;
}

/** Low-level storage adapter for the policy engine. */
export interface PolicyStore {
	/** Insert or update a policy rule. */
	setRule(rule: PolicyRule): void;
	/** Retrieve a rule by ID. */
	getRule(id: string): PolicyRule | undefined;
	/** Delete a rule by ID. */
	deleteRule(id: string): void;
	/** Return all rules sorted by priority (ascending). */
	listRules(): PolicyRule[];

	/** Look up accumulated spend for a tracking key. */
	getSpend(key: string): SpendRecord | undefined;
	/** Set accumulated spend for a tracking key. */
	setSpend(key: string, amount: bigint, windowStart: number): void;
}
