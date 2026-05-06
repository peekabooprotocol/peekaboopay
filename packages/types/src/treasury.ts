import type { Hex, TokenInfo } from "./common";
import type { UTXONote } from "./privacy";

export interface ShieldedTreasury {
	getBalance(token: TokenInfo): Promise<bigint>;
	getBalances(): Promise<TokenBalance[]>;

	selectUTXOs(token: TokenInfo, amount: bigint): Promise<UTXONote[]>;

	addNote(note: UTXONote): Promise<void>;
	spendNote(nullifier: Hex): Promise<void>;

	getHistory(filter?: HistoryFilter): Promise<TreasuryEvent[]>;
}

export interface TokenBalance {
	token: TokenInfo;
	shielded: bigint;
	pending: bigint;
}

export interface HistoryFilter {
	token?: TokenInfo;
	from?: number;
	to?: number;
	limit?: number;
}

export interface TreasuryEvent {
	type: "shield" | "unshield" | "transfer_in" | "transfer_out";
	token: TokenInfo;
	amount: bigint;
	timestamp: number;
	metadata?: Record<string, unknown>;
}

/** Low-level storage adapter for the shielded treasury. */
export interface TreasuryStore {
	/** Store a new UTXO note (keyed by lowercase commitment). */
	addUTXO(note: UTXONote): void;
	/** Check whether a commitment exists in the store. */
	hasCommitment(commitment: string): boolean;
	/** Retrieve a UTXO note by its commitment. */
	getUTXO(commitment: string): UTXONote | undefined;
	/** Return all unspent UTXOs matching a token address + chainId. */
	getUnspentUTXOs(tokenAddress: string, chainId: number): UTXONote[];
	/** Return all unspent UTXOs across every token. */
	getAllUnspentUTXOs(): UTXONote[];

	/** Record a nullifier → commitment mapping. */
	addNullifierMapping(nullifier: string, commitment: string): void;
	/** Look up which commitment a nullifier maps to. */
	getCommitmentForNullifier(nullifier: string): string | undefined;
	/** Atomically mark a nullifier as spent and its commitment as consumed. */
	markSpent(nullifier: string, commitment: string): void;
	/** Check if a nullifier has been spent. */
	isNullifierSpent(nullifier: string): boolean;
	/** Check if a commitment has been consumed. */
	isCommitmentSpent(commitment: string): boolean;

	/** Append an event to the audit log. */
	appendEvent(event: TreasuryEvent): void;
	/** Query the event log with optional filters. */
	getEvents(filter?: HistoryFilter): TreasuryEvent[];
}
