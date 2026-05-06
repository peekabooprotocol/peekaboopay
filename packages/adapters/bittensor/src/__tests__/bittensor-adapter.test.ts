import { describe, it, expect, beforeEach, vi } from "vitest";
import { BittensorAdapter } from "../bittensor-adapter.js";
import type { BittensorAdapterConfig } from "../bittensor-adapter.js";
import {
	BITTENSOR_MAINNET,
	BITTENSOR_TESTNET,
	BITTENSOR_CHAIN_IDS,
	getBittensorNetwork,
} from "../chains.js";
import { MAINNET_CONTRACTS, NATIVE_TOKEN_ADDRESS } from "../contracts.js";
import { BittensorErrorCode } from "../errors.js";
import { NoteStore } from "../note-store.js";
import type { TokenInfo } from "@peekaboopay/types";

// ---------------------------------------------------------------
// Mock ethers to avoid real RPC calls
// ---------------------------------------------------------------
vi.mock("ethers", () => {
	const mockContract = {
		deposit: vi.fn().mockResolvedValue({
			hash: "0xdeadbeef",
			wait: vi.fn().mockResolvedValue({ status: 1 }),
		}),
		depositERC20: vi.fn().mockResolvedValue({
			hash: "0xdeadbeef",
			wait: vi.fn().mockResolvedValue({ status: 1 }),
		}),
		withdraw: vi.fn().mockResolvedValue({
			hash: "0xcafebabe",
			wait: vi.fn().mockResolvedValue({ status: 1 }),
		}),
		announce: vi.fn().mockResolvedValue({
			hash: "0xannounce",
			wait: vi.fn().mockResolvedValue({ status: 1 }),
		}),
		getLatestRoot: vi.fn().mockResolvedValue("0x" + "00".repeat(32)),
		isKnownRoot: vi.fn().mockResolvedValue(true),
		isSpentNullifier: vi.fn().mockResolvedValue(false),
		getNextIndex: vi.fn().mockResolvedValue(0),
		queryFilter: vi.fn().mockResolvedValue([]),
	};

	return {
		ethers: {
			JsonRpcProvider: vi.fn().mockImplementation(() => ({})),
			Wallet: vi.fn().mockImplementation(() => ({})),
			Contract: vi.fn().mockImplementation(() => ({ ...mockContract })),
			toUtf8Bytes: vi.fn().mockReturnValue(new Uint8Array()),
		},
	};
});

// Mock @peekaboopay/crypto to avoid needing circomlibjs WASM
vi.mock("@peekaboopay/crypto", async () => {
	const actual = await vi.importActual("@peekaboopay/crypto");
	return {
		...actual,
		MerkleTree: vi.fn().mockImplementation(() => ({
			init: vi.fn().mockResolvedValue(undefined),
			insert: vi.fn().mockReturnValue(0),
			getRoot: vi.fn().mockResolvedValue(1234n),
			getProof: vi.fn().mockResolvedValue({
				pathElements: [0n, 0n, 0n, 0n, 0n],
				pathIndices: [0, 0, 0, 0, 0],
			}),
			leafCount: 0,
		})),
		generateDeposit: vi.fn().mockResolvedValue({
			nullifier: 111n,
			secret: 222n,
			commitment: 333n,
			nullifierHash: 444n,
		}),
		toBytes32Hex: (v: bigint) =>
			"0x" + v.toString(16).padStart(64, "0"),
		fromBytes32Hex: (h: string) => BigInt(h),
		generateWithdrawProof: vi.fn().mockResolvedValue({
			proof: {
				pA: [1n, 2n],
				pB: [
					[3n, 4n],
					[5n, 6n],
				],
				pC: [7n, 8n],
			},
			publicSignals: [1234n, 444n, 100n, 1000n],
			proofBytes: "0x" + "ab".repeat(256),
		}),
		verifyWithdrawProof: vi.fn().mockResolvedValue(true),
	};
});

// Mock @peekaboopay/core
vi.mock("@peekaboopay/core", () => ({
	AddressDerivationImpl: vi.fn().mockImplementation(() => ({
		generateStealthAddress: vi.fn().mockReturnValue({
			stealthAddress: "0x" + "aa".repeat(20),
			ephemeralPublicKey: "0x" + "bb".repeat(65),
			viewTag: "0xcc",
		}),
		scanForPayments: vi.fn().mockReturnValue([]),
	})),
}));

// ---------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------

const TAO_TOKEN: TokenInfo = {
	address: NATIVE_TOKEN_ADDRESS,
	symbol: "TAO",
	decimals: 18,
	chainId: 964,
};

const makeConfig = (
	overrides: Partial<BittensorAdapterConfig> = {},
): BittensorAdapterConfig => ({
	chainId: 964,
	rpcUrl: "https://lite.chain.opentensor.ai",
	privateKey: "0x" + "ab".repeat(32) as `0x${string}`,
	artifactsPath: "/fake/artifacts",
	...overrides,
});

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe("BittensorAdapter", () => {
	let adapter: BittensorAdapter;

	beforeEach(() => {
		adapter = new BittensorAdapter();
		vi.clearAllMocks();
	});

	describe("metadata", () => {
		it("has correct name", () => {
			expect(adapter.name).toBe("bittensor");
		});

		it("supports mainnet and testnet chains", () => {
			expect(adapter.supportedChains).toContain(964);
			expect(adapter.supportedChains).toContain(945);
			expect(adapter.supportedChains).toHaveLength(2);
		});

		it("is not initialized by default", () => {
			expect(adapter.isInitialized()).toBe(false);
			expect(adapter.getNetwork()).toBeNull();
			expect(adapter.getConfig()).toBeNull();
		});
	});

	describe("initialize", () => {
		it("initializes with mainnet chain ID", async () => {
			await adapter.initialize(makeConfig());
			expect(adapter.isInitialized()).toBe(true);
			expect(adapter.getNetwork()).toEqual(BITTENSOR_MAINNET);
		});

		it("initializes with testnet chain ID", async () => {
			await adapter.initialize(makeConfig({ chainId: 945 }));
			expect(adapter.isInitialized()).toBe(true);
			expect(adapter.getNetwork()).toEqual(BITTENSOR_TESTNET);
		});

		it("uses default RPC URL if none provided", async () => {
			await adapter.initialize(makeConfig({ rpcUrl: "" }));
			const config = adapter.getConfig();
			expect(config?.rpcUrl).toBe(BITTENSOR_MAINNET.rpcUrl);
		});

		it("uses custom RPC URL when provided", async () => {
			const customRpc = "https://my-custom-node.example.com";
			await adapter.initialize(makeConfig({ rpcUrl: customRpc }));
			const config = adapter.getConfig();
			expect(config?.rpcUrl).toBe(customRpc);
		});

		it("rejects unsupported chain ID", async () => {
			await expect(
				adapter.initialize(makeConfig({ chainId: 1 })),
			).rejects.toThrow("Unsupported Bittensor chain ID: 1");
		});

		it("rejects Ethereum mainnet chain ID", async () => {
			await expect(
				adapter.initialize(makeConfig({ chainId: 1 })),
			).rejects.toThrow("Supported: 964 (mainnet), 945 (testnet)");
		});

		it("stores contract addresses from config", async () => {
			const poolAddr = "0x1234" as `0x${string}`;
			await adapter.initialize(
				makeConfig({ shieldedPoolAddress: poolAddr }),
			);
			const config = adapter.getConfig();
			expect(config?.shieldedPoolAddress).toBe(poolAddr);
		});
	});

	describe("uninitialized guard", () => {
		it("shield throws when not initialized", async () => {
			await expect(
				adapter.shield({
					token: TAO_TOKEN,
					amount: 1000000000000000000n,
					recipient: "0x0",
				}),
			).rejects.toThrow("not initialized");
		});

		it("unshield throws when not initialized", async () => {
			await expect(
				adapter.unshield({
					token: TAO_TOKEN,
					amount: 1000000000000000000n,
					recipient: "0x0",
					proof: {
						protocol: "groth16",
						proof: "0x0",
						publicInputs: [],
					},
				}),
			).rejects.toThrow("not initialized");
		});

		it("transfer throws when not initialized", async () => {
			await expect(
				adapter.transfer({
					token: TAO_TOKEN,
					amount: 1000000000000000000n,
					recipientPublicKey: "0x0",
				}),
			).rejects.toThrow("not initialized");
		});

		it("getShieldedBalance throws when not initialized", async () => {
			await expect(
				adapter.getShieldedBalance(TAO_TOKEN, "0x0"),
			).rejects.toThrow("not initialized");
		});
	});

	describe("shield", () => {
		beforeEach(async () => {
			await adapter.initialize(makeConfig());
		});

		it("returns success with txHash and UTXO note", async () => {
			const result = await adapter.shield({
				token: TAO_TOKEN,
				amount: 1000000000000000000n,
				recipient: "0x000000000000000000000000000000000000dEaD",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.txHash).toBe("0xdeadbeef");
				expect(result.data.utxo).toBeDefined();
				expect(result.data.utxo.amount).toBe(1000000000000000000n);
				expect(result.data.utxo.index).toBe(0);
				expect(result.data.timestamp).toBeGreaterThan(0);
			}
		});

		it("stores note in note store after shielding", async () => {
			await adapter.shield({
				token: TAO_TOKEN,
				amount: 1000000000000000000n,
				recipient: "0x000000000000000000000000000000000000dEaD",
			});

			const noteStore = adapter.getNoteStore();
			expect(noteStore.size).toBe(1);
			expect(noteStore.getBalance(NATIVE_TOKEN_ADDRESS)).toBe(
				1000000000000000000n,
			);
		});
	});

	describe("unshield", () => {
		beforeEach(async () => {
			await adapter.initialize(makeConfig());
		});

		it("returns NO_MATCHING_NOTE when no note exists", async () => {
			const result = await adapter.unshield({
				token: TAO_TOKEN,
				amount: 1000000000000000000n,
				recipient: "0x000000000000000000000000000000000000dEaD",
				proof: {
					protocol: "groth16",
					proof: "0x0",
					publicInputs: [],
				},
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe(
					BittensorErrorCode.NO_MATCHING_NOTE,
				);
			}
		});

		it("returns success after shielding and unshielding", async () => {
			// First shield some TAO
			await adapter.shield({
				token: TAO_TOKEN,
				amount: 1000000000000000000n,
				recipient: "0x000000000000000000000000000000000000dEaD",
			});

			// Then unshield it
			const result = await adapter.unshield({
				token: TAO_TOKEN,
				amount: 1000000000000000000n,
				recipient: "0x000000000000000000000000000000000000dEaD",
				proof: {
					protocol: "groth16",
					proof: "0x0",
					publicInputs: [],
				},
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.txHash).toBe("0xcafebabe");
			}
		});
	});

	describe("generateProof", () => {
		beforeEach(async () => {
			await adapter.initialize(makeConfig());
		});

		it("rejects unsupported circuit", async () => {
			const result = await adapter.generateProof({
				circuit: "unknown",
				inputs: {},
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe(
					BittensorErrorCode.PROOF_GENERATION_FAILED,
				);
				expect(result.error.message).toContain("Unsupported circuit");
			}
		});

		it("returns success for withdraw circuit", async () => {
			const result = await adapter.generateProof({
				circuit: "withdraw",
				inputs: {
					nullifier: 111n,
					secret: 222n,
					pathElements: [0n],
					pathIndices: [0],
					root: 1234n,
					nullifierHash: 444n,
					recipient: 100n,
					amount: 1000n,
				},
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.protocol).toBe("groth16");
				expect(result.data.proof).toBeDefined();
				expect(result.data.publicInputs).toHaveLength(4);
			}
		});

		it("returns error when no artifacts configured", async () => {
			const adapter2 = new BittensorAdapter();
			await adapter2.initialize(
				makeConfig({ artifactsPath: undefined }),
			);

			const result = await adapter2.generateProof({
				circuit: "withdraw",
				inputs: {},
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("artifacts");
			}
		});
	});

	describe("getShieldedBalance", () => {
		beforeEach(async () => {
			await adapter.initialize(makeConfig());
		});

		it("returns 0 when no notes exist", async () => {
			const balance = await adapter.getShieldedBalance(TAO_TOKEN, "0x0");
			expect(balance).toBe(0n);
		});

		it("returns correct balance after shielding", async () => {
			await adapter.shield({
				token: TAO_TOKEN,
				amount: 1000000000000000000n,
				recipient: "0x000000000000000000000000000000000000dEaD",
			});

			const balance = await adapter.getShieldedBalance(TAO_TOKEN, "0x0");
			expect(balance).toBe(1000000000000000000n);
		});

		it("returns 0 after shielding and unshielding", async () => {
			await adapter.shield({
				token: TAO_TOKEN,
				amount: 1000000000000000000n,
				recipient: "0x000000000000000000000000000000000000dEaD",
			});
			await adapter.unshield({
				token: TAO_TOKEN,
				amount: 1000000000000000000n,
				recipient: "0x000000000000000000000000000000000000dEaD",
				proof: {
					protocol: "groth16",
					proof: "0x0",
					publicInputs: [],
				},
			});

			const balance = await adapter.getShieldedBalance(TAO_TOKEN, "0x0");
			expect(balance).toBe(0n);
		});
	});

	describe("transfer", () => {
		beforeEach(async () => {
			await adapter.initialize(makeConfig());
		});

		it("returns NO_MATCHING_NOTE when no note exists", async () => {
			const result = await adapter.transfer({
				token: TAO_TOKEN,
				amount: 1000000000000000000n,
				recipientPublicKey: "0x" + "bb".repeat(65),
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe(
					BittensorErrorCode.NO_MATCHING_NOTE,
				);
			}
		});

		it("returns success after shielding then transferring", async () => {
			await adapter.shield({
				token: TAO_TOKEN,
				amount: 1000000000000000000n,
				recipient: "0x000000000000000000000000000000000000dEaD",
			});

			const result = await adapter.transfer({
				token: TAO_TOKEN,
				amount: 1000000000000000000n,
				recipientPublicKey: "0x" + "bb".repeat(65),
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.nullifier).toBeDefined();
				expect(result.data.commitment).toBeDefined();
				expect(result.data.timestamp).toBeGreaterThan(0);
			}
		});
	});
});

describe("NoteStore", () => {
	let store: NoteStore;

	beforeEach(() => {
		store = new NoteStore();
	});

	it("starts empty", () => {
		expect(store.size).toBe(0);
		expect(store.getBalance(NATIVE_TOKEN_ADDRESS)).toBe(0n);
	});

	it("tracks added notes", () => {
		store.addNote({
			nullifier: 1n,
			secret: 2n,
			commitment: 3n,
			nullifierHash: 4n,
			leafIndex: 0,
			amount: 1000n,
			token: NATIVE_TOKEN_ADDRESS,
			timestamp: 123,
		});

		expect(store.size).toBe(1);
		expect(store.getBalance(NATIVE_TOKEN_ADDRESS)).toBe(1000n);
	});

	it("excludes spent notes from balance", () => {
		const nullifierHash = 4n;
		const nullifierHex =
			"0x" + nullifierHash.toString(16).padStart(64, "0");

		store.addNote({
			nullifier: 1n,
			secret: 2n,
			commitment: 3n,
			nullifierHash,
			leafIndex: 0,
			amount: 1000n,
			token: NATIVE_TOKEN_ADDRESS,
			timestamp: 123,
		});

		store.markSpent(nullifierHex);
		expect(store.getBalance(NATIVE_TOKEN_ADDRESS)).toBe(0n);
	});

	it("finds matching unspent notes", () => {
		store.addNote({
			nullifier: 1n,
			secret: 2n,
			commitment: 3n,
			nullifierHash: 4n,
			leafIndex: 0,
			amount: 1000n,
			token: NATIVE_TOKEN_ADDRESS,
			timestamp: 123,
		});

		const found = store.findNote(NATIVE_TOKEN_ADDRESS, 1000n);
		expect(found).toBeDefined();
		expect(found?.amount).toBe(1000n);

		const notFound = store.findNote(NATIVE_TOKEN_ADDRESS, 999n);
		expect(notFound).toBeUndefined();
	});
});

describe("Chain Configuration", () => {
	describe("BITTENSOR_MAINNET", () => {
		it("has correct chain ID", () => {
			expect(BITTENSOR_MAINNET.chainId).toBe(964);
		});

		it("has correct RPC URL", () => {
			expect(BITTENSOR_MAINNET.rpcUrl).toBe(
				"https://lite.chain.opentensor.ai",
			);
		});

		it("has TAO as native currency with 18 decimals", () => {
			expect(BITTENSOR_MAINNET.nativeCurrency.symbol).toBe("TAO");
			expect(BITTENSOR_MAINNET.nativeCurrency.decimals).toBe(18);
		});
	});

	describe("BITTENSOR_TESTNET", () => {
		it("has correct chain ID", () => {
			expect(BITTENSOR_TESTNET.chainId).toBe(945);
		});

		it("has correct RPC URL", () => {
			expect(BITTENSOR_TESTNET.rpcUrl).toBe(
				"https://test.chain.opentensor.ai",
			);
		});
	});

	describe("getBittensorNetwork", () => {
		it("returns mainnet for chain ID 964", () => {
			expect(getBittensorNetwork(964)).toEqual(BITTENSOR_MAINNET);
		});

		it("returns testnet for chain ID 945", () => {
			expect(getBittensorNetwork(945)).toEqual(BITTENSOR_TESTNET);
		});

		it("returns undefined for unknown chain ID", () => {
			expect(getBittensorNetwork(1)).toBeUndefined();
			expect(getBittensorNetwork(137)).toBeUndefined();
		});
	});

	describe("BITTENSOR_CHAIN_IDS", () => {
		it("contains both mainnet and testnet", () => {
			expect(BITTENSOR_CHAIN_IDS).toContain(964);
			expect(BITTENSOR_CHAIN_IDS).toContain(945);
		});
	});

	describe("MAINNET_CONTRACTS", () => {
		it("has deployed contract addresses", () => {
			expect(MAINNET_CONTRACTS.shieldedPool).toMatch(/^0x[a-fA-F0-9]+$/);
			expect(MAINNET_CONTRACTS.groth16Verifier).toMatch(
				/^0x[a-fA-F0-9]+$/,
			);
			expect(MAINNET_CONTRACTS.stealthAnnouncer).toMatch(
				/^0x[a-fA-F0-9]+$/,
			);
		});
	});
});
