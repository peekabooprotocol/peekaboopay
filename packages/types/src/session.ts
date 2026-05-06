export interface SessionManager {
	create(config: SessionConfig): Promise<Session>;
	get(id: string): Promise<Session | null>;
	destroy(id: string): Promise<void>;
	/** Cleans up expired sessions, returns count of cleaned */
	cleanup(): Promise<number>;
}

export interface SessionConfig {
	agentId: string;
	taskDescription?: string;
	privacyLevel: PrivacyLevel;
	ttl: number;
	allowedOperations: OperationType[];
}

export enum PrivacyLevel {
	/** All operations shielded */
	FULL = "full",
	/** Agent chooses per-operation */
	SELECTIVE = "selective",
	/** Only identity shielded */
	MINIMAL = "minimal",
}

export type OperationType =
	| "pay"
	| "receive"
	| "swap"
	| "bridge"
	| "prove"
	| "credential"
	| "disclose";

export interface Session {
	id: string;
	agentId: string;
	privacyLevel: PrivacyLevel;
	createdAt: number;
	expiresAt: number;
	state: SessionState;
	operations: SessionOperation[];
}

export enum SessionState {
	ACTIVE = "active",
	EXPIRED = "expired",
	TERMINATED = "terminated",
}

export interface SessionOperation {
	type: OperationType;
	timestamp: number;
	status: "pending" | "completed" | "failed";
	metadata?: Record<string, unknown>;
}

/** Low-level storage adapter for the session manager. */
export interface SessionStore {
	/** Insert or update a session. */
	save(session: Session): void;
	/** Retrieve a session by ID. */
	get(id: string): Session | undefined;
	/** Delete a session by ID. */
	delete(id: string): void;
	/** Return IDs of sessions that are expired (expiresAt < now) or terminated. */
	listExpiredOrTerminated(now: number): string[];
}
