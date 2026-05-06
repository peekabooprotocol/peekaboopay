import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SessionManagerImpl } from "../session-manager";
import { PrivacyLevel, SessionState } from "@peekaboopay/types";
import type { SessionConfig } from "@peekaboopay/types";

const makeConfig = (
	overrides: Partial<SessionConfig> = {},
): SessionConfig => ({
	agentId: "agent-1",
	privacyLevel: PrivacyLevel.FULL,
	ttl: 60_000, // 1 minute
	allowedOperations: ["pay", "receive"],
	...overrides,
});

describe("SessionManagerImpl", () => {
	let manager: SessionManagerImpl;

	beforeEach(() => {
		vi.useFakeTimers();
		manager = new SessionManagerImpl();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("create", () => {
		it("creates a session with correct fields", async () => {
			vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));
			const session = await manager.create(makeConfig({ ttl: 30_000 }));

			expect(session.id).toBeTruthy();
			expect(session.agentId).toBe("agent-1");
			expect(session.privacyLevel).toBe(PrivacyLevel.FULL);
			expect(session.state).toBe(SessionState.ACTIVE);
			expect(session.operations).toEqual([]);
			expect(session.expiresAt).toBe(session.createdAt + 30_000);
		});

		it("generates unique IDs", async () => {
			const s1 = await manager.create(makeConfig());
			const s2 = await manager.create(makeConfig());
			expect(s1.id).not.toBe(s2.id);
		});
	});

	describe("get", () => {
		it("retrieves an existing session", async () => {
			const created = await manager.create(makeConfig());
			const retrieved = await manager.get(created.id);
			expect(retrieved).not.toBeNull();
			expect(retrieved!.id).toBe(created.id);
			expect(retrieved!.agentId).toBe("agent-1");
		});

		it("returns null for non-existent session", async () => {
			const result = await manager.get("nonexistent-id");
			expect(result).toBeNull();
		});

		it("auto-transitions active sessions to expired", async () => {
			const session = await manager.create(makeConfig({ ttl: 10_000 }));
			expect(session.state).toBe(SessionState.ACTIVE);

			// Advance past TTL
			vi.advanceTimersByTime(15_000);

			const retrieved = await manager.get(session.id);
			expect(retrieved!.state).toBe(SessionState.EXPIRED);
		});

		it("does not re-transition already expired sessions", async () => {
			const session = await manager.create(makeConfig({ ttl: 10_000 }));

			vi.advanceTimersByTime(15_000);
			const first = await manager.get(session.id);
			expect(first!.state).toBe(SessionState.EXPIRED);

			// Getting again should still be expired
			const second = await manager.get(session.id);
			expect(second!.state).toBe(SessionState.EXPIRED);
		});

		it("does not expire sessions within TTL", async () => {
			const session = await manager.create(makeConfig({ ttl: 60_000 }));

			vi.advanceTimersByTime(30_000);
			const retrieved = await manager.get(session.id);
			expect(retrieved!.state).toBe(SessionState.ACTIVE);
		});
	});

	describe("destroy", () => {
		it("sets session state to TERMINATED", async () => {
			const session = await manager.create(makeConfig());
			await manager.destroy(session.id);

			const retrieved = await manager.get(session.id);
			expect(retrieved!.state).toBe(SessionState.TERMINATED);
		});

		it("is idempotent on non-existent session", async () => {
			// Should not throw
			await expect(
				manager.destroy("nonexistent"),
			).resolves.toBeUndefined();
		});
	});

	describe("cleanup", () => {
		it("removes expired sessions", async () => {
			await manager.create(makeConfig({ ttl: 5_000 }));
			await manager.create(makeConfig({ ttl: 5_000 }));
			await manager.create(makeConfig({ ttl: 120_000 }));

			vi.advanceTimersByTime(10_000);

			const removed = await manager.cleanup();
			expect(removed).toBe(2);
		});

		it("removes terminated sessions", async () => {
			const s1 = await manager.create(makeConfig());
			await manager.create(makeConfig());

			await manager.destroy(s1.id);

			const removed = await manager.cleanup();
			expect(removed).toBe(1);
		});

		it("does not remove active non-expired sessions", async () => {
			await manager.create(makeConfig({ ttl: 120_000 }));

			vi.advanceTimersByTime(10_000);

			const removed = await manager.cleanup();
			expect(removed).toBe(0);
		});

		it("returns 0 when no sessions exist", async () => {
			const removed = await manager.cleanup();
			expect(removed).toBe(0);
		});
	});
});
