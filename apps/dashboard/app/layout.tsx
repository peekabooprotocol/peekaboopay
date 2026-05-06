import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
	subsets: ["latin"],
	variable: "--font-heading",
	weight: ["400", "700", "800"],
});

const mono = DM_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
	weight: ["300", "400"],
});

export const metadata: Metadata = {
	title: "Dashboard — Peek-a-boo",
	description:
		"Agent-first privacy dashboard. Shield tokens, send private payments, manage API keys for your agents.",
	icons: { icon: "/favicon.svg" },
	openGraph: {
		title: "Peek-a-boo Dashboard",
		description:
			"Shield · Unshield · Transfer · API Keys. Agent-first privacy for web3.",
		images: [{ url: "/og.svg", width: 1200, height: 630 }],
		siteName: "Peek-a-boo",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Peek-a-boo Dashboard",
		description:
			"Agent-first privacy dashboard. Shield, unshield, transfer, manage API keys.",
		images: ["/og.svg"],
	},
	metadataBase: new URL("https://app.peekaboo.finance"),
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className={`${jakarta.variable} ${mono.variable}`}>
			<body className="bg-bg text-text antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
