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
				<div className="flex justify-center mb-6">
					<svg className="w-20 h-20" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
						<ellipse cx="40" cy="40" rx="36" ry="14" fill="none" stroke="#00e5b4" strokeWidth="1.5"/>
						<circle cx="40" cy="40" r="12" fill="#00a884"/>
						<circle cx="40" cy="40" r="8.5" fill="none" stroke="#005c47" strokeWidth="2"/>
						<circle cx="40" cy="40" r="4" fill="#060614"/>
					</svg>
				</div>
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
