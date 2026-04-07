import type { PASResult } from "@peekaboopay/types";

// ---------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------

export const BittensorErrorCode = {
	NOT_INITIALIZED: "BITTENSOR_NOT_INITIALIZED",
	INVALID_CONFIG: "BITTENSOR_INVALID_CONFIG",
	SHIELD_FAILED: "BITTENSOR_SHIELD_FAILED",
	UNSHIELD_FAILED: "BITTENSOR_UNSHIELD_FAILED",
	TRANSFER_FAILED: "BITTENSOR_TRANSFER_FAILED",
	PROOF_GENERATION_FAILED: "BITTENSOR_PROOF_GENERATION",
	PROOF_VERIFICATION_FAILED: "BITTENSOR_PROOF_VERIFICATION",
	BALANCE_SCAN_FAILED: "BITTENSOR_BALANCE_SCAN",
	TRANSACTION_FAILED: "BITTENSOR_TRANSACTION_FAILED",
	NO_MATCHING_NOTE: "BITTENSOR_NO_MATCHING_NOTE",
	INVALID_ROOT: "BITTENSOR_INVALID_ROOT",
} as const;

// ---------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------

export function toSuccess<T>(data: T): PASResult<T> {
	return { success: true, data };
}

export function toFailure<T>(code: string, message: string): PASResult<T> {
	return { success: false, error: { code, message } };
}
