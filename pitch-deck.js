const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const {
	FaShieldAlt, FaKey, FaEye, FaPlug, FaCode, FaServer, FaPuzzlePiece,
	FaPercent, FaStamp, FaCrown, FaBoxes, FaRocket, FaLock, FaLayerGroup,
	FaCog, FaEthereum, FaExchangeAlt, FaUserSecret, FaCertificate, FaRandom
} = require("react-icons/fa");

function renderIconSvg(IconComponent, color = "#000000", size = 256) {
	return ReactDOMServer.renderToStaticMarkup(
		React.createElement(IconComponent, { color, size: String(size) })
	);
}

async function iconToBase64Png(IconComponent, color, size = 256) {
	const svg = renderIconSvg(IconComponent, color, size);
	const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
	return "image/png;base64," + pngBuffer.toString("base64");
}

// Color palette - dark cyber theme
const C = {
	bg: "0A0A0F",
	bgCard: "12121C",
	bgCardAlt: "161625",
	cyan: "22D3EE",
	purple: "A78BFA",
	pink: "F472B6",
	orange: "FB923C",
	green: "4ADE80",
	white: "E2E2E8",
	muted: "888899",
	dim: "555566",
	border: "1A1A2E",
};

// Helper: never reuse option objects
const makeShadow = () => ({ type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.4 });

// Add slide number to bottom-right
function addSlideNumber(s, num, total) {
	s.addText(`${num} / ${total}`, { x: 8.8, y: 5.25, w: 0.9, h: 0.3,
		fontSize: 8, fontFace: "Consolas", color: C.dim, align: "right", valign: "middle", margin: 0 });
}

async function createDeck() {
	let pres = new pptxgen();
	pres.layout = "LAYOUT_16x9";
	pres.author = "PAS Team";
	pres.title = "PAS — Private Agent Shell";

	// Pre-render icons
	const icons = {
		shield: await iconToBase64Png(FaShieldAlt, `#${C.cyan}`, 256),
		key: await iconToBase64Png(FaKey, `#${C.purple}`, 256),
		eye: await iconToBase64Png(FaEye, `#${C.pink}`, 256),
		plug: await iconToBase64Png(FaPlug, `#${C.orange}`, 256),
		code: await iconToBase64Png(FaCode, `#${C.cyan}`, 256),
		server: await iconToBase64Png(FaServer, `#${C.purple}`, 256),
		puzzle: await iconToBase64Png(FaPuzzlePiece, `#${C.green}`, 256),
		percent: await iconToBase64Png(FaPercent, `#${C.cyan}`, 256),
		stamp: await iconToBase64Png(FaStamp, `#${C.purple}`, 256),
		crown: await iconToBase64Png(FaCrown, `#${C.pink}`, 256),
		boxes: await iconToBase64Png(FaBoxes, `#${C.orange}`, 256),
		rocket: await iconToBase64Png(FaRocket, `#${C.green}`, 256),
		lock: await iconToBase64Png(FaLock, `#${C.pink}`, 256),
		layers: await iconToBase64Png(FaLayerGroup, `#${C.purple}`, 256),
		cog: await iconToBase64Png(FaCog, `#${C.orange}`, 256),
		eth: await iconToBase64Png(FaEthereum, `#${C.green}`, 256),
		exchange: await iconToBase64Png(FaExchangeAlt, `#${C.cyan}`, 256),
		userSecret: await iconToBase64Png(FaUserSecret, `#${C.pink}`, 256),
		cert: await iconToBase64Png(FaCertificate, `#${C.purple}`, 256),
		random: await iconToBase64Png(FaRandom, `#${C.orange}`, 256),
	};

	// =======================================
	// SLIDE 1 — Title
	// =======================================
	{
		let s = pres.addSlide();
		s.background = { color: C.bg };

		// Decorative top gradient bar
		s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.cyan } });

		// Small status pill
		s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.2, w: 2.2, h: 0.35, fill: { color: C.bgCard },
			line: { color: C.green, width: 0.75 }, rectRadius: 0.02 });
		s.addText("ARCHITECTURE SPEC v0.1", { x: 0.8, y: 1.2, w: 2.2, h: 0.35, fontSize: 8,
			fontFace: "Consolas", color: C.green, align: "center", valign: "middle", margin: 0 });

		// Title
		s.addText("Private Agent Shell", { x: 0.8, y: 1.85, w: 8.4, h: 0.85, fontSize: 42,
			fontFace: "Calibri", color: C.white, bold: true, margin: 0 });

		// Subtitle
		s.addText("Agent-agnostic privacy middleware for autonomous AI agents on Ethereum", {
			x: 0.8, y: 2.75, w: 7, h: 0.5, fontSize: 16, fontFace: "Calibri", color: C.muted, margin: 0 });

		// Feature pills row
		const pills = ["Shielded Transactions", "ZK Credentials", "Selective Disclosure", "Pluggable Backends"];
		const pillColors = [C.cyan, C.purple, C.pink, C.orange];
		let px = 0.8;
		for (let i = 0; i < pills.length; i++) {
			const pw = pills[i].length * 0.085 + 0.4;
			s.addShape(pres.shapes.RECTANGLE, { x: px, y: 3.6, w: pw, h: 0.35,
				fill: { color: pillColors[i], transparency: 90 }, line: { color: pillColors[i], width: 0.5 } });
			s.addText(pills[i], { x: px, y: 3.6, w: pw, h: 0.35, fontSize: 9,
				fontFace: "Consolas", color: pillColors[i], align: "center", valign: "middle", margin: 0 });
			px += pw + 0.15;
		}

		// Large icon
		s.addImage({ data: icons.lock, x: 7.8, y: 1.2, w: 1.4, h: 1.4 });

		// Bottom line
		s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.3, w: 10, h: 0.01, fill: { color: C.border } });
		s.addText("March 2026  |  Draft for Discussion", { x: 0.8, y: 5.1, w: 4, h: 0.4,
			fontSize: 9, fontFace: "Calibri", color: C.dim, margin: 0 });
		addSlideNumber(s, 1, 9);
	}

	// =======================================
	// SLIDE 2 — The Problem
	// =======================================
	{
		let s = pres.addSlide();
		s.background = { color: C.bg };
		s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.04, fill: { color: C.pink } });

		s.addText("THE PROBLEM", { x: 0.8, y: 0.35, w: 5, h: 0.4, fontSize: 10,
			fontFace: "Consolas", color: C.pink, charSpacing: 4, margin: 0 });
		s.addText("AI Agents Are Financially Naked", { x: 0.8, y: 0.75, w: 8, h: 0.65, fontSize: 30,
			fontFace: "Calibri", color: C.white, bold: true, margin: 0 });

		// Problem cards — 2x2 grid
		const problems = [
			{ title: "Public Transactions", desc: "Every payment an agent makes is visible on-chain. Competitors can front-run, copy strategies, or analyze spending patterns.", color: C.cyan, icon: icons.eye },
			{ title: "Address Reuse", desc: "Agents reuse addresses, making their entire transaction history linkable. One lookup reveals all activity.", color: C.purple, icon: icons.exchange },
			{ title: "No Credentials", desc: "Agents can't prove reputation or compliance without revealing their full identity and transaction history.", color: C.pink, icon: icons.cert },
			{ title: "Framework Lock-in", desc: "Privacy solutions today are tied to specific chains or agent frameworks. No universal middleware exists.", color: C.orange, icon: icons.plug },
		];

		for (let i = 0; i < 4; i++) {
			const col = i % 2;
			const row = Math.floor(i / 2);
			const cx = 0.8 + col * 4.3;
			const cy = 1.75 + row * 1.75;

			s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: 4.0, h: 1.5,
				fill: { color: C.bgCard }, line: { color: C.border, width: 0.5 }, shadow: makeShadow() });

			s.addImage({ data: problems[i].icon, x: cx + 0.25, y: cy + 0.25, w: 0.4, h: 0.4 });

			s.addText(problems[i].title, { x: cx + 0.8, y: cy + 0.2, w: 3.0, h: 0.35,
				fontSize: 14, fontFace: "Calibri", color: problems[i].color, bold: true, margin: 0 });
			s.addText(problems[i].desc, { x: cx + 0.25, y: cy + 0.7, w: 3.5, h: 0.65,
				fontSize: 10, fontFace: "Calibri", color: C.muted, margin: 0 });
		}
		addSlideNumber(s, 2, 9);
	}

	// =======================================
	// SLIDE 3 — What PAS Is
	// =======================================
	{
		let s = pres.addSlide();
		s.background = { color: C.bg };
		s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.04, fill: { color: C.purple } });

		s.addText("THE SOLUTION", { x: 0.8, y: 0.35, w: 5, h: 0.4, fontSize: 10,
			fontFace: "Consolas", color: C.purple, charSpacing: 4, margin: 0 });
		s.addText("Privacy Middleware for Agents", { x: 0.8, y: 0.75, w: 8.4, h: 0.65, fontSize: 30,
			fontFace: "Calibri", color: C.white, bold: true, margin: 0 });

		// Left side — code example
		s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.7, w: 4.8, h: 2.8,
			fill: { color: C.bgCard }, line: { color: C.border, width: 0.5 }, shadow: makeShadow() });
		s.addText("npm install @pas/sdk", { x: 1.0, y: 1.8, w: 4.4, h: 0.3,
			fontSize: 10, fontFace: "Consolas", color: C.green, margin: 0 });
		s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y: 2.2, w: 4.4, h: 0.01, fill: { color: C.border } });

		const codeLines = [
			{ text: "import", color: C.purple }, { text: " { PASClient } ", color: C.white },
			{ text: "from", color: C.purple }, { text: " \"@pas/sdk\"", color: C.green },
		];
		s.addText([
			{ text: "import ", options: { color: C.purple, fontFace: "Consolas", fontSize: 9 } },
			{ text: "{ PASClient } ", options: { color: C.white, fontFace: "Consolas", fontSize: 9 } },
			{ text: "from ", options: { color: C.purple, fontFace: "Consolas", fontSize: 9 } },
			{ text: "\"@pas/sdk\"", options: { color: C.green, fontFace: "Consolas", fontSize: 9, breakLine: true } },
			{ text: "", options: { fontSize: 6, breakLine: true } },
			{ text: "const ", options: { color: C.purple, fontFace: "Consolas", fontSize: 9 } },
			{ text: "pas = ", options: { color: C.white, fontFace: "Consolas", fontSize: 9 } },
			{ text: "new ", options: { color: C.purple, fontFace: "Consolas", fontSize: 9 } },
			{ text: "PASClient(backend)", options: { color: C.cyan, fontFace: "Consolas", fontSize: 9, breakLine: true } },
			{ text: "", options: { fontSize: 6, breakLine: true } },
			{ text: "await ", options: { color: C.purple, fontFace: "Consolas", fontSize: 9 } },
			{ text: "pas.pay", options: { color: C.cyan, fontFace: "Consolas", fontSize: 9 } },
			{ text: "({", options: { color: C.white, fontFace: "Consolas", fontSize: 9, breakLine: true } },
			{ text: "  to: recipient,", options: { color: C.white, fontFace: "Consolas", fontSize: 9, breakLine: true } },
			{ text: "  amount: 50n,", options: { color: C.orange, fontFace: "Consolas", fontSize: 9, breakLine: true } },
			{ text: "  token: \"USDC\"", options: { color: C.green, fontFace: "Consolas", fontSize: 9, breakLine: true } },
			{ text: "})", options: { color: C.white, fontFace: "Consolas", fontSize: 9 } },
		], { x: 1.0, y: 2.35, w: 4.4, h: 2.0, valign: "top", margin: 0 });

		// Right side — key points
		const points = [
			{ title: "Single Import", desc: "One SDK wraps all privacy complexity", icon: icons.code, color: C.cyan },
			{ title: "Policy Enforced", desc: "Human-set rules agents can never override", icon: icons.shield, color: C.pink },
			{ title: "Backend Agnostic", desc: "Railgun today, Aztec tomorrow, ETH L1 future", icon: icons.random, color: C.orange },
		];
		for (let i = 0; i < points.length; i++) {
			const py = 1.7 + i * 0.95;
			s.addShape(pres.shapes.RECTANGLE, { x: 6.0, y: py, w: 3.4, h: 0.8,
				fill: { color: C.bgCard }, line: { color: C.border, width: 0.5 }, shadow: makeShadow() });
			s.addImage({ data: points[i].icon, x: 6.2, y: py + 0.17, w: 0.4, h: 0.4 });
			s.addText(points[i].title, { x: 6.75, y: py + 0.08, w: 2.4, h: 0.3,
				fontSize: 13, fontFace: "Calibri", color: points[i].color, bold: true, margin: 0 });
			s.addText(points[i].desc, { x: 6.75, y: py + 0.4, w: 2.4, h: 0.3,
				fontSize: 10, fontFace: "Calibri", color: C.muted, margin: 0 });
		}

		// Bottom callout
		s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 4.75, w: 8.4, h: 0.55,
			fill: { color: C.green, transparency: 92 }, line: { color: C.green, width: 0.5 } });
		s.addText("Agents call pas.pay() — shielding, proof generation, relay, and unshielding happen automatically.", {
			x: 0.8, y: 4.75, w: 8.4, h: 0.55, fontSize: 11, fontFace: "Calibri", color: C.green, align: "center", valign: "middle", margin: 0 });
		addSlideNumber(s, 3, 9);
	}

	// =======================================
	// SLIDE 4 — Architecture (5 Layers)
	// =======================================
	{
		let s = pres.addSlide();
		s.background = { color: C.bg };
		s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.04, fill: { color: C.cyan } });

		s.addText("ARCHITECTURE", { x: 0.8, y: 0.35, w: 5, h: 0.4, fontSize: 10,
			fontFace: "Consolas", color: C.cyan, charSpacing: 4, margin: 0 });
		s.addText("Five-Layer Privacy Stack", { x: 0.8, y: 0.75, w: 8, h: 0.55, fontSize: 28,
			fontFace: "Calibri", color: C.white, bold: true, margin: 0 });

		const layers = [
			{ label: "AGENT LAYER", sub: "Any framework, any model", color: C.cyan, items: "OpenClaw · LangChain · CrewAI · AutoGen" },
			{ label: "PAS SDK", sub: "npm install @pas/sdk", color: C.purple, items: "pay() · receive() · swap() · prove() · disclose()" },
			{ label: "CORE ENGINE", sub: "Privacy orchestration", color: C.pink, items: "Shielded Treasury · Stealth Addresses · Credential Vault · Sessions" },
			{ label: "PRIVACY PROTOCOL", sub: "Pluggable ZK backends", color: C.orange, items: "Railgun (live) · Aztec (Q1 2026) · ETH L1 (future)" },
			{ label: "SETTLEMENT", sub: "Where value moves", color: C.green, items: "Ethereum L1 · Base / Arbitrum / Optimism · Relay Network" },
		];

		for (let i = 0; i < layers.length; i++) {
			const ly = 1.3 + i * 0.72;
			// Layer bar
			s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: ly, w: 8.4, h: 0.6,
				fill: { color: C.bgCard }, line: { color: layers[i].color, width: 0.5, transparency: 70 } });

			// Color indicator
			s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: ly, w: 0.06, h: 0.6,
				fill: { color: layers[i].color } });

			// Label
			s.addText(layers[i].label, { x: 1.1, y: ly + 0.03, w: 2.0, h: 0.27,
				fontSize: 10, fontFace: "Consolas", color: layers[i].color, bold: true, charSpacing: 2, margin: 0 });
			s.addText(layers[i].sub, { x: 1.1, y: ly + 0.3, w: 2.0, h: 0.25,
				fontSize: 9, fontFace: "Calibri", color: C.dim, italic: true, margin: 0 });

			// Items
			s.addText(layers[i].items, { x: 3.3, y: ly, w: 5.7, h: 0.6,
				fontSize: 10, fontFace: "Calibri", color: C.muted, valign: "middle", margin: 0 });

			// Connector arrow between layers
			if (i < layers.length - 1) {
				s.addShape(pres.shapes.RECTANGLE, { x: 5, y: ly + 0.6, w: 0.02, h: 0.12,
					fill: { color: layers[i].color, transparency: 60 } });
			}
		}

		// Bottom note — positioned below last layer (1.3 + 4*0.72 + 0.6 = 4.78)
		s.addText("Each layer is fully decoupled — swap privacy backends, settlement chains, or agent frameworks independently.", {
			x: 0.8, y: 4.95, w: 8.4, h: 0.35, fontSize: 10, fontFace: "Calibri", color: C.dim, italic: true, margin: 0 });
		addSlideNumber(s, 4, 9);
	}

	// =======================================
	// SLIDE 5 — Key Features
	// =======================================
	{
		let s = pres.addSlide();
		s.background = { color: C.bg };
		s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.04, fill: { color: C.green } });

		s.addText("KEY FEATURES", { x: 0.8, y: 0.35, w: 5, h: 0.4, fontSize: 10,
			fontFace: "Consolas", color: C.green, charSpacing: 4, margin: 0 });
		s.addText("What PAS Makes Possible", { x: 0.8, y: 0.75, w: 8, h: 0.55, fontSize: 28,
			fontFace: "Calibri", color: C.white, bold: true, margin: 0 });

		// Two columns
		// LEFT — Hidden
		s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.6, w: 4.0, h: 3.4,
			fill: { color: C.bgCard }, line: { color: C.pink, width: 0.5, transparency: 50 }, shadow: makeShadow() });
		s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.6, w: 4.0, h: 0.45,
			fill: { color: C.pink, transparency: 85 } });
		s.addText("ALWAYS HIDDEN", { x: 0.8, y: 1.6, w: 4.0, h: 0.45,
			fontSize: 11, fontFace: "Consolas", color: C.pink, bold: true, align: "center", valign: "middle", charSpacing: 2, margin: 0 });

		const hidden = [
			"Agent's true balance",
			"Transaction amounts",
			"Sender ↔ recipient link",
			"Transaction history / patterns",
			"Which skills or APIs purchased",
			"Agent's identity across sessions",
		];
		for (let i = 0; i < hidden.length; i++) {
			s.addText([
				{ text: "■  ", options: { color: C.pink, fontSize: 9 } },
				{ text: hidden[i], options: { color: C.muted, fontSize: 11 } },
			], { x: 1.1, y: 2.2 + i * 0.42, w: 3.5, h: 0.35, fontFace: "Calibri", margin: 0 });
		}

		// RIGHT — Provable
		s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.6, w: 4.0, h: 3.4,
			fill: { color: C.bgCard }, line: { color: C.green, width: 0.5, transparency: 50 }, shadow: makeShadow() });
		s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.6, w: 4.0, h: 0.45,
			fill: { color: C.green, transparency: 85 } });
		s.addText("PROVABLE ON DEMAND", { x: 5.2, y: 1.6, w: 4.0, h: 0.45,
			fontSize: 11, fontFace: "Consolas", color: C.green, bold: true, align: "center", valign: "middle", charSpacing: 2, margin: 0 });

		const provable = [
			"\"Balance ≥ X\" (not actual amount)",
			"\"Completed N+ tasks\" (not details)",
			"\"Audited by X\" (not scope)",
			"\"Compliant with policy Y\"",
			"\"Owns skill pack Z\"",
			"\"Active for N months\"",
		];
		for (let i = 0; i < provable.length; i++) {
			s.addText([
				{ text: "■  ", options: { color: C.green, fontSize: 9 } },
				{ text: provable[i], options: { color: C.muted, fontSize: 11 } },
			], { x: 5.5, y: 2.2 + i * 0.42, w: 3.5, h: 0.35, fontFace: "Calibri", margin: 0 });
		}
		addSlideNumber(s, 5, 9);
	}

	// =======================================
	// SLIDE 6 — How Agents Integrate
	// =======================================
	{
		let s = pres.addSlide();
		s.background = { color: C.bg };
		s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.04, fill: { color: C.purple } });

		s.addText("INTEGRATION", { x: 0.8, y: 0.35, w: 5, h: 0.4, fontSize: 10,
			fontFace: "Consolas", color: C.purple, charSpacing: 4, margin: 0 });
		s.addText("Three Ways to Plug In", { x: 0.8, y: 0.75, w: 8, h: 0.55, fontSize: 28,
			fontFace: "Calibri", color: C.white, bold: true, margin: 0 });

		// Three integration cards
		const integrations = [
			{
				title: "MCP Server", sub: "Recommended", color: C.cyan, icon: icons.server,
				desc: "Any MCP-compatible agent discovers PAS tools automatically. Zero adapter code needed.",
				tools: "pas:shielded_pay · pas:prove_credential · pas:check_balance"
			},
			{
				title: "Direct SDK", sub: "Maximum control", color: C.purple, icon: icons.code,
				desc: "Import @pas/sdk in any TypeScript agent. Full async API with type safety.",
				tools: "pas.pay() · pas.prove() · pas.disclose() · pas.setPolicy()"
			},
			{
				title: "Framework Adapters", sub: "Drop-in tools", color: C.green, icon: icons.puzzle,
				desc: "Pre-built wrappers for LangChain, CrewAI, and other agent frameworks.",
				tools: "@pas/agent-langchain · @pas/agent-crewai"
			},
		];

		for (let i = 0; i < 3; i++) {
			const cx = 0.6 + i * 3.05;
			s.addShape(pres.shapes.RECTANGLE, { x: cx, y: 1.6, w: 2.85, h: 3.3,
				fill: { color: C.bgCard }, line: { color: integrations[i].color, width: 0.5, transparency: 60 }, shadow: makeShadow() });

			// Icon circle
			s.addShape(pres.shapes.OVAL, { x: cx + 0.98, y: 1.85, w: 0.8, h: 0.8,
				fill: { color: integrations[i].color, transparency: 85 } });
			s.addImage({ data: integrations[i].icon, x: cx + 1.13, y: 2.0, w: 0.5, h: 0.5 });

			s.addText(integrations[i].title, { x: cx + 0.15, y: 2.85, w: 2.55, h: 0.35,
				fontSize: 15, fontFace: "Calibri", color: integrations[i].color, bold: true, align: "center", margin: 0 });
			s.addText(integrations[i].sub, { x: cx + 0.15, y: 3.15, w: 2.55, h: 0.25,
				fontSize: 9, fontFace: "Calibri", color: C.dim, italic: true, align: "center", margin: 0 });

			s.addText(integrations[i].desc, { x: cx + 0.15, y: 3.5, w: 2.55, h: 0.7,
				fontSize: 10, fontFace: "Calibri", color: C.muted, align: "center", margin: 0 });

			s.addShape(pres.shapes.RECTANGLE, { x: cx + 0.15, y: 4.3, w: 2.55, h: 0.01, fill: { color: C.border } });
			s.addText(integrations[i].tools, { x: cx + 0.1, y: 4.4, w: 2.65, h: 0.4,
				fontSize: 7, fontFace: "Consolas", color: C.dim, align: "center", margin: 0 });
		}
		addSlideNumber(s, 6, 9);
	}

	// =======================================
	// SLIDE 7 — Competitive Landscape
	// =======================================
	{
		let s = pres.addSlide();
		s.background = { color: C.bg };
		s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.04, fill: { color: C.orange } });

		s.addText("LANDSCAPE", { x: 0.8, y: 0.35, w: 5, h: 0.4, fontSize: 10,
			fontFace: "Consolas", color: C.orange, charSpacing: 4, margin: 0 });
		s.addText("Nobody Owns This Layer", { x: 0.8, y: 0.75, w: 8, h: 0.55, fontSize: 28,
			fontFace: "Calibri", color: C.white, bold: true, margin: 0 });

		// Comparison table
		const header = ["Player", "Payment", "Privacy", "Agent SDK", "Ethereum"];
		const rows = [
			["x402 (Coinbase)", "Yes", "None", "Basic", "Yes"],
			["Railgun", "No", "ZK-SNARK", "None", "Yes"],
			["Aztec", "No", "Programmable", "None", "L2 only"],
			["NEAR Shade", "Yes", "TEE-based", "Native", "No"],
			["ERC-8004", "No", "No", "Identity only", "Yes"],
			["PAS", "Yes", "ZK (pluggable)", "Universal", "Yes"],
		];

		const colW = [1.8, 1.2, 1.4, 1.4, 1.0];
		const tableX = 0.8;
		const tableY = 1.4;
		const rowH = 0.42;

		// Header row
		let hx = tableX;
		for (let c = 0; c < header.length; c++) {
			s.addShape(pres.shapes.RECTANGLE, { x: hx, y: tableY, w: colW[c], h: rowH,
				fill: { color: C.bgCardAlt } });
			s.addText(header[c], { x: hx, y: tableY, w: colW[c], h: rowH,
				fontSize: 10, fontFace: "Consolas", color: C.orange, bold: true, align: "center", valign: "middle", margin: 0 });
			hx += colW[c];
		}

		// Data rows
		for (let r = 0; r < rows.length; r++) {
			let rx = tableX;
			const ry = tableY + (r + 1) * rowH;
			const isPAS = r === rows.length - 1;
			const rowBg = isPAS ? "1A1A2E" : (r % 2 === 0 ? C.bgCard : C.bg);

			for (let c = 0; c < rows[r].length; c++) {
				s.addShape(pres.shapes.RECTANGLE, { x: rx, y: ry, w: colW[c], h: rowH,
					fill: { color: rowBg }, line: isPAS ? { color: C.green, width: 0.75 } : undefined });

				let cellColor = C.muted;
				if (isPAS) cellColor = C.green;
				else if (rows[r][c] === "None" || rows[r][c] === "No") cellColor = "664444";
				else if (rows[r][c] === "Yes" || rows[r][c] === "Native") cellColor = "66AA66";

				s.addText(rows[r][c], { x: rx, y: ry, w: colW[c], h: rowH,
					fontSize: 10, fontFace: c === 0 ? "Calibri" : "Calibri",
					color: cellColor, bold: isPAS, align: "center", valign: "middle", margin: 0 });
				rx += colW[c];
			}
		}

		// PAS highlight label — positioned just right of table
		const badgeY = tableY + 6 * rowH;
		s.addShape(pres.shapes.RECTANGLE, { x: 7.7, y: badgeY, w: 1.3, h: rowH,
			fill: { color: C.green, transparency: 85 }, line: { color: C.green, width: 0.5 } });
		s.addText("THAT'S US", { x: 7.7, y: badgeY, w: 1.3, h: rowH,
			fontSize: 9, fontFace: "Consolas", color: C.green, align: "center", valign: "middle", margin: 0 });

		// Bottom insight
		s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 4.55, w: 8.4, h: 0.75,
			fill: { color: C.bgCard }, line: { color: C.orange, width: 0.5, transparency: 50 } });
		s.addText([
			{ text: "Key insight: ", options: { bold: true, color: C.orange, fontSize: 11 } },
			{ text: "Everyone is building pieces — payment rails, identity registries, privacy protocols, agent frameworks — but nobody is building the middleware that makes agents private by default across all of them.", options: { color: C.muted, fontSize: 11 } },
		], { x: 1.1, y: 4.55, w: 8.0, h: 0.75, fontFace: "Calibri", valign: "middle", margin: 0 });
		addSlideNumber(s, 7, 9);
	}

	// =======================================
	// SLIDE 8 — Revenue Model
	// =======================================
	{
		let s = pres.addSlide();
		s.background = { color: C.bg };
		s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.04, fill: { color: C.cyan } });

		s.addText("REVENUE", { x: 0.8, y: 0.35, w: 5, h: 0.4, fontSize: 10,
			fontFace: "Consolas", color: C.cyan, charSpacing: 4, margin: 0 });
		s.addText("Four Revenue Streams", { x: 0.8, y: 0.75, w: 8, h: 0.55, fontSize: 28,
			fontFace: "Calibri", color: C.white, bold: true, margin: 0 });

		const streams = [
			{ title: "Relay Fees", stat: "0.1-0.3%", desc: "Fee on each gasless shielded transaction, taken from the shielded amount. Paid in the transaction token (USDC, ETH, etc.).", icon: icons.percent, color: C.cyan },
			{ title: "Credential Minting", stat: "Per credential", desc: "Fee for creating and verifying ZK-provable credentials in the vault. Reputation, compliance, capability proofs.", icon: icons.stamp, color: C.purple },
			{ title: "Premium Policies", stat: "Subscription", desc: "Advanced policy templates for enterprises. Compliance packs, audit trails, multi-sig approval flows.", icon: icons.crown, color: C.pink },
			{ title: "Skill Pack Curation", stat: "Revenue share", desc: "Revenue share on curated privacy-audited skill bundles via OpenClaw marketplace integration.", icon: icons.boxes, color: C.orange },
		];

		for (let i = 0; i < 4; i++) {
			const col = i % 2;
			const row = Math.floor(i / 2);
			const cx = 0.8 + col * 4.4;
			const cy = 1.6 + row * 1.8;

			s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: 4.0, h: 1.55,
				fill: { color: C.bgCard }, line: { color: streams[i].color, width: 0.5, transparency: 60 }, shadow: makeShadow() });

			s.addImage({ data: streams[i].icon, x: cx + 0.25, y: cy + 0.2, w: 0.45, h: 0.45 });
			s.addText(streams[i].title, { x: cx + 0.85, y: cy + 0.12, w: 2.0, h: 0.3,
				fontSize: 14, fontFace: "Calibri", color: streams[i].color, bold: true, margin: 0 });
			s.addText(streams[i].stat, { x: cx + 0.85, y: cy + 0.42, w: 2.0, h: 0.25,
				fontSize: 10, fontFace: "Consolas", color: C.dim, margin: 0 });

			s.addText(streams[i].desc, { x: cx + 0.25, y: cy + 0.8, w: 3.5, h: 0.6,
				fontSize: 10, fontFace: "Calibri", color: C.muted, margin: 0 });
		}
		addSlideNumber(s, 8, 9);
	}

	// =======================================
	// SLIDE 9 — Status & Next Steps
	// =======================================
	{
		let s = pres.addSlide();
		s.background = { color: C.bg };
		s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.04, fill: { color: C.green } });

		s.addText("STATUS", { x: 0.8, y: 0.35, w: 5, h: 0.4, fontSize: 10,
			fontFace: "Consolas", color: C.green, charSpacing: 4, margin: 0 });
		s.addText("Where We Are & What's Next", { x: 0.8, y: 0.75, w: 8, h: 0.55, fontSize: 28,
			fontFace: "Calibri", color: C.white, bold: true, margin: 0 });

		// Status — NOW (card height 3.15 to fit 8 items at 0.30" spacing)
		s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.6, w: 4.0, h: 3.15,
			fill: { color: C.bgCard }, line: { color: C.green, width: 0.5, transparency: 50 }, shadow: makeShadow() });
		s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.6, w: 4.0, h: 0.45,
			fill: { color: C.green, transparency: 85 } });
		s.addText("BUILT (March 2026)", { x: 0.8, y: 1.6, w: 4.0, h: 0.45,
			fontSize: 11, fontFace: "Consolas", color: C.green, bold: true, align: "center", valign: "middle", margin: 0 });

		const done = [
			"Full monorepo scaffold (10 packages)",
			"Type definitions for all layers",
			"Core engine architecture",
			"SDK public API (PASClient)",
			"MCP server tool definitions",
			"3 privacy adapter stubs",
			"LangChain + CrewAI adapters",
			"Docusaurus docs site",
		];
		for (let i = 0; i < done.length; i++) {
			s.addText([
				{ text: "✓  ", options: { color: C.green, fontSize: 10 } },
				{ text: done[i], options: { color: C.muted, fontSize: 10 } },
			], { x: 1.05, y: 2.15 + i * 0.30, w: 3.5, h: 0.26, fontFace: "Calibri", margin: 0 });
		}

		// Status — NEXT (card height 3.15 to match)
		s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.6, w: 4.0, h: 3.15,
			fill: { color: C.bgCard }, line: { color: C.cyan, width: 0.5, transparency: 50 }, shadow: makeShadow() });
		s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.6, w: 4.0, h: 0.45,
			fill: { color: C.cyan, transparency: 85 } });
		s.addText("NEXT MILESTONES", { x: 5.2, y: 1.6, w: 4.0, h: 0.45,
			fontSize: 11, fontFace: "Consolas", color: C.cyan, bold: true, align: "center", valign: "middle", margin: 0 });

		const next = [
			"Railgun adapter implementation",
			"Policy engine with rule evaluation",
			"In-memory shielded treasury",
			"Stealth address derivation (ECDH)",
			"MCP server runtime",
			"Testnet deployment",
			"Aztec adapter (post-launch)",
			"Security audit",
		];
		for (let i = 0; i < next.length; i++) {
			s.addText([
				{ text: "→  ", options: { color: C.cyan, fontSize: 10 } },
				{ text: next[i], options: { color: C.muted, fontSize: 10 } },
			], { x: 5.45, y: 2.15 + i * 0.30, w: 3.5, h: 0.26, fontFace: "Calibri", margin: 0 });
		}

		// Bottom CTA (moved down to accommodate taller cards)
		s.addImage({ data: icons.rocket, x: 2.7, y: 5.0, w: 0.35, h: 0.35 });
		s.addText("The infrastructure for private AI agents doesn't exist yet. We're building it.", {
			x: 3.2, y: 5.0, w: 6, h: 0.4, fontSize: 13, fontFace: "Calibri", color: C.white, bold: true, valign: "middle", margin: 0 });
		addSlideNumber(s, 9, 9);
	}

	// Write file
	await pres.writeFile({ fileName: "C:/Projects/PAS/PAS-Overview.pptx" });
	console.log("Created: C:/Projects/PAS/PAS-Overview.pptx");
}

createDeck().catch(console.error);
