import type { PASResult, SwapParams, SwapReceipt } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

export async function swap(_engine: PASEngine, _params: SwapParams): Promise<PASResult<SwapReceipt>> {
	throw new Error("Not implemented");
}
