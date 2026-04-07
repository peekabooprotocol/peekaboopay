import type { BridgeParams, BridgeReceipt, PASResult } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

export async function bridge(_engine: PASEngine, _params: BridgeParams): Promise<PASResult<BridgeReceipt>> {
	throw new Error("Not implemented");
}
