import {
	payToolSchema,
	receiveToolSchema,
	swapToolSchema,
	bridgeToolSchema,
	proveToolSchema,
	credentialStoreToolSchema,
	discloseToolSchema,
	getBalanceToolSchema,
	shieldFundsToolSchema,
	unshieldFundsToolSchema,
} from "./tools";
import { PAS_RESOURCES } from "./resources";

export const PAS_TOOL_SCHEMAS = [
	payToolSchema,
	receiveToolSchema,
	swapToolSchema,
	bridgeToolSchema,
	proveToolSchema,
	credentialStoreToolSchema,
	discloseToolSchema,
	getBalanceToolSchema,
	shieldFundsToolSchema,
	unshieldFundsToolSchema,
];

export { PAS_RESOURCES };
