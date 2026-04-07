"use client";

import { useState } from "react";

export default function TransferPage() {
	const [amount, setAmount] = useState("");
	const [recipientKey, setRecipientKey] = useState("");

	return (
		<div className="max-w-lg">
			<h1 className="font-heading font-extrabold text-2xl mb-2 tracking-tight">
				Private Transfer
			</h1>
			<p className="text-body text-sm mb-6">
				Send TAO privately via a stealth address. The recipient gets a
				one-time ERC-5564 address — no public link between you.
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
						className="w-full bg-bg border border-border rounded px-4 py-3 text-text text-lg font-heading font-bold focus:border-pink/50 focus:outline-none transition-colors"
					/>
				</div>

				<div>
					<label className="text-muted text-xs font-mono uppercase tracking-wide block mb-2">
						Recipient Public Key
					</label>
					<input
						type="text"
						value={recipientKey}
						onChange={(e) => setRecipientKey(e.target.value)}
						placeholder="0x04..."
						className="w-full bg-bg border border-border rounded px-4 py-3 text-text text-sm font-mono focus:border-pink/50 focus:outline-none transition-colors"
					/>
					<p className="text-dimmed text-[11px] mt-1">
						Uncompressed secp256k1 public key (65 bytes, starts with
						0x04)
					</p>
				</div>

				<button
					disabled={
						!amount ||
						parseFloat(amount) <= 0 ||
						!recipientKey
					}
					className="w-full bg-pink text-bg font-heading font-bold py-3 rounded text-sm uppercase tracking-wide hover:brightness-110 transition disabled:opacity-30 disabled:cursor-not-allowed"
				>
					Send Privately
				</button>
			</div>

			<div className="mt-4 bg-surface/50 border border-border rounded-lg p-4">
				<p className="text-xs text-muted leading-relaxed">
					<span className="text-pink font-mono text-[10px] uppercase tracking-wider">
						Stealth Addresses
					</span>
					<br />
					An ECDH key exchange generates a fresh one-time address. The
					StealthAnnouncer emits an event so the recipient can scan
					for payments using their viewTag.
				</p>
			</div>
		</div>
	);
}
