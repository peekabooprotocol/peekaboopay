import type {
	Hex,
	TokenInfo,
	HistoryFilter,
	ShieldedTreasury,
	TokenBalance,
	TreasuryEvent,
	TreasuryStore,
	UTXONote,
} from "@peekaboopay/types";
import { InMemoryTreasuryStore } from "./in-memory-treasury-store";

export class ShieldedTreasuryImpl implements ShieldedTreasury {
	private store: TreasuryStore;

	constructor(store?: TreasuryStore) {
		this.store = store ?? new InMemoryTreasuryStore();
	}

	async addNote(note: UTXONote): Promise<void> {
		const key = note.commitment.toLowerCase();

		if (this.store.hasCommitment(key)) {
			throw new Error(
				`Duplicate commitment: ${note.commitment} already exists`,
			);
		}

		this.store.addUTXO({ ...note, commitment: key as Hex });
		// In-memory: blinding serves as the nullifier
		this.store.addNullifierMapping(note.blinding.toLowerCase(), key);

		this.store.appendEvent({
			type: "shield",
			token: note.token,
			amount: note.amount,
			timestamp: Date.now(),
			metadata: { commitment: note.commitment },
		});
	}

	async spendNote(nullifier: Hex): Promise<void> {
		const nullifierKey = nullifier.toLowerCase();

		if (this.store.isNullifierSpent(nullifierKey)) {
			throw new Error(`Double spend: nullifier ${nullifier} already spent`);
		}

		const commitment = this.store.getCommitmentForNullifier(nullifierKey);
		if (!commitment) {
			throw new Error(`Unknown nullifier: ${nullifier}`);
		}

		const note = this.store.getUTXO(commitment);
		if (!note) {
			throw new Error(`UTXO not found for commitment: ${commitment}`);
		}

		this.store.markSpent(nullifierKey, commitment);

		this.store.appendEvent({
			type: "unshield",
			token: note.token,
			amount: note.amount,
			timestamp: Date.now(),
			metadata: { nullifier, commitment },
		});
	}

	async getBalance(token: TokenInfo): Promise<bigint> {
		const utxos = this.store.getUnspentUTXOs(
			token.address.toLowerCase(),
			token.chainId,
		);
		return utxos.reduce((sum, note) => sum + note.amount, 0n);
	}

	async getBalances(): Promise<TokenBalance[]> {
		const utxos = this.store.getAllUnspentUTXOs();
		const balances = new Map<string, { token: TokenInfo; shielded: bigint }>();

		for (const note of utxos) {
			const key = `${note.token.address.toLowerCase()}:${note.token.chainId}`;
			const existing = balances.get(key);
			if (existing) {
				existing.shielded += note.amount;
			} else {
				balances.set(key, { token: note.token, shielded: note.amount });
			}
		}

		return Array.from(balances.values()).map(({ token, shielded }) => ({
			token,
			shielded,
			pending: 0n,
		}));
	}

	async selectUTXOs(token: TokenInfo, amount: bigint): Promise<UTXONote[]> {
		if (amount === 0n) {
			return [];
		}

		const candidates = this.store.getUnspentUTXOs(
			token.address.toLowerCase(),
			token.chainId,
		);

		// Sort descending by amount (greedy: pick largest first)
		candidates.sort((a, b) => {
			if (a.amount > b.amount) return -1;
			if (a.amount < b.amount) return 1;
			return 0;
		});

		const selected: UTXONote[] = [];
		let sum = 0n;

		for (const note of candidates) {
			selected.push(note);
			sum += note.amount;
			if (sum >= amount) {
				return selected;
			}
		}

		throw new Error(
			`Insufficient balance: requested ${amount}, available ${sum} for token ${token.symbol}`,
		);
	}

	async getHistory(filter?: HistoryFilter): Promise<TreasuryEvent[]> {
		return this.store.getEvents(filter);
	}
}
