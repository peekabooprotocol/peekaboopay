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
	description: "Private payments for web3. Shield. Send. Prove.",
	icons: { icon: "/favicon.svg" },
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
