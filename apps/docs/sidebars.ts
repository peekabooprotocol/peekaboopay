import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
	docs: [
		"intro",
		{
			type: "category",
			label: "Architecture",
			items: [
				"architecture/overview",
				"architecture/settlement-layer",
				"architecture/privacy-protocol",
				"architecture/core-engine",
				"architecture/sdk",
				"architecture/agent-layer",
			],
		},
		{
			type: "category",
			label: "Guides",
			items: ["guides/quickstart", "guides/agent-integration"],
		},
	],
};

export default sidebars;
