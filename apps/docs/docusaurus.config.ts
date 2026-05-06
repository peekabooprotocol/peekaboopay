import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
	title: "PAS — Private Agent Shell",
	tagline: "Agent-agnostic privacy middleware for autonomous AI agents on Ethereum",
	favicon: "img/favicon.ico",
	url: "https://pas.dev",
	baseUrl: "/",
	organizationName: "pas",
	projectName: "pas",
	onBrokenLinks: "throw",
	onBrokenMarkdownLinks: "warn",

	i18n: {
		defaultLocale: "en",
		locales: ["en"],
	},

	presets: [
		[
			"classic",
			{
				docs: {
					sidebarPath: "./sidebars.ts",
				},
				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	themeConfig: {
		navbar: {
			title: "PAS",
			items: [
				{
					type: "docSidebar",
					sidebarId: "docs",
					position: "left",
					label: "Docs",
				},
				{
					href: "https://github.com/pas/pas",
					label: "GitHub",
					position: "right",
				},
			],
		},
		footer: {
			style: "dark",
			copyright: `PAS — Private Agent Shell. Built for the agentic economy.`,
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
