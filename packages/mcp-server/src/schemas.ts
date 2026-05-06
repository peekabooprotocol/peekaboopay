/**
 * Aggregated tool schema list — useful for introspection and documentation.
 * The actual tool registration happens in server.ts via the McpServer API.
 */

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
} from "./tools/index.js";

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
