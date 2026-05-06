import type { ChainId, ChainType } from "@peekaboopay/types";

export interface ChainConfig {
	chainId: ChainId;
	name: string;
	type: ChainType;
	rpcUrl: string;
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
	ethereum: { chainId: 1, name: "Ethereum", type: "l1" as ChainType, rpcUrl: "" },
	base: { chainId: 8453, name: "Base", type: "l2_base" as ChainType, rpcUrl: "" },
	arbitrum: { chainId: 42161, name: "Arbitrum One", type: "l2_arbitrum" as ChainType, rpcUrl: "" },
	optimism: { chainId: 10, name: "Optimism", type: "l2_optimism" as ChainType, rpcUrl: "" },
};
