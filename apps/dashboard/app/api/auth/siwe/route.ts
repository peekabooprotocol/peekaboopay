import { NextResponse } from "next/server";
import { parseSiweMessage, validateSiweMessage } from "viem/siwe";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

const publicClient = createPublicClient({
	chain: mainnet,
	transport: http(),
});

export async function POST(request: Request) {
	try {
		const { message, signature } = await request.json();
		const session = await getSession();

		const siweMessage = parseSiweMessage(message);

		// Verify nonce matches session
		if (siweMessage.nonce !== session.nonce) {
			return NextResponse.json(
				{ error: "Invalid nonce" },
				{ status: 422 },
			);
		}

		// Verify the SIWE message
		const isValid = await validateSiweMessage({
			address: siweMessage.address!,
			message: siweMessage,
		});

		if (!isValid) {
			return NextResponse.json(
				{ error: "Invalid signature" },
				{ status: 422 },
			);
		}

		// Create/update user in DB
		const db = getDb();
		db.prepare(
			"INSERT OR IGNORE INTO users (wallet_address) VALUES (?)",
		).run(siweMessage.address!.toLowerCase());

		// Set session
		session.address = siweMessage.address!.toLowerCase();
		session.chainId = siweMessage.chainId;
		session.nonce = undefined; // consume nonce
		await session.save();

		return NextResponse.json({
			address: session.address,
			chainId: session.chainId,
		});
	} catch (error: any) {
		return NextResponse.json(
			{ error: error.message || "Authentication failed" },
			{ status: 500 },
		);
	}
}

export async function DELETE() {
	const session = await getSession();
	session.destroy();
	return NextResponse.json({ ok: true });
}
