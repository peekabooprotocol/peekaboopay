/**
 * Chain-aware configuration for the dashboard.
 * Maps chain IDs to supported tokens, contract addresses, and adapter info.
 */

export interface TokenConfig {
	address: string; // address(0) for native
	symbol: string;
	decimals: number;
	name: string;
	isNative: boolean;
}

export interface ChainConfig {
	name: string;
	shortName: string;
	adapter: "bittensor" | "railgun";
	nativeToken: TokenConfig;
	tokens: TokenConfig[];
	/** ShieldedPool address (only on Bittensor — Railgun uses its own contracts) */
	shieldedPoolAddress?: string;
	/** StealthAnnouncer address (only on Bittensor) */
	stealthAnnouncerAddress?: string;
	accentColor: string;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Well-known ERC-20 addresses per chain
const USDC: Record<number, string> = {
	1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
	56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
	137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
	42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
};

const USDT: Record<number, string> = {
	1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
	56: "0x55d398326f99059fF775485246999027B3197955",
	137: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
	42161: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
};

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
	// Bittensor EVM
	964: {
		name: "Bittensor EVM",
		shortName: "Bittensor",
		adapter: "bittensor",
		accentColor: "#00e5b4",
		shieldedPoolAddress: "0xaf2443B3bFc7D4cbD0e58fA175876fF51f7097f59",
		stealthAnnouncerAddress: "0xF6b3223aC0107e2bd64A982e0212C0b0751c269B",
		nativeToken: {
			address: ZERO_ADDRESS,
			symbol: "TAO",
			decimals: 18,
			name: "TAO",
			isNative: true,
		},
		tokens: [
			{
				address: ZERO_ADDRESS,
				symbol: "TAO",
				decimals: 18,
				name: "TAO",
				isNative: true,
			},
		],
	},

	// Ethereum
	1: {
		name: "Ethereum",
		shortName: "ETH",
		adapter: "railgun",
		accentColor: "#627EEA",
		nativeToken: {
			address: ZERO_ADDRESS,
			symbol: "ETH",
			decimals: 18,
			name: "Ether",
			isNative: true,
		},
		tokens: [
			{ address: ZERO_ADDRESS, symbol: "ETH", decimals: 18, name: "Ether", isNative: true },
			{ address: USDC[1], symbol: "USDC", decimals: 6, name: "USD Coin", isNative: false },
			{ address: USDT[1], symbol: "USDT", decimals: 6, name: "Tether", isNative: false },
		],
	},

	// BSC
	56: {
		name: "BNB Chain",
		shortName: "BSC",
		adapter: "railgun",
		accentColor: "#F0B90B",
		nativeToken: {
			address: ZERO_ADDRESS,
			symbol: "BNB",
			decimals: 18,
			name: "BNB",
			isNative: true,
		},
		tokens: [
			{ address: ZERO_ADDRESS, symbol: "BNB", decimals: 18, name: "BNB", isNative: true },
			{ address: USDC[56], symbol: "USDC", decimals: 18, name: "USD Coin", isNative: false },
			{ address: USDT[56], symbol: "USDT", decimals: 18, name: "Tether", isNative: false },
		],
	},

	// Polygon
	137: {
		name: "Polygon",
		shortName: "POL",
		adapter: "railgun",
		accentColor: "#8247E5",
		nativeToken: {
			address: ZERO_ADDRESS,
			symbol: "POL",
			decimals: 18,
			name: "POL",
			isNative: true,
		},
		tokens: [
			{ address: ZERO_ADDRESS, symbol: "POL", decimals: 18, name: "POL", isNative: true },
			{ address: USDC[137], symbol: "USDC", decimals: 6, name: "USD Coin", isNative: false },
			{ address: USDT[137], symbol: "USDT", decimals: 6, name: "Tether", isNative: false },
		],
	},

	// Arbitrum
	42161: {
		name: "Arbitrum",
		shortName: "ARB",
		adapter: "railgun",
		accentColor: "#28A0F0",
		nativeToken: {
			address: ZERO_ADDRESS,
			symbol: "ETH",
			decimals: 18,
			name: "Ether",
			isNative: true,
		},
		tokens: [
			{ address: ZERO_ADDRESS, symbol: "ETH", decimals: 18, name: "Ether", isNative: true },
			{ address: USDC[42161], symbol: "USDC", decimals: 6, name: "USD Coin", isNative: false },
			{ address: USDT[42161], symbol: "USDT", decimals: 6, name: "Tether", isNative: false },
		],
	},
};

/** Get chain config for the connected chain, falls back to Bittensor */
export function getChainConfig(chainId: number | undefined): ChainConfig {
	return CHAIN_CONFIGS[chainId || 964] || CHAIN_CONFIGS[964];
}

/** Check if a chain uses Railgun (EVM) or Bittensor adapter */
export function isRailgunChain(chainId: number | undefined): boolean {
	return getChainConfig(chainId).adapter === "railgun";
}
