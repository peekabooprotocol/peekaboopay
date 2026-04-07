import type { PASClient } from "@peekaboopay/sdk";

/**
 * Creates CrewAI-compatible tool definitions from a PASClient instance.
 */
export function createCrewAITools(_client: PASClient) {
	return [
		{
			name: "pas_pay",
			description: "Send a shielded payment to any address",
			execute: async (_input: Record<string, unknown>) => {
				throw new Error("Not implemented");
			},
		},
		{
			name: "pas_receive",
			description: "Generate a stealth receive address",
			execute: async (_input: Record<string, unknown>) => {
				throw new Error("Not implemented");
			},
		},
		{
			name: "pas_get_balance",
			description: "Check shielded token balance",
			execute: async (_input: Record<string, unknown>) => {
				throw new Error("Not implemented");
			},
		},
		{
			name: "pas_prove",
			description: "Generate a ZK proof for a credential",
			execute: async (_input: Record<string, unknown>) => {
				throw new Error("Not implemented");
			},
		},
	];
}
