"use client";

import { useState } from "react";

export default function UnshieldPage() {
	const [amount, setAmount] = useState("");
	const [recipient, setRecipient] = useState("");
	const fee = amount ? (parseFloat(amount) * 0.005).toFixed(6) : "0";
	const net = amount
		? (parseFloat(amount) - parseFloat(fee)).toFixed(6)
		: "0";

	return (
		<div className="max-w-lg">
			<h1 className="font-heading font-extrabold text-2xl mb-2 tracking-tight">
				Unshield TAO
			</h1>
			<p className="text-body text-sm mb-6">
				Withdraw from the shielded pool. A Groth16 ZK proof is generated
				locally — proving you own funds without revealing which deposit.
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
						className="w-full bg-bg border border-border rounded px-4 py-3 text-text text-lg font-heading font-bold focus:border-violet/50 focus:outline-none transition-colors"
					/>
				</div>

				<div>
					<label className="text-muted text-xs font-mono uppercase tracking-wide block mb-2">
						Recipient Address
					</label>
					<input
						type="text"
						value={recipient}
						onChange={(e) => setRecipient(e.target.value)}
						placeholder="0x..."
						className="w-full bg-bg border border-border rounded px-4 py-3 text-text text-sm font-mono focus:border-violet/50 focus:outline-none transition-colors"
					/>
				</div>

				<div className="border-t border-border pt-4 space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-muted">Protocol fee (0.5%)</span>
						<span className="text-body">{fee} TAO</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted">Recipient receives</span>
						<span className="text-violet font-bold">
							{net} TAO
						</span>
					</div>
				</div>

				<button
					disabled={
						!amount || parseFloat(amount) <= 0 || !recipient
					}
					className="w-full bg-violet text-bg font-heading font-bold py-3 rounded text-sm uppercase tracking-wide hover:brightness-110 transition disabled:opacity-30 disabled:cursor-not-allowed"
				>
					Generate Proof & Withdraw
				</button>
			</div>

			<div className="mt-4 bg-surface/50 border border-border rounded-lg p-4">
				<p className="text-xs text-muted leading-relaxed">
					<span className="text-violet font-mono text-[10px] uppercase tracking-wider">
						ZK Proof Generation
					</span>
					<br />
					Proof generation takes 5-10 seconds. The Groth16 proof
					proves Merkle membership without revealing which deposit is
					yours. Recipient and amount are bound to prevent
					front-running.
				</p>
			</div>
		</div>
	);
}
