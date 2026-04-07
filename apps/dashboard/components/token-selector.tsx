"use client";

import { type TokenConfig } from "@/lib/chain-config";

interface TokenSelectorProps {
	tokens: TokenConfig[];
	selected: TokenConfig;
	onChange: (token: TokenConfig) => void;
}

export function TokenSelector({
	tokens,
	selected,
	onChange,
}: TokenSelectorProps) {
	if (tokens.length <= 1) {
		return (
			<div className="flex items-center gap-2 px-3 py-2 bg-bg border border-border rounded text-sm">
				<span className="text-text font-bold">{selected.symbol}</span>
				<span className="text-muted text-xs">{selected.name}</span>
			</div>
		);
	}

	return (
		<div className="flex gap-2">
			{tokens.map((token) => (
				<button
					key={token.address}
					onClick={() => onChange(token)}
					className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-colors border ${
						selected.address === token.address
							? "border-mint/40 bg-mint/10 text-mint"
							: "border-border bg-bg text-muted hover:text-text hover:border-border/80"
					}`}
				>
					<span className="font-bold">{token.symbol}</span>
				</button>
			))}
		</div>
	);
}
