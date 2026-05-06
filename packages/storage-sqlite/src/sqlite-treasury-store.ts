import type Database from "better-sqlite3";
import type {
	Address,
	Hex,
	HistoryFilter,
	TokenInfo,
	TreasuryEvent,
	TreasuryStore,
	UTXONote,
} from "@peekaboopay/types";
import {
	deserializeBigIntFields,
	serializeBigIntFields,
} from "./serialization";

/**
 * SQLite-backed treasury store.
 *
 * Uses 5 tables: utxo_notes, spent_nullifiers, spent_commitments,
 * nullifier_map, and treasury_events. All bigint amounts are stored as
 * decimal TEXT strings for lossless round-tripping.
 */
export class SqliteTreasuryStore implements TreasuryStore {
	constructor(private db: Database.Database) {
		this.createTables();
	}

	private createTables(): void {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS utxo_notes (
				commitment     TEXT PRIMARY KEY,
				amount         TEXT NOT NULL,
				token_address  TEXT NOT NULL,
				token_symbol   TEXT NOT NULL,
				token_decimals INTEGER NOT NULL,
				token_chain_id INTEGER NOT NULL,
				blinding       TEXT NOT NULL,
				note_index     INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS spent_nullifiers (
				nullifier TEXT PRIMARY KEY
			);

			CREATE TABLE IF NOT EXISTS spent_commitments (
				commitment TEXT PRIMARY KEY
			);

			CREATE TABLE IF NOT EXISTS nullifier_map (
				nullifier  TEXT PRIMARY KEY,
				commitment TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS treasury_events (
				id             INTEGER PRIMARY KEY AUTOINCREMENT,
				type           TEXT NOT NULL,
				token_address  TEXT NOT NULL,
				token_symbol   TEXT NOT NULL,
				token_decimals INTEGER NOT NULL,
				token_chain_id INTEGER NOT NULL,
				amount         TEXT NOT NULL,
				timestamp      INTEGER NOT NULL,
				metadata       TEXT
			);

			CREATE INDEX IF NOT EXISTS idx_utxo_token
				ON utxo_notes(token_address, token_chain_id);

			CREATE INDEX IF NOT EXISTS idx_events_timestamp
				ON treasury_events(timestamp);

			CREATE INDEX IF NOT EXISTS idx_events_token
				ON treasury_events(token_address, token_chain_id);
		`);
	}

	addUTXO(note: UTXONote): void {
		this.db
			.prepare(
				`INSERT INTO utxo_notes
				(commitment, amount, token_address, token_symbol, token_decimals, token_chain_id, blinding, note_index)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				note.commitment.toLowerCase(),
				note.amount.toString(),
				note.token.address.toLowerCase(),
				note.token.symbol,
				note.token.decimals,
				note.token.chainId,
				note.blinding,
				note.index,
			);
	}

	hasCommitment(commitment: string): boolean {
		const row = this.db
			.prepare("SELECT 1 FROM utxo_notes WHERE commitment = ?")
			.get(commitment);
		return row !== undefined;
	}

	getUTXO(commitment: string): UTXONote | undefined {
		const row = this.db
			.prepare("SELECT * FROM utxo_notes WHERE commitment = ?")
			.get(commitment) as UTXONoteRow | undefined;
		return row ? this.rowToNote(row) : undefined;
	}

	getUnspentUTXOs(tokenAddress: string, chainId: number): UTXONote[] {
		const rows = this.db
			.prepare(
				`SELECT u.* FROM utxo_notes u
				WHERE u.token_address = ? AND u.token_chain_id = ?
				AND u.commitment NOT IN (SELECT commitment FROM spent_commitments)`,
			)
			.all(tokenAddress.toLowerCase(), chainId) as UTXONoteRow[];
		return rows.map((r) => this.rowToNote(r));
	}

	getAllUnspentUTXOs(): UTXONote[] {
		const rows = this.db
			.prepare(
				`SELECT u.* FROM utxo_notes u
				WHERE u.commitment NOT IN (SELECT commitment FROM spent_commitments)`,
			)
			.all() as UTXONoteRow[];
		return rows.map((r) => this.rowToNote(r));
	}

	addNullifierMapping(nullifier: string, commitment: string): void {
		this.db
			.prepare(
				"INSERT OR REPLACE INTO nullifier_map (nullifier, commitment) VALUES (?, ?)",
			)
			.run(nullifier, commitment);
	}

	getCommitmentForNullifier(nullifier: string): string | undefined {
		const row = this.db
			.prepare("SELECT commitment FROM nullifier_map WHERE nullifier = ?")
			.get(nullifier) as { commitment: string } | undefined;
		return row?.commitment;
	}

	markSpent(nullifier: string, commitment: string): void {
		const markSpentTx = this.db.transaction(() => {
			this.db
				.prepare("INSERT INTO spent_nullifiers (nullifier) VALUES (?)")
				.run(nullifier);
			this.db
				.prepare("INSERT INTO spent_commitments (commitment) VALUES (?)")
				.run(commitment);
		});
		markSpentTx();
	}

	isNullifierSpent(nullifier: string): boolean {
		const row = this.db
			.prepare("SELECT 1 FROM spent_nullifiers WHERE nullifier = ?")
			.get(nullifier);
		return row !== undefined;
	}

	isCommitmentSpent(commitment: string): boolean {
		const row = this.db
			.prepare("SELECT 1 FROM spent_commitments WHERE commitment = ?")
			.get(commitment);
		return row !== undefined;
	}

	appendEvent(event: TreasuryEvent): void {
		this.db
			.prepare(
				`INSERT INTO treasury_events
				(type, token_address, token_symbol, token_decimals, token_chain_id, amount, timestamp, metadata)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				event.type,
				event.token.address.toLowerCase(),
				event.token.symbol,
				event.token.decimals,
				event.token.chainId,
				event.amount.toString(),
				event.timestamp,
				event.metadata
					? serializeBigIntFields(event.metadata)
					: null,
			);
	}

	getEvents(filter?: HistoryFilter): TreasuryEvent[] {
		const conditions: string[] = [];
		const params: unknown[] = [];

		if (filter?.token) {
			conditions.push(
				"token_address = ? AND token_chain_id = ?",
			);
			params.push(filter.token.address.toLowerCase(), filter.token.chainId);
		}

		if (filter?.from !== undefined) {
			conditions.push("timestamp >= ?");
			params.push(filter.from);
		}

		if (filter?.to !== undefined) {
			conditions.push("timestamp <= ?");
			params.push(filter.to);
		}

		const where =
			conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

		let sql = `SELECT * FROM treasury_events ${where} ORDER BY id ASC`;

		if (filter?.limit !== undefined) {
			// Return the most recent N events: order desc, limit, then re-order asc
			sql = `SELECT * FROM (
				SELECT * FROM treasury_events ${where} ORDER BY id DESC LIMIT ?
			) sub ORDER BY id ASC`;
			params.push(filter.limit);
		}

		const rows = this.db.prepare(sql).all(...params) as TreasuryEventRow[];
		return rows.map((r) => this.rowToEvent(r));
	}

	private rowToNote(row: UTXONoteRow): UTXONote {
		return {
			commitment: row.commitment as Hex,
			amount: BigInt(row.amount),
			token: {
				address: row.token_address as Address,
				symbol: row.token_symbol,
				decimals: row.token_decimals,
				chainId: row.token_chain_id,
			},
			blinding: row.blinding as Hex,
			index: row.note_index,
		};
	}

	private rowToEvent(row: TreasuryEventRow): TreasuryEvent {
		return {
			type: row.type as TreasuryEvent["type"],
			token: {
				address: row.token_address as Address,
				symbol: row.token_symbol,
				decimals: row.token_decimals,
				chainId: row.token_chain_id,
			},
			amount: BigInt(row.amount),
			timestamp: row.timestamp,
			metadata: row.metadata
				? (deserializeBigIntFields(row.metadata) as Record<string, unknown>)
				: undefined,
		};
	}
}

interface UTXONoteRow {
	commitment: string;
	amount: string;
	token_address: string;
	token_symbol: string;
	token_decimals: number;
	token_chain_id: number;
	blinding: string;
	note_index: number;
}

interface TreasuryEventRow {
	id: number;
	type: string;
	token_address: string;
	token_symbol: string;
	token_decimals: number;
	token_chain_id: number;
	amount: string;
	timestamp: number;
	metadata: string | null;
}
