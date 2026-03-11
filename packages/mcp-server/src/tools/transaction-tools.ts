import { z } from "zod";

export const payToolSchema = {
	name: "pas_pay",
	description: "Send a shielded payment to any address. The payment is routed through a privacy pool — no link between sender and recipient is created on-chain.",
	inputSchema: z.object({
		recipient: z.string().describe("Recipient address (public or shielded)"),
		amount: z.string().describe("Amount to send (as string to preserve precision)"),
		token: z.string().describe("Token symbol (e.g. USDC, ETH, DAI)"),
		memo: z.string().optional().describe("Optional encrypted memo"),
	}),
};

export const receiveToolSchema = {
	name: "pas_receive",
	description: "Generate a fresh stealth receive address. Each address is single-use — no address reuse.",
	inputSchema: z.object({
		token: z.string().describe("Token to receive"),
		singleUse: z.boolean().optional().describe("Whether address expires after one use (default true)"),
	}),
};

export const swapToolSchema = {
	name: "pas_swap",
	description: "Private token swap — exchange tokens within the shielded pool.",
	inputSchema: z.object({
		fromToken: z.string().describe("Token to sell"),
		toToken: z.string().describe("Token to buy"),
		amount: z.string().describe("Amount of fromToken to swap"),
		slippageBps: z.number().optional().describe("Max slippage in basis points"),
	}),
};

export const bridgeToolSchema = {
	name: "pas_bridge",
	description: "Bridge tokens privately between L1 and L2 chains.",
	inputSchema: z.object({
		token: z.string().describe("Token to bridge"),
		amount: z.string().describe("Amount to bridge"),
		fromChain: z.number().describe("Source chain ID"),
		toChain: z.number().describe("Destination chain ID"),
	}),
};
