import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { SqliteTreasuryStore } from "../sqlite-treasury-store";
import { SqlitePolicyStore } from "../sqlite-policy-store";
import { SqliteSessionStore } from "../sqlite-session-store";
import { createSqliteStores } from "../factory";
import type { Hex, UTXONote, TokenInfo } from "@peekaboopay/types";
import { PrivacyLevel, SessionState } from "@peekaboopay/types";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const ETH: TokenInfo = {
	address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Hex,
	symbol: "ETH",
	decimals: 18,
	chainId: 1,
};

describe("Integration: SQLite persistence across restarts", () => {
	let dbPath: string;

	beforeEach(() => {
		dbPath = path.join(os.tmpdir(), `pas-test-${Date.now()}.db`);
	});

	afterEach(() => {
		// Cleanup temp DB files
		for (const suffix of ["", "-wal", "-shm"]) {
			try {
				fs.unlinkSync(dbPath + suffix);
			} catch {
				// ignore
			}
		}
	});

	it("treasury data survives close → reopen", () => {
		// First session: add notes
		const stores1 = createSqliteStores(dbPath);
		const note: UTXONote = {
			commitment: "0x0001" as Hex,
			amount: 1_000_000_000_000_000_000n, // 1 ETH
			token: ETH,
			blinding: "0x1000" as Hex,
			index: 0,
		};
		stores1.treasury.addUTXO(note);
		stores1.treasury.addNullifierMapping("0x1000", "0x0001");
		stores1.treasury.appendEvent({
			type: "shield",
			token: ETH,
			amount: note.amount,
			timestamp: Date.now(),
		});
		stores1.close();

		// Second session: verify data persisted
		const stores2 = createSqliteStores(dbPath);
		expect(stores2.treasury.hasCommitment("0x0001")).toBe(true);
		expect(stores2.treasury.getUTXO("0x0001")!.amount).toBe(
			1_000_000_000_000_000_000n,
		);
		expect(stores2.treasury.getCommitmentForNullifier("0x1000")).toBe(
			"0x0001",
		);
		expect(stores2.treasury.getEvents()).toHaveLength(1);

		// Spend the note in session 2
		stores2.treasury.markSpent("0x1000", "0x0001");
		stores2.close();

		// Third session: verify spend persisted
		const stores3 = createSqliteStores(dbPath);
		expect(stores3.treasury.isNullifierSpent("0x1000")).toBe(true);
		expect(stores3.treasury.isCommitmentSpent("0x0001")).toBe(true);
		expect(stores3.treasury.getAllUnspentUTXOs()).toHaveLength(0);
		stores3.close();
	});

	it("policy rules and spend tracking survive restart", () => {
		const stores1 = createSqliteStores(dbPath);
		stores1.policy.setRule({
			id: "limit-1",
			name: "Daily ETH",
			type: "spend_limit",
			priority: 1,
			enabled: true,
			token: ETH,
			maxAmount: 5_000_000_000_000_000_000n,
			period: "daily",
		});
		stores1.policy.setSpend("0xeth:1:daily", 2_000_000_000_000_000_000n, Date.now());
		stores1.close();

		const stores2 = createSqliteStores(dbPath);
		const rules = stores2.policy.listRules();
		expect(rules).toHaveLength(1);
		expect(rules[0].id).toBe("limit-1");

		const spend = stores2.policy.getSpend("0xeth:1:daily");
		expect(spend!.amount).toBe(2_000_000_000_000_000_000n);
		stores2.close();
	});

	it("sessions survive restart", () => {
		const stores1 = createSqliteStores(dbPath);
		stores1.session.save({
			id: "sess-1",
			agentId: "agent-x",
			privacyLevel: PrivacyLevel.FULL,
			createdAt: 1000,
			expiresAt: 999999,
			state: SessionState.ACTIVE,
			operations: [{ type: "pay", timestamp: 1500, status: "completed" }],
		});
		stores1.close();

		const stores2 = createSqliteStores(dbPath);
		const session = stores2.session.get("sess-1");
		expect(session).toBeDefined();
		expect(session!.agentId).toBe("agent-x");
		expect(session!.operations).toHaveLength(1);
		expect(session!.operations[0].status).toBe("completed");
		stores2.close();
	});

	it("createSqliteStores factory returns all three stores", () => {
		const stores = createSqliteStores(":memory:");
		expect(stores.treasury).toBeInstanceOf(SqliteTreasuryStore);
		expect(stores.policy).toBeInstanceOf(SqlitePolicyStore);
		expect(stores.session).toBeInstanceOf(SqliteSessionStore);
		expect(typeof stores.close).toBe("function");
		stores.close();
	});
});
