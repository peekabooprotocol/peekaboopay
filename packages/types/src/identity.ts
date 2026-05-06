import type { Address, Hex, PublicKey } from "./common";
import type { Proof } from "./privacy";

/** Stealth address system using ECDH key exchange */
export interface AddressDerivation {
	generateStealthAddress(recipientPubKey: PublicKey): StealthAddressResult;
	scanForPayments(scanKey: Hex, announcements: StealthAnnouncement[]): Address[];
}

export interface StealthAddressResult {
	stealthAddress: Address;
	ephemeralPublicKey: PublicKey;
	viewTag: Hex;
}

export interface StealthAnnouncement {
	ephemeralPublicKey: PublicKey;
	stealthAddress: Address;
	viewTag: Hex;
	metadata?: Hex;
}

/** ZK-provable credential storage and attestation */
export interface CredentialVault {
	store(credential: Credential): Promise<void>;
	retrieve(id: string): Promise<Credential | null>;
	list(filter?: CredentialFilter): Promise<Credential[]>;
	prove(credentialId: string, disclosure: DisclosureRequest): Promise<Proof>;
	revoke(id: string): Promise<void>;
}

export interface Credential {
	id: string;
	type: CredentialType;
	issuer: Address;
	subject: Address;
	claims: Record<string, unknown>;
	issuedAt: number;
	expiresAt?: number;
	proof: Proof;
}

export enum CredentialType {
	REPUTATION = "reputation",
	COMPLIANCE = "compliance",
	CAPABILITY = "capability",
	MEMBERSHIP = "membership",
}

export interface CredentialFilter {
	type?: CredentialType;
	issuer?: Address;
	active?: boolean;
}

export interface DisclosureRequest {
	attributes: string[];
	predicates?: Predicate[];
}

export interface Predicate {
	attribute: string;
	operator: "gt" | "lt" | "eq" | "gte" | "lte" | "in";
	value: unknown;
}
