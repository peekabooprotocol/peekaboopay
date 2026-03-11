import type { PASResult, SwapParams, SwapReceipt } from "@pas/types";
import type { PASEngine } from "@pas/core";

export async function swap(_engine: PASEngine, _params: SwapParams): Promise<PASResult<SwapReceipt>> {
	throw new Error("Not implemented");
}
