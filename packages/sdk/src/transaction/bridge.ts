import type { BridgeParams, BridgeReceipt, PASResult } from "@pas/types";
import type { PASEngine } from "@pas/core";

export async function bridge(_engine: PASEngine, _params: BridgeParams): Promise<PASResult<BridgeReceipt>> {
	throw new Error("Not implemented");
}
