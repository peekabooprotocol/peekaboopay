import type { Address, ChainId, Hex, TransactionHash } from "./common";

export interface SettlementProvider {
	readonly chainId: ChainId;

	submitTransaction(tx: RawTransaction): Promise<TransactionHash>;
	getTransactionStatus(hash: TransactionHash): Promise<TransactionStatus>;
	estimateGas(tx: RawTransaction): Promise<bigint>;
}

export interface RelayProvider extends SettlementProvider {
	submitGasless(tx: GaslessTransaction): Promise<TransactionHash>;
	estimateRelayFee(tx: RawTransaction): Promise<RelayFeeEstimate>;
}

export interface RawTransaction {
	to: Address;
	data: Hex;
	value?: bigint;
	chainId: ChainId;
}

export interface GaslessTransaction extends RawTransaction {
	signature: Hex;
	deadline: number;
}

export interface TransactionStatus {
	hash: TransactionHash;
	status: "pending" | "confirmed" | "failed" | "dropped";
	blockNumber?: number;
	confirmations: number;
	gasUsed?: bigint;
}

export interface RelayFeeEstimate {
	feeToken: Address;
	feeAmount: bigint;
	feePercentage: number;
}
