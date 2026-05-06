import type { Address, ChainId, Hex, PASResult, TokenInfo } from "./common";

/**
 * Core pluggable backend interface.
 * Every ZK privacy backend (Railgun, Aztec, native Ethereum) implements this.
 */
export interface PrivacyBackend {
	readonly name: string;
	readonly supportedChains: ChainId[];

	initialize(config: BackendConfig): Promise<void>;

	shield(params: ShieldParams): Promise<PASResult<ShieldResult>>;
	unshield(params: UnshieldParams): Promise<PASResult<UnshieldResult>>;
	transfer(params: PrivateTransferParams): Promise<PASResult<TransferResult>>;

	generateProof(params: ProofParams): Promise<PASResult<Proof>>;
	verifyProof(proof: Proof): Promise<boolean>;

	getShieldedBalance(token: TokenInfo, viewingKey: Hex): Promise<bigint>;
}

export interface BackendConfig {
	chainId: ChainId;
	rpcUrl: string;
	artifactsPath?: string;
}

export interface ShieldParams {
	token: TokenInfo;
	amount: bigint;
	recipient: Hex;
}

export interface ShieldResult {
	txHash: Hex;
	utxo: UTXONote;
	timestamp: number;
}

export interface UnshieldParams {
	token: TokenInfo;
	amount: bigint;
	recipient: Address;
	proof: Proof;
}

export interface UnshieldResult {
	txHash: Hex;
	timestamp: number;
}

export interface PrivateTransferParams {
	token: TokenInfo;
	amount: bigint;
	recipientPublicKey: Hex;
	memo?: string;
}

export interface TransferResult {
	nullifier: Hex;
	commitment: Hex;
	timestamp: number;
}

export interface ProofParams {
	circuit: string;
	inputs: Record<string, unknown>;
}

export interface Proof {
	protocol: "groth16" | "plonk" | "ultraplonk";
	proof: Hex;
	publicInputs: Hex[];
}

export interface UTXONote {
	commitment: Hex;
	amount: bigint;
	token: TokenInfo;
	blinding: Hex;
	index: number;
}
