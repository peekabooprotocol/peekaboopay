import type { RailgunAdapterConfig, RailgunProvider, RailgunState } from "./types";
import { chainIdToNetworkName, SUPPORTED_CHAINS } from "./chain-map";
import { RailgunErrorCode } from "./errors";

export class WalletManager {
	private state: RailgunState | null = null;
	private provider: RailgunProvider;

	constructor(provider: RailgunProvider) {
		this.provider = provider;
	}

	async initialize(config: RailgunAdapterConfig): Promise<void> {
		this.validateConfig(config);

		const networkName = chainIdToNetworkName(config.chainId);

		await this.provider.startEngine(config);

		let walletId: string;
		if (config.walletId) {
			await this.provider.loadWallet(config.encryptionKey, config.walletId);
			walletId = config.walletId;
		} else {
			walletId = await this.provider.createWallet(
				config.encryptionKey,
				config.mnemonic!,
			);
		}

		this.state = {
			networkName,
			chainId: config.chainId,
			walletId,
			encryptionKey: config.encryptionKey,
			initialized: true,
		};
	}

	getState(): RailgunState {
		if (!this.state?.initialized) {
			throw new Error(RailgunErrorCode.NOT_INITIALIZED);
		}
		return this.state;
	}

	isInitialized(): boolean {
		return this.state?.initialized === true;
	}

	async shutdown(): Promise<void> {
		await this.provider.shutdown();
		this.state = null;
	}

	private validateConfig(config: RailgunAdapterConfig): void {
		if (!config.encryptionKey) {
			throw new Error("encryptionKey is required");
		}
		if (!config.mnemonic && !config.walletId) {
			throw new Error("Either mnemonic or walletId is required");
		}
		if (config.mnemonic && config.walletId) {
			throw new Error("mnemonic and walletId are mutually exclusive");
		}
		if (!SUPPORTED_CHAINS.includes(config.chainId)) {
			throw new Error(
				`Unsupported chain ID: ${config.chainId}. Supported: ${SUPPORTED_CHAINS.join(", ")}`,
			);
		}
	}
}
