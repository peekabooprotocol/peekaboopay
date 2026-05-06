import type { BackendConfig, Hex } from "@peekaboopay/types";

/**
 * Extended configuration for the Railgun adapter.
 * Pass this to `RailgunAdapter.initialize()` — it widens `BackendConfig`.
 */
export interface RailgunAdapterConfig extends BackendConfig {
	/** Encryption key for Railgun wallet DB storage. */
	encryptionKey: string;
	/** BIP-39 mnemonic for creating a new wallet. Mutually exclusive with walletId. */
	mnemonic?: string;
	/** Existing Railgun wallet ID to load. Mutually exclusive with mnemonic. */
	walletId?: string;
	/** Path for LevelDB database (default: "./railgun-db") */
	dbPath?: string;
	/** POI (Proof of Innocence) aggregator node URLs */
	poiNodeUrls?: string[];
}

/** Internal state held by the adapter after initialization. */
export interface RailgunState {
	networkName: RailgunNetworkName;
	chainId: number;
	walletId: string;
	encryptionKey: string;
	initialized: boolean;
}

/** Railgun network names matching @railgun-community/shared-models. */
export type RailgunNetworkName =
	| "Ethereum"
	| "BNB_Chain"
	| "Polygon"
	| "Arbitrum";

/** Populated (unsigned) transaction ready for submission via SettlementProvider. */
export interface PopulatedTransaction {
	to: string;
	data: string;
	value?: bigint;
	gasLimit?: bigint;
}

/** Result from a Railgun shield operation. */
export interface RailgunShieldResult {
	transaction: PopulatedTransaction;
	commitmentHash: Hex;
	nullifier: Hex;
	blindingFactor: Hex;
}

/** Result from a Railgun unshield operation. */
export interface RailgunUnshieldResult {
	transaction: PopulatedTransaction;
}

/** Result from a Railgun private transfer operation. */
export interface RailgunTransferResult {
	transaction: PopulatedTransaction;
	nullifier: Hex;
	commitmentHash: Hex;
}

/** Railgun proof output from proof generation. */
export interface RailgunProofOutput {
	proof: Hex;
	publicInputs: Hex[];
}

/** Token balance entry from Railgun wallet scan. */
export interface RailgunTokenBalance {
	tokenAddress: string;
	balance: bigint;
}

/**
 * Provider interface isolating all Railgun SDK interactions.
 * Tests mock this; the real implementation lives in provider.ts.
 */
export interface RailgunProvider {
	/** Start the Railgun engine with DB and artifact config. */
	startEngine(config: RailgunAdapterConfig): Promise<void>;

	/** Create a new Railgun wallet from mnemonic. Returns wallet ID. */
	createWallet(encryptionKey: string, mnemonic: string): Promise<string>;

	/** Load an existing Railgun wallet by ID. */
	loadWallet(encryptionKey: string, walletId: string): Promise<void>;

	/** Populate a shield (deposit) transaction. */
	populateShield(
		networkName: RailgunNetworkName,
		walletId: string,
		encryptionKey: string,
		tokenAddress: string,
		amount: bigint,
		recipientAddress: Hex,
	): Promise<RailgunShieldResult>;

	/** Generate proof and populate an unshield (withdraw) transaction. */
	populateUnshield(
		networkName: RailgunNetworkName,
		walletId: string,
		encryptionKey: string,
		tokenAddress: string,
		amount: bigint,
		recipientAddress: string,
	): Promise<RailgunUnshieldResult>;

	/** Generate proof and populate a private transfer transaction. */
	populateTransfer(
		networkName: RailgunNetworkName,
		walletId: string,
		encryptionKey: string,
		tokenAddress: string,
		amount: bigint,
		recipientPublicKey: Hex,
		memo?: string,
	): Promise<RailgunTransferResult>;

	/** Generate a standalone proof for the given circuit and inputs. */
	generateProof(
		networkName: RailgunNetworkName,
		circuit: string,
		inputs: Record<string, unknown>,
	): Promise<RailgunProofOutput>;

	/** Verify a Groth16 proof. */
	verifyProof(proof: Hex, publicInputs: Hex[]): Promise<boolean>;

	/** Get shielded token balances for a wallet. */
	getBalances(
		networkName: RailgunNetworkName,
		walletId: string,
	): Promise<RailgunTokenBalance[]>;

	/** Trigger a balance refresh / Merkle tree scan. */
	refreshBalances(
		networkName: RailgunNetworkName,
		walletId: string,
	): Promise<void>;

	/** Shutdown the engine and clean up. */
	shutdown(): Promise<void>;
}
