import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
	solidity: {
		version: "0.8.24",
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},
	networks: {
		hardhat: {
			// In-process EVM — no external RPC needed
		},
		// Bittensor Subtensor EVM — primary deployment target
		bittensor: {
			url: process.env.BITTENSOR_RPC_URL || "https://lite.chain.opentensor.ai",
			chainId: 964,
			accounts: process.env.DEPLOYER_PRIVATE_KEY
				? [process.env.DEPLOYER_PRIVATE_KEY]
				: [],
		},
		"bittensor-testnet": {
			url: process.env.BITTENSOR_TESTNET_RPC_URL || "https://test.chain.opentensor.ai",
			chainId: 945,
			accounts: process.env.DEPLOYER_PRIVATE_KEY
				? [process.env.DEPLOYER_PRIVATE_KEY]
				: [],
		},
	},
};

export default config;
