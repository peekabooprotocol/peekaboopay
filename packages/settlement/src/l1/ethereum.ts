import type {
	ChainId,
	RawTransaction,
	SettlementProvider,
	TransactionHash,
	TransactionStatus,
} from "@peekaboopay/types";

export class EthereumL1Provider implements SettlementProvider {
	readonly chainId: ChainId = 1;

	async submitTransaction(_tx: RawTransaction): Promise<TransactionHash> {
		throw new Error("Not implemented");
	}

	async getTransactionStatus(_hash: TransactionHash): Promise<TransactionStatus> {
		throw new Error("Not implemented");
	}

	async estimateGas(_tx: RawTransaction): Promise<bigint> {
		throw new Error("Not implemented");
	}
}
