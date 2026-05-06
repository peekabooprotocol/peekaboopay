import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------
// Mock ethers — must be declared before any import that uses ethers
// ---------------------------------------------------------------

const mockSendTransaction = vi.fn();
const mockWait = vi.fn();
const mockEstimateGas = vi.fn();
const mockGetFeeData = vi.fn();
const mockGetBalance = vi.fn();
const mockGetTransactionReceipt = vi.fn();
const mockGetBlockNumber = vi.fn();
const mockSignTypedData = vi.fn();

// Track the most-recently-created Wallet so tests can inspect its address
let mockWalletAddress = "0xRelayer1234567890abcdef1234567890abcdef12";

vi.mock("ethers", () => {
	// Minimal AbiCoder for Interface.encodeFunctionData
	const mockEncode = vi.fn().mockReturnValue("0xabcdef");

	const MockInterface = vi.fn().mockImplementation(() => ({
		encodeFunctionData: vi.fn().mockReturnValue("0xencoded_withdraw_data"),
	}));

	const MockJsonRpcProvider = vi.fn().mockImplementation(() => ({
		estimateGas: mockEstimateGas,
		getFeeData: mockGetFeeData,
		getBalance: mockGetBalance,
		getTransactionReceipt: mockGetTransactionReceipt,
		getBlockNumber: mockGetBlockNumber,
	}));

	const MockWallet = vi.fn().mockImplementation((_pk: string, _provider: unknown) => ({
		address: mockWalletAddress,
		sendTransaction: mockSendTransaction,
		signTypedData: mockSignTypedData,
	}));

	// verifyTypedData must recover the signer address for signature verification
	const mockVerifyTypedData = vi.fn();

	return {
		ethers: {
			JsonRpcProvider: MockJsonRpcProvider,
			Wallet: MockWallet,
			Interface: MockInterface,
			verifyTypedData: mockVerifyTypedData,
			parseUnits: vi.fn().mockImplementation((val: string, unit: string) => {
				if (unit === "gwei") return BigInt(val) * 1_000_000_000n;
				return BigInt(val);
			}),
			formatUnits: vi.fn().mockImplementation((val: bigint, unit: string) => {
				if (unit === "gwei") return (Number(val) / 1_000_000_000).toString();
				return val.toString();
			}),
		},
		JsonRpcProvider: MockJsonRpcProvider,
		Wallet: MockWallet,
		Interface: MockInterface,
		verifyTypedData: mockVerifyTypedData,
		parseUnits: vi.fn().mockImplementation((val: string, unit: string) => {
			if (unit === "gwei") return BigInt(val) * 1_000_000_000n;
			return BigInt(val);
		}),
		formatUnits: vi.fn().mockImplementation((val: bigint, unit: string) => {
			if (unit === "gwei") return (Number(val) / 1_000_000_000).toString();
			return val.toString();
		}),
	};
});

// ---------------------------------------------------------------
// Now import the code under test (after vi.mock)
// ---------------------------------------------------------------

import { ethers } from "ethers";
import {
	RelayClient,
	createRelayClient,
	signRelayRequest,
	verifyRelaySignature,
	submitRelayRequest,
	estimateRelayFee,
	buildWithdrawMetaTx,
	buildAnnounceMetaTx,
	RelayError,
	RelayErrorCode,
	BPS_DENOMINATOR,
	MAX_RELAY_FEE_BPS,
	RELAY_EIP712_DOMAIN,
} from "../index.js";
import type { RelayRequest, RelayerConfig } from "../index.js";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

const STEALTH_ADDRESS = "0xStealth0000000000000000000000000000000001";
const POOL_ADDRESS = "0xPool00000000000000000000000000000000000002";
const ANNOUNCER_ADDRESS = "0xAnnounce000000000000000000000000000000003";
const RELAYER_PK = "0x" + "ab".repeat(32);

function makeConfig(overrides?: Partial<RelayerConfig>): RelayerConfig {
	return {
		rpcUrl: "http://localhost:8545",
		chainId: 964,
		relayerPrivateKey: RELAYER_PK,
		defaultFeeBps: 50,
		maxGasPriceGwei: 100,
		...overrides,
	};
}

function makeUnsignedRequest(
	overrides?: Partial<Omit<RelayRequest, "signature">>,
): Omit<RelayRequest, "signature"> {
	return {
		from: STEALTH_ADDRESS,
		to: POOL_ADDRESS,
		data: "0xdeadbeef",
		chainId: 964,
		maxRelayFeeBps: 50,
		nonce: 1,
		deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
		...overrides,
	};
}

function makeSignedRequest(
	overrides?: Partial<RelayRequest>,
): RelayRequest {
	return {
		...makeUnsignedRequest(),
		signature: "0xfakesignature",
		...overrides,
	};
}

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe("Relay Network", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock behaviors
		mockGetFeeData.mockResolvedValue({ gasPrice: 1_000_000_000n }); // 1 gwei
		mockEstimateGas.mockResolvedValue(21_000n);
		mockGetBalance.mockResolvedValue(10n ** 18n); // 1 ETH
		mockGetTransactionReceipt.mockResolvedValue(null);
		mockGetBlockNumber.mockResolvedValue(1000);

		mockSendTransaction.mockResolvedValue({
			hash: "0xtxhash123",
			wait: mockWait,
		});
		mockWait.mockResolvedValue({
			status: 1,
			gasUsed: 21_000n,
			gasPrice: 1_000_000_000n,
		});
	});

	// -----------------------------------------------------------
	// createRelayClient
	// -----------------------------------------------------------

	describe("createRelayClient", () => {
		it("should create a relay client with default config", () => {
			const client = createRelayClient(makeConfig());
			expect(client).toBeInstanceOf(RelayClient);
			expect(client.chainId).toBe(964);
		});

		it("should use default fee and gas price when not specified", () => {
			const client = createRelayClient({
				rpcUrl: "http://localhost:8545",
				chainId: 964,
				relayerPrivateKey: RELAYER_PK,
			});
			expect(client).toBeInstanceOf(RelayClient);
			expect(client.chainId).toBe(964);
		});
	});

	// -----------------------------------------------------------
	// signRelayRequest
	// -----------------------------------------------------------

	describe("signRelayRequest", () => {
		it("should sign a relay request and return the full signed request", async () => {
			const unsigned = makeUnsignedRequest();
			const fakeSig = "0xsigned_eip712_data";
			mockSignTypedData.mockResolvedValue(fakeSig);

			// Create a mock signer that behaves like an ethers Wallet
			const mockSigner = {
				signTypedData: mockSignTypedData,
			} as unknown as ethers.Wallet;

			const signed = await signRelayRequest(mockSigner, unsigned);

			expect(signed.signature).toBe(fakeSig);
			expect(signed.from).toBe(unsigned.from);
			expect(signed.to).toBe(unsigned.to);
			expect(signed.data).toBe(unsigned.data);
			expect(signed.nonce).toBe(unsigned.nonce);

			// Verify EIP-712 domain was passed
			expect(mockSignTypedData).toHaveBeenCalledWith(
				expect.objectContaining({
					name: RELAY_EIP712_DOMAIN.name,
					version: RELAY_EIP712_DOMAIN.version,
					chainId: 964,
				}),
				expect.any(Object),
				expect.objectContaining({
					from: unsigned.from,
					to: unsigned.to,
				}),
			);
		});
	});

	// -----------------------------------------------------------
	// verifyRelaySignature
	// -----------------------------------------------------------

	describe("verifyRelaySignature", () => {
		it("should return true for a valid signature", () => {
			const request = makeSignedRequest();
			const mockVerify = ethers.verifyTypedData as ReturnType<typeof vi.fn>;
			mockVerify.mockReturnValue(STEALTH_ADDRESS);

			const result = verifyRelaySignature(request);
			expect(result).toBe(true);
		});

		it("should return false when recovered address doesn't match", () => {
			const request = makeSignedRequest();
			const mockVerify = ethers.verifyTypedData as ReturnType<typeof vi.fn>;
			mockVerify.mockReturnValue("0xWrongAddress");

			const result = verifyRelaySignature(request);
			expect(result).toBe(false);
		});

		it("should return false when verification throws", () => {
			const request = makeSignedRequest();
			const mockVerify = ethers.verifyTypedData as ReturnType<typeof vi.fn>;
			mockVerify.mockImplementation(() => {
				throw new Error("bad signature");
			});

			const result = verifyRelaySignature(request);
			expect(result).toBe(false);
		});
	});

	// -----------------------------------------------------------
	// submitRelayRequest
	// -----------------------------------------------------------

	describe("submitRelayRequest", () => {
		it("should submit a valid relay request and return response", async () => {
			const client = createRelayClient(makeConfig());
			const request = makeSignedRequest();

			// Make verifyTypedData return the sender address
			const mockVerify = ethers.verifyTypedData as ReturnType<typeof vi.fn>;
			mockVerify.mockReturnValue(STEALTH_ADDRESS);

			const response = await submitRelayRequest(client, request);

			expect(response.txHash).toBe("0xtxhash123");
			expect(response.relayFeeBps).toBe(50);
			expect(response.gasCost).toBe("21000000000000"); // 21000 * 1 gwei
		});

		it("should reject expired requests", async () => {
			const client = createRelayClient(makeConfig());
			const request = makeSignedRequest({
				deadline: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
			});

			await expect(submitRelayRequest(client, request)).rejects.toThrow(
				RelayError,
			);
			await expect(submitRelayRequest(client, request)).rejects.toMatchObject({
				code: RelayErrorCode.EXPIRED,
			});
		});

		it("should reject fees exceeding the maximum", async () => {
			const client = createRelayClient(makeConfig());
			const request = makeSignedRequest({
				maxRelayFeeBps: MAX_RELAY_FEE_BPS + 1,
			});

			await expect(submitRelayRequest(client, request)).rejects.toThrow(
				RelayError,
			);
			await expect(submitRelayRequest(client, request)).rejects.toMatchObject({
				code: RelayErrorCode.FEE_TOO_HIGH,
			});
		});

		it("should reject replayed nonces", async () => {
			const client = createRelayClient(makeConfig());
			const request = makeSignedRequest({ nonce: 42 });

			const mockVerify = ethers.verifyTypedData as ReturnType<typeof vi.fn>;
			mockVerify.mockReturnValue(STEALTH_ADDRESS);

			// First submission succeeds
			await submitRelayRequest(client, request);

			// Second submission with same nonce should fail
			await expect(submitRelayRequest(client, request)).rejects.toThrow(
				RelayError,
			);
			await expect(submitRelayRequest(client, request)).rejects.toMatchObject({
				code: RelayErrorCode.NONCE_REPLAY,
			});
		});

		it("should reject invalid signatures", async () => {
			const client = createRelayClient(makeConfig());
			const request = makeSignedRequest();

			// verifyTypedData returns wrong address
			const mockVerify = ethers.verifyTypedData as ReturnType<typeof vi.fn>;
			mockVerify.mockReturnValue("0xWrongAddress");

			await expect(submitRelayRequest(client, request)).rejects.toThrow(
				RelayError,
			);
			await expect(submitRelayRequest(client, request)).rejects.toMatchObject({
				code: RelayErrorCode.INVALID_SIGNATURE,
			});
		});

		it("should reject when gas price is too high", async () => {
			const client = createRelayClient(makeConfig({ maxGasPriceGwei: 10 }));
			const request = makeSignedRequest();

			const mockVerify = ethers.verifyTypedData as ReturnType<typeof vi.fn>;
			mockVerify.mockReturnValue(STEALTH_ADDRESS);

			// Gas price of 20 gwei (exceeds max of 10)
			mockGetFeeData.mockResolvedValue({
				gasPrice: 20_000_000_000n,
			});

			await expect(submitRelayRequest(client, request)).rejects.toThrow(
				RelayError,
			);
			await expect(submitRelayRequest(client, request)).rejects.toMatchObject({
				code: RelayErrorCode.GAS_PRICE_TOO_HIGH,
			});
		});

		it("should throw TRANSACTION_REVERTED when receipt status is 0", async () => {
			const client = createRelayClient(makeConfig());
			const request = makeSignedRequest({ nonce: 999 });

			const mockVerify = ethers.verifyTypedData as ReturnType<typeof vi.fn>;
			mockVerify.mockReturnValue(STEALTH_ADDRESS);

			mockWait.mockResolvedValue({
				status: 0,
				gasUsed: 21_000n,
				gasPrice: 1_000_000_000n,
			});

			await expect(submitRelayRequest(client, request)).rejects.toThrow(
				RelayError,
			);

			// Need a fresh client+nonce since nonce 999 was consumed above
			const client2 = createRelayClient(makeConfig());
			const request2 = makeSignedRequest({ nonce: 998 });
			await expect(submitRelayRequest(client2, request2)).rejects.toMatchObject({
				code: RelayErrorCode.TRANSACTION_REVERTED,
			});
		});

		it("should wrap unexpected errors in RELAY_FAILED", async () => {
			const client = createRelayClient(makeConfig());
			const request = makeSignedRequest();

			const mockVerify = ethers.verifyTypedData as ReturnType<typeof vi.fn>;
			mockVerify.mockReturnValue(STEALTH_ADDRESS);

			mockSendTransaction.mockRejectedValue(new Error("network error"));

			await expect(submitRelayRequest(client, request)).rejects.toThrow(
				RelayError,
			);
			await expect(submitRelayRequest(client, request)).rejects.toMatchObject({
				code: RelayErrorCode.RELAY_FAILED,
			});
		});
	});

	// -----------------------------------------------------------
	// estimateRelayFee
	// -----------------------------------------------------------

	describe("estimateRelayFee", () => {
		it("should estimate gas cost and relay fee", async () => {
			const client = createRelayClient(makeConfig({ defaultFeeBps: 100 }));
			const request = makeUnsignedRequest({ maxRelayFeeBps: 100 });

			const estimate = await estimateRelayFee(client, request);

			// Gas cost: 21000 gas * 1 gwei = 21_000_000_000_000 wei
			expect(estimate.gasCostWei).toBe("21000000000000");
			expect(estimate.relayFeeBps).toBe(100); // 1%
			// Relay fee: 21_000_000_000_000 * 100 / 10000 = 210_000_000_000
			expect(estimate.totalCostWei).toBe("21210000000000");
			expect(estimate.relayerCanAfford).toBe(true);
		});

		it("should report relayer can't afford when balance is low", async () => {
			const client = createRelayClient(makeConfig());
			const request = makeUnsignedRequest();

			mockGetBalance.mockResolvedValue(0n); // relayer has no balance

			const estimate = await estimateRelayFee(client, request);
			expect(estimate.relayerCanAfford).toBe(false);
		});

		it("should use the lower of maxRelayFeeBps and defaultFeeBps", async () => {
			// defaultFeeBps = 50, request says 200 => should use 50
			const client = createRelayClient(makeConfig({ defaultFeeBps: 50 }));
			const request = makeUnsignedRequest({ maxRelayFeeBps: 200 });

			const estimate = await estimateRelayFee(client, request);
			expect(estimate.relayFeeBps).toBe(50);
		});
	});

	// -----------------------------------------------------------
	// buildWithdrawMetaTx
	// -----------------------------------------------------------

	describe("buildWithdrawMetaTx", () => {
		it("should build a withdraw meta-transaction with correct fields", () => {
			const params = {
				poolAddress: POOL_ADDRESS,
				nullifierHash: "0x" + "aa".repeat(32),
				recipient: STEALTH_ADDRESS,
				amount: "1000000000000000000", // 1 ETH
				token: "0x0000000000000000000000000000000000000000",
				root: "0x" + "bb".repeat(32),
				proof: "0x" + "cc".repeat(64),
				chainId: 964,
				maxRelayFeeBps: 50,
				nonce: 1,
				deadline: Math.floor(Date.now() / 1000) + 3600,
			};

			const metaTx = buildWithdrawMetaTx(params);

			expect(metaTx.from).toBe(STEALTH_ADDRESS);
			expect(metaTx.to).toBe(POOL_ADDRESS);
			expect(metaTx.chainId).toBe(964);
			expect(metaTx.maxRelayFeeBps).toBe(50);
			expect(metaTx.nonce).toBe(1);
			expect(metaTx.data).toBeDefined();
			expect(typeof metaTx.data).toBe("string");
			// Should not have a signature — caller must sign it
			expect((metaTx as Record<string, unknown>).signature).toBeUndefined();
		});

		it("should set the sender to the recipient (stealth address holder)", () => {
			const recipient = "0xRecipient000000000000000000000000000000ff";
			const metaTx = buildWithdrawMetaTx({
				poolAddress: POOL_ADDRESS,
				nullifierHash: "0x" + "11".repeat(32),
				recipient,
				amount: "500000000000000000",
				token: "0x0000000000000000000000000000000000000000",
				root: "0x" + "22".repeat(32),
				proof: "0x" + "33".repeat(64),
				chainId: 964,
				maxRelayFeeBps: 100,
				nonce: 2,
				deadline: Math.floor(Date.now() / 1000) + 7200,
			});

			expect(metaTx.from).toBe(recipient);
		});
	});

	// -----------------------------------------------------------
	// buildAnnounceMetaTx
	// -----------------------------------------------------------

	describe("buildAnnounceMetaTx", () => {
		it("should build an announce meta-transaction with correct fields", () => {
			const params = {
				announcerAddress: ANNOUNCER_ADDRESS,
				schemeId: 1,
				stealthAddress: STEALTH_ADDRESS,
				ephemeralPubKey: "0x04" + "ab".repeat(64),
				viewTag: "0x42",
				metadata: "0x",
				chainId: 964,
				maxRelayFeeBps: 50,
				nonce: 5,
				deadline: Math.floor(Date.now() / 1000) + 3600,
			};

			const metaTx = buildAnnounceMetaTx(params);

			expect(metaTx.from).toBe(STEALTH_ADDRESS);
			expect(metaTx.to).toBe(ANNOUNCER_ADDRESS);
			expect(metaTx.chainId).toBe(964);
			expect(metaTx.maxRelayFeeBps).toBe(50);
			expect(metaTx.nonce).toBe(5);
			expect(metaTx.data).toBeDefined();
			expect(typeof metaTx.data).toBe("string");
		});

		it("should use the stealth address as the sender", () => {
			const stealthAddr = "0xStealth00000000000000000000000000000000ff";
			const metaTx = buildAnnounceMetaTx({
				announcerAddress: ANNOUNCER_ADDRESS,
				schemeId: 1,
				stealthAddress: stealthAddr,
				ephemeralPubKey: "0x04" + "cd".repeat(64),
				viewTag: "0xff",
				metadata: "0xdeadbeef",
				chainId: 1,
				maxRelayFeeBps: 25,
				nonce: 10,
				deadline: Math.floor(Date.now() / 1000) + 1800,
			});

			expect(metaTx.from).toBe(stealthAddr);
		});
	});

	// -----------------------------------------------------------
	// Constants & types
	// -----------------------------------------------------------

	describe("constants and types", () => {
		it("should export correct BPS_DENOMINATOR", () => {
			expect(BPS_DENOMINATOR).toBe(10_000);
		});

		it("should export correct MAX_RELAY_FEE_BPS", () => {
			expect(MAX_RELAY_FEE_BPS).toBe(500);
		});

		it("should export EIP-712 domain constants", () => {
			expect(RELAY_EIP712_DOMAIN.name).toBe("PeekabooRelay");
			expect(RELAY_EIP712_DOMAIN.version).toBe("1");
		});

		it("should have correct RelayErrorCode values", () => {
			expect(RelayErrorCode.INVALID_SIGNATURE).toBe("INVALID_SIGNATURE");
			expect(RelayErrorCode.EXPIRED).toBe("EXPIRED");
			expect(RelayErrorCode.NONCE_REPLAY).toBe("NONCE_REPLAY");
			expect(RelayErrorCode.FEE_TOO_HIGH).toBe("FEE_TOO_HIGH");
			expect(RelayErrorCode.GAS_PRICE_TOO_HIGH).toBe("GAS_PRICE_TOO_HIGH");
			expect(RelayErrorCode.TRANSACTION_REVERTED).toBe("TRANSACTION_REVERTED");
			expect(RelayErrorCode.RELAY_FAILED).toBe("RELAY_FAILED");
		});

		it("RelayError should carry code and details", () => {
			const err = new RelayError("test", RelayErrorCode.EXPIRED, {
				deadline: 123,
			});
			expect(err.message).toBe("test");
			expect(err.code).toBe(RelayErrorCode.EXPIRED);
			expect(err.details).toEqual({ deadline: 123 });
			expect(err.name).toBe("RelayError");
			expect(err).toBeInstanceOf(Error);
		});
	});

	// -----------------------------------------------------------
	// RelayClient (RelayProvider interface)
	// -----------------------------------------------------------

	describe("RelayClient RelayProvider interface", () => {
		it("should get transaction status for pending tx", async () => {
			const client = createRelayClient(makeConfig());
			mockGetTransactionReceipt.mockResolvedValue(null);

			const status = await client.getTransactionStatus("0xabc" as `0x${string}`);
			expect(status.status).toBe("pending");
			expect(status.confirmations).toBe(0);
		});

		it("should get transaction status for confirmed tx", async () => {
			const client = createRelayClient(makeConfig());
			mockGetTransactionReceipt.mockResolvedValue({
				status: 1,
				blockNumber: 990,
				gasUsed: 21_000n,
			});
			mockGetBlockNumber.mockResolvedValue(1000);

			const status = await client.getTransactionStatus("0xabc" as `0x${string}`);
			expect(status.status).toBe("confirmed");
			expect(status.blockNumber).toBe(990);
			expect(status.confirmations).toBe(11);
		});

		it("should get transaction status for failed tx", async () => {
			const client = createRelayClient(makeConfig());
			mockGetTransactionReceipt.mockResolvedValue({
				status: 0,
				blockNumber: 995,
				gasUsed: 21_000n,
			});
			mockGetBlockNumber.mockResolvedValue(1000);

			const status = await client.getTransactionStatus("0xabc" as `0x${string}`);
			expect(status.status).toBe("failed");
		});
	});

	// -----------------------------------------------------------
	// Full round-trip: sign → verify → submit
	// -----------------------------------------------------------

	describe("full round-trip", () => {
		it("sign → verify → submit", async () => {
			const unsigned = makeUnsignedRequest();
			const fakeSig = "0xfull_roundtrip_sig";
			mockSignTypedData.mockResolvedValue(fakeSig);

			// Sign
			const mockSigner = {
				signTypedData: mockSignTypedData,
			} as unknown as ethers.Wallet;
			const signed = await signRelayRequest(mockSigner, unsigned);
			expect(signed.signature).toBe(fakeSig);

			// Verify
			const mockVerify = ethers.verifyTypedData as ReturnType<typeof vi.fn>;
			mockVerify.mockReturnValue(STEALTH_ADDRESS);
			expect(verifyRelaySignature(signed)).toBe(true);

			// Submit
			const client = createRelayClient(makeConfig());
			const response = await submitRelayRequest(client, signed);
			expect(response.txHash).toBe("0xtxhash123");
			expect(response.relayFeeBps).toBe(50);
			expect(typeof response.gasCost).toBe("string");
		});
	});
});
