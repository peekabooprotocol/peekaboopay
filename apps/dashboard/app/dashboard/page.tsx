"use client";

import { useAccount, useBalance } from "wagmi";
import Link from "next/link";
import { bittensorEvm } from "@/lib/chains";

export default function DashboardPage() {
	const { address } = useAccount();
	const { data: balance } = useBalance({
		address,
		chainId: bittensorEvm.id,
	});

	return (
		<div className="max-w-4xl">
			<h1 className="font-heading font-extrabold text-2xl mb-6 tracking-tight">
				Dashboard
			</h1>

			{/* Balance Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<div className="bg-surface border border-border rounded-lg p-5">
					<p className="text-muted text-xs font-mono uppercase tracking-wide mb-2">
						Wallet Balance
					</p>
					<p className="font-heading font-extrabold text-2xl text-mint">
						{balance
							? parseFloat(balance.formatted).toFixed(4)
							: "—"}{" "}
						<span className="text-sm text-muted">TAO</span>
					</p>
				</div>

				<div className="bg-surface border border-border rounded-lg p-5">
					<p className="text-muted text-xs font-mono uppercase tracking-wide mb-2">
						Shielded Balance
					</p>
					<p className="font-heading font-extrabold text-2xl text-violet">
						0.0000{" "}
						<span className="text-sm text-muted">TAO</span>
					</p>
				</div>

				<div className="bg-surface border border-border rounded-lg p-5">
					<p className="text-muted text-xs font-mono uppercase tracking-wide mb-2">
						Transactions
					</p>
					<p className="font-heading font-extrabold text-2xl">
						0
					</p>
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
					<p className="font-heading font-bold text-mint group-hover:text-mint mb-1">
						↓ Shield
					</p>
					<p className="text-body text-xs">
						Deposit TAO into the shielded pool
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

			{/* Recent Transactions */}
			<h2 className="font-heading font-bold text-lg mb-4">
				Recent Transactions
			</h2>
			<div className="bg-surface border border-border rounded-lg p-6 text-center">
				<p className="text-muted text-sm">
					No transactions yet. Start by shielding some TAO.
				</p>
			</div>
		</div>
	);
}
