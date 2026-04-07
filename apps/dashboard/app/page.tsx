"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
	const { isConnected } = useAccount();
	const router = useRouter();

	useEffect(() => {
		if (isConnected) {
			router.push("/dashboard");
		}
	}, [isConnected, router]);

	return (
		<main className="min-h-screen flex flex-col items-center justify-center px-6">
			<div className="text-center max-w-lg">
				<div className="mb-6 text-4xl">
					<span className="font-heading font-extrabold">peek</span>
					<span className="text-mint">—</span>
					<span className="font-heading font-extrabold">a</span>
					<span className="text-mint">—</span>
					<span className="font-heading font-extrabold">boo</span>
				</div>

				<h1 className="font-heading font-extrabold text-3xl mb-3 tracking-tight">
					Private payments for{" "}
					<span className="text-mint">web3</span>
				</h1>

				<p className="text-body text-sm mb-8 leading-relaxed">
					Connect your wallet to access the dashboard. Shield tokens,
					send private payments, manage API keys for your agents.
				</p>

				<div className="flex justify-center">
					<ConnectButton />
				</div>

				<p className="text-muted text-xs mt-8 font-mono">
					Bittensor EVM · Ethereum · BSC · Polygon · Arbitrum
				</p>
			</div>
		</main>
	);
}
