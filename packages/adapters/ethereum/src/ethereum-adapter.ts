import type {
	BackendConfig,
	ChainId,
	Hex,
	PASResult,
	PrivacyBackend,
	PrivateTransferParams,
	Proof,
	ProofParams,
	ShieldParams,
	ShieldResult,
	TokenInfo,
	TransferResult,
	UnshieldParams,
	UnshieldResult,
} from "@peekaboopay/types";

/**
 * Native Ethereum privacy adapter.
 * Status: Stub — awaiting Ethereum Strawmap "Private L1" implementation.
 */
export class EthereumPrivacyAdapter implements PrivacyBackend {
	readonly name = "ethereum";
	readonly supportedChains: ChainId[] = [1];

	async initialize(_config: BackendConfig): Promise<void> {
		throw new Error("Not implemented — awaiting Ethereum native shielded transfers");
	}

	async shield(_params: ShieldParams): Promise<PASResult<ShieldResult>> {
		throw new Error("Not implemented");
	}

	async unshield(_params: UnshieldParams): Promise<PASResult<UnshieldResult>> {
		throw new Error("Not implemented");
	}

	async transfer(_params: PrivateTransferParams): Promise<PASResult<TransferResult>> {
		throw new Error("Not implemented");
	}

	async generateProof(_params: ProofParams): Promise<PASResult<Proof>> {
		throw new Error("Not implemented");
	}

	async verifyProof(_proof: Proof): Promise<boolean> {
		throw new Error("Not implemented");
	}

	async getShieldedBalance(_token: TokenInfo, _viewingKey: Hex): Promise<bigint> {
		throw new Error("Not implemented");
	}
}
