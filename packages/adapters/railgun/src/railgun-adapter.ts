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
import type { RailgunAdapterConfig, RailgunProvider } from "./types";
import { SUPPORTED_CHAINS } from "./chain-map";
import { WalletManager } from "./wallet-manager";
import { TransactionBuilder } from "./transaction-builder";
import { ProofService } from "./proof-service";
import { BalanceScanner } from "./balance-scanner";
import { RailgunErrorCode, toFailure } from "./errors";

/**
 * Railgun privacy backend adapter.
 * Uses ZK-SNARKs for shielded ERC-20 transfers on Ethereum, BSC, Polygon, Arbitrum.
 *
 * Pass a `RailgunAdapterConfig` (extends `BackendConfig`) to `initialize()`.
 * Optionally inject a custom `RailgunProvider` for testing.
 */
export class RailgunAdapter implements PrivacyBackend {
	readonly name = "railgun";
	readonly supportedChains: ChainId[] = [...SUPPORTED_CHAINS];

	private walletManager: WalletManager;
	private txBuilder: TransactionBuilder;
	private proofService: ProofService;
	private balanceScanner: BalanceScanner;

	constructor(provider?: RailgunProvider) {
		const resolvedProvider = provider ?? createDeferredProvider();

		this.walletManager = new WalletManager(resolvedProvider);
		this.txBuilder = new TransactionBuilder(
			() => this.walletManager.getState(),
			resolvedProvider,
		);
		this.proofService = new ProofService(
			() => this.walletManager.getState(),
			resolvedProvider,
		);
		this.balanceScanner = new BalanceScanner(
			() => this.walletManager.getState(),
			resolvedProvider,
		);
	}

	async initialize(config: BackendConfig): Promise<void> {
		const railgunConfig = config as RailgunAdapterConfig;
		await this.walletManager.initialize(railgunConfig);
	}

	async shield(params: ShieldParams): Promise<PASResult<ShieldResult>> {
		if (!this.walletManager.isInitialized()) {
			return toFailure(
				RailgunErrorCode.NOT_INITIALIZED,
				"Adapter not initialized. Call initialize() first.",
			);
		}
		return this.txBuilder.buildShield(params);
	}

	async unshield(params: UnshieldParams): Promise<PASResult<UnshieldResult>> {
		if (!this.walletManager.isInitialized()) {
			return toFailure(
				RailgunErrorCode.NOT_INITIALIZED,
				"Adapter not initialized. Call initialize() first.",
			);
		}
		return this.txBuilder.buildUnshield(params);
	}

	async transfer(
		params: PrivateTransferParams,
	): Promise<PASResult<TransferResult>> {
		if (!this.walletManager.isInitialized()) {
			return toFailure(
				RailgunErrorCode.NOT_INITIALIZED,
				"Adapter not initialized. Call initialize() first.",
			);
		}
		return this.txBuilder.buildTransfer(params);
	}

	async generateProof(params: ProofParams): Promise<PASResult<Proof>> {
		if (!this.walletManager.isInitialized()) {
			return toFailure(
				RailgunErrorCode.NOT_INITIALIZED,
				"Adapter not initialized. Call initialize() first.",
			);
		}
		return this.proofService.generate(params);
	}

	async verifyProof(proof: Proof): Promise<boolean> {
		if (!this.walletManager.isInitialized()) {
			return false;
		}
		return this.proofService.verify(proof);
	}

	async getShieldedBalance(token: TokenInfo, viewingKey: Hex): Promise<bigint> {
		if (!this.walletManager.isInitialized()) {
			throw new Error(
				"Adapter not initialized. Call initialize() first.",
			);
		}
		return this.balanceScanner.getBalance(token, viewingKey);
	}
}

/**
 * Creates a deferred provider that throws if any method is called
 * before a real provider is configured. Production callers should
 * pass a RailgunSDKProvider to the RailgunAdapter constructor.
 */
function createDeferredProvider(): RailgunProvider {
	const handler: ProxyHandler<object> = {
		get(_target, prop) {
			if (prop === "startEngine") {
				return async () => {
					throw new Error(
						"No RailgunProvider configured. Pass a provider to the RailgunAdapter constructor, " +
							"or use RailgunSDKProvider from @peekaboopay/adapter-railgun/provider.",
					);
				};
			}
			return () => {
				throw new Error(
					`RailgunProvider.${String(prop)}() called but no provider configured.`,
				);
			};
		},
	};
	return new Proxy({}, handler) as RailgunProvider;
}
