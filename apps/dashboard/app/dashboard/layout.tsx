"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { clsx } from "clsx";

const navItems = [
	{ href: "/dashboard", label: "Overview", icon: "◉" },
	{ href: "/dashboard/shield", label: "Shield", icon: "↓" },
	{ href: "/dashboard/unshield", label: "Unshield", icon: "↑" },
	{ href: "/dashboard/transfer", label: "Transfer", icon: "→" },
	{ href: "/dashboard/api-keys", label: "API Keys", icon: "⚿" },
	{ href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const { isConnected } = useAccount();
	const router = useRouter();

	useEffect(() => {
		if (!isConnected) {
			router.push("/");
		}
	}, [isConnected, router]);

	if (!isConnected) return null;

	return (
		<div className="min-h-screen flex">
			{/* Sidebar */}
			<aside className="w-60 border-r border-border bg-bg2 flex flex-col">
				<div className="p-5 border-b border-border">
					<Link href="/" className="font-heading font-extrabold text-sm">
						peek<span className="text-mint">—</span>a
						<span className="text-mint">—</span>boo
					</Link>
				</div>

				<nav className="flex-1 p-3">
					{navItems.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className={clsx(
								"flex items-center gap-3 px-3 py-2.5 rounded text-sm mb-0.5 transition-colors",
								pathname === item.href
									? "bg-surface text-mint"
									: "text-muted hover:text-text hover:bg-surface/50",
							)}
						>
							<span className="text-xs w-4 text-center opacity-60">
								{item.icon}
							</span>
							{item.label}
						</Link>
					))}
				</nav>

				<div className="p-4 border-t border-border text-xs text-dimmed font-mono">
					Chain 964 · 0.5% fee
				</div>
			</aside>

			{/* Main */}
			<div className="flex-1 flex flex-col">
				<header className="h-14 border-b border-border flex items-center justify-end px-6">
					<ConnectButton
						showBalance={true}
						chainStatus="icon"
						accountStatus="address"
					/>
				</header>

				<main className="flex-1 p-6 overflow-auto">{children}</main>
			</div>
		</div>
	);
}
