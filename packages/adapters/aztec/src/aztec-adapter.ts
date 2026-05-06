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
 * Aztec privacy backend adapter.
 * Full programmable privacy with private smart contracts.
 * Status: Stub — awaiting Aztec Alpha launch.
 */
export class AztecAdapter implements PrivacyBackend {
	readonly name = "aztec";
	readonly supportedChains: ChainId[] = [1];

	async initialize(_config: BackendConfig): Promise<void> {
		throw new Error("Not implemented — awaiting @aztec/aztec.js");
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
