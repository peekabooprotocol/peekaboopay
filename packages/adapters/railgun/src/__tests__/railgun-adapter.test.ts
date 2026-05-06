import { describe, it, expect, beforeEach } from "vitest";
import { RailgunAdapter } from "../railgun-adapter";
import {
	createMockProvider,
	makeConfig,
	USDC,
	ETH_TOKEN,
	MOCK_VIEWING_KEY,
} from "./helpers";
import type { Hex, Proof } from "@peekaboopay/types";
import type { RailgunProvider } from "../types";
import { RailgunErrorCode } from "../errors";

describe("RailgunAdapter", () => {
	let provider: RailgunProvider;
	let adapter: RailgunAdapter;

	beforeEach(() => {
		provider = createMockProvider();
		adapter = new RailgunAdapter(provider);
	});

	describe("metadata", () => {
		it('has name "railgun"', () => {
			expect(adapter.name).toBe("railgun");
		});

		it("supports 4 chains", () => {
			expect(adapter.supportedChains).toEqual(
				expect.arrayContaining([1, 56, 137, 42161]),
			);
			expect(adapter.supportedChains).toHaveLength(4);
		});
	});

	describe("initialize", () => {
		it("initializes successfully with valid config", async () => {
			await expect(
				adapter.initialize(makeConfig()),
			).resolves.not.toThrow();
		});

		it("rejects invalid config", async () => {
			await expect(
				adapter.initialize(makeConfig({ encryptionKey: "" })),
			).rejects.toThrow("encryptionKey is required");
		});
	});

	describe("not-initialized guards", () => {
		it("shield returns failure", async () => {
			const result = await adapter.shield({
				token: USDC,
				amount: 100n,
				recipient: "0x1" as Hex,
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe(RailgunErrorCode.NOT_INITIALIZED);
			}
		});

		it("unshield returns failure", async () => {
			const result = await adapter.unshield({
				token: USDC,
				amount: 100n,
				recipient: "0x1" as Hex,
				proof: { protocol: "groth16", proof: "0x" as Hex, publicInputs: [] },
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe(RailgunErrorCode.NOT_INITIALIZED);
			}
		});

		it("transfer returns failure", async () => {
			const result = await adapter.transfer({
				token: USDC,
				amount: 100n,
				recipientPublicKey: "0x1" as Hex,
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe(RailgunErrorCode.NOT_INITIALIZED);
			}
		});

		it("generateProof returns failure", async () => {
			const result = await adapter.generateProof({
				circuit: "test",
				inputs: {},
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe(RailgunErrorCode.NOT_INITIALIZED);
			}
		});

		it("verifyProof returns false", async () => {
			const result = await adapter.verifyProof({
				protocol: "groth16",
				proof: "0x" as Hex,
				publicInputs: [],
			});
			expect(result).toBe(false);
		});

		it("getShieldedBalance throws", async () => {
			await expect(
				adapter.getShieldedBalance(USDC, MOCK_VIEWING_KEY),
			).rejects.toThrow("not initialized");
		});
	});

	describe("full lifecycle", () => {
		beforeEach(async () => {
			await adapter.initialize(makeConfig());
		});

		it("shield → transfer → unshield → balance check", async () => {
			// Shield
			const shieldResult = await adapter.shield({
				token: USDC,
				amount: 1_000_000n,
				recipient: "0xRecipient" as Hex,
			});
			expect(shieldResult.success).toBe(true);
			if (shieldResult.success) {
				expect(shieldResult.data.utxo.amount).toBe(1_000_000n);
				expect(shieldResult.data.utxo.token.symbol).toBe("USDC");
			}

			// Transfer
			const transferResult = await adapter.transfer({
				token: USDC,
				amount: 500_000n,
				recipientPublicKey: "0xPubKey" as Hex,
				memo: "test payment",
			});
			expect(transferResult.success).toBe(true);
			if (transferResult.success) {
				expect(transferResult.data.nullifier).toBeDefined();
				expect(transferResult.data.commitment).toBeDefined();
			}

			// Unshield
			const unshieldResult = await adapter.unshield({
				token: USDC,
				amount: 500_000n,
				recipient: "0xDestination" as Hex,
				proof: {
					protocol: "groth16",
					proof: "0xproof" as Hex,
					publicInputs: ["0xinput" as Hex],
				},
			});
			expect(unshieldResult.success).toBe(true);

			// Balance check
			const balance = await adapter.getShieldedBalance(
				USDC,
				MOCK_VIEWING_KEY,
			);
			expect(balance).toBe(1_000_000n);
		});

		it("generates and verifies a proof", async () => {
			const genResult = await adapter.generateProof({
				circuit: "withdraw",
				inputs: { root: "0x1", nullifier: "0x2" },
			});

			expect(genResult.success).toBe(true);
			if (genResult.success) {
				expect(genResult.data.protocol).toBe("groth16");

				const verified = await adapter.verifyProof(genResult.data);
				expect(verified).toBe(true);
			}
		});

		it("returns 0n balance for unknown token", async () => {
			const balance = await adapter.getShieldedBalance(
				ETH_TOKEN,
				MOCK_VIEWING_KEY,
			);
			expect(balance).toBe(0n);
		});
	});

	describe("error propagation", () => {
		beforeEach(async () => {
			await adapter.initialize(makeConfig());
		});

		it("maps shield provider errors to PASResult failures", async () => {
			(provider.populateShield as ReturnType<typeof import("vitest").vi.fn>).mockRejectedValue(
				new Error("Transaction simulation failed"),
			);

			const result = await adapter.shield({
				token: USDC,
				amount: 1n,
				recipient: "0x1" as Hex,
			});

			expect(result.success).toBe(false);
		});

		it("maps transfer provider errors to PASResult failures", async () => {
			(provider.populateTransfer as ReturnType<typeof import("vitest").vi.fn>).mockRejectedValue(
				new Error("insufficient balance for transfer"),
			);

			const result = await adapter.transfer({
				token: USDC,
				amount: 1n,
				recipientPublicKey: "0x1" as Hex,
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe(RailgunErrorCode.BALANCE_SCAN_FAILED);
			}
		});
	});
});
