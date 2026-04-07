import type { PASResult, PaymentReceipt, PayParams } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

export async function pay(_engine: PASEngine, _params: PayParams): Promise<PASResult<PaymentReceipt>> {
	throw new Error("Not implemented");
}
