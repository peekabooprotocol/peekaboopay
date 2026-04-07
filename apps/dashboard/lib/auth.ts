import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
	address?: string;
	chainId?: number;
	nonce?: string;
}

export const sessionOptions: SessionOptions = {
	password:
		process.env.SESSION_SECRET ||
		"peek-a-boo-dev-secret-at-least-32-chars-long!",
	cookieName: "peekaboo-session",
	cookieOptions: {
		secure: process.env.NODE_ENV === "production",
		httpOnly: true,
		sameSite: "lax",
	},
};

export async function getSession() {
	const cookieStore = await cookies();
	return getIronSession<SessionData>(cookieStore, sessionOptions);
}
