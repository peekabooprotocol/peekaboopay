import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { PASClient } from "@peekaboopay/sdk";
import type { Hex, TokenInfo, Address } from "@peekaboopay/types";
import { CredentialType } from "@peekaboopay/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpServerConfig {
  client: PASClient;
  /** Default chain ID for token resolution */
  chainId: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal TokenInfo from a symbol string.
 * Real usage would resolve from a registry; here we use placeholder address.
 */
function resolveToken(symbol: string, chainId: number): TokenInfo {
  // Native ETH/TAO represented with zero address
  const NATIVE_SYMBOLS = ["ETH", "TAO", "MATIC", "BNB"];
  const address = NATIVE_SYMBOLS.includes(symbol.toUpperCase())
    ? ("0x0000000000000000000000000000000000000000" as Hex)
    : ("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Hex); // placeholder

  return {
    address,
    symbol: symbol.toUpperCase(),
    decimals: 18,
    chainId,
  };
}

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

/**
 * Creates and configures the MCP server with all Peek-a-boo tool handlers.
 */
export function createServer(config: McpServerConfig): McpServer {
  const { client, chainId } = config;

  const server = new McpServer(
    { name: "peekaboopay", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  // -------------------------------------------------------------------------
  // pas_pay — Send a shielded payment
  // -------------------------------------------------------------------------
  server.tool(
    "pas_pay",
    "Send a shielded payment to any address. The payment is routed through a privacy pool — no link between sender and recipient is created on-chain.",
    {
      recipient: z.string().describe("Recipient address (public or shielded)"),
      amount: z.string().describe("Amount to send (as string to preserve precision)"),
      token: z.string().describe("Token symbol (e.g. USDC, ETH, DAI)"),
      memo: z.string().optional().describe("Optional encrypted memo"),
    },
    async (args) => {
      try {
        const tokenInfo = resolveToken(args.token, chainId);
        const result = await client.pay({
          to: args.recipient as Hex,
          token: tokenInfo,
          amount: BigInt(args.amount),
          memo: args.memo,
        });
        if (result.success) {
          return textResult(result.data);
        }
        return errorResult(`Payment failed: ${result.error.message}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResult(`Payment error: ${msg}`);
      }
    }
  );

  // -------------------------------------------------------------------------
  // pas_receive — Generate a fresh stealth receive address
  // -------------------------------------------------------------------------
  server.tool(
    "pas_receive",
    "Generate a fresh stealth receive address. Each address is single-use — no address reuse.",
    {
      token: z.string().describe("Token to receive"),
      singleUse: z.boolean().optional().describe("Whether address expires after one use (default true)"),
    },
    async (args) => {
      try {
        const tokenInfo = resolveToken(args.token, chainId);
        const result = await client.receive({
          token: tokenInfo,
          singleUse: args.singleUse ?? true,
        });
        if (result.success) {
          return textResult(result.data);
        }
        return errorResult(`Receive failed: ${result.error.message}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResult(`Receive error: ${msg}`);
      }
    }
  );

  // -------------------------------------------------------------------------
  // pas_get_balance — Query shielded balance
  // -------------------------------------------------------------------------
  server.tool(
    "pas_get_balance",
    "Query the shielded balance for a token. Balance is computed locally — never exposed on-chain.",
    {
      token: z.string().describe("Token symbol to check balance for"),
    },
    async (args) => {
      try {
        const tokenInfo = resolveToken(args.token, chainId);
        // getShieldedBalance requires a viewing key — use a zero key for now
        // In production, the viewing key comes from the user's wallet/session
        const viewingKey = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;
        const engine = (client as any).engine;
        if (engine && engine.getBackend) {
          const backend = engine.getBackend();
          const balance = await backend.getShieldedBalance(tokenInfo, viewingKey);
          return textResult({
            token: args.token,
            balance: balance.toString(),
            decimals: tokenInfo.decimals,
          });
        }
        return errorResult("Backend not available — client not fully initialized");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResult(`Balance query error: ${msg}`);
      }
    }
  );

  // -------------------------------------------------------------------------
  // pas_shield_funds — Move funds into the shielded pool
  // -------------------------------------------------------------------------
  server.tool(
    "pas_shield_funds",
    "Move funds from a public address into the shielded pool.",
    {
      token: z.string().describe("Token to shield"),
      amount: z.string().describe("Amount to shield"),
    },
    async (args) => {
      try {
        const tokenInfo = resolveToken(args.token, chainId);
        const engine = (client as any).engine;
        if (engine && engine.getBackend) {
          const backend = engine.getBackend();
          const recipient = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;
          const result = await backend.shield({
            token: tokenInfo,
            amount: BigInt(args.amount),
            recipient,
          });
          if (result.success) {
            return textResult(result.data);
          }
          return errorResult(`Shield failed: ${result.error.message}`);
        }
        return errorResult("Backend not available — client not fully initialized");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResult(`Shield error: ${msg}`);
      }
    }
  );

  // -------------------------------------------------------------------------
  // pas_unshield_funds — Withdraw from shielded pool
  // -------------------------------------------------------------------------
  server.tool(
    "pas_unshield_funds",
    "Withdraw funds from the shielded pool to a public address.",
    {
      token: z.string().describe("Token to unshield"),
      amount: z.string().describe("Amount to unshield"),
      recipient: z.string().describe("Public address to receive funds"),
    },
    async (args) => {
      try {
        const tokenInfo = resolveToken(args.token, chainId);
        const engine = (client as any).engine;
        if (engine && engine.getBackend) {
          const backend = engine.getBackend();
          const result = await backend.unshield({
            token: tokenInfo,
            amount: BigInt(args.amount),
            recipient: args.recipient as Hex,
            proof: {
              protocol: "groth16",
              proof: "0x" as Hex,
              publicInputs: [],
            },
          });
          if (result.success) {
            return textResult(result.data);
          }
          return errorResult(`Unshield failed: ${result.error.message}`);
        }
        return errorResult("Backend not available — client not fully initialized");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResult(`Unshield error: ${msg}`);
      }
    }
  );

  // -------------------------------------------------------------------------
  // pas_prove — Generate a ZK proof
  // -------------------------------------------------------------------------
  server.tool(
    "pas_prove",
    "Generate a ZK proof for a credential. Proves a claim without revealing the underlying data.",
    {
      credentialId: z.string().describe("ID of the credential to prove"),
      attributes: z.array(z.string()).describe("Attributes to selectively disclose"),
    },
    async (args) => {
      try {
        const result = await client.prove(args.credentialId, {
          attributes: args.attributes,
        });
        if (result.success) {
          return textResult(result.data);
        }
        return errorResult(`Proof generation failed: ${result.error.message}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResult(`Proof error: ${msg}`);
      }
    }
  );

  // -------------------------------------------------------------------------
  // pas_swap — Private token swap (not yet implemented)
  // -------------------------------------------------------------------------
  server.tool(
    "pas_swap",
    "Private token swap — exchange tokens within the shielded pool.",
    {
      fromToken: z.string().describe("Token to sell"),
      toToken: z.string().describe("Token to buy"),
      amount: z.string().describe("Amount of fromToken to swap"),
      slippageBps: z.number().optional().describe("Max slippage in basis points"),
    },
    async (_args) => {
      return errorResult(
        "Private swaps not yet supported. This feature requires integration with a shielded DEX. " +
        "Track progress at: https://github.com/peekabooprotocol/PAS/issues"
      );
    }
  );

  // -------------------------------------------------------------------------
  // pas_bridge — Cross-chain bridging (not yet implemented)
  // -------------------------------------------------------------------------
  server.tool(
    "pas_bridge",
    "Bridge tokens privately between L1 and L2 chains.",
    {
      token: z.string().describe("Token to bridge"),
      amount: z.string().describe("Amount to bridge"),
      fromChain: z.number().describe("Source chain ID"),
      toChain: z.number().describe("Destination chain ID"),
    },
    async (_args) => {
      return errorResult(
        "Cross-chain bridging not yet supported. This feature requires integration with a privacy-preserving bridge protocol. " +
        "Track progress at: https://github.com/peekabooprotocol/PAS/issues"
      );
    }
  );

  // -------------------------------------------------------------------------
  // pas_credential_store — Store ZK credential (not yet implemented)
  // -------------------------------------------------------------------------
  server.tool(
    "pas_credential_store",
    "Store a new ZK-provable credential in the credential vault.",
    {
      type: z.enum(["reputation", "compliance", "capability", "membership"]).describe("Credential type"),
      claims: z.record(z.unknown()).describe("Credential claims to store"),
    },
    async (args) => {
      try {
        const typeMap: Record<string, CredentialType> = {
          reputation: CredentialType.REPUTATION,
          compliance: CredentialType.COMPLIANCE,
          capability: CredentialType.CAPABILITY,
          membership: CredentialType.MEMBERSHIP,
        };
        const credId = `cred-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const result = await client.credential({
          id: credId,
          type: typeMap[args.type] ?? CredentialType.CAPABILITY,
          claims: args.claims as Record<string, unknown>,
          issuer: "0x0000000000000000000000000000000000000000" as Address,
          subject: "0x0000000000000000000000000000000000000000" as Address,
          issuedAt: Date.now(),
          proof: {
            protocol: "groth16",
            proof: "0x" as Hex,
            publicInputs: [],
          },
        });
        if (result.success) {
          return textResult({ credentialId: result.data, type: args.type });
        }
        return errorResult(`Credential store failed: ${result.error.message}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResult(`Credential store error: ${msg}`);
      }
    }
  );

  // -------------------------------------------------------------------------
  // pas_disclose — Selective disclosure (not yet implemented)
  // -------------------------------------------------------------------------
  server.tool(
    "pas_disclose",
    "Selectively reveal specific attributes for compliance or access control.",
    {
      attributes: z.array(z.string()).describe("Attributes to disclose"),
    },
    async (args) => {
      try {
        const result = await client.disclose(args.attributes);
        if (result.success) {
          return textResult(result.data);
        }
        return errorResult(`Selective disclosure failed: ${result.error.message}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResult(`Disclosure error: ${msg}`);
      }
    }
  );

  return server;
}

// ---------------------------------------------------------------------------
// Start server (convenience for CLI)
// ---------------------------------------------------------------------------

/**
 * Starts the MCP server on stdio transport.
 * Call this from the CLI entry point after creating the PASClient.
 */
export async function startServer(config: McpServerConfig): Promise<void> {
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
