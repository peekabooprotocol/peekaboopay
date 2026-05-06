import type { PASError, PASResult } from "@peekaboopay/types";

export const RailgunErrorCode = {
	NOT_INITIALIZED: "RAILGUN_NOT_INITIALIZED",
	UNSUPPORTED_CHAIN: "RAILGUN_UNSUPPORTED_CHAIN",
	INVALID_CONFIG: "RAILGUN_INVALID_CONFIG",
	WALLET_CREATION_FAILED: "RAILGUN_WALLET_CREATION",
	WALLET_LOAD_FAILED: "RAILGUN_WALLET_LOAD",
	SHIELD_FAILED: "RAILGUN_SHIELD_FAILED",
	UNSHIELD_FAILED: "RAILGUN_UNSHIELD_FAILED",
	TRANSFER_FAILED: "RAILGUN_TRANSFER_FAILED",
	PROOF_GENERATION_FAILED: "RAILGUN_PROOF_GENERATION",
	PROOF_VERIFICATION_FAILED: "RAILGUN_PROOF_VERIFICATION",
	BALANCE_SCAN_FAILED: "RAILGUN_BALANCE_SCAN",
	ARTIFACT_LOAD_FAILED: "RAILGUN_ARTIFACT_LOAD",
	ENGINE_START_FAILED: "RAILGUN_ENGINE_START",
} as const;

export function toSuccess<T>(data: T): PASResult<T> {
	return { success: true, data };
}

export function toFailure<T>(
	code: string,
	message: string,
	details?: unknown,
): PASResult<T> {
	return { success: false, error: { code, message, details } };
}

export function mapRailgunError(err: unknown, context: string): PASError {
	const message = err instanceof Error ? err.message : String(err);

	if (message.includes("not loaded") || message.includes("not initialized")) {
		return {
			code: RailgunErrorCode.NOT_INITIALIZED,
			message,
			details: { context },
		};
	}
	if (message.includes("artifact") || message.includes("snark")) {
		return {
			code: RailgunErrorCode.ARTIFACT_LOAD_FAILED,
			message,
			details: { context },
		};
	}
	if (message.includes("insufficient") || message.includes("balance")) {
		return {
			code: RailgunErrorCode.BALANCE_SCAN_FAILED,
			message,
			details: { context },
		};
	}

	return {
		code: `RAILGUN_${context.toUpperCase()}_FAILED`,
		message,
		details: err instanceof Error ? { stack: err.stack } : err,
	};
}
