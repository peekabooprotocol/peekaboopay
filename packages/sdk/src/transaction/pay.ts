import type { PASResult, PaymentReceipt, PayParams } from "@peekaboopay/types";
import type { PASEngine } from "@peekaboopay/core";

/**
 * Execute a private payment via the backend's transfer method.
 *
 * Maps the SDK-level PayParams to the backend's PrivateTransferParams,
 * then converts the TransferResult back into a PaymentReceipt.
 */
export async function pay(engine: PASEngine, params: PayParams): Promise<PASResult<PaymentReceipt>> {
	const backend = engine.getBackend();

	const result = await backend.transfer({
		token: params.token,
		amount: params.amount,
		recipientPublicKey: params.to,
		memo: params.memo,
	});

	if (!result.success) {
		return { success: false, error: result.error };
	}

	return {
		success: true,
		data: {
			id: result.data.nullifier || `0x${Date.now().toString(16)}`,
			status: "confirmed",
			amount: params.amount,
			token: params.token,
			timestamp: result.data.timestamp,
			txHash: result.data.nullifier,
		},
	};
}
