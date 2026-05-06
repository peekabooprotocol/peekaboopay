import { vi } from "vitest";
import type { Address, Hex, TokenInfo, UTXONote } from "@peekaboopay/types";
import type {
	RailgunProvider,
	RailgunShieldResult,
	RailgunUnshieldResult,
	RailgunTransferResult,
	RailgunProofOutput,
	RailgunTokenBalance,
	RailgunAdapterConfig,
} from "../types";

// ── Shared fixtures ──

export const USDC: TokenInfo = {
	address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
	symbol: "USDC",
	decimals: 6,
	chainId: 1,
};

export const ETH_TOKEN: TokenInfo = {
	address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address,
	symbol: "ETH",
	decimals: 18,
	chainId: 1,
};

export const WETH_POLYGON: TokenInfo = {
	address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as Address,
	symbol: "WETH",
	decimals: 18,
	chainId: 137,
};

export const MOCK_WALLET_ID = "mock-wallet-0x1234";
export const MOCK_ENCRYPTION_KEY = "test-encryption-key-256bit";
export const MOCK_MNEMONIC =
	"test test test test test test test test test test test junk";
export const MOCK_VIEWING_KEY =
	"0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as Hex;

export function makeConfig(
	overrides: Partial<RailgunAdapterConfig> = {},
): RailgunAdapterConfig {
	return {
		chainId: 1,
		rpcUrl: "http://localhost:8545",
		encryptionKey: MOCK_ENCRYPTION_KEY,
		mnemonic: MOCK_MNEMONIC,
		...overrides,
	};
}

let noteCounter = 0;

export function makeNote(
	token: TokenInfo,
	amount: bigint,
	overrides: Partial<UTXONote> = {},
): UTXONote {
	noteCounter++;
	return {
		commitment: `0x${noteCounter.toString(16).padStart(64, "0")}` as Hex,
		amount,
		token,
		blinding: `0x${(noteCounter + 1000).toString(16).padStart(64, "0")}` as Hex,
		index: noteCounter,
		...overrides,
	};
}

export function resetNoteCounter(): void {
	noteCounter = 0;
}

// ── Mock provider factory ──

const MOCK_COMMITMENT =
	"0x1111111111111111111111111111111111111111111111111111111111111111" as Hex;
const MOCK_NULLIFIER =
	"0x2222222222222222222222222222222222222222222222222222222222222222" as Hex;
const MOCK_BLINDING =
	"0x3333333333333333333333333333333333333333333333333333333333333333" as Hex;
const MOCK_PROOF =
	"0x4444444444444444444444444444444444444444444444444444444444444444" as Hex;

export function createMockProvider(): RailgunProvider {
	const shieldResult: RailgunShieldResult = {
		transaction: { to: "0xShieldedPool", data: "0xshieldData" },
		commitmentHash: MOCK_COMMITMENT,
		nullifier: MOCK_NULLIFIER,
		blindingFactor: MOCK_BLINDING,
	};

	const unshieldResult: RailgunUnshieldResult = {
		transaction: { to: "0xShieldedPool", data: "0xunshieldData" },
	};

	const transferResult: RailgunTransferResult = {
		transaction: { to: "0xShieldedPool", data: "0xtransferData" },
		nullifier: MOCK_NULLIFIER,
		commitmentHash: MOCK_COMMITMENT,
	};

	const proofOutput: RailgunProofOutput = {
		proof: MOCK_PROOF,
		publicInputs: [MOCK_COMMITMENT, MOCK_NULLIFIER],
	};

	const balances: RailgunTokenBalance[] = [
		{
			tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
			balance: 1_000_000n, // 1 USDC
		},
	];

	return {
		startEngine: vi.fn<RailgunProvider["startEngine"]>().mockResolvedValue(undefined),
		createWallet: vi.fn<RailgunProvider["createWallet"]>().mockResolvedValue(MOCK_WALLET_ID),
		loadWallet: vi.fn<RailgunProvider["loadWallet"]>().mockResolvedValue(undefined),
		populateShield: vi.fn<RailgunProvider["populateShield"]>().mockResolvedValue(shieldResult),
		populateUnshield: vi.fn<RailgunProvider["populateUnshield"]>().mockResolvedValue(unshieldResult),
		populateTransfer: vi.fn<RailgunProvider["populateTransfer"]>().mockResolvedValue(transferResult),
		generateProof: vi.fn<RailgunProvider["generateProof"]>().mockResolvedValue(proofOutput),
		verifyProof: vi.fn<RailgunProvider["verifyProof"]>().mockResolvedValue(true),
		getBalances: vi.fn<RailgunProvider["getBalances"]>().mockResolvedValue(balances),
		refreshBalances: vi.fn<RailgunProvider["refreshBalances"]>().mockResolvedValue(undefined),
		shutdown: vi.fn<RailgunProvider["shutdown"]>().mockResolvedValue(undefined),
	};
}
