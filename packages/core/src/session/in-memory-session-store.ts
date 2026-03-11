import type { Session, SessionStore } from "@pas/types";
import { SessionState } from "@pas/types";

/**
 * In-memory implementation of SessionStore.
 *
 * Uses a Map keyed by session ID.
 */
export class InMemorySessionStore implements SessionStore {
	private sessions: Map<string, Session> = new Map();

	save(session: Session): void {
		this.sessions.set(session.id, session);
	}

	get(id: string): Session | undefined {
		return this.sessions.get(id);
	}

	delete(id: string): void {
		this.sessions.delete(id);
	}

	listExpiredOrTerminated(now: number): string[] {
		const ids: string[] = [];
		for (const [id, session] of this.sessions) {
			const isExpired = now > session.expiresAt;
			const isDone =
				session.state === SessionState.EXPIRED ||
				session.state === SessionState.TERMINATED;
			if (isExpired || isDone) {
				ids.push(id);
			}
		}
		return ids;
	}
}
