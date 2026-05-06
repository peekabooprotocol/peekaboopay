import type { Address, ChainId, Hex, PASResult, TokenInfo, TransactionHash } from "./common";

/** Public SDK transaction interface */
export interface TransactionAPI {
	pay(params: PayParams): Promise<PASResult<PaymentReceipt>>;
	receive(params: ReceiveParams): Promise<PASResult<ReceiveAddress>>;
	swap(params: SwapParams): Promise<PASResult<SwapReceipt>>;
	bridge(params: BridgeParams): Promise<PASResult<BridgeReceipt>>;
}

export interface PayParams {
	to: Address | Hex;
	token: TokenInfo;
	amount: bigint;
	memo?: string;
	chainId?: ChainId;
}

export interface PaymentReceipt {
	id: string;
	status: "pending" | "confirmed" | "failed";
	amount: bigint;
	token: TokenInfo;
	timestamp: number;
	txHash?: TransactionHash;
}

export interface ReceiveParams {
	token: TokenInfo;
	singleUse?: boolean;
}

export interface ReceiveAddress {
	address: Address;
	ephemeralPublicKey: Hex;
	expiresAt?: number;
}

export interface SwapParams {
	fromToken: TokenInfo;
	toToken: TokenInfo;
	amount: bigint;
	slippageBps?: number;
	chainId?: ChainId;
}

export interface SwapReceipt {
	id: string;
	fromToken: TokenInfo;
	toToken: TokenInfo;
	amountIn: bigint;
	amountOut: bigint;
	timestamp: number;
}

export interface BridgeParams {
	token: TokenInfo;
	amount: bigint;
	fromChain: ChainId;
	toChain: ChainId;
	recipient?: Address;
}

export interface BridgeReceipt {
	id: string;
	sourceTxHash: TransactionHash;
	destinationTxHash?: TransactionHash;
	status: "initiated" | "in_transit" | "completed" | "failed";
	timestamp: number;
}
