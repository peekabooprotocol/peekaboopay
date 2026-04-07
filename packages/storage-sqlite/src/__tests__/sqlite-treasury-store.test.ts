import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { SqliteTreasuryStore } from "../sqlite-treasury-store";
import type { Hex, UTXONote, TokenInfo, TreasuryEvent } from "@peekaboopay/types";

const ETH: TokenInfo = {
	address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Hex,
	symbol: "ETH",
	decimals: 18,
	chainId: 1,
};

const USDC: TokenInfo = {
	address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Hex,
	symbol: "USDC",
	decimals: 6,
	chainId: 1,
};

function makeNote(index: number, token: TokenInfo = ETH, amount = 1000n): UTXONote {
	const hex = index.toString(16).padStart(64, "0");
	return {
		commitment: `0x${hex}` as Hex,
		amount,
		token,
		blinding: `0x${hex.split("").reverse().join("")}` as Hex,
		index,
	};
}

describe("SqliteTreasuryStore", () => {
	let db: Database.Database;
	let store: SqliteTreasuryStore;

	beforeEach(() => {
		db = new Database(":memory:");
		store = new SqliteTreasuryStore(db);
	});

	afterEach(() => {
		db.close();
	});

	describe("UTXO management", () => {
		it("addUTXO / hasCommitment / getUTXO round-trip", () => {
			const note = makeNote(1);
			store.addUTXO(note);

			expect(store.hasCommitment(note.commitment.toLowerCase())).toBe(true);
			expect(store.hasCommitment("0xnonexistent")).toBe(false);

			const retrieved = store.getUTXO(note.commitment.toLowerCase());
			expect(retrieved).toBeDefined();
			expect(retrieved!.amount).toBe(1000n);
			expect(retrieved!.token.symbol).toBe("ETH");
		});

		it("getUnspentUTXOs filters by token and excludes spent", () => {
			store.addUTXO(makeNote(1, ETH, 100n));
			store.addUTXO(makeNote(2, ETH, 200n));
			store.addUTXO(makeNote(3, USDC, 300n));

			// Spend the first note
			const note1 = makeNote(1, ETH, 100n);
			store.addNullifierMapping(
				note1.blinding.toLowerCase(),
				note1.commitment.toLowerCase(),
			);
			store.markSpent(note1.blinding.toLowerCase(), note1.commitment.toLowerCase());

			const ethUnspent = store.getUnspentUTXOs(
				ETH.address.toLowerCase(),
				ETH.chainId,
			);
			expect(ethUnspent).toHaveLength(1);
			expect(ethUnspent[0].amount).toBe(200n);

			const usdcUnspent = store.getUnspentUTXOs(
				USDC.address.toLowerCase(),
				USDC.chainId,
			);
			expect(usdcUnspent).toHaveLength(1);
		});

		it("getAllUnspentUTXOs returns all tokens, excludes spent", () => {
			store.addUTXO(makeNote(1, ETH, 100n));
			store.addUTXO(makeNote(2, USDC, 200n));

			expect(store.getAllUnspentUTXOs()).toHaveLength(2);

			const note1 = makeNote(1);
			store.addNullifierMapping(
				note1.blinding.toLowerCase(),
				note1.commitment.toLowerCase(),
			);
			store.markSpent(note1.blinding.toLowerCase(), note1.commitment.toLowerCase());

			expect(store.getAllUnspentUTXOs()).toHaveLength(1);
		});
	});

	describe("nullifier tracking", () => {
		it("addNullifierMapping and getCommitmentForNullifier", () => {
			store.addNullifierMapping("0xnull", "0xcommit");
			expect(store.getCommitmentForNullifier("0xnull")).toBe("0xcommit");
			expect(store.getCommitmentForNullifier("0xother")).toBeUndefined();
		});

		it("markSpent atomically marks both nullifier and commitment", () => {
			store.markSpent("0xnull1", "0xcommit1");

			expect(store.isNullifierSpent("0xnull1")).toBe(true);
			expect(store.isCommitmentSpent("0xcommit1")).toBe(true);
			expect(store.isNullifierSpent("0xother")).toBe(false);
			expect(store.isCommitmentSpent("0xother")).toBe(false);
		});
	});

	describe("bigint round-tripping", () => {
		it("preserves large bigint amounts beyond Number.MAX_SAFE_INTEGER", () => {
			const largeAmount = 999_999_999_999_999_999_999n;
			const note = makeNote(42, ETH, largeAmount);
			store.addUTXO(note);

			const retrieved = store.getUTXO(note.commitment.toLowerCase());
			expect(retrieved!.amount).toBe(largeAmount);
		});
	});

	describe("event log", () => {
		it("appendEvent and getEvents round-trip", () => {
			const event: TreasuryEvent = {
				type: "shield",
				token: ETH,
				amount: 500n,
				timestamp: 1000,
				metadata: { commitment: "0xabc" },
			};
			store.appendEvent(event);

			const events = store.getEvents();
			expect(events).toHaveLength(1);
			expect(events[0].type).toBe("shield");
			expect(events[0].amount).toBe(500n);
			expect(events[0].metadata).toEqual({ commitment: "0xabc" });
		});

		it("getEvents filters by token", () => {
			store.appendEvent({
				type: "shield",
				token: ETH,
				amount: 100n,
				timestamp: 1000,
			});
			store.appendEvent({
				type: "shield",
				token: USDC,
				amount: 200n,
				timestamp: 2000,
			});

			const ethEvents = store.getEvents({ token: ETH });
			expect(ethEvents).toHaveLength(1);
			expect(ethEvents[0].token.symbol).toBe("ETH");
		});

		it("getEvents filters by timestamp range", () => {
			for (let i = 1; i <= 5; i++) {
				store.appendEvent({
					type: "shield",
					token: ETH,
					amount: BigInt(i * 100),
					timestamp: i * 1000,
				});
			}

			const filtered = store.getEvents({ from: 2000, to: 4000 });
			expect(filtered).toHaveLength(3);
			expect(filtered[0].timestamp).toBe(2000);
			expect(filtered[2].timestamp).toBe(4000);
		});

		it("getEvents respects limit (most recent N)", () => {
			for (let i = 1; i <= 10; i++) {
				store.appendEvent({
					type: "shield",
					token: ETH,
					amount: BigInt(i),
					timestamp: i * 1000,
				});
			}

			const limited = store.getEvents({ limit: 3 });
			expect(limited).toHaveLength(3);
			// Should be the last 3 events
			expect(limited[0].amount).toBe(8n);
			expect(limited[2].amount).toBe(10n);
		});

		it("events without metadata return undefined metadata", () => {
			store.appendEvent({
				type: "unshield",
				token: ETH,
				amount: 100n,
				timestamp: 1000,
			});

			const events = store.getEvents();
			expect(events[0].metadata).toBeUndefined();
		});
	});
});
