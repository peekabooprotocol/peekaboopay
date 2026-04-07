import { describe, it, expect, beforeEach } from "vitest";
import { BalanceScanner } from "../balance-scanner";
import {
	createMockProvider,
	USDC,
	ETH_TOKEN,
	MOCK_WALLET_ID,
	MOCK_ENCRYPTION_KEY,
	MOCK_VIEWING_KEY,
} from "./helpers";
import type { RailgunProvider, RailgunState } from "../types";

describe("BalanceScanner", () => {
	let provider: RailgunProvider;
	let scanner: BalanceScanner;
	const state: RailgunState = {
		networkName: "Ethereum",
		chainId: 1,
		walletId: MOCK_WALLET_ID,
		encryptionKey: MOCK_ENCRYPTION_KEY,
		initialized: true,
	};

	beforeEach(() => {
		provider = createMockProvider();
		scanner = new BalanceScanner(() => state, provider);
	});

	it("returns balance for known token", async () => {
		const balance = await scanner.getBalance(USDC, MOCK_VIEWING_KEY);
		expect(balance).toBe(1_000_000n);
	});

	it("returns 0n for unknown token", async () => {
		const balance = await scanner.getBalance(ETH_TOKEN, MOCK_VIEWING_KEY);
		expect(balance).toBe(0n);
	});

	it("triggers refresh before querying", async () => {
		await scanner.getBalance(USDC, MOCK_VIEWING_KEY);

		expect(provider.refreshBalances).toHaveBeenCalledWith(
			"Ethereum",
			MOCK_WALLET_ID,
		);
		expect(provider.getBalances).toHaveBeenCalledWith(
			"Ethereum",
			MOCK_WALLET_ID,
		);
	});

	it("matches token address case-insensitively", async () => {
		// The mock returns lowercase address, USDC fixture has mixed case
		const balance = await scanner.getBalance(USDC, MOCK_VIEWING_KEY);
		expect(balance).toBe(1_000_000n);
	});

	it("handles multiple token balances", async () => {
		(provider.getBalances as ReturnType<typeof import("vitest").vi.fn>).mockResolvedValue([
			{
				tokenAddress: USDC.address.toLowerCase(),
				balance: 500_000n,
			},
			{
				tokenAddress: ETH_TOKEN.address.toLowerCase(),
				balance: 2_000_000_000_000_000_000n,
			},
		]);

		const usdcBalance = await scanner.getBalance(USDC, MOCK_VIEWING_KEY);
		const ethBalance = await scanner.getBalance(ETH_TOKEN, MOCK_VIEWING_KEY);

		expect(usdcBalance).toBe(500_000n);
		expect(ethBalance).toBe(2_000_000_000_000_000_000n);
	});

	it("returns 0n when wallet has no balances", async () => {
		(provider.getBalances as ReturnType<typeof import("vitest").vi.fn>).mockResolvedValue([]);

		const balance = await scanner.getBalance(USDC, MOCK_VIEWING_KEY);
		expect(balance).toBe(0n);
	});
});
