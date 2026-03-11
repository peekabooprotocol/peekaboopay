import type { Credential, CredentialFilter, CredentialVault, DisclosureRequest, Proof } from "@pas/types";

export class CredentialVaultImpl implements CredentialVault {
	async store(_credential: Credential): Promise<void> {
		throw new Error("Not implemented");
	}

	async retrieve(_id: string): Promise<Credential | null> {
		throw new Error("Not implemented");
	}

	async list(_filter?: CredentialFilter): Promise<Credential[]> {
		throw new Error("Not implemented");
	}

	async prove(_credentialId: string, _disclosure: DisclosureRequest): Promise<Proof> {
		throw new Error("Not implemented");
	}

	async revoke(_id: string): Promise<void> {
		throw new Error("Not implemented");
	}
}
