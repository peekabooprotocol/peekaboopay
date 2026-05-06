import type { ChainId } from "@peekaboopay/types";

/**
 * Bittensor Subtensor EVM network configuration.
 *
 * Bittensor runs an EVM compatibility layer on its Substrate-based chain.
 * All standard Ethereum JSON-RPC methods are supported. Contracts deploy
 * without modification. Native currency is TAO.
 *
 * @see https://docs.learnbittensor.org/evm-tutorials/subtensor-networks
 */

export interface BittensorNetwork {
	name: string;
	chainId: ChainId;
	rpcUrl: string;
	nativeCurrency: {
		name: string;
		symbol: string;
		decimals: number;
	};
}

/** Bittensor EVM Mainnet (Finney) */
export const BITTENSOR_MAINNET: BittensorNetwork = {
	name: "Bittensor EVM Mainnet",
	chainId: 964,
	rpcUrl: "https://lite.chain.opentensor.ai",
	nativeCurrency: {
		name: "TAO",
		symbol: "TAO",
		decimals: 18,
	},
};

/** Bittensor EVM Testnet */
export const BITTENSOR_TESTNET: BittensorNetwork = {
	name: "Bittensor EVM Testnet",
	chainId: 945,
	rpcUrl: "https://test.chain.opentensor.ai",
	nativeCurrency: {
		name: "Test TAO",
		symbol: "TAO",
		decimals: 18,
	},
};

/** All supported Bittensor chain IDs */
export const BITTENSOR_CHAIN_IDS: ChainId[] = [
	BITTENSOR_MAINNET.chainId,
	BITTENSOR_TESTNET.chainId,
];

/**
 * Get network config by chain ID.
 */
export function getBittensorNetwork(
	chainId: ChainId,
): BittensorNetwork | undefined {
	switch (chainId) {
		case 964:
			return BITTENSOR_MAINNET;
		case 945:
			return BITTENSOR_TESTNET;
		default:
			return undefined;
	}
}
