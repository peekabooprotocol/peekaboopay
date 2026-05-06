import type { DepositNote } from "./types.js";

// ---------------------------------------------------------------
// In-memory UTXO / Note Store
// ---------------------------------------------------------------

/**
 * Tracks deposit notes and spent nullifiers.
 *
 * In this initial implementation, only notes created by this adapter
 * instance are tracked (from shield() calls). A future enhancement
 * would use viewingKey-based event decryption to discover third-party deposits.
 */
export class NoteStore {
	/** Notes keyed by commitment hex */
	private notes = new Map<string, DepositNote>();
	/** Set of spent nullifier hash hex values */
	private spentNullifiers = new Set<string>();

	/**
	 * Store a new deposit note.
	 */
	addNote(note: DepositNote): void {
		const key = "0x" + note.commitment.toString(16).padStart(64, "0");
		this.notes.set(key, note);
	}

	/**
	 * Get all unspent notes for a given token.
	 * @param token Token address (zero address for native TAO)
	 */
	getUnspentNotes(token: string): DepositNote[] {
		const tokenLower = token.toLowerCase();
		const result: DepositNote[] = [];

		for (const note of this.notes.values()) {
			const nullifierHex =
				"0x" + note.nullifierHash.toString(16).padStart(64, "0");
			if (
				note.token.toLowerCase() === tokenLower &&
				!this.spentNullifiers.has(nullifierHex)
			) {
				result.push(note);
			}
		}

		return result;
	}

	/**
	 * Find an unspent note matching the token and amount.
	 * Returns the first match, or undefined if none found.
	 */
	findNote(token: string, amount: bigint): DepositNote | undefined {
		return this.getUnspentNotes(token).find((n) => n.amount === amount);
	}

	/**
	 * Mark a nullifier as spent.
	 * @param nullifierHash The nullifier hash hex string
	 */
	markSpent(nullifierHash: string): void {
		this.spentNullifiers.add(nullifierHash.toLowerCase());
	}

	/**
	 * Check if a nullifier has been spent.
	 */
	isSpent(nullifierHash: string): boolean {
		return this.spentNullifiers.has(nullifierHash.toLowerCase());
	}

	/**
	 * Get the total unspent balance for a token.
	 */
	getBalance(token: string): bigint {
		return this.getUnspentNotes(token).reduce(
			(sum, note) => sum + note.amount,
			0n,
		);
	}

	/**
	 * Get total note count (including spent).
	 */
	get size(): number {
		return this.notes.size;
	}
}
