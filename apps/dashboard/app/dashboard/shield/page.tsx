"use client";

import { useState } from "react";
import { useChainId } from "wagmi";
import { getChainConfig, type TokenConfig } from "@/lib/chain-config";
import { TokenSelector } from "@/components/token-selector";

export default function ShieldPage() {
	const chainId = useChainId();
	const chain = getChainConfig(chainId);
	const [selectedToken, setSelectedToken] = useState<TokenConfig>(
		chain.tokens[0],
	);
	const [amount, setAmount] = useState("");

	const feeRate = chain.adapter === "bittensor" ? 0.005 : 0; // Railgun handles its own fees
	const fee = amount ? (parseFloat(amount) * feeRate).toFixed(6) : "0";
	const net = amount
		? (parseFloat(amount) - parseFloat(fee)).toFixed(6)
		: "0";

	return (
		<div className="max-w-lg">
			<div className="flex items-center gap-3 mb-2">
				<h1 className="font-heading font-extrabold text-2xl tracking-tight">
					Shield {selectedToken.symbol}
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
				</span>
			</div>
			<p className="text-body text-sm mb-6">
				{chain.adapter === "bittensor"
					? "Deposit into the ShieldedPool. A Poseidon commitment enters the Merkle tree. Your identity stays off-chain."
					: `Shield ${selectedToken.symbol} via Railgun's ZK-SNARK privacy system on ${chain.name}.`}
			</p>

			<div className="bg-surface border border-border rounded-lg p-6 space-y-4">
				{/* Token selector */}
				{chain.tokens.length > 1 && (
					<div>
						<label className="text-muted text-xs font-mono uppercase tracking-wide block mb-2">
							Token
						</label>
						<TokenSelector
							tokens={chain.tokens}
							selected={selectedToken}
							onChange={setSelectedToken}
						/>
					</div>
				)}

				<div>
					<label className="text-muted text-xs font-mono uppercase tracking-wide block mb-2">
						Amount ({selectedToken.symbol})
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

				{feeRate > 0 && (
					<div className="border-t border-border pt-4 space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted">
								Protocol fee ({(feeRate * 100).toFixed(1)}%)
							</span>
							<span className="text-body">
								{fee} {selectedToken.symbol}
							</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted">Net shielded</span>
							<span className="text-mint font-bold">
								{net} {selectedToken.symbol}
							</span>
						</div>
					</div>
				)}

				{chain.adapter === "railgun" && (
					<div className="border-t border-border pt-4">
						<p className="text-xs text-muted">
							Railgun applies a 0.25% shielding fee at the contract level.
						</p>
					</div>
				)}

				<button
					disabled={!amount || parseFloat(amount) <= 0}
					className="w-full text-bg font-heading font-bold py-3 rounded text-sm uppercase tracking-wide hover:brightness-110 transition disabled:opacity-30 disabled:cursor-not-allowed"
					style={{ background: chain.accentColor }}
				>
					Shield {amount || "0"} {selectedToken.symbol}
				</button>
			</div>

			<div className="mt-4 bg-surface/50 border border-border rounded-lg p-4">
				<p className="text-xs text-muted leading-relaxed">
					<span
						className="font-mono text-[10px] uppercase tracking-wider"
						style={{ color: chain.accentColor }}
					>
						{chain.adapter === "bittensor"
							? "Peek-a-boo ShieldedPool"
							: "Railgun Privacy System"}
					</span>
					<br />
					{chain.adapter === "bittensor"
						? "A random nullifier and secret are generated locally. The commitment Poseidon(nullifier, secret) is inserted into the on-chain Merkle tree."
						: `Your ${selectedToken.symbol} is shielded via Railgun's ZK-SNARK system. Shielded tokens enter a UTXO-based privacy pool — invisible on-chain until you unshield.`}
				</p>
			</div>
		</div>
	);
}
