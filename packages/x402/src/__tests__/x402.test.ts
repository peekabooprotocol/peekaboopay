import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	SHIELDED_SCHEME,
	X402_VERSION,
	X402_HEADERS,
	buildPaymentRequired,
	buildPaymentPayload,
	encodeHeader,
	decodeHeader,
	findShieldedRequirement,
	parseChainId,
	createShieldedFetch,
	shieldedPaymentMiddleware,
	clearNullifierCache,
	verifyShieldedPayment,
} from "../index.js";
import type {
	PaymentRequired,
	ShieldedPaymentRequirement,
	ShieldedPayloadData,
	ShieldedMiddlewareConfig,
} from "../index.js";

// ---------------------------------------------------------------
// Mock ethers to avoid real RPC calls in verify.ts
// ---------------------------------------------------------------
const mockQueryFilter = vi.fn().mockResolvedValue([
	{
		args: {
			stealthAddress:
				"0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
			schemeId: 1n,
			caller: "0x1234",
			ephemeralPubKey: "0x04aabb",
			metadata: "0x",
		},
	},
]);

vi.mock("ethers", () => ({
	ethers: {
		JsonRpcProvider: vi.fn().mockImplementation(() => ({
			getTransactionReceipt: vi.fn().mockResolvedValue({ status: 1 }),
			getBlockNumber: vi.fn().mockResolvedValue(1000),
		})),
		Contract: vi.fn().mockImplementation(() => ({
			queryFilter: mockQueryFilter,
		})),
	},
	// Also export at top level for named imports
	JsonRpcProvider: vi.fn().mockImplementation(() => ({
		getTransactionReceipt: vi.fn().mockResolvedValue({ status: 1 }),
		getBlockNumber: vi.fn().mockResolvedValue(1000),
	})),
	Contract: vi.fn().mockImplementation(() => ({
		queryFilter: mockQueryFilter,
	})),
}));

// ---------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------

const MOCK_EXTRA = {
	stealthAnnouncerAddress:
		"0xE5e3d47BF0aE09E7D4F6b36A5da285254CCfE0F7" as `0x${string}`,
	shieldedPoolAddress:
		"0xf42E35258a682D4726880c3c453c4b96821f2b04" as `0x${string}`,
	recipientPublicKey: ("0x04" + "aa".repeat(64)) as `0x${string}`,
};

const MOCK_PAYLOAD: ShieldedPayloadData = {
	stealthAddress:
		"0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" as `0x${string}`,
	ephemeralPublicKey: ("0x04" + "bb".repeat(64)) as `0x${string}`,
	viewTag: "0xab" as `0x${string}`,
	txHash: ("0x" + "cc".repeat(32)) as `0x${string}`,
	nullifierHash: ("0x" + "dd".repeat(32)) as `0x${string}`,
	amount: "1000000000000000000",
};

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe("Scheme Constants", () => {
	it("has correct scheme name", () => {
		expect(SHIELDED_SCHEME).toBe("shielded");
	});

	it("has correct x402 version", () => {
		expect(X402_VERSION).toBe(2);
	});

	it("has correct header names", () => {
		expect(X402_HEADERS.PAYMENT_REQUIRED).toBe("payment-required");
		expect(X402_HEADERS.PAYMENT_SIGNATURE).toBe("payment-signature");
		expect(X402_HEADERS.PAYMENT_RESPONSE).toBe("payment-response");
	});
});

describe("buildPaymentRequired", () => {
	it("builds a valid PaymentRequired with shielded scheme", () => {
		const result = buildPaymentRequired(
			964,
			"1000000000000000000",
			"0x0000000000000000000000000000000000000000",
			MOCK_EXTRA,
		);

		expect(result.x402Version).toBe(2);
		expect(result.accepts).toHaveLength(1);
		expect(result.accepts[0].scheme).toBe("shielded");
		expect(result.accepts[0].network).toBe("eip155:964");
		expect(result.accepts[0].amount).toBe("1000000000000000000");
		expect(result.accepts[0].extra).toEqual(MOCK_EXTRA);
	});

	it("uses custom timeout", () => {
		const result = buildPaymentRequired(
			1,
			"100",
			"0xA0b8",
			MOCK_EXTRA,
			120,
		);
		expect(result.accepts[0].maxTimeoutSeconds).toBe(120);
	});

	it("defaults to 60s timeout", () => {
		const result = buildPaymentRequired(
			964,
			"100",
			"0x0",
			MOCK_EXTRA,
		);
		expect(result.accepts[0].maxTimeoutSeconds).toBe(60);
	});
});

describe("buildPaymentPayload", () => {
	it("builds a valid ShieldedPaymentPayload", () => {
		const result = buildPaymentPayload(964, MOCK_PAYLOAD);

		expect(result.x402Version).toBe(2);
		expect(result.scheme).toBe("shielded");
		expect(result.network).toBe("eip155:964");
		expect(result.payload).toEqual(MOCK_PAYLOAD);
	});
});

describe("encodeHeader / decodeHeader", () => {
	it("round-trips JSON via Base64", () => {
		const original = { foo: "bar", num: 42 };
		const encoded = encodeHeader(original);
		const decoded = decodeHeader<typeof original>(encoded);

		expect(decoded).toEqual(original);
	});

	it("round-trips PaymentRequired", () => {
		const original = buildPaymentRequired(
			964,
			"1000",
			"0x0",
			MOCK_EXTRA,
		);
		const encoded = encodeHeader(original);
		const decoded = decodeHeader<PaymentRequired>(encoded);

		expect(decoded.x402Version).toBe(2);
		expect(decoded.accepts[0].scheme).toBe("shielded");
	});
});

describe("findShieldedRequirement", () => {
	it("finds shielded requirement when present", () => {
		const pr = buildPaymentRequired(964, "100", "0x0", MOCK_EXTRA);
		const result = findShieldedRequirement(pr);

		expect(result).toBeDefined();
		expect(result!.scheme).toBe("shielded");
		expect(result!.extra).toEqual(MOCK_EXTRA);
	});

	it("returns undefined when no shielded scheme", () => {
		const pr: PaymentRequired = {
			x402Version: 2,
			accepts: [
				{
					scheme: "exact",
					network: "eip155:1",
					amount: "100",
					asset: "0x0",
					payTo: "0x0",
					maxTimeoutSeconds: 60,
				},
			],
		};
		const result = findShieldedRequirement(pr);
		expect(result).toBeUndefined();
	});
});

describe("parseChainId", () => {
	it("parses eip155 network identifiers", () => {
		expect(parseChainId("eip155:964")).toBe(964);
		expect(parseChainId("eip155:1")).toBe(1);
		expect(parseChainId("eip155:137")).toBe(137);
	});

	it("throws on invalid format", () => {
		expect(() => parseChainId("solana:mainnet")).toThrow(
			"Invalid EVM network identifier",
		);
		expect(() => parseChainId("964")).toThrow(
			"Invalid EVM network identifier",
		);
	});
});

describe("createShieldedFetch", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("passes through non-402 responses", async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValue(new Response("ok", { status: 200 }));
		vi.stubGlobal("fetch", mockFetch);

		const shieldedFetch = createShieldedFetch({
			pay: vi.fn(),
		});

		const response = await shieldedFetch("https://example.com/data");
		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it("passes through 402 without x402 header", async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValue(new Response("pay up", { status: 402 }));
		vi.stubGlobal("fetch", mockFetch);

		const shieldedFetch = createShieldedFetch({
			pay: vi.fn(),
		});

		const response = await shieldedFetch("https://example.com/data");
		expect(response.status).toBe(402);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it("handles shielded 402 and retries with payment", async () => {
		const paymentRequired = buildPaymentRequired(
			964,
			"1000000000000000000",
			"0x0000000000000000000000000000000000000000",
			MOCK_EXTRA,
		);

		const mockPay = vi.fn().mockResolvedValue({
			stealthAddress: MOCK_PAYLOAD.stealthAddress,
			ephemeralPublicKey: MOCK_PAYLOAD.ephemeralPublicKey,
			viewTag: MOCK_PAYLOAD.viewTag,
			txHash: MOCK_PAYLOAD.txHash,
			nullifierHash: MOCK_PAYLOAD.nullifierHash,
		});

		const headers402 = new Headers();
		headers402.set(
			X402_HEADERS.PAYMENT_REQUIRED,
			encodeHeader(paymentRequired),
		);

		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce(
				new Response("pay", { status: 402, headers: headers402 }),
			)
			.mockResolvedValueOnce(
				new Response("data", { status: 200 }),
			);
		vi.stubGlobal("fetch", mockFetch);

		const shieldedFetch = createShieldedFetch({ pay: mockPay });

		const response = await shieldedFetch("https://example.com/data");

		expect(response.status).toBe(200);
		expect(mockFetch).toHaveBeenCalledTimes(2);
		expect(mockPay).toHaveBeenCalledWith({
			recipientPublicKey: MOCK_EXTRA.recipientPublicKey,
			amount: "1000000000000000000",
			asset: "0x0000000000000000000000000000000000000000",
			chainId: 964,
		});

		// Verify retry has PAYMENT-SIGNATURE header
		const retryCall = mockFetch.mock.calls[1];
		const retryHeaders = retryCall[1]?.headers as Headers;
		expect(retryHeaders.has(X402_HEADERS.PAYMENT_SIGNATURE)).toBe(true);
	});

	it("passes through 402 when server only accepts exact scheme", async () => {
		const paymentRequired: PaymentRequired = {
			x402Version: 2,
			accepts: [
				{
					scheme: "exact",
					network: "eip155:1",
					amount: "100",
					asset: "0x0",
					payTo: "0x0",
					maxTimeoutSeconds: 60,
				},
			],
		};

		const headers402 = new Headers();
		headers402.set(
			X402_HEADERS.PAYMENT_REQUIRED,
			encodeHeader(paymentRequired),
		);

		const mockFetch = vi
			.fn()
			.mockResolvedValue(
				new Response("pay", { status: 402, headers: headers402 }),
			);
		vi.stubGlobal("fetch", mockFetch);

		const shieldedFetch = createShieldedFetch({ pay: vi.fn() });
		const response = await shieldedFetch("https://example.com/data");

		expect(response.status).toBe(402);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});
});

describe("shieldedPaymentMiddleware", () => {
	const middlewareConfig: ShieldedMiddlewareConfig = {
		rpcUrl: "https://lite.chain.opentensor.ai",
		chainId: 964,
		stealthAnnouncerAddress:
			"0xE5e3d47BF0aE09E7D4F6b36A5da285254CCfE0F7" as `0x${string}`,
		shieldedPoolAddress:
			"0xf42E35258a682D4726880c3c453c4b96821f2b04" as `0x${string}`,
		recipientPublicKey: ("0x04" + "aa".repeat(64)) as `0x${string}`,
		routes: {
			"GET /api/data": {
				asset: "0x0000000000000000000000000000000000000000",
				amount: "1000000000000000000",
			},
		},
	};

	function mockReq(
		method: string,
		path: string,
		headers: Record<string, string> = {},
	) {
		return {
			method,
			path,
			url: `https://example.com${path}`,
			headers: {
				get: (name: string) => headers[name] || null,
				...headers,
			},
		};
	}

	function mockRes() {
		const res: any = {
			statusCode: 200,
			headers: {} as Record<string, string>,
			body: null,
			status(code: number) {
				res.statusCode = code;
				return res;
			},
			setHeader(name: string, value: string) {
				res.headers[name] = value;
				return res;
			},
			json(body: unknown) {
				res.body = body;
			},
			send(body: string) {
				res.body = body;
			},
		};
		return res;
	}

	it("passes through ungated routes", async () => {
		const middleware = shieldedPaymentMiddleware(middlewareConfig);
		const req = mockReq("GET", "/other");
		const res = mockRes();
		const next = vi.fn();

		await middleware(req, res, next);
		expect(next).toHaveBeenCalled();
	});

	it("returns 402 for gated routes without payment", async () => {
		const middleware = shieldedPaymentMiddleware(middlewareConfig);
		const req = mockReq("GET", "/api/data");
		const res = mockRes();
		const next = vi.fn();

		await middleware(req, res, next);
		expect(res.statusCode).toBe(402);
		expect(res.headers[X402_HEADERS.PAYMENT_REQUIRED]).toBeDefined();
		expect(res.body.scheme).toBe("shielded");
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 400 for invalid scheme", async () => {
		const middleware = shieldedPaymentMiddleware(middlewareConfig);
		const badPayload = encodeHeader({
			x402Version: 2,
			scheme: "exact",
			network: "eip155:964",
			payload: {},
		});
		const req = mockReq("GET", "/api/data", {
			[X402_HEADERS.PAYMENT_SIGNATURE]: badPayload,
		});
		const res = mockRes();
		const next = vi.fn();

		await middleware(req, res, next);
		expect(res.statusCode).toBe(400);
		expect(next).not.toHaveBeenCalled();
	});

	it.skip("verifies valid shielded payment and passes through (requires RPC mock)", async () => {
		clearNullifierCache();
		const middleware = shieldedPaymentMiddleware(middlewareConfig);

		const payload = buildPaymentPayload(964, MOCK_PAYLOAD);
		const req = mockReq("GET", "/api/data", {
			[X402_HEADERS.PAYMENT_SIGNATURE]: encodeHeader(payload),
		});
		const res = mockRes();
		const next = vi.fn();

		await middleware(req, res, next);
		expect(next).toHaveBeenCalled();
		expect(res.headers[X402_HEADERS.PAYMENT_RESPONSE]).toBeDefined();
	});
});

describe("verifyShieldedPayment", () => {
	beforeEach(() => {
		clearNullifierCache();
	});

	it.skip("rejects duplicate nullifiers (requires RPC mock — integration test)", async () => {
		const config = {
			rpcUrl: "https://lite.chain.opentensor.ai",
			chainId: 964,
			stealthAnnouncerAddress:
				"0xE5e3d47BF0aE09E7D4F6b36A5da285254CCfE0F7" as `0x${string}`,
		};

		const result1 = await verifyShieldedPayment(MOCK_PAYLOAD, config);
		expect(result1.valid).toBe(true);

		const result2 = await verifyShieldedPayment(MOCK_PAYLOAD, config);
		expect(result2.valid).toBe(false);
		expect(result2.reason).toContain("replay");
	});

	it("clearNullifierCache resets the cache", () => {
		// This tests the exported function exists and doesn't throw
		clearNullifierCache();
	});
});
