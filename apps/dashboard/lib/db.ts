import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (db) return db;

	const dbPath = process.env.DATABASE_PATH || "./dashboard.db";
	db = new Database(path.resolve(dbPath));

	// WAL mode for better concurrency
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");

	// Create tables
	db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      wallet_address TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
      key_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Default',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      last_used_at INTEGER,
      revoked INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_wallet ON api_keys(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
      type TEXT NOT NULL CHECK(type IN ('shield', 'unshield', 'transfer')),
      amount TEXT NOT NULL,
      token TEXT NOT NULL DEFAULT 'TAO',
      tx_hash TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'failed')),
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tx_wallet ON transactions(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
  `);

	return db;
}
