import Database from "better-sqlite3";
import { SqlitePolicyStore } from "./sqlite-policy-store";
import { SqliteSessionStore } from "./sqlite-session-store";
import { SqliteTreasuryStore } from "./sqlite-treasury-store";

export interface SqliteStores {
	treasury: SqliteTreasuryStore;
	policy: SqlitePolicyStore;
	session: SqliteSessionStore;
	/** Close the underlying database connection. */
	close: () => void;
}

/**
 * Create all three SQLite stores backed by a single database file.
 *
 * Uses WAL journal mode for concurrent read performance and enables
 * foreign key enforcement. Pass `:memory:` for an ephemeral database
 * (useful for tests).
 *
 * The returned object can be spread directly into `PASEngineConfig.stores`.
 */
export function createSqliteStores(dbPath: string): SqliteStores {
	const db = new Database(dbPath);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");

	return {
		treasury: new SqliteTreasuryStore(db),
		policy: new SqlitePolicyStore(db),
		session: new SqliteSessionStore(db),
		close: () => db.close(),
	};
}
