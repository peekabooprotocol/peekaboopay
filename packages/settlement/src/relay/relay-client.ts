import type {
	ChainId,
	GaslessTransaction,
	RawTransaction,
	RelayFeeEstimate,
	RelayProvider,
	TransactionHash,
	TransactionStatus,
} from "@pas/types";

export class RelayClient implements RelayProvider {
	readonly chainId: ChainId;

	constructor(chainId: ChainId) {
		this.chainId = chainId;
	}

	async submitTransaction(_tx: RawTransaction): Promise<TransactionHash> {
		throw new Error("Not implemented");
	}

	async getTransactionStatus(_hash: TransactionHash): Promise<TransactionStatus> {
		throw new Error("Not implemented");
	}

	async estimateGas(_tx: RawTransaction): Promise<bigint> {
		throw new Error("Not implemented");
	}

	async submitGasless(_tx: GaslessTransaction): Promise<TransactionHash> {
		throw new Error("Not implemented");
	}

	async estimateRelayFee(_tx: RawTransaction): Promise<RelayFeeEstimate> {
		throw new Error("Not implemented");
	}
}
