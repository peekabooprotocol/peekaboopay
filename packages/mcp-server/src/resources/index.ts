export const PAS_RESOURCES = {
	balance: {
		uri: "pas://balance/{token}",
		name: "Shielded Balance",
		description: "Current shielded balance for a specific token",
		mimeType: "application/json",
	},
	policies: {
		uri: "pas://policies",
		name: "Active Policies",
		description: "Currently active policy rules",
		mimeType: "application/json",
	},
	credentials: {
		uri: "pas://credentials",
		name: "Credential Vault",
		description: "Available ZK-provable credentials",
		mimeType: "application/json",
	},
	session: {
		uri: "pas://session",
		name: "Session State",
		description: "Current privacy session state",
		mimeType: "application/json",
	},
} as const;
