import type { ChainId } from "@peekaboopay/types";
import type { RailgunNetworkName } from "./types";

const CHAIN_TO_NETWORK: ReadonlyMap<ChainId, RailgunNetworkName> = new Map([
	[1, "Ethereum"],
	[56, "BNB_Chain"],
	[137, "Polygon"],
	[42161, "Arbitrum"],
]);

const NETWORK_TO_CHAIN: ReadonlyMap<RailgunNetworkName, ChainId> = new Map(
	[...CHAIN_TO_NETWORK.entries()].map(([k, v]) => [v, k]),
);

export function chainIdToNetworkName(chainId: ChainId): RailgunNetworkName {
	const name = CHAIN_TO_NETWORK.get(chainId);
	if (!name) {
		throw new Error(`Unsupported chain ID for Railgun: ${chainId}`);
	}
	return name;
}

export function networkNameToChainId(name: RailgunNetworkName): ChainId {
	const id = NETWORK_TO_CHAIN.get(name);
	if (!id) {
		throw new Error(`Unknown Railgun network: ${name}`);
	}
	return id;
}

export const SUPPORTED_CHAINS: readonly ChainId[] = [
	...CHAIN_TO_NETWORK.keys(),
];
