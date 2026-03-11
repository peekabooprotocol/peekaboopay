---
sidebar_position: 1
---

# Quickstart

Get started with PAS in under 5 minutes.

## Install

```bash
npm install @pas/sdk @pas/adapter-railgun
```

## Basic Usage

```typescript
import { PASClient } from "@pas/sdk";
import { RailgunAdapter } from "@pas/adapter-railgun";

// 1. Create a privacy backend
const backend = new RailgunAdapter();

// 2. Initialize the client
const pas = new PASClient(backend);
await pas.connect({
  agentId: "my-agent",
  rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
  backend: "railgun",
  session: {
    agentId: "my-agent",
    privacyLevel: "full",
    ttl: 3600,
    allowedOperations: ["pay", "receive"],
  },
});

// 3. Send a shielded payment
const result = await pas.pay({
  to: "0x...",
  token: { address: "0xA0b8...", symbol: "USDC", decimals: 6, chainId: 1 },
  amount: 50_000_000n, // 50 USDC
});
```

## MCP Integration

For MCP-compatible agents, PAS exposes tools automatically:

```json
{
  "mcpServers": {
    "pas": {
      "command": "npx",
      "args": ["@pas/mcp-server"]
    }
  }
}
```
