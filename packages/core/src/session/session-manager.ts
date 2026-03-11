import type { Session, SessionConfig, SessionManager, SessionStore } from "@pas/types";
import { SessionState } from "@pas/types";
import { InMemorySessionStore } from "./in-memory-session-store";

/** Generate a v4-style UUID without depending on node:crypto types */
function generateId(): string {
	const hex = "0123456789abcdef";
	const segments = [8, 4, 4, 4, 12];
	return segments
		.map((len) =>
			Array.from({ length: len }, () =>
				hex[Math.floor(Math.random() * 16)],
			).join(""),
		)
		.join("-");
}

export class SessionManagerImpl implements SessionManager {
	private store: SessionStore;

	constructor(store?: SessionStore) {
		this.store = store ?? new InMemorySessionStore();
	}

	async create(config: SessionConfig): Promise<Session> {
		const now = Date.now();
		const session: Session = {
			id: generateId(),
			agentId: config.agentId,
			privacyLevel: config.privacyLevel,
			createdAt: now,
			expiresAt: now + config.ttl,
			state: SessionState.ACTIVE,
			operations: [],
		};

		this.store.save(session);
		return session;
	}

	async get(id: string): Promise<Session | null> {
		const session = this.store.get(id);
		if (!session) {
			return null;
		}

		// Auto-transition active sessions that have expired
		if (
			session.state === SessionState.ACTIVE &&
			Date.now() > session.expiresAt
		) {
			session.state = SessionState.EXPIRED;
			this.store.save(session);
		}

		return session;
	}

	async destroy(id: string): Promise<void> {
		const session = this.store.get(id);
		if (session) {
			session.state = SessionState.TERMINATED;
			this.store.save(session);
		}
	}

	async cleanup(): Promise<number> {
		const now = Date.now();
		const ids = this.store.listExpiredOrTerminated(now);
		for (const id of ids) {
			this.store.delete(id);
		}
		return ids.length;
	}
}
