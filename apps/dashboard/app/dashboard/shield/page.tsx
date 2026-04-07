"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

export default function ShieldPage() {
	const { address } = useAccount();
	const [amount, setAmount] = useState("");
	const fee = amount ? (parseFloat(amount) * 0.005).toFixed(6) : "0";
	const net = amount
		? (parseFloat(amount) - parseFloat(fee)).toFixed(6)
		: "0";

	return (
		<div className="max-w-lg">
			<h1 className="font-heading font-extrabold text-2xl mb-2 tracking-tight">
				Shield TAO
			</h1>
			<p className="text-body text-sm mb-6">
				Deposit TAO into the shielded pool. A Poseidon commitment enters
				the Merkle tree. Your identity stays off-chain.
			</p>

			<div className="bg-surface border border-border rounded-lg p-6 space-y-4">
				<div>
					<label className="text-muted text-xs font-mono uppercase tracking-wide block mb-2">
						Amount (TAO)
					</label>
					<input
						type="number"
						step="0.0001"
						min="0"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						placeholder="0.0"
						className="w-full bg-bg border border-border rounded px-4 py-3 text-text text-lg font-heading font-bold focus:border-mint/50 focus:outline-none transition-colors"
					/>
				</div>

				<div className="border-t border-border pt-4 space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-muted">Protocol fee (0.5%)</span>
						<span className="text-body">{fee} TAO</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted">Net shielded</span>
						<span className="text-mint font-bold">{net} TAO</span>
					</div>
				</div>

				<button
					disabled={!amount || parseFloat(amount) <= 0}
					className="w-full bg-mint text-bg font-heading font-bold py-3 rounded text-sm uppercase tracking-wide hover:brightness-110 transition disabled:opacity-30 disabled:cursor-not-allowed"
				>
					Shield {amount || "0"} TAO
				</button>
			</div>

			<div className="mt-4 bg-surface/50 border border-border rounded-lg p-4">
				<p className="text-xs text-muted leading-relaxed">
					<span className="text-mint font-mono text-[10px] uppercase tracking-wider">
						How it works
					</span>
					<br />
					A random nullifier and secret are generated locally. The
					commitment Poseidon(nullifier, secret) is inserted into the
					on-chain Merkle tree. Only you hold the secrets needed to
					withdraw.
				</p>
			</div>
		</div>
	);
}
