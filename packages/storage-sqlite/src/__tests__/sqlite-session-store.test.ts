import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { SqliteSessionStore } from "../sqlite-session-store";
import type { Session } from "@pas/types";
import { PrivacyLevel, SessionState } from "@pas/types";

function makeSession(overrides: Partial<Session> = {}): Session {
	return {
		id: "sess-001",
		agentId: "agent-1",
		privacyLevel: PrivacyLevel.FULL,
		createdAt: 1000,
		expiresAt: 2000,
		state: SessionState.ACTIVE,
		operations: [],
		...overrides,
	};
}

describe("SqliteSessionStore", () => {
	let db: Database.Database;
	let store: SqliteSessionStore;

	beforeEach(() => {
		db = new Database(":memory:");
		store = new SqliteSessionStore(db);
	});

	afterEach(() => {
		db.close();
	});

	describe("save / get / delete", () => {
		it("save and get round-trip", () => {
			const session = makeSession();
			store.save(session);

			const retrieved = store.get("sess-001");
			expect(retrieved).toBeDefined();
			expect(retrieved!.id).toBe("sess-001");
			expect(retrieved!.agentId).toBe("agent-1");
			expect(retrieved!.privacyLevel).toBe(PrivacyLevel.FULL);
			expect(retrieved!.state).toBe(SessionState.ACTIVE);
		});

		it("get returns undefined for missing session", () => {
			expect(store.get("nonexistent")).toBeUndefined();
		});

		it("save updates existing session (upsert)", () => {
			store.save(makeSession());
			store.save(makeSession({ state: SessionState.TERMINATED }));

			const retrieved = store.get("sess-001");
			expect(retrieved!.state).toBe(SessionState.TERMINATED);
		});

		it("delete removes a session", () => {
			store.save(makeSession());
			store.delete("sess-001");
			expect(store.get("sess-001")).toBeUndefined();
		});

		it("delete is idempotent for missing ID", () => {
			store.delete("nonexistent"); // should not throw
		});
	});

	describe("operations JSON round-trip", () => {
		it("preserves operations array", () => {
			const session = makeSession({
				operations: [
					{ type: "pay", timestamp: 1500, status: "completed" },
					{
						type: "swap",
						timestamp: 1600,
						status: "pending",
						metadata: { dex: "uniswap" },
					},
				],
			});
			store.save(session);

			const retrieved = store.get("sess-001");
			expect(retrieved!.operations).toHaveLength(2);
			expect(retrieved!.operations[0].type).toBe("pay");
			expect(retrieved!.operations[1].metadata).toEqual({ dex: "uniswap" });
		});

		it("handles empty operations array", () => {
			store.save(makeSession());
			const retrieved = store.get("sess-001");
			expect(retrieved!.operations).toEqual([]);
		});
	});

	describe("listExpiredOrTerminated", () => {
		it("returns terminated sessions", () => {
			store.save(makeSession({ id: "s1", state: SessionState.TERMINATED }));
			store.save(makeSession({ id: "s2", state: SessionState.ACTIVE, expiresAt: 99999 }));

			const ids = store.listExpiredOrTerminated(1500);
			expect(ids).toContain("s1");
			expect(ids).not.toContain("s2");
		});

		it("returns expired sessions (expiresAt < now)", () => {
			store.save(makeSession({ id: "s1", state: SessionState.ACTIVE, expiresAt: 1000 }));
			store.save(makeSession({ id: "s2", state: SessionState.ACTIVE, expiresAt: 3000 }));

			const ids = store.listExpiredOrTerminated(2000);
			expect(ids).toContain("s1");
			expect(ids).not.toContain("s2");
		});

		it("returns sessions already marked EXPIRED", () => {
			store.save(makeSession({ id: "s1", state: SessionState.EXPIRED, expiresAt: 5000 }));

			const ids = store.listExpiredOrTerminated(1000);
			expect(ids).toContain("s1");
		});

		it("returns empty array when no expired or terminated", () => {
			store.save(makeSession({ id: "s1", state: SessionState.ACTIVE, expiresAt: 99999 }));
			expect(store.listExpiredOrTerminated(1000)).toEqual([]);
		});
	});
});
