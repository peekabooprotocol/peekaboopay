"use client";

import { useState, useEffect, useCallback } from "react";

interface ApiKey {
	id: string;
	name: string;
	created_at: number;
	last_used_at: number | null;
	revoked: number;
}

export default function ApiKeysPage() {
	const [keys, setKeys] = useState<ApiKey[]>([]);
	const [newKey, setNewKey] = useState<string | null>(null);
	const [keyName, setKeyName] = useState("Default");
	const [loading, setLoading] = useState(false);

	const fetchKeys = useCallback(async () => {
		const res = await fetch("/api/keys");
		const data = await res.json();
		setKeys(data.keys || []);
	}, []);

	useEffect(() => {
		fetchKeys();
	}, [fetchKeys]);

	const generateKey = async () => {
		setLoading(true);
		const res = await fetch("/api/keys", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: keyName }),
		});
		const data = await res.json();
		setNewKey(data.key);
		setKeyName("Default");
		setLoading(false);
		fetchKeys();
	};

	const revokeKey = async (id: string) => {
		await fetch(`/api/keys/${id}`, { method: "DELETE" });
		fetchKeys();
	};

	const copyKey = () => {
		if (newKey) navigator.clipboard.writeText(newKey);
	};

	return (
		<div className="max-w-2xl">
			<h1 className="font-heading font-extrabold text-2xl mb-2 tracking-tight">
				API Keys
			</h1>
			<p className="text-body text-sm mb-6">
				Generate API keys so your agents can access the protocol
				programmatically. Keys use Bearer authentication.
			</p>

			{/* Generate Key */}
			<div className="bg-surface border border-border rounded-lg p-5 mb-6">
				<div className="flex gap-3">
					<input
						type="text"
						value={keyName}
						onChange={(e) => setKeyName(e.target.value)}
						placeholder="Key name"
						className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:border-mint/50 focus:outline-none"
					/>
					<button
						onClick={generateKey}
						disabled={loading}
						className="bg-mint text-bg font-heading font-bold px-5 py-2 rounded text-sm uppercase tracking-wide hover:brightness-110 transition disabled:opacity-50"
					>
						Generate
					</button>
				</div>

				{newKey && (
					<div className="mt-4 bg-bg border border-mint/30 rounded p-4">
						<p className="text-mint text-xs font-mono uppercase tracking-wider mb-2">
							New API Key — save this now
						</p>
						<div className="flex items-center gap-2">
							<code className="flex-1 text-sm text-text font-mono bg-surface px-3 py-2 rounded break-all">
								{newKey}
							</code>
							<button
								onClick={copyKey}
								className="text-mint text-xs font-mono border border-mint/30 px-3 py-2 rounded hover:bg-mint/10 transition"
							>
								Copy
							</button>
						</div>
						<p className="text-muted text-[11px] mt-2">
							This key won&apos;t be shown again.
						</p>
					</div>
				)}
			</div>

			{/* Key List */}
			<div className="bg-surface border border-border rounded-lg overflow-hidden">
				<div className="grid grid-cols-4 gap-4 px-5 py-3 text-xs font-mono uppercase tracking-wide text-muted border-b border-border">
					<span>Name</span>
					<span>Created</span>
					<span>Last Used</span>
					<span>Actions</span>
				</div>

				{keys.length === 0 ? (
					<div className="p-6 text-center text-muted text-sm">
						No API keys yet. Generate one above.
					</div>
				) : (
					keys.map((key) => (
						<div
							key={key.id}
							className="grid grid-cols-4 gap-4 px-5 py-3 text-sm border-b border-border/50 last:border-0"
						>
							<span
								className={
									key.revoked
										? "text-muted line-through"
										: "text-text"
								}
							>
								{key.name}
							</span>
							<span className="text-muted text-xs">
								{new Date(
									key.created_at * 1000,
								).toLocaleDateString()}
							</span>
							<span className="text-muted text-xs">
								{key.last_used_at
									? new Date(
											key.last_used_at * 1000,
										).toLocaleDateString()
									: "Never"}
							</span>
							<span>
								{key.revoked ? (
									<span className="text-dimmed text-xs">
										Revoked
									</span>
								) : (
									<button
										onClick={() => revokeKey(key.id)}
										className="text-pink text-xs hover:text-pink/80 transition"
									>
										Revoke
									</button>
								)}
							</span>
						</div>
					))
				)}
			</div>

			<div className="mt-4 bg-surface/50 border border-border rounded-lg p-4">
				<p className="text-xs text-muted leading-relaxed">
					<span className="text-mint font-mono text-[10px] uppercase tracking-wider">
						Usage
					</span>
					<br />
					Include your API key in the Authorization header:{" "}
					<code className="text-mint text-[11px]">
						Authorization: Bearer pab_...
					</code>
				</p>
			</div>
		</div>
	);
}
