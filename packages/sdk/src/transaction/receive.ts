import type { PASResult, ReceiveAddress, ReceiveParams } from "@pas/types";
import type { PASEngine } from "@pas/core";

export async function receive(_engine: PASEngine, _params: ReceiveParams): Promise<PASResult<ReceiveAddress>> {
	throw new Error("Not implemented");
}
