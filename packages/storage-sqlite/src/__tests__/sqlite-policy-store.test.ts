import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { SqlitePolicyStore } from "../sqlite-policy-store";
import type { Hex, PolicyRule, SpendLimitRule, WhitelistRule, TimeBoundRule, ChainRestrictionRule } from "@pas/types";

describe("SqlitePolicyStore", () => {
	let db: Database.Database;
	let store: SqlitePolicyStore;

	beforeEach(() => {
		db = new Database(":memory:");
		store = new SqlitePolicyStore(db);
	});

	afterEach(() => {
		db.close();
	});

	const spendRule: SpendLimitRule = {
		id: "spend-1",
		name: "Daily ETH limit",
		type: "spend_limit",
		priority: 1,
		enabled: true,
		token: {
			address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Hex,
			symbol: "ETH",
			decimals: 18,
			chainId: 1,
		},
		maxAmount: 5_000_000_000_000_000_000n, // 5 ETH
		period: "daily",
	};

	const whitelistRule: WhitelistRule = {
		id: "wl-1",
		name: "Allowed recipients",
		type: "whitelist",
		priority: 2,
		enabled: true,
		addresses: [
			"0x1234567890abcdef1234567890abcdef12345678" as Hex,
		],
		mode: "allow",
	};

	describe("rule CRUD", () => {
		it("setRule and getRule round-trip", () => {
			store.setRule(spendRule);
			const retrieved = store.getRule("spend-1");

			expect(retrieved).toBeDefined();
			expect(retrieved!.id).toBe("spend-1");
			expect(retrieved!.type).toBe("spend_limit");
			expect((retrieved as SpendLimitRule).maxAmount).toBe(5_000_000_000_000_000_000n);
		});

		it("getRule returns undefined for missing ID", () => {
			expect(store.getRule("nonexistent")).toBeUndefined();
		});

		it("setRule updates existing rule (upsert)", () => {
			store.setRule(spendRule);
			store.setRule({ ...spendRule, name: "Updated name" });

			const retrieved = store.getRule("spend-1");
			expect(retrieved!.name).toBe("Updated name");
		});

		it("deleteRule removes a rule", () => {
			store.setRule(spendRule);
			store.deleteRule("spend-1");
			expect(store.getRule("spend-1")).toBeUndefined();
		});

		it("deleteRule is idempotent for missing ID", () => {
			store.deleteRule("nonexistent"); // should not throw
		});
	});

	describe("listRules", () => {
		it("returns rules sorted by priority ascending", () => {
			store.setRule(whitelistRule); // priority 2
			store.setRule(spendRule); // priority 1

			const rules = store.listRules();
			expect(rules).toHaveLength(2);
			expect(rules[0].id).toBe("spend-1");
			expect(rules[1].id).toBe("wl-1");
		});

		it("returns empty array when no rules", () => {
			expect(store.listRules()).toEqual([]);
		});
	});

	describe("PolicyRule union variants", () => {
		it("round-trips SpendLimitRule with bigint maxAmount", () => {
			const huge = 999_999_999_999_999_999_999n;
			store.setRule({ ...spendRule, maxAmount: huge });
			const retrieved = store.getRule("spend-1") as SpendLimitRule;
			expect(retrieved.maxAmount).toBe(huge);
			expect(retrieved.period).toBe("daily");
		});

		it("round-trips WhitelistRule", () => {
			store.setRule(whitelistRule);
			const retrieved = store.getRule("wl-1") as WhitelistRule;
			expect(retrieved.mode).toBe("allow");
			expect(retrieved.addresses).toHaveLength(1);
		});

		it("round-trips TimeBoundRule", () => {
			const rule: TimeBoundRule = {
				id: "tb-1",
				name: "Business hours only",
				type: "time_bound",
				priority: 3,
				enabled: true,
				operations: ["pay", "swap"],
				allowedHours: { start: 9, end: 17 },
				timezone: "America/New_York",
			};
			store.setRule(rule);
			const retrieved = store.getRule("tb-1") as TimeBoundRule;
			expect(retrieved.allowedHours).toEqual({ start: 9, end: 17 });
			expect(retrieved.operations).toEqual(["pay", "swap"]);
		});

		it("round-trips ChainRestrictionRule", () => {
			const rule: ChainRestrictionRule = {
				id: "cr-1",
				name: "Mainnet only",
				type: "chain_restriction",
				priority: 4,
				enabled: false,
				allowedChains: [1, 10, 42161],
			};
			store.setRule(rule);
			const retrieved = store.getRule("cr-1") as ChainRestrictionRule;
			expect(retrieved.allowedChains).toEqual([1, 10, 42161]);
			expect(retrieved.enabled).toBe(false);
		});
	});

	describe("spend tracking", () => {
		it("getSpend returns undefined for unknown key", () => {
			expect(store.getSpend("unknown")).toBeUndefined();
		});

		it("setSpend and getSpend round-trip", () => {
			store.setSpend("0xtoken:1:daily", 1_500_000n, 1700000000000);
			const record = store.getSpend("0xtoken:1:daily");

			expect(record).toBeDefined();
			expect(record!.amount).toBe(1_500_000n);
			expect(record!.windowStart).toBe(1700000000000);
		});

		it("setSpend overwrites existing value", () => {
			store.setSpend("key", 100n, 1000);
			store.setSpend("key", 200n, 2000);

			const record = store.getSpend("key");
			expect(record!.amount).toBe(200n);
			expect(record!.windowStart).toBe(2000);
		});

		it("preserves large bigint spend amounts", () => {
			const huge = 123_456_789_012_345_678_901n;
			store.setSpend("big", huge, 1000);
			expect(store.getSpend("big")!.amount).toBe(huge);
		});
	});
});
