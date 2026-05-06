import { defineChain } from "viem";

export const bittensorEvm = defineChain({
	id: 964,
	name: "Bittensor EVM",
	nativeCurrency: {
		name: "TAO",
		symbol: "TAO",
		decimals: 18,
	},
	rpcUrls: {
		default: {
			http: [
				process.env.NEXT_PUBLIC_BITTENSOR_RPC ||
					"https://lite.chain.opentensor.ai",
			],
		},
	},
	blockExplorers: {
		default: {
			name: "Bittensor Explorer",
			url: "https://explorer.bittensor.com",
		},
	},
});
