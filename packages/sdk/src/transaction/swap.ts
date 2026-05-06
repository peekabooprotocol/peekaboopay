import type { PASResult, SwapParams, SwapReceipt } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

/**
 * Private swap — not yet supported.
 *
 * Private swaps require DEX integration with the shielded pool (e.g., a
 * private AMM or a shielded order book). For now, users should shield funds,
 * swap on a public DEX, then re-shield.
 */
export async function swap(_engine: PASEngine, _params: SwapParams): Promise<PASResult<SwapReceipt>> {
	return {
		success: false,
		error: {
			code: "NOT_SUPPORTED",
			message: "Private swaps are not yet supported. Use shield + unshield to convert between tokens.",
		},
	};
}
