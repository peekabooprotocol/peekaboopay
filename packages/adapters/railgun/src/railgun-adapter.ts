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
} from "@pas/types";

/**
 * Railgun privacy backend adapter.
 * Uses ZK-SNARKs for shielded ERC-20 transfers on Ethereum mainnet.
 */
export class RailgunAdapter implements PrivacyBackend {
	readonly name = "railgun";
	readonly supportedChains: ChainId[] = [1, 56, 137, 42161];

	async initialize(_config: BackendConfig): Promise<void> {
		throw new Error("Not implemented — requires @railgun-community/wallet");
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
