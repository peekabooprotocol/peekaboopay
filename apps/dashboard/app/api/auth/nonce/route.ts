import { NextResponse } from "next/server";
import { generateSiweNonce } from "viem/siwe";
import { getSession } from "@/lib/auth";

export async function GET() {
	const session = await getSession();
	const nonce = generateSiweNonce();
	session.nonce = nonce;
	await session.save();

	return NextResponse.json({ nonce });
}
