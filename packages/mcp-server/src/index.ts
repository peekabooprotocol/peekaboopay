export { createServer, startServer } from "./server.js";
export type { McpServerConfig } from "./server.js";

export {
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
} from "./tools/index.js";

export { PAS_RESOURCES } from "./resources/index.js";

/**
 * Aggregated list of all tool schemas (kept for backwards compatibility).
 */
export { PAS_TOOL_SCHEMAS } from "./schemas.js";
