import { z } from "zod";

export const proveToolSchema = {
	name: "pas_prove",
	description: "Generate a ZK proof for a credential. Proves a claim without revealing the underlying data.",
	inputSchema: z.object({
		credentialId: z.string().describe("ID of the credential to prove"),
		attributes: z.array(z.string()).describe("Attributes to selectively disclose"),
	}),
};

export const credentialStoreToolSchema = {
	name: "pas_credential_store",
	description: "Store a new ZK-provable credential in the credential vault.",
	inputSchema: z.object({
		type: z.enum(["reputation", "compliance", "capability", "membership"]),
		claims: z.record(z.unknown()).describe("Credential claims to store"),
	}),
};

export const discloseToolSchema = {
	name: "pas_disclose",
	description: "Selectively reveal specific attributes for compliance or access control.",
	inputSchema: z.object({
		attributes: z.array(z.string()).describe("Attributes to disclose"),
	}),
};
