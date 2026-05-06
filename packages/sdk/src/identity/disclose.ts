import type { PASResult, Proof } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

/**
 * Selective disclosure — not yet supported.
 *
 * Selective disclosure requires a verifiable credential scheme with
 * attribute-level ZK proofs (e.g., BBS+ signatures or Circom-based
 * credential circuits). This will be implemented after the credential
 * vault supports signed claims.
 */
export async function disclose(
	_engine: PASEngine,
	_attributes: string[],
): Promise<PASResult<Proof>> {
	return {
		success: false,
		error: {
			code: "NOT_SUPPORTED",
			message: "Selective disclosure is not yet supported.",
		},
	};
}
