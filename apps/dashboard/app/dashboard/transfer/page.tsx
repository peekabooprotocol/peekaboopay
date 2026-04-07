"use client";

import { useState } from "react";
import { useChainId } from "wagmi";
import { getChainConfig, type TokenConfig } from "@/lib/chain-config";
import { TokenSelector } from "@/components/token-selector";

export default function TransferPage() {
	const chainId = useChainId();
	const chain = getChainConfig(chainId);
	const [selectedToken, setSelectedToken] = useState<TokenConfig>(
		chain.tokens[0],
	);
	const [amount, setAmount] = useState("");
	const [recipientKey, setRecipientKey] = useState("");

	return (
		<div className="max-w-lg">
			<div className="flex items-center gap-3 mb-2">
				<h1 className="font-heading font-extrabold text-2xl tracking-tight">
					Private Transfer
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
					? `Send ${selectedToken.symbol} privately via a stealth address. The recipient gets a one-time ERC-5564 address — no public link between you.`
					: `Send ${selectedToken.symbol} privately via Railgun on ${chain.name}. The transfer happens entirely within the shielded pool.`}
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
						className="w-full bg-bg border border-border rounded px-4 py-3 text-text text-lg font-heading font-bold focus:border-pink/50 focus:outline-none transition-colors"
					/>
				</div>

				<div>
					<label className="text-muted text-xs font-mono uppercase tracking-wide block mb-2">
						{chain.adapter === "bittensor"
							? "Recipient Public Key"
							: "Railgun Address (0zk...)"}
					</label>
					<input
						type="text"
						value={recipientKey}
						onChange={(e) => setRecipientKey(e.target.value)}
						placeholder={
							chain.adapter === "bittensor"
								? "0x04..."
								: "0zk..."
						}
						className="w-full bg-bg border border-border rounded px-4 py-3 text-text text-sm font-mono focus:border-pink/50 focus:outline-none transition-colors"
					/>
					<p className="text-dimmed text-[11px] mt-1">
						{chain.adapter === "bittensor"
							? "Uncompressed secp256k1 public key (65 bytes, starts with 0x04)"
							: "Railgun shielded address (starts with 0zk)"}
					</p>
				</div>

				<button
					disabled={
						!amount || parseFloat(amount) <= 0 || !recipientKey
					}
					className="w-full bg-pink text-bg font-heading font-bold py-3 rounded text-sm uppercase tracking-wide hover:brightness-110 transition disabled:opacity-30 disabled:cursor-not-allowed"
				>
					Send{" "}
					{amount || "0"} {selectedToken.symbol} Privately
				</button>
			</div>

			<div className="mt-4 bg-surface/50 border border-border rounded-lg p-4">
				<p className="text-xs text-muted leading-relaxed">
					<span className="text-pink font-mono text-[10px] uppercase tracking-wider">
						{chain.adapter === "bittensor"
							? "Stealth Addresses"
							: "Railgun Private Transfer"}
					</span>
					<br />
					{chain.adapter === "bittensor"
						? "An ECDH key exchange generates a fresh one-time address. The StealthAnnouncer emits an event so the recipient can scan for payments using their viewTag."
						: `The transfer stays entirely within Railgun's shielded pool. No on-chain trace links sender to recipient. The proof is generated locally before submission.`}
				</p>
			</div>
		</div>
	);
}
