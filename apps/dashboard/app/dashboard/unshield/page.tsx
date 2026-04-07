"use client";

import { useState } from "react";
import { useChainId } from "wagmi";
import { getChainConfig, type TokenConfig } from "@/lib/chain-config";
import { TokenSelector } from "@/components/token-selector";

export default function UnshieldPage() {
	const chainId = useChainId();
	const chain = getChainConfig(chainId);
	const [selectedToken, setSelectedToken] = useState<TokenConfig>(
		chain.tokens[0],
	);
	const [amount, setAmount] = useState("");
	const [recipient, setRecipient] = useState("");

	const feeRate = chain.adapter === "bittensor" ? 0.005 : 0.0025;
	const fee = amount ? (parseFloat(amount) * feeRate).toFixed(6) : "0";
	const net = amount
		? (parseFloat(amount) - parseFloat(fee)).toFixed(6)
		: "0";

	return (
		<div className="max-w-lg">
			<div className="flex items-center gap-3 mb-2">
				<h1 className="font-heading font-extrabold text-2xl tracking-tight">
					Unshield {selectedToken.symbol}
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
					? "Withdraw from the shielded pool. A Groth16 ZK proof is generated locally — proving you own funds without revealing which deposit."
					: `Unshield ${selectedToken.symbol} from Railgun's privacy pool back to a public address on ${chain.name}.`}
			</p>

			<div className="bg-surface border border-border rounded-lg p-6 space-y-4">
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
						<span className="text-muted">
							{chain.adapter === "bittensor"
								? "Protocol fee (0.5%)"
								: "Railgun fee (0.25%)"}
						</span>
						<span className="text-body">
							{fee} {selectedToken.symbol}
						</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted">Recipient receives</span>
						<span className="text-violet font-bold">
							{net} {selectedToken.symbol}
						</span>
					</div>
				</div>

				<button
					disabled={
						!amount || parseFloat(amount) <= 0 || !recipient
					}
					className="w-full bg-violet text-bg font-heading font-bold py-3 rounded text-sm uppercase tracking-wide hover:brightness-110 transition disabled:opacity-30 disabled:cursor-not-allowed"
				>
					{chain.adapter === "bittensor"
						? "Generate Proof & Withdraw"
						: "Unshield via Railgun"}
				</button>
			</div>

			<div className="mt-4 bg-surface/50 border border-border rounded-lg p-4">
				<p className="text-xs text-muted leading-relaxed">
					<span className="text-violet font-mono text-[10px] uppercase tracking-wider">
						{chain.adapter === "bittensor"
							? "ZK Proof Generation"
							: "Railgun Unshield"}
					</span>
					<br />
					{chain.adapter === "bittensor"
						? "Proof generation takes 5-10 seconds. The Groth16 proof proves Merkle membership without revealing which deposit is yours."
						: `Railgun generates a ZK proof internally to unshield your ${selectedToken.symbol}. The transaction appears as a standard transfer from the Railgun contract.`}
				</p>
			</div>
		</div>
	);
}
