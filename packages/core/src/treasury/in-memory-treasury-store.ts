import type {
	HistoryFilter,
	TokenInfo,
	TreasuryEvent,
	TreasuryStore,
	UTXONote,
} from "@peekaboopay/types";

/**
 * In-memory implementation of TreasuryStore.
 *
 * Uses Maps and Sets for O(1) lookups. All keys are expected to be
 * pre-lowercased by the caller (ShieldedTreasuryImpl).
 */
export class InMemoryTreasuryStore implements TreasuryStore {
	private utxos: Map<string, UTXONote> = new Map();
	private spentNullifiers: Set<string> = new Set();
	private spentCommitments: Set<string> = new Set();
	private nullifierToCommitment: Map<string, string> = new Map();
	private events: TreasuryEvent[] = [];

	addUTXO(note: UTXONote): void {
		this.utxos.set(note.commitment.toLowerCase(), note);
	}

	hasCommitment(commitment: string): boolean {
		return this.utxos.has(commitment);
	}

	getUTXO(commitment: string): UTXONote | undefined {
		return this.utxos.get(commitment);
	}

	getUnspentUTXOs(tokenAddress: string, chainId: number): UTXONote[] {
		const addr = tokenAddress.toLowerCase();
		const result: UTXONote[] = [];
		for (const [commitment, note] of this.utxos) {
			if (this.spentCommitments.has(commitment)) continue;
			if (
				note.token.address.toLowerCase() === addr &&
				note.token.chainId === chainId
			) {
				result.push(note);
			}
		}
		return result;
	}

	getAllUnspentUTXOs(): UTXONote[] {
		const result: UTXONote[] = [];
		for (const [commitment, note] of this.utxos) {
			if (!this.spentCommitments.has(commitment)) {
				result.push(note);
			}
		}
		return result;
	}

	addNullifierMapping(nullifier: string, commitment: string): void {
		this.nullifierToCommitment.set(nullifier, commitment);
	}

	getCommitmentForNullifier(nullifier: string): string | undefined {
		return this.nullifierToCommitment.get(nullifier);
	}

	markSpent(nullifier: string, commitment: string): void {
		this.spentNullifiers.add(nullifier);
		this.spentCommitments.add(commitment);
	}

	isNullifierSpent(nullifier: string): boolean {
		return this.spentNullifiers.has(nullifier);
	}

	isCommitmentSpent(commitment: string): boolean {
		return this.spentCommitments.has(commitment);
	}

	appendEvent(event: TreasuryEvent): void {
		this.events.push(event);
	}

	getEvents(filter?: HistoryFilter): TreasuryEvent[] {
		let result = [...this.events];

		if (filter) {
			if (filter.token) {
				const addr = filter.token.address.toLowerCase();
				const chainId = filter.token.chainId;
				result = result.filter(
					(e) =>
						e.token.address.toLowerCase() === addr &&
						e.token.chainId === chainId,
				);
			}

			if (filter.from !== undefined) {
				result = result.filter((e) => e.timestamp >= filter.from!);
			}

			if (filter.to !== undefined) {
				result = result.filter((e) => e.timestamp <= filter.to!);
			}

			if (filter.limit !== undefined) {
				result = result.slice(-filter.limit);
			}
		}

		return result;
	}
}
