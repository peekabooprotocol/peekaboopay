"use client";

import { useAccount, useBalance, useChainId } from "wagmi";
import Link from "next/link";
import { getChainConfig } from "@/lib/chain-config";

export default function DashboardPage() {
	const { address } = useAccount();
	const chainId = useChainId();
	const chain = getChainConfig(chainId);
	const { data: balance } = useBalance({ address, chainId });

	return (
		<div className="max-w-4xl">
			<div className="flex items-center gap-3 mb-6">
				<h1 className="font-heading font-extrabold text-2xl tracking-tight">
					Dashboard
				</h1>
				<span
					className="text-xs font-mono px-2 py-0.5 rounded border"
					style={{
						color: chain.accentColor,
						borderColor: `${chain.accentColor}33`,
						background: `${chain.accentColor}0d`,
					}}
				>
					{chain.shortName}
					{chain.adapter === "railgun" ? " · Railgun" : ""}
				</span>
			</div>

			{/* Balance Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<div className="bg-surface border border-border rounded-lg p-5">
					<p className="text-muted text-xs font-mono uppercase tracking-wide mb-2">
						Wallet Balance
					</p>
					<p className="font-heading font-extrabold text-2xl" style={{ color: chain.accentColor }}>
						{balance
							? parseFloat(balance.formatted).toFixed(4)
							: "—"}{" "}
						<span className="text-sm text-muted">
							{chain.nativeToken.symbol}
						</span>
					</p>
				</div>

				<div className="bg-surface border border-border rounded-lg p-5">
					<p className="text-muted text-xs font-mono uppercase tracking-wide mb-2">
						Shielded Balance
					</p>
					<p className="font-heading font-extrabold text-2xl text-violet">
						0.0000{" "}
						<span className="text-sm text-muted">
							{chain.nativeToken.symbol}
						</span>
					</p>
				</div>

				<div className="bg-surface border border-border rounded-lg p-5">
					<p className="text-muted text-xs font-mono uppercase tracking-wide mb-2">
						Transactions
					</p>
					<p className="font-heading font-extrabold text-2xl">0</p>
				</div>
			</div>

			{/* Quick Actions */}
			<h2 className="font-heading font-bold text-lg mb-4">
				Quick Actions
			</h2>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<Link
					href="/dashboard/shield"
					className="bg-surface border border-border rounded-lg p-5 hover:border-mint/30 transition-colors group"
				>
					<p className="font-heading font-bold text-mint mb-1">
						↓ Shield
					</p>
					<p className="text-body text-xs">
						Deposit {chain.nativeToken.symbol} into the shielded pool
						{chain.adapter === "railgun"
							? " via Railgun"
							: ""}
					</p>
				</Link>

				<Link
					href="/dashboard/unshield"
					className="bg-surface border border-border rounded-lg p-5 hover:border-violet/30 transition-colors group"
				>
					<p className="font-heading font-bold text-violet mb-1">
						↑ Unshield
					</p>
					<p className="text-body text-xs">
						Withdraw from the shielded pool
					</p>
				</Link>

				<Link
					href="/dashboard/transfer"
					className="bg-surface border border-border rounded-lg p-5 hover:border-pink/30 transition-colors group"
				>
					<p className="font-heading font-bold text-pink mb-1">
						→ Transfer
					</p>
					<p className="text-body text-xs">
						Send privately via stealth address
					</p>
				</Link>
			</div>

			{/* Chain Info */}
			<div className="bg-surface/50 border border-border rounded-lg p-4 mb-8">
				<p className="text-xs text-muted leading-relaxed">
					<span
						className="font-mono text-[10px] uppercase tracking-wider"
						style={{ color: chain.accentColor }}
					>
						{chain.name}
					</span>
					<br />
					{chain.adapter === "bittensor"
						? "Shielded via Peek-a-boo ShieldedPool contract with Groth16 ZK proofs. 0.5% protocol fee."
						: `Shielded via Railgun privacy protocol. Supports ${chain.tokens.map((t) => t.symbol).join(", ")}.`}
				</p>
			</div>

			{/* Recent Transactions */}
			<h2 className="font-heading font-bold text-lg mb-4">
				Recent Transactions
			</h2>
			<div className="bg-surface border border-border rounded-lg p-6 text-center">
				<p className="text-muted text-sm">
					No transactions yet. Start by shielding some{" "}
					{chain.nativeToken.symbol}.
				</p>
			</div>
		</div>
	);
}
