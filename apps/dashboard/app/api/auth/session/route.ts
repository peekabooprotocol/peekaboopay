import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
	const session = await getSession();

	if (!session.address) {
		return NextResponse.json({ authenticated: false });
	}

	return NextResponse.json({
		authenticated: true,
		address: session.address,
		chainId: session.chainId,
	});
}
