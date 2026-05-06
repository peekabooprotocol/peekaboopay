import { describe, it, expect } from "vitest";
import {
	SanctionedSet,
	generateComplianceAttestation,
	verifyComplianceAttestation,
} from "../compliance.js";
import { computeCommitment } from "../commitment.js";

const CLEAN_ADDR = "0x000000000000000000000000000000000000dead";
const SANCTIONED_1 = "0x0000000000000000000000000000000000000bad";
const SANCTIONED_2 = "0x00000000000000000000000000000000000bad02";

describe("SanctionedSet", () => {
	it("detects sanctioned addresses", () => {
		const set = new SanctionedSet([SANCTIONED_1, SANCTIONED_2]);
		expect(set.isSanctioned(SANCTIONED_1)).toBe(true);
		expect(set.isSanctioned(SANCTIONED_2)).toBe(true);
		expect(set.isSanctioned(CLEAN_ADDR)).toBe(false);
	});

	it("reports correct size", () => {
		const set = new SanctionedSet([SANCTIONED_1, SANCTIONED_2]);
		expect(set.size).toBe(2);
		expect(new SanctionedSet([]).size).toBe(0);
	});

	it("computes Merkle root", async () => {
		const set = new SanctionedSet([SANCTIONED_1]);
		const root = await set.getRoot();
		expect(root).toBeTypeOf("bigint");
		expect(root).not.toBe(0n);
	});

	it("empty set has root 0", async () => {
		const set = new SanctionedSet([]);
		expect(await set.getRoot()).toBe(0n);
	});

	it("generates exclusion proof for clean address", () => {
		const set = new SanctionedSet([SANCTIONED_1, SANCTIONED_2]);
		const proof = set.generateExclusionProof(CLEAN_ADDR);
		expect(proof).not.toBeNull();
		expect(proof!.isInnocent).toBe(true);
	});

	it("returns null for sanctioned address", () => {
		const set = new SanctionedSet([SANCTIONED_1]);
		const proof = set.generateExclusionProof(SANCTIONED_1);
		expect(proof).toBeNull();
	});

	it("generates valid bounds for exclusion proof", () => {
		const set = new SanctionedSet([SANCTIONED_1, SANCTIONED_2]);
		const proof = set.generateExclusionProof(CLEAN_ADDR);
		expect(proof).not.toBeNull();
		// Address should fall between bounds
		if (proof!.lowerBound !== 0n) {
			expect(proof!.address > proof!.lowerBound).toBe(true);
		}
		if (proof!.upperBound !== 0n) {
			expect(proof!.address < proof!.upperBound).toBe(true);
		}
	});

	it("handles empty set exclusion proof", () => {
		const set = new SanctionedSet([]);
		const proof = set.generateExclusionProof(CLEAN_ADDR);
		expect(proof).not.toBeNull();
		expect(proof!.isInnocent).toBe(true);
		expect(proof!.setSize).toBe(0);
	});
});

describe("Compliance Attestation", () => {
	it("generates attestation for clean depositor", async () => {
		const set = new SanctionedSet([SANCTIONED_1]);
		const commitment = await computeCommitment(123n, 456n);

		const attestation = await generateComplianceAttestation(
			CLEAN_ADDR,
			commitment,
			set,
		);

		expect(attestation).not.toBeNull();
		expect(attestation!.depositorAddress).toBe(CLEAN_ADDR);
		expect(attestation!.commitment).toBe(commitment);
		expect(attestation!.attestationHash).toBeTypeOf("bigint");
		expect(attestation!.version).toBe(1);
	});

	it("refuses attestation for sanctioned depositor", async () => {
		const set = new SanctionedSet([SANCTIONED_1]);
		const commitment = await computeCommitment(123n, 456n);

		const attestation = await generateComplianceAttestation(
			SANCTIONED_1,
			commitment,
			set,
		);

		expect(attestation).toBeNull();
	});

	it("verifies valid attestation", async () => {
		const set = new SanctionedSet([SANCTIONED_1, SANCTIONED_2]);
		const commitment = await computeCommitment(789n, 101n);

		const attestation = await generateComplianceAttestation(
			CLEAN_ADDR,
			commitment,
			set,
		);
		expect(attestation).not.toBeNull();

		const verification = await verifyComplianceAttestation(
			attestation!,
			set,
		);
		expect(verification.valid).toBe(true);
		expect(verification.errors).toHaveLength(0);
	});

	it("detects attestation hash tampering", async () => {
		const set = new SanctionedSet([SANCTIONED_1]);
		const commitment = await computeCommitment(111n, 222n);

		const attestation = await generateComplianceAttestation(
			CLEAN_ADDR,
			commitment,
			set,
		);
		expect(attestation).not.toBeNull();

		// Tamper with the hash
		const tampered = { ...attestation!, attestationHash: 999n };
		const verification = await verifyComplianceAttestation(tampered);
		expect(verification.valid).toBe(false);
		expect(verification.errors).toContain("Attestation hash mismatch");
	});

	it("detects stale attestation against updated sanctioned set", async () => {
		const oldSet = new SanctionedSet([SANCTIONED_1]);
		const commitment = await computeCommitment(333n, 444n);

		const attestation = await generateComplianceAttestation(
			CLEAN_ADDR,
			commitment,
			oldSet,
		);
		expect(attestation).not.toBeNull();

		// Sanctioned set has changed
		const newSet = new SanctionedSet([SANCTIONED_1, SANCTIONED_2]);
		const verification = await verifyComplianceAttestation(
			attestation!,
			newSet,
		);
		expect(verification.valid).toBe(false);
		expect(verification.errors).toContain(
			"Sanctioned set root has changed since attestation",
		);
	});

	it("verifies attestation without sanctioned set (hash-only)", async () => {
		const set = new SanctionedSet([SANCTIONED_1]);
		const commitment = await computeCommitment(555n, 666n);

		const attestation = await generateComplianceAttestation(
			CLEAN_ADDR,
			commitment,
			set,
		);
		expect(attestation).not.toBeNull();

		// Verify without providing the sanctioned set
		const verification = await verifyComplianceAttestation(attestation!);
		expect(verification.valid).toBe(true);
	});
});
