import { describe, it, expect, beforeEach } from "vitest";
import { TransactionBuilder } from "../transaction-builder";
import { createMockProvider, USDC, MOCK_WALLET_ID, MOCK_ENCRYPTION_KEY } from "./helpers";
import type { Hex, Proof } from "@peekaboopay/types";
import type { RailgunProvider, RailgunState } from "../types";
import { RailgunErrorCode } from "../errors";

describe("TransactionBuilder", () => {
	let provider: RailgunProvider;
	let builder: TransactionBuilder;
	const state: RailgunState = {
		networkName: "Ethereum",
		chainId: 1,
		walletId: MOCK_WALLET_ID,
		encryptionKey: MOCK_ENCRYPTION_KEY,
		initialized: true,
	};

	beforeEach(() => {
		provider = createMockProvider();
		builder = new TransactionBuilder(() => state, provider);
	});

	describe("buildShield", () => {
		it("returns successful ShieldResult", async () => {
			const result = await builder.buildShield({
				token: USDC,
				amount: 1_000_000n,
				recipient: "0xRecipient" as Hex,
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.txHash).toMatch(/^0x/);
				expect(result.data.utxo.amount).toBe(1_000_000n);
				expect(result.data.utxo.token).toBe(USDC);
				expect(result.data.utxo.commitment).toBeDefined();
				expect(result.data.utxo.blinding).toBeDefined();
				expect(result.data.timestamp).toBeGreaterThan(0);
			}
		});

		it("passes correct args to provider", async () => {
			await builder.buildShield({
				token: USDC,
				amount: 500n,
				recipient: "0xABC" as Hex,
			});

			expect(provider.populateShield).toHaveBeenCalledWith(
				"Ethereum",
				MOCK_WALLET_ID,
				MOCK_ENCRYPTION_KEY,
				USDC.address,
				500n,
				"0xABC",
			);
		});

		it("returns failure on provider error", async () => {
			(provider.populateShield as ReturnType<typeof import("vitest").vi.fn>).mockRejectedValue(
				new Error("Shield transaction failed"),
			);

			const result = await builder.buildShield({
				token: USDC,
				amount: 1n,
				recipient: "0x1" as Hex,
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("RAILGUN_SHIELD_FAILED");
			}
		});
	});

	describe("buildUnshield", () => {
		const mockProof: Proof = {
			protocol: "groth16",
			proof: "0xproof" as Hex,
			publicInputs: ["0xinput1" as Hex],
		};

		it("returns successful UnshieldResult", async () => {
			const result = await builder.buildUnshield({
				token: USDC,
				amount: 500_000n,
				recipient: "0xRecipient" as Hex,
				proof: mockProof,
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.txHash).toMatch(/^0x/);
				expect(result.data.timestamp).toBeGreaterThan(0);
			}
		});

		it("passes correct args to provider", async () => {
			await builder.buildUnshield({
				token: USDC,
				amount: 250n,
				recipient: "0xDest" as Hex,
				proof: mockProof,
			});

			expect(provider.populateUnshield).toHaveBeenCalledWith(
				"Ethereum",
				MOCK_WALLET_ID,
				MOCK_ENCRYPTION_KEY,
				USDC.address,
				250n,
				"0xDest",
			);
		});

		it("returns failure on provider error", async () => {
			(provider.populateUnshield as ReturnType<typeof import("vitest").vi.fn>).mockRejectedValue(
				new Error("Engine not initialized"),
			);

			const result = await builder.buildUnshield({
				token: USDC,
				amount: 1n,
				recipient: "0x1" as Hex,
				proof: mockProof,
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe(RailgunErrorCode.NOT_INITIALIZED);
			}
		});
	});

	describe("buildTransfer", () => {
		it("returns successful TransferResult", async () => {
			const result = await builder.buildTransfer({
				token: USDC,
				amount: 100_000n,
				recipientPublicKey: "0xPubKey" as Hex,
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.nullifier).toBeDefined();
				expect(result.data.commitment).toBeDefined();
				expect(result.data.timestamp).toBeGreaterThan(0);
			}
		});

		it("passes memo to provider", async () => {
			await builder.buildTransfer({
				token: USDC,
				amount: 50n,
				recipientPublicKey: "0xKey" as Hex,
				memo: "Payment for services",
			});

			expect(provider.populateTransfer).toHaveBeenCalledWith(
				"Ethereum",
				MOCK_WALLET_ID,
				MOCK_ENCRYPTION_KEY,
				USDC.address,
				50n,
				"0xKey",
				"Payment for services",
			);
		});

		it("omits memo when not provided", async () => {
			await builder.buildTransfer({
				token: USDC,
				amount: 50n,
				recipientPublicKey: "0xKey" as Hex,
			});

			expect(provider.populateTransfer).toHaveBeenCalledWith(
				"Ethereum",
				MOCK_WALLET_ID,
				MOCK_ENCRYPTION_KEY,
				USDC.address,
				50n,
				"0xKey",
				undefined,
			);
		});

		it("returns failure on provider error", async () => {
			(provider.populateTransfer as ReturnType<typeof import("vitest").vi.fn>).mockRejectedValue(
				new Error("insufficient balance for transfer"),
			);

			const result = await builder.buildTransfer({
				token: USDC,
				amount: 999n,
				recipientPublicKey: "0x1" as Hex,
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe(RailgunErrorCode.BALANCE_SCAN_FAILED);
			}
		});
	});
});
