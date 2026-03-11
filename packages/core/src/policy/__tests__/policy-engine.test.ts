import { describe, it, expect, beforeEach } from "vitest";
import { PolicyEngineImpl } from "../policy-engine";
import type {
	Address,
	ChainRestrictionRule,
	PolicyRequest,
	PolicyRule,
	SpendLimitRule,
	TimeBoundRule,
	TokenInfo,
	WhitelistRule,
} from "@pas/types";

const USDC: TokenInfo = {
	address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
	symbol: "USDC",
	decimals: 6,
	chainId: 1,
};

const makePayRequest = (
	overrides: Partial<PolicyRequest> = {},
): PolicyRequest => ({
	operation: "pay",
	token: USDC,
	amount: 100n,
	recipient: "0x1234567890abcdef1234567890abcdef12345678" as Address,
	chainId: 1,
	agentId: "agent-1",
	sessionId: "session-1",
	...overrides,
});

describe("PolicyEngineImpl", () => {
	let engine: PolicyEngineImpl;

	beforeEach(() => {
		engine = new PolicyEngineImpl();
	});

	describe("rule management", () => {
		it("allows all when no rules exist", async () => {
			const decision = await engine.evaluate(makePayRequest());
			expect(decision.allowed).toBe(true);
			expect(decision.appliedRules).toEqual([]);
		});

		it("adds, lists, and removes rules", async () => {
			const rule: SpendLimitRule = {
				id: "r1",
				name: "Test Rule",
				priority: 1,
				enabled: true,
				type: "spend_limit",
				token: USDC,
				maxAmount: 1000n,
				period: "per_tx",
			};

			await engine.addRule(rule);
			let rules = await engine.listRules();
			expect(rules).toHaveLength(1);
			expect(rules[0].id).toBe("r1");

			await engine.removeRule("r1");
			rules = await engine.listRules();
			expect(rules).toHaveLength(0);
		});

		it("returns rules sorted by priority", async () => {
			await engine.addRule({
				id: "r3",
				name: "Low",
				priority: 10,
				enabled: true,
				type: "spend_limit",
				token: USDC,
				maxAmount: 1000n,
				period: "per_tx",
			});
			await engine.addRule({
				id: "r1",
				name: "High",
				priority: 1,
				enabled: true,
				type: "spend_limit",
				token: USDC,
				maxAmount: 500n,
				period: "per_tx",
			});
			await engine.addRule({
				id: "r2",
				name: "Mid",
				priority: 5,
				enabled: true,
				type: "spend_limit",
				token: USDC,
				maxAmount: 750n,
				period: "per_tx",
			});

			const rules = await engine.listRules();
			expect(rules.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
		});

		it("skips disabled rules", async () => {
			await engine.addRule({
				id: "r1",
				name: "Disabled deny",
				priority: 1,
				enabled: false,
				type: "spend_limit",
				token: USDC,
				maxAmount: 10n,
				period: "per_tx",
			});

			const decision = await engine.evaluate(
				makePayRequest({ amount: 100n }),
			);
			expect(decision.allowed).toBe(true);
			expect(decision.appliedRules).toEqual([]);
		});
	});

	describe("SpendLimitRule", () => {
		it("allows amount within per_tx limit", async () => {
			await engine.addRule({
				id: "r1",
				name: "Per-tx limit",
				priority: 1,
				enabled: true,
				type: "spend_limit",
				token: USDC,
				maxAmount: 200n,
				period: "per_tx",
			});

			const decision = await engine.evaluate(
				makePayRequest({ amount: 100n }),
			);
			expect(decision.allowed).toBe(true);
			expect(decision.appliedRules).toContain("r1");
		});

		it("denies amount exceeding per_tx limit", async () => {
			await engine.addRule({
				id: "r1",
				name: "Per-tx limit",
				priority: 1,
				enabled: true,
				type: "spend_limit",
				token: USDC,
				maxAmount: 50n,
				period: "per_tx",
			});

			const decision = await engine.evaluate(
				makePayRequest({ amount: 100n }),
			);
			expect(decision.allowed).toBe(false);
			expect(decision.reason).toContain("per-transaction limit");
		});

		it("tracks cumulative daily spend", async () => {
			await engine.addRule({
				id: "r1",
				name: "Daily limit",
				priority: 1,
				enabled: true,
				type: "spend_limit",
				token: USDC,
				maxAmount: 150n,
				period: "daily",
			});

			// First operation: 100 of 150 limit
			const d1 = await engine.evaluate(makePayRequest({ amount: 100n }));
			expect(d1.allowed).toBe(true);

			// Second operation: 60 more would exceed 150
			const d2 = await engine.evaluate(makePayRequest({ amount: 60n }));
			expect(d2.allowed).toBe(false);
			expect(d2.reason).toContain("Cumulative");

			// Third operation: 50 more is exactly 150 — should pass
			const d3 = await engine.evaluate(makePayRequest({ amount: 50n }));
			expect(d3.allowed).toBe(true);
		});

		it("does not accumulate spend on denied operations", async () => {
			await engine.addRule({
				id: "r1",
				name: "Daily limit",
				priority: 1,
				enabled: true,
				type: "spend_limit",
				token: USDC,
				maxAmount: 150n,
				period: "daily",
			});

			// Also add a whitelist rule that will deny
			await engine.addRule({
				id: "r2",
				name: "Whitelist",
				priority: 0,
				enabled: true,
				type: "whitelist",
				addresses: ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address],
				mode: "allow",
			});

			// This should be denied by whitelist, so spend should NOT accumulate
			const d1 = await engine.evaluate(makePayRequest({ amount: 100n }));
			expect(d1.allowed).toBe(false);

			// Remove the whitelist rule
			await engine.removeRule("r2");

			// Now 100n should pass since nothing was accumulated
			const d2 = await engine.evaluate(makePayRequest({ amount: 100n }));
			expect(d2.allowed).toBe(true);
		});

		it("skips when no token in request", async () => {
			await engine.addRule({
				id: "r1",
				name: "Spend limit",
				priority: 1,
				enabled: true,
				type: "spend_limit",
				token: USDC,
				maxAmount: 50n,
				period: "per_tx",
			});

			const decision = await engine.evaluate(
				makePayRequest({ token: undefined, amount: undefined }),
			);
			expect(decision.allowed).toBe(true);
			expect(decision.appliedRules).not.toContain("r1");
		});
	});

	describe("TimeBoundRule", () => {
		it("allows operations within allowed hours", async () => {
			const currentHour = new Date().getHours();
			await engine.addRule({
				id: "r1",
				name: "Business hours",
				priority: 1,
				enabled: true,
				type: "time_bound",
				operations: ["pay"],
				allowedHours: { start: currentHour, end: currentHour + 1 },
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			});

			const decision = await engine.evaluate(makePayRequest());
			expect(decision.allowed).toBe(true);
		});

		it("denies operations outside allowed hours", async () => {
			const currentHour = new Date().getHours();
			// Set window to 2 hours from now
			const start = (currentHour + 2) % 24;
			const end = (currentHour + 4) % 24;

			await engine.addRule({
				id: "r1",
				name: "Future only",
				priority: 1,
				enabled: true,
				type: "time_bound",
				operations: ["pay"],
				allowedHours: { start, end },
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			});

			const decision = await engine.evaluate(makePayRequest());
			expect(decision.allowed).toBe(false);
			expect(decision.reason).toContain("not allowed at current hour");
		});

		it("skips operations not in the rule's operations list", async () => {
			await engine.addRule({
				id: "r1",
				name: "Swap only",
				priority: 1,
				enabled: true,
				type: "time_bound",
				operations: ["swap"],
				allowedHours: { start: 0, end: 0 }, // Would block everything
				timezone: "UTC",
			});

			// Pay is not in the operations list, so the rule should not apply
			const decision = await engine.evaluate(makePayRequest());
			expect(decision.allowed).toBe(true);
		});
	});

	describe("WhitelistRule", () => {
		it("allows recipient in allowlist", async () => {
			const recipient =
				"0x1234567890abcdef1234567890abcdef12345678" as Address;
			await engine.addRule({
				id: "r1",
				name: "Allowlist",
				priority: 1,
				enabled: true,
				type: "whitelist",
				addresses: [recipient],
				mode: "allow",
			});

			const decision = await engine.evaluate(
				makePayRequest({ recipient }),
			);
			expect(decision.allowed).toBe(true);
		});

		it("denies recipient not in allowlist", async () => {
			await engine.addRule({
				id: "r1",
				name: "Allowlist",
				priority: 1,
				enabled: true,
				type: "whitelist",
				addresses: [
					"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address,
				],
				mode: "allow",
			});

			const decision = await engine.evaluate(makePayRequest());
			expect(decision.allowed).toBe(false);
			expect(decision.reason).toContain("not in the allowlist");
		});

		it("denies recipient in denylist", async () => {
			const recipient =
				"0x1234567890abcdef1234567890abcdef12345678" as Address;
			await engine.addRule({
				id: "r1",
				name: "Denylist",
				priority: 1,
				enabled: true,
				type: "whitelist",
				addresses: [recipient],
				mode: "deny",
			});

			const decision = await engine.evaluate(
				makePayRequest({ recipient }),
			);
			expect(decision.allowed).toBe(false);
			expect(decision.reason).toContain("denylist");
		});

		it("handles case-insensitive address comparison", async () => {
			await engine.addRule({
				id: "r1",
				name: "Allowlist",
				priority: 1,
				enabled: true,
				type: "whitelist",
				addresses: [
					"0xABCDEF1234567890ABCDEF1234567890ABCDEF12" as Address,
				],
				mode: "allow",
			});

			const decision = await engine.evaluate(
				makePayRequest({
					recipient:
						"0xabcdef1234567890abcdef1234567890abcdef12" as Address,
				}),
			);
			expect(decision.allowed).toBe(true);
		});

		it("skips when no recipient in request", async () => {
			await engine.addRule({
				id: "r1",
				name: "Denylist",
				priority: 1,
				enabled: true,
				type: "whitelist",
				addresses: [
					"0x1234567890abcdef1234567890abcdef12345678" as Address,
				],
				mode: "deny",
			});

			const decision = await engine.evaluate(
				makePayRequest({ recipient: undefined }),
			);
			expect(decision.allowed).toBe(true);
		});
	});

	describe("ChainRestrictionRule", () => {
		it("allows operation on permitted chain", async () => {
			await engine.addRule({
				id: "r1",
				name: "Ethereum only",
				priority: 1,
				enabled: true,
				type: "chain_restriction",
				allowedChains: [1, 8453],
			});

			const decision = await engine.evaluate(
				makePayRequest({ chainId: 1 }),
			);
			expect(decision.allowed).toBe(true);
		});

		it("denies operation on restricted chain", async () => {
			await engine.addRule({
				id: "r1",
				name: "Ethereum only",
				priority: 1,
				enabled: true,
				type: "chain_restriction",
				allowedChains: [1],
			});

			const decision = await engine.evaluate(
				makePayRequest({ chainId: 42161 }),
			);
			expect(decision.allowed).toBe(false);
			expect(decision.reason).toContain("not in allowed chains");
		});
	});

	describe("multiple rules", () => {
		it("first deny wins based on priority", async () => {
			await engine.addRule({
				id: "r1",
				name: "Chain rule",
				priority: 2,
				enabled: true,
				type: "chain_restriction",
				allowedChains: [1],
			});
			await engine.addRule({
				id: "r2",
				name: "Whitelist",
				priority: 1,
				enabled: true,
				type: "whitelist",
				addresses: [
					"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address,
				],
				mode: "allow",
			});

			const decision = await engine.evaluate(
				makePayRequest({ chainId: 999 }),
			);
			expect(decision.allowed).toBe(false);
			// The whitelist rule (priority 1) should fire first
			expect(decision.reason).toContain("allowlist");
			expect(decision.appliedRules).toContain("r1");
			expect(decision.appliedRules).toContain("r2");
		});
	});
});
