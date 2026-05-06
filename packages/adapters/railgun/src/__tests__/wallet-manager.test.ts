import { describe, it, expect, beforeEach } from "vitest";
import { WalletManager } from "../wallet-manager";
import {
	createMockProvider,
	makeConfig,
	MOCK_WALLET_ID,
	MOCK_ENCRYPTION_KEY,
	MOCK_MNEMONIC,
} from "./helpers";
import type { RailgunProvider } from "../types";
import { RailgunErrorCode } from "../errors";

describe("WalletManager", () => {
	let provider: RailgunProvider;
	let manager: WalletManager;

	beforeEach(() => {
		provider = createMockProvider();
		manager = new WalletManager(provider);
	});

	describe("initialize", () => {
		it("initializes with mnemonic and creates wallet", async () => {
			await manager.initialize(makeConfig());

			expect(provider.startEngine).toHaveBeenCalledOnce();
			expect(provider.createWallet).toHaveBeenCalledWith(
				MOCK_ENCRYPTION_KEY,
				MOCK_MNEMONIC,
			);
			expect(provider.loadWallet).not.toHaveBeenCalled();
		});

		it("initializes with walletId and loads wallet", async () => {
			await manager.initialize(
				makeConfig({
					mnemonic: undefined,
					walletId: "existing-wallet",
				}),
			);

			expect(provider.loadWallet).toHaveBeenCalledWith(
				MOCK_ENCRYPTION_KEY,
				"existing-wallet",
			);
			expect(provider.createWallet).not.toHaveBeenCalled();
		});

		it("stores correct state after init", async () => {
			await manager.initialize(makeConfig());

			const state = manager.getState();
			expect(state.networkName).toBe("Ethereum");
			expect(state.chainId).toBe(1);
			expect(state.walletId).toBe(MOCK_WALLET_ID);
			expect(state.encryptionKey).toBe(MOCK_ENCRYPTION_KEY);
			expect(state.initialized).toBe(true);
		});

		it("maps chain 137 to Polygon", async () => {
			await manager.initialize(makeConfig({ chainId: 137 }));
			expect(manager.getState().networkName).toBe("Polygon");
		});

		it("maps chain 42161 to Arbitrum", async () => {
			await manager.initialize(makeConfig({ chainId: 42161 }));
			expect(manager.getState().networkName).toBe("Arbitrum");
		});
	});

	describe("config validation", () => {
		it("rejects missing encryptionKey", async () => {
			await expect(
				manager.initialize(makeConfig({ encryptionKey: "" })),
			).rejects.toThrow("encryptionKey is required");
		});

		it("rejects missing mnemonic and walletId", async () => {
			await expect(
				manager.initialize(
					makeConfig({ mnemonic: undefined, walletId: undefined }),
				),
			).rejects.toThrow("Either mnemonic or walletId is required");
		});

		it("rejects both mnemonic and walletId", async () => {
			await expect(
				manager.initialize(
					makeConfig({ mnemonic: MOCK_MNEMONIC, walletId: "some-id" }),
				),
			).rejects.toThrow("mnemonic and walletId are mutually exclusive");
		});

		it("rejects unsupported chain ID", async () => {
			await expect(
				manager.initialize(makeConfig({ chainId: 999 })),
			).rejects.toThrow("Unsupported chain ID: 999");
		});
	});

	describe("getState", () => {
		it("throws before initialization", () => {
			expect(() => manager.getState()).toThrow(
				RailgunErrorCode.NOT_INITIALIZED,
			);
		});
	});

	describe("isInitialized", () => {
		it("returns false before init", () => {
			expect(manager.isInitialized()).toBe(false);
		});

		it("returns true after init", async () => {
			await manager.initialize(makeConfig());
			expect(manager.isInitialized()).toBe(true);
		});
	});

	describe("shutdown", () => {
		it("calls provider shutdown and clears state", async () => {
			await manager.initialize(makeConfig());
			await manager.shutdown();

			expect(provider.shutdown).toHaveBeenCalledOnce();
			expect(manager.isInitialized()).toBe(false);
		});
	});
});
