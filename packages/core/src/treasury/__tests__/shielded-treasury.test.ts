import { describe, it, expect, beforeEach } from "vitest";
import { ShieldedTreasuryImpl } from "../shielded-treasury";
import type { Address, Hex, TokenInfo, UTXONote } from "@pas/types";

const USDC: TokenInfo = {
	address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
	symbol: "USDC",
	decimals: 6,
	chainId: 1,
};

const ETH: TokenInfo = {
	address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address,
	symbol: "ETH",
	decimals: 18,
	chainId: 1,
};

let noteIndex = 0;
function makeNote(
	token: TokenInfo,
	amount: bigint,
	overrides: Partial<UTXONote> = {},
): UTXONote {
	noteIndex++;
	return {
		commitment: `0x${noteIndex.toString(16).padStart(64, "0")}` as Hex,
		amount,
		token,
		blinding: `0x${(noteIndex + 1000).toString(16).padStart(64, "0")}` as Hex,
		index: noteIndex,
		...overrides,
	};
}

describe("ShieldedTreasuryImpl", () => {
	let treasury: ShieldedTreasuryImpl;

	beforeEach(() => {
		treasury = new ShieldedTreasuryImpl();
		noteIndex = 0;
	});

	describe("getBalance", () => {
		it("returns 0 for empty treasury", async () => {
			const balance = await treasury.getBalance(USDC);
			expect(balance).toBe(0n);
		});

		it("returns correct balance after adding a note", async () => {
			await treasury.addNote(makeNote(USDC, 500n));
			const balance = await treasury.getBalance(USDC);
			expect(balance).toBe(500n);
		});

		it("sums multiple notes for same token", async () => {
			await treasury.addNote(makeNote(USDC, 300n));
			await treasury.addNote(makeNote(USDC, 200n));
			const balance = await treasury.getBalance(USDC);
			expect(balance).toBe(500n);
		});

		it("keeps independent balances per token", async () => {
			await treasury.addNote(makeNote(USDC, 300n));
			await treasury.addNote(makeNote(ETH, 1000n));

			expect(await treasury.getBalance(USDC)).toBe(300n);
			expect(await treasury.getBalance(ETH)).toBe(1000n);
		});
	});

	describe("addNote / spendNote", () => {
		it("reduces balance when note is spent", async () => {
			const note = makeNote(USDC, 500n);
			await treasury.addNote(note);
			expect(await treasury.getBalance(USDC)).toBe(500n);

			await treasury.spendNote(note.blinding);
			expect(await treasury.getBalance(USDC)).toBe(0n);
		});

		it("throws on duplicate commitment", async () => {
			const note = makeNote(USDC, 100n);
			await treasury.addNote(note);

			await expect(treasury.addNote(note)).rejects.toThrow(
				"Duplicate commitment",
			);
		});

		it("throws on double spend", async () => {
			const note = makeNote(USDC, 100n);
			await treasury.addNote(note);
			await treasury.spendNote(note.blinding);

			await expect(treasury.spendNote(note.blinding)).rejects.toThrow(
				"Double spend",
			);
		});

		it("throws on unknown nullifier", async () => {
			await expect(
				treasury.spendNote("0xdeadbeef" as Hex),
			).rejects.toThrow("Unknown nullifier");
		});
	});

	describe("getBalances", () => {
		it("groups balances by token", async () => {
			await treasury.addNote(makeNote(USDC, 100n));
			await treasury.addNote(makeNote(USDC, 200n));
			await treasury.addNote(makeNote(ETH, 500n));

			const balances = await treasury.getBalances();
			expect(balances).toHaveLength(2);

			const usdcBal = balances.find((b) => b.token.symbol === "USDC");
			const ethBal = balances.find((b) => b.token.symbol === "ETH");

			expect(usdcBal!.shielded).toBe(300n);
			expect(usdcBal!.pending).toBe(0n);
			expect(ethBal!.shielded).toBe(500n);
		});

		it("excludes spent notes from balances", async () => {
			const note1 = makeNote(USDC, 100n);
			const note2 = makeNote(USDC, 200n);
			await treasury.addNote(note1);
			await treasury.addNote(note2);

			await treasury.spendNote(note1.blinding);

			const balances = await treasury.getBalances();
			const usdcBal = balances.find((b) => b.token.symbol === "USDC");
			expect(usdcBal!.shielded).toBe(200n);
		});
	});

	describe("selectUTXOs", () => {
		it("returns empty array for zero amount", async () => {
			await treasury.addNote(makeNote(USDC, 100n));
			const selected = await treasury.selectUTXOs(USDC, 0n);
			expect(selected).toEqual([]);
		});

		it("selects UTXOs to cover requested amount", async () => {
			await treasury.addNote(makeNote(USDC, 300n));
			await treasury.addNote(makeNote(USDC, 200n));

			const selected = await treasury.selectUTXOs(USDC, 250n);
			// Should pick the 300n note first (greedy, largest first)
			expect(selected).toHaveLength(1);
			expect(selected[0].amount).toBe(300n);
		});

		it("selects multiple UTXOs if needed", async () => {
			await treasury.addNote(makeNote(USDC, 100n));
			await treasury.addNote(makeNote(USDC, 100n));
			await treasury.addNote(makeNote(USDC, 100n));

			const selected = await treasury.selectUTXOs(USDC, 250n);
			expect(selected).toHaveLength(3);
		});

		it("throws on insufficient balance", async () => {
			await treasury.addNote(makeNote(USDC, 100n));

			await expect(
				treasury.selectUTXOs(USDC, 500n),
			).rejects.toThrow("Insufficient balance");
		});

		it("excludes spent UTXOs from selection", async () => {
			const note1 = makeNote(USDC, 300n);
			const note2 = makeNote(USDC, 200n);
			await treasury.addNote(note1);
			await treasury.addNote(note2);

			await treasury.spendNote(note1.blinding);

			// Only 200n available now
			await expect(
				treasury.selectUTXOs(USDC, 250n),
			).rejects.toThrow("Insufficient balance");

			const selected = await treasury.selectUTXOs(USDC, 200n);
			expect(selected).toHaveLength(1);
			expect(selected[0].amount).toBe(200n);
		});

		it("picks largest UTXOs first (greedy)", async () => {
			await treasury.addNote(makeNote(USDC, 50n));
			await treasury.addNote(makeNote(USDC, 500n));
			await treasury.addNote(makeNote(USDC, 200n));

			const selected = await treasury.selectUTXOs(USDC, 600n);
			// Should pick 500, then 200 (total 700 ≥ 600)
			expect(selected).toHaveLength(2);
			expect(selected[0].amount).toBe(500n);
			expect(selected[1].amount).toBe(200n);
		});
	});

	describe("getHistory", () => {
		it("returns all events when no filter", async () => {
			const note = makeNote(USDC, 100n);
			await treasury.addNote(note);
			await treasury.spendNote(note.blinding);

			const history = await treasury.getHistory();
			expect(history).toHaveLength(2);
			expect(history[0].type).toBe("shield");
			expect(history[1].type).toBe("unshield");
		});

		it("filters by token", async () => {
			await treasury.addNote(makeNote(USDC, 100n));
			await treasury.addNote(makeNote(ETH, 200n));

			const history = await treasury.getHistory({ token: USDC });
			expect(history).toHaveLength(1);
			expect(history[0].token.symbol).toBe("USDC");
		});

		it("limits results", async () => {
			await treasury.addNote(makeNote(USDC, 100n));
			await treasury.addNote(makeNote(USDC, 200n));
			await treasury.addNote(makeNote(USDC, 300n));

			const history = await treasury.getHistory({ limit: 2 });
			expect(history).toHaveLength(2);
			// Should return the last 2 events
			expect(history[0].amount).toBe(200n);
			expect(history[1].amount).toBe(300n);
		});
	});
});
