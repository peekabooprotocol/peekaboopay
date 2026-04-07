"use client";

import { useAccount, useChainId } from "wagmi";
import {
	SHIELDED_POOL_ADDRESS,
	STEALTH_ANNOUNCER_ADDRESS,
	FEE_RECIPIENT,
} from "@/lib/contracts";

export default function SettingsPage() {
	const { address } = useAccount();
	const chainId = useChainId();

	const contracts = [
		{ name: "ShieldedPool", address: SHIELDED_POOL_ADDRESS },
		{ name: "StealthAnnouncer", address: STEALTH_ANNOUNCER_ADDRESS },
		{ name: "Fee Recipient", address: FEE_RECIPIENT },
	];

	return (
		<div className="max-w-2xl">
			<h1 className="font-heading font-extrabold text-2xl mb-6 tracking-tight">
				Settings
			</h1>

			{/* Network */}
			<div className="bg-surface border border-border rounded-lg p-5 mb-4">
				<h2 className="text-xs font-mono uppercase tracking-wide text-muted mb-3">
					Network
				</h2>
				<div className="space-y-2 text-sm">
					<div className="flex justify-between">
						<span className="text-muted">Connected Wallet</span>
						<code className="text-mint text-xs font-mono">
							{address}
						</code>
					</div>
					<div className="flex justify-between">
						<span className="text-muted">Chain ID</span>
						<span className="text-text">{chainId}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted">RPC</span>
						<span className="text-body text-xs">
							lite.chain.opentensor.ai
						</span>
					</div>
				</div>
			</div>

			{/* Contracts */}
			<div className="bg-surface border border-border rounded-lg p-5 mb-4">
				<h2 className="text-xs font-mono uppercase tracking-wide text-muted mb-3">
					Deployed Contracts (Chain 964)
				</h2>
				<div className="space-y-2">
					{contracts.map((c) => (
						<div
							key={c.name}
							className="flex justify-between text-sm"
						>
							<span className="text-muted">{c.name}</span>
							<code className="text-mint text-[11px] font-mono">
								{c.address}
							</code>
						</div>
					))}
				</div>
			</div>

			{/* Fee Info */}
			<div className="bg-surface border border-border rounded-lg p-5">
				<h2 className="text-xs font-mono uppercase tracking-wide text-muted mb-3">
					Protocol Fee
				</h2>
				<div className="space-y-2 text-sm">
					<div className="flex justify-between">
						<span className="text-muted">Deposit fee</span>
						<span className="text-text">0.5%</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted">Withdrawal fee</span>
						<span className="text-text">0.5%</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted">Max fee (contract limit)</span>
						<span className="text-text">2.0%</span>
					</div>
				</div>
			</div>
		</div>
	);
}
