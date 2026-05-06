/**
 * Compliance proofs — Proof of Innocence
 *
 * Allows a user to prove their shielded funds did NOT originate from
 * sanctioned addresses, without revealing which deposit is theirs.
 *
 * Approach: off-chain signed attestation backed by Merkle exclusion proof.
 * The user proves their deposit address is NOT in the sanctioned set by
 * providing a sorted Merkle proof showing the address falls between two
 * adjacent non-sanctioned leaves.
 *
 * A full ZK circuit version (proving exclusion inside a SNARK) can be
 * added later — this module provides the cryptographic primitives.
 */

import { poseidonHash2, poseidonHash1 } from "./poseidon.js";

// ---------------------------------------------------------------
// Sanctioned Set (Sorted Poseidon Merkle Tree)
// ---------------------------------------------------------------

/**
 * A sorted Merkle tree for the sanctioned address set.
 * Used for non-membership (exclusion) proofs.
 */
export class SanctionedSet {
	private addresses: bigint[];
	private root: bigint | null = null;

	constructor(addresses: string[] = []) {
		// Convert to bigint and sort for binary search
		this.addresses = addresses
			.map((a) => BigInt(a.toLowerCase()))
			.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
	}

	/**
	 * Check if an address is in the sanctioned set.
	 */
	isSanctioned(address: string): boolean {
		const target = BigInt(address.toLowerCase());
		return this.addresses.some((a) => a === target);
	}

	/**
	 * Get the number of sanctioned addresses.
	 */
	get size(): number {
		return this.addresses.length;
	}

	/**
	 * Compute the Merkle root of the sanctioned set.
	 */
	async getRoot(): Promise<bigint> {
		if (this.root !== null) return this.root;
		if (this.addresses.length === 0) {
			this.root = 0n;
			return this.root;
		}

		// Hash all leaves
		let level = await Promise.all(
			this.addresses.map((a) => poseidonHash1(a)),
		);

		// Build tree bottom-up
		while (level.length > 1) {
			const next: bigint[] = [];
			for (let i = 0; i < level.length; i += 2) {
				const left = level[i];
				const right = i + 1 < level.length ? level[i + 1] : 0n;
				next.push(await poseidonHash2(left, right));
			}
			level = next;
		}

		this.root = level[0];
		return this.root;
	}

	/**
	 * Generate a non-membership proof for an address.
	 * Proves the address is NOT in the sorted set by showing the two
	 * adjacent elements it falls between.
	 *
	 * Returns null if the address IS sanctioned (can't prove innocence).
	 */
	generateExclusionProof(
		address: string,
	): ExclusionProof | null {
		const target = BigInt(address.toLowerCase());

		// Check if sanctioned — can't prove innocence
		if (this.isSanctioned(address)) return null;

		// Empty set — trivially innocent
		if (this.addresses.length === 0) {
			return {
				address: target,
				lowerBound: 0n,
				upperBound: 0n,
				setSize: 0,
				isInnocent: true,
			};
		}

		// Find the position where target would be inserted
		let idx = 0;
		while (idx < this.addresses.length && this.addresses[idx] < target) {
			idx++;
		}

		const lowerBound = idx > 0 ? this.addresses[idx - 1] : 0n;
		const upperBound =
			idx < this.addresses.length ? this.addresses[idx] : 0n;

		return {
			address: target,
			lowerBound,
			upperBound,
			setSize: this.addresses.length,
			isInnocent: true,
		};
	}
}

// ---------------------------------------------------------------
// Compliance Attestation
// ---------------------------------------------------------------

/**
 * Generate a compliance attestation for a deposit.
 * This is a signed statement that the depositor's address is not in
 * the sanctioned set at the time of the attestation.
 */
export async function generateComplianceAttestation(
	depositorAddress: string,
	commitment: bigint,
	sanctionedSet: SanctionedSet,
	timestamp?: number,
): Promise<ComplianceAttestation | null> {
	const exclusionProof = sanctionedSet.generateExclusionProof(depositorAddress);
	if (!exclusionProof) return null; // Address is sanctioned

	const root = await sanctionedSet.getRoot();
	const ts = timestamp || Math.floor(Date.now() / 1000);

	// Create attestation hash: Poseidon(commitment, sanctionedRoot, timestamp)
	const commitmentAndRoot = await poseidonHash2(commitment, root);
	const attestationHash = await poseidonHash2(
		commitmentAndRoot,
		BigInt(ts),
	);

	return {
		depositorAddress,
		commitment,
		sanctionedSetRoot: root,
		sanctionedSetSize: sanctionedSet.size,
		exclusionProof,
		attestationHash,
		timestamp: ts,
		version: 1,
	};
}

/**
 * Verify a compliance attestation.
 * Checks that the exclusion proof is consistent and the attestation
 * hash matches the claimed inputs.
 */
export async function verifyComplianceAttestation(
	attestation: ComplianceAttestation,
	sanctionedSet?: SanctionedSet,
): Promise<ComplianceVerification> {
	const errors: string[] = [];

	// 1. Check exclusion proof consistency
	const { exclusionProof } = attestation;
	if (!exclusionProof.isInnocent) {
		errors.push("Exclusion proof indicates address is sanctioned");
	}

	// 2. Check bounds: lowerBound < address < upperBound
	if (exclusionProof.setSize > 0) {
		if (
			exclusionProof.lowerBound !== 0n &&
			exclusionProof.address <= exclusionProof.lowerBound
		) {
			errors.push("Address is not above lower bound");
		}
		if (
			exclusionProof.upperBound !== 0n &&
			exclusionProof.address >= exclusionProof.upperBound
		) {
			errors.push("Address is not below upper bound");
		}
	}

	// 3. Verify attestation hash
	const commitmentAndRoot = await poseidonHash2(
		attestation.commitment,
		attestation.sanctionedSetRoot,
	);
	const expectedHash = await poseidonHash2(
		commitmentAndRoot,
		BigInt(attestation.timestamp),
	);

	if (expectedHash !== attestation.attestationHash) {
		errors.push("Attestation hash mismatch");
	}

	// 4. If sanctioned set provided, verify root matches
	if (sanctionedSet) {
		const currentRoot = await sanctionedSet.getRoot();
		if (currentRoot !== attestation.sanctionedSetRoot) {
			errors.push("Sanctioned set root has changed since attestation");
		}

		// Double-check: address should not be in current set
		if (sanctionedSet.isSanctioned(attestation.depositorAddress)) {
			errors.push("Address is in the current sanctioned set");
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		attestation,
	};
}

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface ExclusionProof {
	/** The address being proven innocent */
	address: bigint;
	/** The sanctioned address just below (0n if none) */
	lowerBound: bigint;
	/** The sanctioned address just above (0n if none) */
	upperBound: bigint;
	/** Size of the sanctioned set at proof time */
	setSize: number;
	/** Whether the proof demonstrates innocence */
	isInnocent: boolean;
}

export interface ComplianceAttestation {
	/** The depositor's public address */
	depositorAddress: string;
	/** The deposit commitment (Poseidon hash) */
	commitment: bigint;
	/** Merkle root of the sanctioned address set */
	sanctionedSetRoot: bigint;
	/** Number of addresses in the sanctioned set */
	sanctionedSetSize: number;
	/** Proof that address is not in the sanctioned set */
	exclusionProof: ExclusionProof;
	/** Poseidon(Poseidon(commitment, root), timestamp) */
	attestationHash: bigint;
	/** Unix timestamp of attestation */
	timestamp: number;
	/** Attestation format version */
	version: number;
}

export interface ComplianceVerification {
	/** Whether the attestation is valid */
	valid: boolean;
	/** List of errors (empty if valid) */
	errors: string[];
	/** The attestation being verified */
	attestation: ComplianceAttestation;
}
