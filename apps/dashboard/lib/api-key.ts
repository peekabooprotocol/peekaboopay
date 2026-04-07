import { randomBytes, createHash } from "crypto";
import { getDb } from "./db";

const PREFIX = "pab_";

/** Generate a new API key with pab_ prefix */
export function generateApiKey(): string {
	return PREFIX + randomBytes(32).toString("hex");
}

/** Hash an API key for storage (SHA-256) */
export function hashApiKey(key: string): string {
	return createHash("sha256").update(key).digest("hex");
}

/** Validate an API key and return the wallet address if valid */
export function validateApiKey(key: string): string | null {
	if (!key.startsWith(PREFIX)) return null;

	const db = getDb();
	const hash = hashApiKey(key);

	const row = db
		.prepare(
			"SELECT wallet_address FROM api_keys WHERE key_hash = ? AND revoked = 0",
		)
		.get(hash) as { wallet_address: string } | undefined;

	if (!row) return null;

	// Update last_used_at
	db.prepare("UPDATE api_keys SET last_used_at = unixepoch() WHERE key_hash = ?").run(
		hash,
	);

	return row.wallet_address;
}

/** Create a new API key for a wallet */
export function createApiKeyForWallet(
	walletAddress: string,
	name = "Default",
): { id: string; key: string } {
	const db = getDb();
	const key = generateApiKey();
	const hash = hashApiKey(key);
	const id = randomBytes(16).toString("hex");

	// Ensure user exists
	db.prepare(
		"INSERT OR IGNORE INTO users (wallet_address) VALUES (?)",
	).run(walletAddress.toLowerCase());

	// Insert key
	db.prepare(
		"INSERT INTO api_keys (id, wallet_address, key_hash, name) VALUES (?, ?, ?, ?)",
	).run(id, walletAddress.toLowerCase(), hash, name);

	return { id, key };
}

/** List API keys for a wallet (without the actual key) */
export function listApiKeys(walletAddress: string) {
	const db = getDb();
	return db
		.prepare(
			"SELECT id, name, created_at, last_used_at, revoked FROM api_keys WHERE wallet_address = ? ORDER BY created_at DESC",
		)
		.all(walletAddress.toLowerCase()) as Array<{
		id: string;
		name: string;
		created_at: number;
		last_used_at: number | null;
		revoked: number;
	}>;
}

/** Revoke an API key */
export function revokeApiKey(id: string, walletAddress: string): boolean {
	const db = getDb();
	const result = db
		.prepare(
			"UPDATE api_keys SET revoked = 1 WHERE id = ? AND wallet_address = ?",
		)
		.run(id, walletAddress.toLowerCase());
	return result.changes > 0;
}
