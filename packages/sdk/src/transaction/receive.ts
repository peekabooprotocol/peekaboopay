import type { PASResult, ReceiveAddress, ReceiveParams } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

export async function receive(_engine: PASEngine, _params: ReceiveParams): Promise<PASResult<ReceiveAddress>> {
	throw new Error("Not implemented");
}
