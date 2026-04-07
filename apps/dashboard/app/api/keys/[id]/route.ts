import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { revokeApiKey } from "@/lib/api-key";

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await getSession();
	if (!session.address) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const { id } = await params;
	const revoked = revokeApiKey(id, session.address);

	if (!revoked) {
		return NextResponse.json({ error: "Key not found" }, { status: 404 });
	}

	return NextResponse.json({ ok: true });
}
