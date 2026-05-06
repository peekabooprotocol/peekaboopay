import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createApiKeyForWallet, listApiKeys } from "@/lib/api-key";

export async function GET() {
	const session = await getSession();
	if (!session.address) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const keys = listApiKeys(session.address);
	return NextResponse.json({ keys });
}

export async function POST(request: Request) {
	const session = await getSession();
	if (!session.address) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const body = await request.json().catch(() => ({}));
	const name = body.name || "Default";

	const { id, key } = createApiKeyForWallet(session.address, name);

	return NextResponse.json({
		id,
		key, // Only shown once!
		name,
		message: "Save this key — it won't be shown again.",
	});
}
