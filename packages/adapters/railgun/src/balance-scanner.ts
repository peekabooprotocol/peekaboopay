import type { Hex, TokenInfo } from "@peekaboopay/types";
import type { RailgunProvider, RailgunState } from "./types";

export class BalanceScanner {
	constructor(
		private getState: () => RailgunState,
		private provider: RailgunProvider,
	) {}

	async getBalance(token: TokenInfo, _viewingKey: Hex): Promise<bigint> {
		const state = this.getState();

		await this.provider.refreshBalances(state.networkName, state.walletId);

		const balances = await this.provider.getBalances(
			state.networkName,
			state.walletId,
		);

		const normalizedAddress = token.address.toLowerCase();
		const entry = balances.find(
			(b) => b.tokenAddress.toLowerCase() === normalizedAddress,
		);

		return entry?.balance ?? 0n;
	}
}
