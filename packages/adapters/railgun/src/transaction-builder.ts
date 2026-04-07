import type {
	Hex,
	PASResult,
	ShieldParams,
	ShieldResult,
	UnshieldParams,
	UnshieldResult,
	PrivateTransferParams,
	TransferResult,
	UTXONote,
} from "@peekaboopay/types";
import type { RailgunProvider, RailgunState } from "./types";
import { RailgunErrorCode, toSuccess, toFailure, mapRailgunError } from "./errors";

export class TransactionBuilder {
	constructor(
		private getState: () => RailgunState,
		private provider: RailgunProvider,
	) {}

	async buildShield(params: ShieldParams): Promise<PASResult<ShieldResult>> {
		const state = this.getState();

		try {
			const result = await this.provider.populateShield(
				state.networkName,
				state.walletId,
				state.encryptionKey,
				params.token.address,
				params.amount,
				params.recipient,
			);

			const txHash = `0x${Buffer.from(result.transaction.data).toString("hex").slice(0, 64).padEnd(64, "0")}` as Hex;

			const utxo: UTXONote = {
				commitment: result.commitmentHash,
				amount: params.amount,
				token: params.token,
				blinding: result.blindingFactor,
				index: 0,
			};

			return toSuccess<ShieldResult>({
				txHash,
				utxo,
				timestamp: Date.now(),
			});
		} catch (err) {
			const mapped = mapRailgunError(err, "shield");
			return toFailure(mapped.code, mapped.message, mapped.details);
		}
	}

	async buildUnshield(
		params: UnshieldParams,
	): Promise<PASResult<UnshieldResult>> {
		const state = this.getState();

		try {
			const result = await this.provider.populateUnshield(
				state.networkName,
				state.walletId,
				state.encryptionKey,
				params.token.address,
				params.amount,
				params.recipient,
			);

			const txHash = `0x${Buffer.from(result.transaction.data).toString("hex").slice(0, 64).padEnd(64, "0")}` as Hex;

			return toSuccess<UnshieldResult>({
				txHash,
				timestamp: Date.now(),
			});
		} catch (err) {
			const mapped = mapRailgunError(err, "unshield");
			return toFailure(mapped.code, mapped.message, mapped.details);
		}
	}

	async buildTransfer(
		params: PrivateTransferParams,
	): Promise<PASResult<TransferResult>> {
		const state = this.getState();

		try {
			const result = await this.provider.populateTransfer(
				state.networkName,
				state.walletId,
				state.encryptionKey,
				params.token.address,
				params.amount,
				params.recipientPublicKey,
				params.memo,
			);

			return toSuccess<TransferResult>({
				nullifier: result.nullifier,
				commitment: result.commitmentHash,
				timestamp: Date.now(),
			});
		} catch (err) {
			const mapped = mapRailgunError(err, "transfer");
			return toFailure(mapped.code, mapped.message, mapped.details);
		}
	}
}
