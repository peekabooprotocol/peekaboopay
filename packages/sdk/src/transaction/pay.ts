import type { PASResult, PaymentReceipt, PayParams } from "@pas/types";
import type { PASEngine } from "@pas/core";

export async function pay(_engine: PASEngine, _params: PayParams): Promise<PASResult<PaymentReceipt>> {
	throw new Error("Not implemented");
}
