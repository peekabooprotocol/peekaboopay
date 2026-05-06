import type { BridgeParams, BridgeReceipt, PASResult } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

/**
 * Cross-chain private bridge — not yet supported.
 *
 * Cross-chain bridging requires infrastructure for proof relay and
 * cross-chain message passing (e.g., via LayerZero or Hyperlane with
 * shielded pool contracts on both chains).
 */
export async function bridge(_engine: PASEngine, _params: BridgeParams): Promise<PASResult<BridgeReceipt>> {
	return {
		success: false,
		error: {
			code: "NOT_SUPPORTED",
			message: "Cross-chain bridging is not yet supported.",
		},
	};
}
