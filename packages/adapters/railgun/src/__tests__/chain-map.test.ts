import { describe, it, expect } from "vitest";
import {
	chainIdToNetworkName,
	networkNameToChainId,
	SUPPORTED_CHAINS,
} from "../chain-map";

describe("chain-map", () => {
	describe("chainIdToNetworkName", () => {
		it("maps Ethereum mainnet", () => {
			expect(chainIdToNetworkName(1)).toBe("Ethereum");
		});

		it("maps BNB Chain", () => {
			expect(chainIdToNetworkName(56)).toBe("BNB_Chain");
		});

		it("maps Polygon", () => {
			expect(chainIdToNetworkName(137)).toBe("Polygon");
		});

		it("maps Arbitrum", () => {
			expect(chainIdToNetworkName(42161)).toBe("Arbitrum");
		});

		it("throws for unsupported chain ID", () => {
			expect(() => chainIdToNetworkName(999)).toThrow(
				"Unsupported chain ID for Railgun: 999",
			);
		});
	});

	describe("networkNameToChainId", () => {
		it("maps Ethereum to 1", () => {
			expect(networkNameToChainId("Ethereum")).toBe(1);
		});

		it("maps BNB_Chain to 56", () => {
			expect(networkNameToChainId("BNB_Chain")).toBe(56);
		});

		it("maps Polygon to 137", () => {
			expect(networkNameToChainId("Polygon")).toBe(137);
		});

		it("maps Arbitrum to 42161", () => {
			expect(networkNameToChainId("Arbitrum")).toBe(42161);
		});

		it("throws for unknown network", () => {
			expect(() =>
				networkNameToChainId("Unknown" as never),
			).toThrow("Unknown Railgun network: Unknown");
		});
	});

	describe("round-trip", () => {
		it("chain → network → chain preserves ID for all supported chains", () => {
			for (const chainId of SUPPORTED_CHAINS) {
				const network = chainIdToNetworkName(chainId);
				expect(networkNameToChainId(network)).toBe(chainId);
			}
		});
	});

	describe("SUPPORTED_CHAINS", () => {
		it("contains exactly [1, 56, 137, 42161]", () => {
			expect([...SUPPORTED_CHAINS].sort((a, b) => a - b)).toEqual([
				1, 56, 137, 42161,
			]);
		});
	});
});
