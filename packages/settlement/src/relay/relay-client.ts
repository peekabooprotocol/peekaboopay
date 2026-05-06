import { ethers } from "ethers";
import type {
	ChainId,
	GaslessTransaction,
	RawTransaction,
	RelayFeeEstimate as TypesRelayFeeEstimate,
	RelayProvider,
	TransactionHash,
	TransactionStatus,
} from "@peekaboopay/types";
import {
	RELAY_EIP712_DOMAIN,
	RELAY_REQUEST_TYPES,
	BPS_DENOMINATOR,
	MAX_RELAY_FEE_BPS,
	RelayError,
	RelayErrorCode,
} from "./types.js";
import type {
	RelayRequest,
	RelayResponse,
	RelayerConfig,
	RelayFeeEstimate,
	RelayClientState,
} from "./types.js";

// ---------------------------------------------------------------
// RelayClient — implements RelayProvider from @peekaboopay/types
// ---------------------------------------------------------------

/**
 * A relay client that submits transactions on behalf of stealth address holders,
 * paying gas so the stealth address never needs to hold native tokens.
 */
export class RelayClient implements RelayProvider {
	readonly chainId: ChainId;

	private readonly state: RelayClientState;

	constructor(config: RelayerConfig) {
		const provider = new ethers.JsonRpcProvider(config.rpcUrl);
		const wallet = new ethers.Wallet(config.relayerPrivateKey, provider);

		this.chainId = config.chainId;
		this.state = {
			provider,
			wallet,
			chainId: config.chainId,
			defaultFeeBps: config.defaultFeeBps ?? 50,
			maxGasPriceGwei: config.maxGasPriceGwei ?? 100,
			usedNonces: new Map(),
		};
	}

	// ------- RelayProvider interface methods -------

	async submitTransaction(tx: RawTransaction): Promise<TransactionHash> {
		const wallet = this.state.wallet as ethers.Wallet;
		const response = await wallet.sendTransaction({
			to: tx.to,
			data: tx.data,
			value: tx.value ?? 0n,
			chainId: tx.chainId,
		});
		return response.hash as TransactionHash;
	}

	async getTransactionStatus(hash: TransactionHash): Promise<TransactionStatus> {
		const provider = this.state.provider as ethers.JsonRpcProvider;
		const receipt = await provider.getTransactionReceipt(hash);

		if (!receipt) {
			return {
				hash,
				status: "pending",
				confirmations: 0,
			};
		}

		const currentBlock = await provider.getBlockNumber();
		const confirmations = currentBlock - receipt.blockNumber + 1;

		return {
			hash,
			status: receipt.status === 1 ? "confirmed" : "failed",
			blockNumber: receipt.blockNumber,
			confirmations,
			gasUsed: receipt.gasUsed,
		};
	}

	async estimateGas(tx: RawTransaction): Promise<bigint> {
		const provider = this.state.provider as ethers.JsonRpcProvider;
		return provider.estimateGas({
			to: tx.to,
			data: tx.data,
			value: tx.value ?? 0n,
		});
	}

	async submitGasless(tx: GaslessTransaction): Promise<TransactionHash> {
		// Build a relay request from the gasless transaction
		const request: RelayRequest = {
			from: "0x0000000000000000000000000000000000000000", // unknown sender for gasless
			to: tx.to,
			data: tx.data,
			chainId: tx.chainId,
			maxRelayFeeBps: this.state.defaultFeeBps,
			signature: tx.signature,
			nonce: 0,
			deadline: tx.deadline,
		};
		const response = await submitRelayRequest(this, request);
		return response.txHash as TransactionHash;
	}

	async estimateRelayFee(tx: RawTransaction): Promise<TypesRelayFeeEstimate> {
		const estimate = await estimateRelayFee(this, {
			from: "0x0000000000000000000000000000000000000000",
			to: tx.to,
			data: tx.data,
			chainId: tx.chainId,
			maxRelayFeeBps: this.state.defaultFeeBps,
			signature: "0x",
			nonce: 0,
			deadline: Math.floor(Date.now() / 1000) + 3600,
		});

		return {
			feeToken: "0x0000000000000000000000000000000000000000" as `0x${string}`,
			feeAmount: BigInt(estimate.totalCostWei),
			feePercentage: estimate.relayFeeBps / BPS_DENOMINATOR,
		};
	}
}

// ---------------------------------------------------------------
// Factory
// ---------------------------------------------------------------

/**
 * Create a relay client from configuration.
 *
 * The relayer holds the private key that pays gas. Stealth address holders
 * sign EIP-712 relay requests, and the relayer submits the underlying
 * transactions on their behalf.
 */
export function createRelayClient(config: RelayerConfig): RelayClient {
	return new RelayClient(config);
}

// ---------------------------------------------------------------
// EIP-712 Signing
// ---------------------------------------------------------------

/**
 * Build the EIP-712 domain for relay request signing.
 */
function buildEIP712Domain(chainId: number) {
	return {
		...RELAY_EIP712_DOMAIN,
		chainId,
	};
}

/**
 * Build the EIP-712 typed data value from a relay request.
 * The signature field is excluded — it is what we are producing.
 */
function requestToTypedValue(request: Omit<RelayRequest, "signature">) {
	return {
		from: request.from,
		to: request.to,
		data: request.data,
		chainId: request.chainId,
		maxRelayFeeBps: request.maxRelayFeeBps,
		nonce: request.nonce,
		deadline: request.deadline,
	};
}

/**
 * Sign a relay request using EIP-712 typed data.
 *
 * This is called by the stealth address holder. The resulting signature
 * proves that the holder authorized this specific relay operation.
 *
 * @param signer  An ethers Signer (the stealth address's key)
 * @param request The relay request to sign (without signature)
 * @returns The fully signed relay request
 */
export async function signRelayRequest(
	signer: ethers.Signer,
	request: Omit<RelayRequest, "signature">,
): Promise<RelayRequest> {
	const domain = buildEIP712Domain(request.chainId);
	const value = requestToTypedValue(request);

	const signature = await (signer as ethers.Wallet).signTypedData(
		domain,
		RELAY_REQUEST_TYPES,
		value,
	);

	return {
		...request,
		signature,
	};
}

// ---------------------------------------------------------------
// Signature Verification
// ---------------------------------------------------------------

/**
 * Verify that a signed relay request has a valid EIP-712 signature
 * from the claimed sender address.
 *
 * @returns true if the signature is valid and matches `request.from`
 */
export function verifyRelaySignature(request: RelayRequest): boolean {
	try {
		const domain = buildEIP712Domain(request.chainId);
		const value = requestToTypedValue(request);

		const recovered = ethers.verifyTypedData(
			domain,
			RELAY_REQUEST_TYPES,
			value,
			request.signature,
		);

		return recovered.toLowerCase() === request.from.toLowerCase();
	} catch {
		return false;
	}
}

// ---------------------------------------------------------------
// Relay Submission
// ---------------------------------------------------------------

/**
 * Submit a signed relay request through the relayer.
 *
 * Validates the request (signature, nonce, deadline, fee), then
 * sends the transaction from the relayer's wallet and pays gas.
 *
 * @throws {RelayError} on validation failure or transaction revert
 */
export async function submitRelayRequest(
	client: RelayClient,
	request: RelayRequest,
): Promise<RelayResponse> {
	const state = (client as unknown as { state: RelayClientState }).state;

	// --- Validate deadline ---
	const now = Math.floor(Date.now() / 1000);
	if (request.deadline < now) {
		throw new RelayError(
			`Relay request expired: deadline ${request.deadline} < now ${now}`,
			RelayErrorCode.EXPIRED,
			{ deadline: request.deadline, now },
		);
	}

	// --- Validate fee ---
	if (request.maxRelayFeeBps > MAX_RELAY_FEE_BPS) {
		throw new RelayError(
			`Relay fee ${request.maxRelayFeeBps} bps exceeds maximum ${MAX_RELAY_FEE_BPS} bps`,
			RelayErrorCode.FEE_TOO_HIGH,
			{ requested: request.maxRelayFeeBps, max: MAX_RELAY_FEE_BPS },
		);
	}

	// --- Validate nonce (replay protection) ---
	const senderKey = request.from.toLowerCase();
	if (!state.usedNonces.has(senderKey)) {
		state.usedNonces.set(senderKey, new Set());
	}
	const nonceSet = state.usedNonces.get(senderKey)!;
	if (nonceSet.has(request.nonce)) {
		throw new RelayError(
			`Nonce ${request.nonce} already used for sender ${request.from}`,
			RelayErrorCode.NONCE_REPLAY,
			{ nonce: request.nonce, from: request.from },
		);
	}

	// --- Validate signature ---
	if (!verifyRelaySignature(request)) {
		throw new RelayError(
			"Invalid relay request signature",
			RelayErrorCode.INVALID_SIGNATURE,
			{ from: request.from },
		);
	}

	// --- Check gas price ---
	const provider = state.provider as ethers.JsonRpcProvider;
	const feeData = await provider.getFeeData();
	const gasPrice = feeData.gasPrice ?? 0n;
	const maxGasPriceWei = ethers.parseUnits(
		state.maxGasPriceGwei.toString(),
		"gwei",
	);

	if (gasPrice > maxGasPriceWei) {
		throw new RelayError(
			`Gas price ${ethers.formatUnits(gasPrice, "gwei")} gwei exceeds max ${state.maxGasPriceGwei} gwei`,
			RelayErrorCode.GAS_PRICE_TOO_HIGH,
			{
				currentGwei: ethers.formatUnits(gasPrice, "gwei"),
				maxGwei: state.maxGasPriceGwei,
			},
		);
	}

	// --- Submit the transaction ---
	const wallet = state.wallet as ethers.Wallet;

	try {
		const tx = await wallet.sendTransaction({
			to: request.to,
			data: request.data,
			chainId: request.chainId,
		});

		// Mark nonce as used only after successful submission
		nonceSet.add(request.nonce);

		const receipt = await tx.wait();
		if (!receipt || receipt.status === 0) {
			throw new RelayError(
				"Relayed transaction reverted on-chain",
				RelayErrorCode.TRANSACTION_REVERTED,
				{ txHash: tx.hash },
			);
		}

		const gasCost = receipt.gasUsed * receipt.gasPrice;

		return {
			txHash: tx.hash,
			relayFeeBps: Math.min(request.maxRelayFeeBps, state.defaultFeeBps),
			gasCost: gasCost.toString(),
		};
	} catch (err) {
		if (err instanceof RelayError) throw err;
		throw new RelayError(
			`Relay submission failed: ${(err as Error).message}`,
			RelayErrorCode.RELAY_FAILED,
			{ originalError: (err as Error).message },
		);
	}
}

// ---------------------------------------------------------------
// Fee Estimation
// ---------------------------------------------------------------

/**
 * Estimate the gas cost and relay fee for a given request.
 * Does NOT submit the transaction.
 */
export async function estimateRelayFee(
	client: RelayClient,
	request: Omit<RelayRequest, "signature"> & { signature?: string },
): Promise<RelayFeeEstimate> {
	const state = (client as unknown as { state: RelayClientState }).state;
	const provider = state.provider as ethers.JsonRpcProvider;

	// Estimate gas
	const gasEstimate = await provider.estimateGas({
		to: request.to,
		data: request.data,
		from: (state.wallet as ethers.Wallet).address,
	});

	// Get current gas price
	const feeData = await provider.getFeeData();
	const gasPrice = feeData.gasPrice ?? 0n;

	const gasCostWei = gasEstimate * gasPrice;

	// Calculate relay fee (percentage of gas cost)
	const feeBps = Math.min(
		request.maxRelayFeeBps ?? state.defaultFeeBps,
		state.defaultFeeBps,
	);
	const relayFeeWei = (gasCostWei * BigInt(feeBps)) / BigInt(BPS_DENOMINATOR);
	const totalCostWei = gasCostWei + relayFeeWei;

	// Check relayer balance
	const relayerBalance = await provider.getBalance(
		(state.wallet as ethers.Wallet).address,
	);

	return {
		gasCostWei: gasCostWei.toString(),
		relayFeeBps: feeBps,
		totalCostWei: totalCostWei.toString(),
		relayerCanAfford: relayerBalance >= totalCostWei,
	};
}
