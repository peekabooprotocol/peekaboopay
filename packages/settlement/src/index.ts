export { EthereumL1Provider } from "./l1/index.js";
export { SUPPORTED_CHAINS } from "./l2/index.js";
export type { ChainConfig } from "./l2/index.js";

// Relay network — gasless meta-transactions for stealth addresses
export {
	RelayClient,
	createRelayClient,
	signRelayRequest,
	verifyRelaySignature,
	submitRelayRequest,
	estimateRelayFee,
	buildWithdrawMetaTx,
	buildAnnounceMetaTx,
	RELAY_EIP712_DOMAIN,
	RELAY_REQUEST_TYPES,
	BPS_DENOMINATOR,
	MAX_RELAY_FEE_BPS,
	RelayError,
	RelayErrorCode,
} from "./relay/index.js";

export type {
	RelayRequest,
	RelayResponse,
	RelayerConfig,
	RelayFeeEstimate,
	RelayClientState,
	WithdrawMetaTxParams,
	AnnounceMetaTxParams,
} from "./relay/index.js";
