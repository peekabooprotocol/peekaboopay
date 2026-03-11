import type { PASClient } from "@pas/sdk";

/**
 * Creates LangChain-compatible tool definitions from a PASClient instance.
 *
 * Usage with LangChain:
 *   import { createPASTools } from "@pas/agent-langchain";
 *   const tools = createPASTools(pasClient);
 *   const agent = createReactAgent({ llm, tools });
 */
export function createPASTools(_client: PASClient) {
	return [
		{
			name: "pas_pay",
			description: "Send a shielded payment to any address",
			func: async (_input: string) => {
				throw new Error("Not implemented");
			},
		},
		{
			name: "pas_receive",
			description: "Generate a stealth receive address",
			func: async (_input: string) => {
				throw new Error("Not implemented");
			},
		},
		{
			name: "pas_get_balance",
			description: "Check shielded token balance",
			func: async (_input: string) => {
				throw new Error("Not implemented");
			},
		},
		{
			name: "pas_prove",
			description: "Generate a ZK proof for a credential",
			func: async (_input: string) => {
				throw new Error("Not implemented");
			},
		},
	];
}
