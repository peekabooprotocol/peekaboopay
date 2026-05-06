import type Database from "better-sqlite3";
import type { PolicyRule, PolicyStore, SpendRecord } from "@peekaboopay/types";
import {
	deserializeBigIntFields,
	serializeBigIntFields,
} from "./serialization";

/**
 * SQLite-backed policy store.
 *
 * Rules are stored with base fields in columns and the full rule object
 * (including type-specific fields) serialized as JSON in the payload column.
 * The payload uses tagged bigint encoding for lossless round-tripping.
 */
export class SqlitePolicyStore implements PolicyStore {
	constructor(private db: Database.Database) {
		this.createTables();
	}

	private createTables(): void {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS policy_rules (
				id       TEXT PRIMARY KEY,
				name     TEXT NOT NULL,
				type     TEXT NOT NULL,
				priority INTEGER NOT NULL,
				enabled  INTEGER NOT NULL,
				payload  TEXT NOT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_rules_priority
				ON policy_rules(priority);

			CREATE TABLE IF NOT EXISTS spend_tracker (
				key          TEXT PRIMARY KEY,
				amount       TEXT NOT NULL,
				window_start INTEGER NOT NULL
			);
		`);
	}

	setRule(rule: PolicyRule): void {
		this.db
			.prepare(
				`INSERT OR REPLACE INTO policy_rules (id, name, type, priority, enabled, payload)
				VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.run(
				rule.id,
				rule.name,
				rule.type,
				rule.priority,
				rule.enabled ? 1 : 0,
				serializeBigIntFields(rule),
			);
	}

	getRule(id: string): PolicyRule | undefined {
		const row = this.db
			.prepare("SELECT payload FROM policy_rules WHERE id = ?")
			.get(id) as { payload: string } | undefined;
		return row
			? (deserializeBigIntFields(row.payload) as PolicyRule)
			: undefined;
	}

	deleteRule(id: string): void {
		this.db.prepare("DELETE FROM policy_rules WHERE id = ?").run(id);
	}

	listRules(): PolicyRule[] {
		const rows = this.db
			.prepare("SELECT payload FROM policy_rules ORDER BY priority ASC")
			.all() as { payload: string }[];
		return rows.map(
			(r) => deserializeBigIntFields(r.payload) as PolicyRule,
		);
	}

	getSpend(key: string): SpendRecord | undefined {
		const row = this.db
			.prepare("SELECT amount, window_start FROM spend_tracker WHERE key = ?")
			.get(key) as { amount: string; window_start: number } | undefined;
		return row
			? { amount: BigInt(row.amount), windowStart: row.window_start }
			: undefined;
	}

	setSpend(key: string, amount: bigint, windowStart: number): void {
		this.db
			.prepare(
				`INSERT OR REPLACE INTO spend_tracker (key, amount, window_start)
				VALUES (?, ?, ?)`,
			)
			.run(key, amount.toString(), windowStart);
	}
}
