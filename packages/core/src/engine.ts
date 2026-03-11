import type {
	BackendConfig,
	PolicyStore,
	PrivacyBackend,
	SessionStore,
	TreasuryStore,
} from "@pas/types";
import { AddressDerivationImpl, CredentialVaultImpl } from "./identity";
import { PolicyEngineImpl } from "./policy";
import { SessionManagerImpl } from "./session";
import { ShieldedTreasuryImpl } from "./treasury";

export interface PASEngineConfig {
	backend: PrivacyBackend;
	backendConfig: BackendConfig;
	/** Optional storage adapters — defaults to in-memory if omitted. */
	stores?: {
		treasury?: TreasuryStore;
		policy?: PolicyStore;
		session?: SessionStore;
	};
}

/**
 * PAS Core Engine — orchestrates treasury, identity, session, and policy modules.
 *
 * The engine is the central coordinator. It wires together all privacy-related
 * subsystems and exposes them to the SDK layer above.
 */
export class PASEngine {
	readonly treasury: ShieldedTreasuryImpl;
	readonly addressDerivation: AddressDerivationImpl;
	readonly credentialVault: CredentialVaultImpl;
	readonly sessionManager: SessionManagerImpl;
	readonly policyEngine: PolicyEngineImpl;

	private backend: PrivacyBackend;
	private initialized = false;

	constructor(config: PASEngineConfig) {
		this.backend = config.backend;
		this.treasury = new ShieldedTreasuryImpl(config.stores?.treasury);
		this.addressDerivation = new AddressDerivationImpl();
		this.credentialVault = new CredentialVaultImpl();
		this.sessionManager = new SessionManagerImpl(config.stores?.session);
		this.policyEngine = new PolicyEngineImpl(config.stores?.policy);
	}

	async initialize(config: BackendConfig): Promise<void> {
		await this.backend.initialize(config);
		this.initialized = true;
	}

	isInitialized(): boolean {
		return this.initialized;
	}

	getBackend(): PrivacyBackend {
		return this.backend;
	}
}
