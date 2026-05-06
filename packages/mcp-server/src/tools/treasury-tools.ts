import { z } from "zod";

export const getBalanceToolSchema = {
	name: "pas_get_balance",
	description: "Query the shielded balance for a token. Balance is computed locally — never exposed on-chain.",
	inputSchema: z.object({
		token: z.string().describe("Token symbol to check balance for"),
	}),
};

export const shieldFundsToolSchema = {
	name: "pas_shield_funds",
	description: "Move funds from a public address into the shielded pool.",
	inputSchema: z.object({
		token: z.string().describe("Token to shield"),
		amount: z.string().describe("Amount to shield"),
	}),
};

export const unshieldFundsToolSchema = {
	name: "pas_unshield_funds",
	description: "Withdraw funds from the shielded pool to a public address.",
	inputSchema: z.object({
		token: z.string().describe("Token to unshield"),
		amount: z.string().describe("Amount to unshield"),
		recipient: z.string().describe("Public address to receive funds"),
	}),
};
