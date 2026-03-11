import type Database from "better-sqlite3";
import type { Session, SessionStore } from "@pas/types";
import { SessionState } from "@pas/types";

/**
 * SQLite-backed session store.
 *
 * Sessions are stored with scalar fields in columns and the operations
 * array serialized as JSON. Session operations don't contain bigints,
 * so standard JSON.stringify/parse is sufficient.
 */
export class SqliteSessionStore implements SessionStore {
	constructor(private db: Database.Database) {
		this.createTables();
	}

	private createTables(): void {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS sessions (
				id            TEXT PRIMARY KEY,
				agent_id      TEXT NOT NULL,
				privacy_level TEXT NOT NULL,
				created_at    INTEGER NOT NULL,
				expires_at    INTEGER NOT NULL,
				state         TEXT NOT NULL,
				operations    TEXT NOT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_sessions_state
				ON sessions(state);

			CREATE INDEX IF NOT EXISTS idx_sessions_expires
				ON sessions(expires_at);
		`);
	}

	save(session: Session): void {
		this.db
			.prepare(
				`INSERT OR REPLACE INTO sessions
				(id, agent_id, privacy_level, created_at, expires_at, state, operations)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				session.id,
				session.agentId,
				session.privacyLevel,
				session.createdAt,
				session.expiresAt,
				session.state,
				JSON.stringify(session.operations),
			);
	}

	get(id: string): Session | undefined {
		const row = this.db
			.prepare("SELECT * FROM sessions WHERE id = ?")
			.get(id) as SessionRow | undefined;
		return row ? this.rowToSession(row) : undefined;
	}

	delete(id: string): void {
		this.db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
	}

	listExpiredOrTerminated(now: number): string[] {
		const rows = this.db
			.prepare(
				`SELECT id FROM sessions
				WHERE state IN (?, ?) OR (state = ? AND expires_at < ?)`,
			)
			.all(
				SessionState.EXPIRED,
				SessionState.TERMINATED,
				SessionState.ACTIVE,
				now,
			) as { id: string }[];
		return rows.map((r) => r.id);
	}

	private rowToSession(row: SessionRow): Session {
		return {
			id: row.id,
			agentId: row.agent_id,
			privacyLevel: row.privacy_level as Session["privacyLevel"],
			createdAt: row.created_at,
			expiresAt: row.expires_at,
			state: row.state as Session["state"],
			operations: JSON.parse(row.operations),
		};
	}
}

interface SessionRow {
	id: string;
	agent_id: string;
	privacy_level: string;
	created_at: number;
	expires_at: number;
	state: string;
	operations: string;
}
