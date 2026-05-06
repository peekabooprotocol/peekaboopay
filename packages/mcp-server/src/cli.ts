#!/usr/bin/env node

/**
 * Peek-a-boo MCP Server CLI
 *
 * Starts a Model Context Protocol server on stdio that exposes
 * privacy tools (shield, unshield, pay, receive, prove, etc.) to
 * any MCP-compatible AI agent.
 *
 * Configuration via environment variables:
 *   PEEKABOOPAY_CHAIN_ID   — Target chain ID (default: 964 = Bittensor EVM)
 *   PEEKABOOPAY_RPC_URL    — JSON-RPC endpoint
 *   PEEKABOOPAY_PRIVATE_KEY — Private key for signing transactions
 *   PEEKABOOPAY_BACKEND    — Backend: "bittensor" | "railgun" (default: auto from chain ID)
 */

import { PASClient } from "@peekaboopay/sdk";
import type { AgentConfig, OperationType } from "@peekaboopay/types";
import { PrivacyLevel } from "@peekaboopay/types";
import { startServer } from "./server.js";

// ---------------------------------------------------------------------------
// Environment configuration
// ---------------------------------------------------------------------------

const BITTENSOR_CHAIN_IDS = [964, 945]; // mainnet, testnet

interface EnvConfig {
  chainId: number;
  rpcUrl: string;
  privateKey?: string;
  backend: "bittensor" | "railgun";
}

function loadConfig(): EnvConfig {
  const chainId = parseInt(process.env.PEEKABOOPAY_CHAIN_ID || "964", 10);
  const rpcUrl = process.env.PEEKABOOPAY_RPC_URL || getDefaultRpcUrl(chainId);
  const privateKey = process.env.PEEKABOOPAY_PRIVATE_KEY || undefined;

  // Auto-detect backend from chain ID unless explicitly set
  let backend: "bittensor" | "railgun";
  if (process.env.PEEKABOOPAY_BACKEND) {
    backend = process.env.PEEKABOOPAY_BACKEND as "bittensor" | "railgun";
  } else {
    backend = BITTENSOR_CHAIN_IDS.includes(chainId) ? "bittensor" : "railgun";
  }

  return { chainId, rpcUrl, privateKey, backend };
}

function getDefaultRpcUrl(chainId: number): string {
  switch (chainId) {
    case 964:
      return "https://evm.bittensor.com";
    case 945:
      return "https://evm-testnet.bittensor.com";
    case 1:
      return "https://eth.llamarpc.com";
    case 137:
      return "https://polygon-rpc.com";
    case 42161:
      return "https://arb1.arbitrum.io/rpc";
    default:
      return "http://localhost:8545";
  }
}

// ---------------------------------------------------------------------------
// Create backend adapter
// ---------------------------------------------------------------------------

async function createBackend(config: EnvConfig) {
  if (config.backend === "bittensor") {
    const { BittensorAdapter } = await import("@peekaboopay/adapter-bittensor");
    // BittensorAdapter takes config via initialize(), not constructor
    return new BittensorAdapter();
  } else {
    const { RailgunAdapter } = await import("@peekaboopay/adapter-railgun");
    // RailgunAdapter takes an optional RailgunProvider, not config
    return new RailgunAdapter();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const config = loadConfig();

  // Print startup info to stderr (stdout is reserved for MCP JSON-RPC)
  process.stderr.write(
    `[peekaboopay-mcp] Starting MCP server\n` +
    `  Backend: ${config.backend}\n` +
    `  Chain ID: ${config.chainId}\n` +
    `  RPC URL: ${config.rpcUrl}\n`
  );

  try {
    const backend = await createBackend(config);
    const client = new PASClient(backend);

    // Initialize the client connection
    const agentConfig: AgentConfig = {
      agentId: "mcp-server",
      session: {
        agentId: "mcp-server",
        privacyLevel: PrivacyLevel.FULL,
        ttl: 86400,
        allowedOperations: [
          "pay", "receive", "swap", "bridge", "prove", "credential", "disclose",
        ] as OperationType[],
      },
      backend: config.backend,
      rpcUrl: config.rpcUrl,
      chainId: config.chainId,
    };
    await client.connect(agentConfig);

    process.stderr.write(`[peekaboopay-mcp] Server ready, listening on stdio\n`);

    await startServer({ client, chainId: config.chainId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[peekaboopay-mcp] Fatal error: ${msg}\n`);
    process.exit(1);
  }
}

main();
