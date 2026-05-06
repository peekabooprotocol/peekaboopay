import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Nym SDK mock — simulates @nymproject/sdk so tests run without it installed
// ---------------------------------------------------------------------------

const mockMixFetch = vi.fn();
const mockStart = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn().mockResolvedValue(undefined);
const mockSelfAddress = vi.fn().mockReturnValue("nym1abc123xyz");

vi.mock("@nymproject/sdk", () => ({
	createNymMixnetClient: vi.fn().mockResolvedValue({
		client: {
			start: mockStart,
			stop: mockStop,
			selfAddress: mockSelfAddress,
			mixFetch: mockMixFetch,
		},
	}),
}));

// Import after mocks are in place
import {
	detectMode,
	DEFAULT_NYM_API_URL,
	DEFAULT_SOCKS5_HOST,
	DEFAULT_SOCKS5_PORT,
} from "../config.js";
import { createNymClient, getNymClient, type NymClient } from "../client.js";
import {
	createNymProvider,
	NymWrappedProvider,
	type NymProviderConfig,
	type NymProviderInfo,
} from "../provider.js";
import type { NymConfig } from "../config.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultMixFetchResponse(result: unknown = "0x1") {
	return {
		json: vi.fn().mockResolvedValue({ jsonrpc: "2.0", id: 1, result }),
		status: 200,
		headers: new Map(),
	};
}

// ---------------------------------------------------------------------------
// 1. Config
// ---------------------------------------------------------------------------

describe("Config", () => {
	it("exports correct default constants", () => {
		expect(DEFAULT_NYM_API_URL).toBe("https://validator.nymtech.net/api");
		expect(DEFAULT_SOCKS5_HOST).toBe("127.0.0.1");
		expect(DEFAULT_SOCKS5_PORT).toBe(1080);
	});

	it("detectMode returns 'mixfetch' when SDK is available", async () => {
		const mode = await detectMode();
		expect(mode).toBe("mixfetch");
	});
});

// ---------------------------------------------------------------------------
// 2. Client — mixFetch mode
// ---------------------------------------------------------------------------

describe("Client — mixFetch mode", () => {
	let client: NymClient;

	beforeEach(async () => {
		mockStart.mockClear();
		mockStop.mockClear();
		mockSelfAddress.mockClear().mockReturnValue("nym1abc123xyz");

		client = await createNymClient({ mode: "mixfetch" });
	});

	afterEach(async () => {
		await client.disconnect();
	});

	it("creates a mixfetch client", () => {
		expect(client.mode).toBe("mixfetch");
		expect(client.client).toBeTruthy();
	});

	it("starts the Nym SDK with the default API URL", () => {
		expect(mockStart).toHaveBeenCalledWith({
			nymApiUrl: DEFAULT_NYM_API_URL,
		});
	});

	it("starts with a custom API URL when provided", async () => {
		mockStart.mockClear();
		const c = await createNymClient({
			mode: "mixfetch",
			nymApiUrl: "https://custom.nym.api",
		});
		expect(mockStart).toHaveBeenCalledWith({
			nymApiUrl: "https://custom.nym.api",
		});
		await c.disconnect();
	});

	it("exposes the self-address from the Nym SDK", () => {
		expect(client.selfAddress).toBe("nym1abc123xyz");
	});

	it("has no socks5Url", () => {
		expect(client.socks5Url).toBeUndefined();
	});

	it("disconnect stops the SDK client", async () => {
		await client.disconnect();
		expect(mockStop).toHaveBeenCalled();
	});

	it("getNymClient returns null after disconnect", async () => {
		await client.disconnect();
		expect(getNymClient()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// 3. Client — SOCKS5 mode
// ---------------------------------------------------------------------------

describe("Client — SOCKS5 mode", () => {
	let client: NymClient;

	beforeEach(async () => {
		client = await createNymClient({ mode: "socks5" });
	});

	afterEach(async () => {
		await client.disconnect();
	});

	it("creates a socks5 client", () => {
		expect(client.mode).toBe("socks5");
	});

	it("has a null underlying client", () => {
		expect(client.client).toBeNull();
	});

	it("has a null selfAddress", () => {
		expect(client.selfAddress).toBeNull();
	});

	it("builds the default socks5Url", () => {
		expect(client.socks5Url).toBe("socks5://127.0.0.1:1080");
	});

	it("builds a custom socks5Url from config", async () => {
		const c = await createNymClient({
			mode: "socks5",
			socks5Host: "10.0.0.1",
			socks5Port: 9050,
		});
		expect(c.socks5Url).toBe("socks5://10.0.0.1:9050");
		await c.disconnect();
	});

	it("disconnect is a no-op that resolves", async () => {
		await expect(client.disconnect()).resolves.toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// 4. Client — auto mode
// ---------------------------------------------------------------------------

describe("Client — auto mode", () => {
	it("resolves to mixfetch when SDK is available", async () => {
		const client = await createNymClient({ mode: "auto" });
		expect(client.mode).toBe("mixfetch");
		await client.disconnect();
	});
});

// ---------------------------------------------------------------------------
// 5. getNymClient
// ---------------------------------------------------------------------------

describe("getNymClient", () => {
	it("returns the active client after creation", async () => {
		const client = await createNymClient({ mode: "socks5" });
		const active = getNymClient();
		expect(active).not.toBeNull();
		expect(active!.mode).toBe("socks5");
		await client.disconnect();
	});

	it("returns null before any client is created", async () => {
		// disconnect clears the singleton
		const client = await createNymClient({ mode: "socks5" });
		await client.disconnect();
		expect(getNymClient()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// 6. Provider — createNymProvider
// ---------------------------------------------------------------------------

describe("createNymProvider", () => {
	afterEach(async () => {
		const c = getNymClient();
		if (c) await c.disconnect();
	});

	it("creates a provider with mixfetch mode", async () => {
		const provider = await createNymProvider({
			rpcUrl: "https://rpc.example.com",
			chainId: 964,
			nym: { mode: "mixfetch" },
		});

		expect(provider).toBeInstanceOf(NymWrappedProvider);
		expect(provider.mode).toBe("mixfetch");
		expect(provider.chainId).toBe(964);
		expect(provider.rpcUrl).toBe("https://rpc.example.com");
		await provider.disconnect();
	});

	it("creates a provider with socks5 mode", async () => {
		const provider = await createNymProvider({
			rpcUrl: "https://rpc.example.com",
			chainId: 1,
			nym: { mode: "socks5" },
		});

		expect(provider).toBeInstanceOf(NymWrappedProvider);
		expect(provider.mode).toBe("socks5");
		await provider.disconnect();
	});

	it("creates a provider with auto mode (resolves to mixfetch)", async () => {
		const provider = await createNymProvider({
			rpcUrl: "https://rpc.example.com",
			chainId: 42161,
			nym: { mode: "auto" },
		});

		expect(provider.mode).toBe("mixfetch");
		await provider.disconnect();
	});

	it("defaults to auto mode when nym config is omitted", async () => {
		const provider = await createNymProvider({
			rpcUrl: "https://rpc.example.com",
			chainId: 1,
		});

		// SDK is mocked, so auto resolves to mixfetch
		expect(provider.mode).toBe("mixfetch");
		await provider.disconnect();
	});
});

// ---------------------------------------------------------------------------
// 7. NymWrappedProvider
// ---------------------------------------------------------------------------

describe("NymWrappedProvider", () => {
	let provider: NymWrappedProvider;

	describe("in mixFetch mode", () => {
		beforeEach(async () => {
			mockMixFetch.mockClear();
			mockMixFetch.mockResolvedValue(defaultMixFetchResponse("0x3c4"));

			provider = await createNymProvider({
				rpcUrl: "https://rpc.example.com",
				chainId: 964,
				nym: { mode: "mixfetch" },
			});
		});

		afterEach(async () => {
			await provider.disconnect();
		});

		it("send() routes through mixFetch", async () => {
			const result = await provider.send("eth_blockNumber", []);
			expect(result).toBe("0x3c4");
			expect(mockMixFetch).toHaveBeenCalledTimes(1);
		});

		it("send() passes method and params in the JSON-RPC body", async () => {
			mockMixFetch.mockResolvedValue(
				defaultMixFetchResponse("0xabc"),
			);

			await provider.send("eth_getBalance", [
				"0xdead",
				"latest",
			]);

			const [url, opts] = mockMixFetch.mock.calls[0];
			expect(url).toBe("https://rpc.example.com");
			const body = JSON.parse(opts.body);
			expect(body.method).toBe("eth_getBalance");
			expect(body.params).toEqual(["0xdead", "latest"]);
			expect(body.jsonrpc).toBe("2.0");
		});

		it("send() throws on RPC error response", async () => {
			mockMixFetch.mockResolvedValue({
				json: vi.fn().mockResolvedValue({
					jsonrpc: "2.0",
					id: 1,
					error: { code: -32600, message: "Invalid Request" },
				}),
				status: 200,
				headers: new Map(),
			});

			await expect(
				provider.send("bad_method", []),
			).rejects.toThrow("Invalid Request");
		});

		it("send() throws on mixFetch transport failure", async () => {
			mockMixFetch.mockRejectedValue(new Error("mixnet down"));

			await expect(
				provider.send("eth_blockNumber", []),
			).rejects.toThrow("mixnet down");
		});

		it("isNymActive() returns true", () => {
			expect(provider.isNymActive()).toBe(true);
		});

		it("getInfo() returns correct metadata", () => {
			const info = provider.getInfo();
			expect(info.mode).toBe("mixfetch");
			expect(info.rpcUrl).toBe("https://rpc.example.com");
			expect(info.chainId).toBe(964);
			expect(info.selfAddress).toBe("nym1abc123xyz");
			expect(info.active).toBe(true);
			expect(info.socks5Url).toBeUndefined();
		});

		it("getEthersProvider() returns the underlying JsonRpcProvider", () => {
			const base = provider.getEthersProvider();
			expect(base).toBe(provider.provider);
		});

		it("increments JSON-RPC id across calls", async () => {
			mockMixFetch.mockResolvedValue(defaultMixFetchResponse("0x1"));
			await provider.send("eth_chainId", []);

			mockMixFetch.mockResolvedValue(defaultMixFetchResponse("0x2"));
			await provider.send("eth_blockNumber", []);

			const body1 = JSON.parse(mockMixFetch.mock.calls[0][1].body);
			const body2 = JSON.parse(mockMixFetch.mock.calls[1][1].body);
			expect(body2.id).toBeGreaterThan(body1.id);
		});
	});

	describe("in SOCKS5 mode", () => {
		beforeEach(async () => {
			provider = await createNymProvider({
				rpcUrl: "https://rpc.example.com",
				chainId: 1,
				nym: { mode: "socks5" },
			});
		});

		afterEach(async () => {
			await provider.disconnect();
		});

		it("isNymActive() returns false", () => {
			expect(provider.isNymActive()).toBe(false);
		});

		it("getInfo() includes socks5Url", () => {
			const info = provider.getInfo();
			expect(info.mode).toBe("socks5");
			expect(info.socks5Url).toBe("socks5://127.0.0.1:1080");
			expect(info.active).toBe(false);
			expect(info.selfAddress).toBeNull();
		});

		it("getEthersProvider() returns the underlying provider", () => {
			expect(provider.getEthersProvider()).toBe(provider.provider);
		});
	});
});

// ---------------------------------------------------------------------------
// 8. SOCKS5 fallback when SDK import fails
// ---------------------------------------------------------------------------

describe("SOCKS5 fallback", () => {
	it("auto mode falls back to socks5 when SDK import throws", async () => {
		// Temporarily override the mock to simulate missing SDK
		const sdkMock = await import("@nymproject/sdk");
		const originalFn = (sdkMock as any).createNymMixnetClient;
		(sdkMock as any).createNymMixnetClient = vi.fn().mockRejectedValue(
			new Error("SDK not available"),
		);

		const client = await createNymClient({ mode: "auto" });
		expect(client.mode).toBe("socks5");
		await client.disconnect();

		// Restore
		(sdkMock as any).createNymMixnetClient = originalFn;
	});

	it("mixfetch mode throws when SDK import fails", async () => {
		const sdkMock = await import("@nymproject/sdk");
		const originalFn = (sdkMock as any).createNymMixnetClient;
		(sdkMock as any).createNymMixnetClient = vi.fn().mockRejectedValue(
			new Error("SDK not available"),
		);

		await expect(
			createNymClient({ mode: "mixfetch" }),
		).rejects.toThrow("Failed to create Nym mixFetch client");

		// Restore
		(sdkMock as any).createNymMixnetClient = originalFn;
	});
});

// ---------------------------------------------------------------------------
// 9. Integration — full flow
// ---------------------------------------------------------------------------

describe("Integration — full provider flow", () => {
	it("create provider -> send eth_chainId -> verify routed through mixFetch -> disconnect", async () => {
		mockMixFetch.mockClear();
		mockMixFetch.mockResolvedValue(
			defaultMixFetchResponse("0x3c4"), // chainId 964
		);

		// 1. Create
		const provider = await createNymProvider({
			rpcUrl: "https://lite.chain.opentensor.ai",
			chainId: 964,
			nym: { mode: "mixfetch" },
		});

		expect(provider.isNymActive()).toBe(true);

		// 2. Send
		const chainId = await provider.send("eth_chainId", []);
		expect(chainId).toBe("0x3c4");

		// 3. Verify mixFetch was used
		expect(mockMixFetch).toHaveBeenCalledTimes(1);
		const [url, opts] = mockMixFetch.mock.calls[0];
		expect(url).toBe("https://lite.chain.opentensor.ai");
		expect(opts.method).toBe("POST");
		expect(opts.headers["Content-Type"]).toBe("application/json");

		const body = JSON.parse(opts.body);
		expect(body.method).toBe("eth_chainId");
		expect(body.params).toEqual([]);

		// 4. Info snapshot
		const info = provider.getInfo();
		expect(info).toEqual({
			mode: "mixfetch",
			rpcUrl: "https://lite.chain.opentensor.ai",
			chainId: 964,
			selfAddress: "nym1abc123xyz",
			active: true,
		});

		// 5. Disconnect
		await provider.disconnect();
		expect(mockStop).toHaveBeenCalled();
	});

	it("create socks5 provider -> getInfo -> disconnect", async () => {
		const provider = await createNymProvider({
			rpcUrl: "https://rpc.example.com",
			chainId: 1,
			nym: { mode: "socks5", socks5Host: "10.0.0.5", socks5Port: 9050 },
		});

		expect(provider.isNymActive()).toBe(false);

		const info = provider.getInfo();
		expect(info.mode).toBe("socks5");
		expect(info.socks5Url).toBe("socks5://10.0.0.5:9050");
		expect(info.selfAddress).toBeNull();

		await provider.disconnect();
	});
});
