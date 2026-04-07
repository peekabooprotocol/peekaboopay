import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, bsc, polygon, arbitrum } from "wagmi/chains";
import { bittensorEvm } from "./chains";

export const config = getDefaultConfig({
	appName: "Peek-a-boo",
	projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
	chains: [bittensorEvm, mainnet, polygon, arbitrum, bsc],
	ssr: true,
});
