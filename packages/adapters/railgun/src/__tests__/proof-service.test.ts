import { describe, it, expect, beforeEach } from "vitest";
import { ProofService } from "../proof-service";
import { createMockProvider, MOCK_WALLET_ID, MOCK_ENCRYPTION_KEY } from "./helpers";
import type { Hex, Proof } from "@peekaboopay/types";
import type { RailgunProvider, RailgunState } from "../types";

describe("ProofService", () => {
	let provider: RailgunProvider;
	let service: ProofService;
	const state: RailgunState = {
		networkName: "Ethereum",
		chainId: 1,
		walletId: MOCK_WALLET_ID,
		encryptionKey: MOCK_ENCRYPTION_KEY,
		initialized: true,
	};

	beforeEach(() => {
		provider = createMockProvider();
		service = new ProofService(() => state, provider);
	});

	describe("generate", () => {
		it("generates proof with groth16 protocol", async () => {
			const result = await service.generate({
				circuit: "withdraw",
				inputs: { root: "0x123", nullifier: "0x456" },
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.protocol).toBe("groth16");
				expect(result.data.proof).toBeDefined();
				expect(result.data.publicInputs).toBeInstanceOf(Array);
				expect(result.data.publicInputs.length).toBeGreaterThan(0);
			}
		});

		it("passes circuit and inputs to provider", async () => {
			const inputs = { root: "0xabc", amount: 100 };
			await service.generate({ circuit: "transfer", inputs });

			expect(provider.generateProof).toHaveBeenCalledWith(
				"Ethereum",
				"transfer",
				inputs,
			);
		});

		it("returns failure on provider error", async () => {
			(provider.generateProof as ReturnType<typeof import("vitest").vi.fn>).mockRejectedValue(
				new Error("Failed to load snark artifacts"),
			);

			const result = await service.generate({
				circuit: "withdraw",
				inputs: {},
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toContain("ARTIFACT");
			}
		});
	});

	describe("verify", () => {
		const validProof: Proof = {
			protocol: "groth16",
			proof: "0xvalidproof" as Hex,
			publicInputs: ["0xinput1" as Hex, "0xinput2" as Hex],
		};

		it("returns true for valid proof", async () => {
			const result = await service.verify(validProof);
			expect(result).toBe(true);
		});

		it("passes proof and publicInputs to provider", async () => {
			await service.verify(validProof);

			expect(provider.verifyProof).toHaveBeenCalledWith(
				"0xvalidproof",
				["0xinput1", "0xinput2"],
			);
		});

		it("returns false for invalid proof", async () => {
			(provider.verifyProof as ReturnType<typeof import("vitest").vi.fn>).mockResolvedValue(false);

			const result = await service.verify(validProof);
			expect(result).toBe(false);
		});

		it("returns false when provider throws", async () => {
			(provider.verifyProof as ReturnType<typeof import("vitest").vi.fn>).mockRejectedValue(
				new Error("Verification error"),
			);

			const result = await service.verify(validProof);
			expect(result).toBe(false);
		});
	});
});
