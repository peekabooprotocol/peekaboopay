import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock Lit SDK packages ---

const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn().mockResolvedValue(undefined);
const mockExecuteJs = vi.fn().mockResolvedValue({
  response: JSON.stringify({
    id: "wrapped-key-123",
    pkpAddress: "0xPKPAddress",
    generatedPublicKey: "0xGeneratedPub",
  }),
});

vi.mock("@lit-protocol/lit-node-client", () => ({
  LitNodeClient: vi.fn().mockImplementation((opts: any) => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    executeJs: mockExecuteJs,
    config: opts,
  })),
}));

const mockInit = vi.fn().mockResolvedValue(undefined);
const mockWalletConnect = vi.fn().mockReturnThis();
const mockGetAddress = vi
  .fn()
  .mockResolvedValue("0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef");

vi.mock("@lit-protocol/pkp-ethers", () => ({
  PKPEthersWallet: vi.fn().mockImplementation(() => ({
    init: mockInit,
    connect: mockWalletConnect,
    getAddress: mockGetAddress,
  })),
}));

// --- Import modules under test (after mocks) ---

import {
  createLitClient,
  getLitClient,
  disconnectLit,
  _resetLitClient,
} from "../client.js";
import { createPKPSigner, pkpToAddress } from "../pkp-signer.js";
import {
  wrapPrivateKey,
  signWithWrappedKey,
  generateWrappedKey,
} from "../wrapped-keys.js";
import { createPolicyAction, describeLitPolicy } from "../policies.js";
import type { LitPolicy } from "../policies.js";
import { SHIELD_ACTION, UNSHIELD_ACTION, TRANSFER_ACTION } from "../actions.js";

// ============================================================
// 1. Lit Client
// ============================================================

describe("Lit Client", () => {
  beforeEach(() => {
    _resetLitClient();
    vi.clearAllMocks();
  });

  it("creates and connects a Lit client", async () => {
    const client = await createLitClient({
      network: "datil-test",
      debug: false,
    });
    expect(client).toBeDefined();
    expect(mockConnect).toHaveBeenCalledOnce();
  });

  it("returns the same client on subsequent calls (singleton)", async () => {
    const a = await createLitClient({ network: "datil-test" });
    const b = await createLitClient({ network: "datil-test" });
    expect(a).toBe(b);
    // connect should only be called once
    expect(mockConnect).toHaveBeenCalledOnce();
  });

  it("getLitClient throws before initialization", () => {
    expect(() => getLitClient()).toThrow(
      "Lit client not initialized. Call createLitClient() first.",
    );
  });

  it("getLitClient returns client after initialization", async () => {
    await createLitClient({ network: "datil-test" });
    const client = getLitClient();
    expect(client).toBeDefined();
    expect(client.config.litNetwork).toBe("datil-test");
  });

  it("disconnects and clears the client", async () => {
    await createLitClient({ network: "datil-test" });
    await disconnectLit();
    expect(mockDisconnect).toHaveBeenCalledOnce();
    expect(() => getLitClient()).toThrow();
  });

  it("disconnect is safe to call when no client exists", async () => {
    // Should not throw
    await disconnectLit();
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it("passes debug flag to LitNodeClient", async () => {
    const client = await createLitClient({
      network: "datil",
      debug: true,
    });
    expect(client.config.debug).toBe(true);
  });

  it("accepts all valid network values", async () => {
    for (const network of ["datil-test", "datil", "datil-dev"] as const) {
      _resetLitClient();
      vi.clearAllMocks();
      const client = await createLitClient({ network });
      expect(client.config.litNetwork).toBe(network);
    }
  });
});

// ============================================================
// 2. PKP Signer
// ============================================================

describe("PKP Signer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseCfg = {
    litClient: { connected: true },
    pkpPublicKey:
      "0x04abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
    authSig: { sig: "0xmockSig", derivedVia: "web3.eth.personal.sign" },
  };

  it("creates a PKP signer", async () => {
    const signer = await createPKPSigner(baseCfg);
    expect(signer).toBeDefined();
    expect(mockInit).toHaveBeenCalledOnce();
  });

  it("connects provider when provided", async () => {
    const mockProvider = {} as any;
    const signer = await createPKPSigner({
      ...baseCfg,
      provider: mockProvider,
    });
    expect(signer).toBeDefined();
    expect(mockWalletConnect).toHaveBeenCalledWith(mockProvider);
  });

  it("does not call connect when no provider given", async () => {
    await createPKPSigner(baseCfg);
    expect(mockWalletConnect).not.toHaveBeenCalled();
  });

  it("wraps errors with descriptive message", async () => {
    mockInit.mockRejectedValueOnce(new Error("network timeout"));
    await expect(createPKPSigner(baseCfg)).rejects.toThrow(
      "Failed to create PKP signer: network timeout",
    );
  });

  it("pkpToAddress derives correct address from public key", () => {
    // Use a known uncompressed public key
    const pubKey =
      "0x04e68acfc0253a10620dff706b0a1b1f1f5833ea3beb3bde2250d5f271f3563606672ebc45e0b7ea2e816ecb70ca03137b1c9476eec63d4632e990020b7b6fba39";
    const addr = pkpToAddress(pubKey);
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("pkpToAddress returns checksummed address", () => {
    const pubKey =
      "0x04e68acfc0253a10620dff706b0a1b1f1f5833ea3beb3bde2250d5f271f3563606672ebc45e0b7ea2e816ecb70ca03137b1c9476eec63d4632e990020b7b6fba39";
    const addr = pkpToAddress(pubKey);
    // ethers always returns EIP-55 checksummed addresses
    expect(addr).not.toBe(addr.toLowerCase());
  });
});

// ============================================================
// 3. Wrapped Keys
// ============================================================

describe("Wrapped Keys", () => {
  const mockClient = {
    executeJs: mockExecuteJs,
  };
  const mockAuth = { sig: "0xauth", derivedVia: "web3.eth.personal.sign" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteJs.mockResolvedValue({
      response: JSON.stringify({
        id: "wrapped-key-123",
        pkpAddress: "0xPKPAddress",
        generatedPublicKey: "0xGeneratedPub",
      }),
    });
  });

  describe("wrapPrivateKey", () => {
    it("wraps a private key and returns result", async () => {
      const result = await wrapPrivateKey(
        mockClient,
        "0xdeadbeefdeadbeef",
        mockAuth,
      );
      expect(result.id).toBe("wrapped-key-123");
      expect(result.pkpAddress).toBe("0xPKPAddress");
      expect(result.generatedPublicKey).toBe("0xGeneratedPub");
    });

    it("calls executeJs with correct parameters", async () => {
      await wrapPrivateKey(mockClient, "0xprivkey", mockAuth);
      expect(mockExecuteJs).toHaveBeenCalledOnce();
      const call = mockExecuteJs.mock.calls[0][0];
      expect(call.authSig).toBe(mockAuth);
      expect(call.jsParams.privateKeyParam).toBe("0xprivkey");
      expect(call.code).toContain("importPrivateKey");
    });

    it("throws descriptive error on failure", async () => {
      mockExecuteJs.mockRejectedValueOnce(new Error("auth failed"));
      await expect(
        wrapPrivateKey(mockClient, "0xkey", mockAuth),
      ).rejects.toThrow("Failed to wrap private key: auth failed");
    });
  });

  describe("signWithWrappedKey", () => {
    it("signs a transaction with a wrapped key", async () => {
      mockExecuteJs.mockResolvedValueOnce({
        response: '"0xsignedtx"',
      });
      const sig = await signWithWrappedKey(
        mockClient,
        "key-id",
        { to: "0x123", value: "1000" },
        mockAuth,
      );
      expect(sig).toBe('"0xsignedtx"');
    });

    it("passes chain parameter to executeJs", async () => {
      mockExecuteJs.mockResolvedValueOnce({ response: '"0xsig"' });
      await signWithWrappedKey(
        mockClient,
        "key-id",
        { to: "0x123" },
        mockAuth,
        "bittensor",
      );
      const call = mockExecuteJs.mock.calls[0][0];
      expect(call.jsParams.chainParam).toBe("bittensor");
    });

    it("defaults chain to ethereum", async () => {
      mockExecuteJs.mockResolvedValueOnce({ response: '"0xsig"' });
      await signWithWrappedKey(
        mockClient,
        "key-id",
        { to: "0x123" },
        mockAuth,
      );
      const call = mockExecuteJs.mock.calls[0][0];
      expect(call.jsParams.chainParam).toBe("ethereum");
    });

    it("throws descriptive error on failure", async () => {
      mockExecuteJs.mockRejectedValueOnce(new Error("decrypt failed"));
      await expect(
        signWithWrappedKey(mockClient, "key-id", {}, mockAuth),
      ).rejects.toThrow("Failed to sign with wrapped key: decrypt failed");
    });
  });

  describe("generateWrappedKey", () => {
    it("generates a new wrapped key", async () => {
      const result = await generateWrappedKey(mockClient, mockAuth);
      expect(result.id).toBe("wrapped-key-123");
      expect(result.pkpAddress).toBe("0xPKPAddress");
      expect(result.generatedPublicKey).toBe("0xGeneratedPub");
    });

    it("calls executeJs with generateEncryptedKey code", async () => {
      await generateWrappedKey(mockClient, mockAuth);
      const call = mockExecuteJs.mock.calls[0][0];
      expect(call.code).toContain("generateEncryptedKey");
      expect(call.authSig).toBe(mockAuth);
    });

    it("throws descriptive error on failure", async () => {
      mockExecuteJs.mockRejectedValueOnce(new Error("quota exceeded"));
      await expect(generateWrappedKey(mockClient, mockAuth)).rejects.toThrow(
        "Failed to generate wrapped key: quota exceeded",
      );
    });
  });
});

// ============================================================
// 4. Policies
// ============================================================

describe("Policies", () => {
  describe("createPolicyAction", () => {
    it("returns valid JavaScript string for empty policy", () => {
      const action = createPolicyAction({});
      expect(typeof action).toBe("string");
      expect(action).toContain("JSON.parse(params)");
      expect(action).toContain("signAndCombineEcdsa");
    });

    it("includes max amount check", () => {
      const action = createPolicyAction({
        maxAmountPerTx: "1000000000000000000",
      });
      expect(action).toContain("1000000000000000000");
      expect(action).toContain("exceeds max amount per tx");
    });

    it("includes allowed recipients whitelist", () => {
      const action = createPolicyAction({
        allowedRecipients: ["0xAlice", "0xBob"],
      });
      expect(action).toContain("0xalice");
      expect(action).toContain("0xbob");
      expect(action).toContain("not in whitelist");
    });

    it("lowercases recipient addresses in whitelist", () => {
      const action = createPolicyAction({
        allowedRecipients: ["0xABCDEF"],
      });
      expect(action).toContain("0xabcdef");
    });

    it("includes blocked recipients denylist", () => {
      const action = createPolicyAction({
        blockedRecipients: ["0xEvil"],
      });
      expect(action).toContain("0xevil");
      expect(action).toContain("Recipient is blocked");
    });

    it("includes allowed chains check", () => {
      const action = createPolicyAction({
        allowedChains: [1, 964, 137],
      });
      expect(action).toContain("[1,964,137]");
      expect(action).toContain("Chain not allowed");
    });

    it("includes expiration check", () => {
      const expiresAt = 1700000000;
      const action = createPolicyAction({ expiresAt });
      expect(action).toContain(String(expiresAt));
      expect(action).toContain("Policy has expired");
    });

    it("combines multiple policy checks", () => {
      const action = createPolicyAction({
        maxAmountPerTx: "500000",
        allowedRecipients: ["0xAlice"],
        allowedChains: [1],
        expiresAt: 1700000000,
      });
      expect(action).toContain("exceeds max amount per tx");
      expect(action).toContain("not in whitelist");
      expect(action).toContain("Chain not allowed");
      expect(action).toContain("Policy has expired");
    });

    it("always includes signing step", () => {
      const action = createPolicyAction({ maxAmountPerTx: "100" });
      expect(action).toContain("peekabooPolicySig");
      expect(action).toContain("policyEnforced");
    });
  });

  describe("describeLitPolicy", () => {
    it("returns 'No restrictions' for empty policy", () => {
      expect(describeLitPolicy({})).toBe("No restrictions");
    });

    it("describes max per tx", () => {
      expect(describeLitPolicy({ maxAmountPerTx: "1000" })).toContain(
        "Max per tx: 1000 wei",
      );
    });

    it("describes max daily", () => {
      expect(describeLitPolicy({ maxDailyAmount: "5000" })).toContain(
        "Max daily: 5000 wei",
      );
    });

    it("describes whitelist count", () => {
      const desc = describeLitPolicy({
        allowedRecipients: ["0xA", "0xB", "0xC"],
      });
      expect(desc).toContain("Whitelist: 3 addresses");
    });

    it("describes denylist count", () => {
      const desc = describeLitPolicy({ blockedRecipients: ["0xEvil"] });
      expect(desc).toContain("Denylist: 1 addresses");
    });

    it("describes allowed chains", () => {
      const desc = describeLitPolicy({ allowedChains: [1, 964] });
      expect(desc).toContain("Chains: 1, 964");
    });

    it("describes cooldown", () => {
      const desc = describeLitPolicy({ cooldownSeconds: 60 });
      expect(desc).toContain("Cooldown: 60s");
    });

    it("describes expiration as ISO string", () => {
      const desc = describeLitPolicy({ expiresAt: 1700000000 });
      expect(desc).toContain("Expires:");
      expect(desc).toContain("2023-11-14");
    });

    it("joins multiple constraints with pipe separator", () => {
      const desc = describeLitPolicy({
        maxAmountPerTx: "100",
        allowedChains: [1],
        cooldownSeconds: 30,
      });
      expect(desc).toBe(
        "Max per tx: 100 wei | Chains: 1 | Cooldown: 30s",
      );
    });
  });
});

// ============================================================
// 5. Pre-built Actions
// ============================================================

describe("Pre-built Actions", () => {
  it("SHIELD_ACTION is a non-empty string", () => {
    expect(typeof SHIELD_ACTION).toBe("string");
    expect(SHIELD_ACTION.length).toBeGreaterThan(0);
  });

  it("SHIELD_ACTION contains shield-specific logic", () => {
    expect(SHIELD_ACTION).toContain("Shield amount exceeds maximum");
    expect(SHIELD_ACTION).toContain("shieldSig");
    expect(SHIELD_ACTION).toContain('action: "shield"');
  });

  it("UNSHIELD_ACTION is a non-empty string", () => {
    expect(typeof UNSHIELD_ACTION).toBe("string");
    expect(UNSHIELD_ACTION.length).toBeGreaterThan(0);
  });

  it("UNSHIELD_ACTION contains withdrawal-specific logic", () => {
    expect(UNSHIELD_ACTION).toContain("Withdrawal exceeds daily limit");
    expect(UNSHIELD_ACTION).toContain("Cooldown active");
    expect(UNSHIELD_ACTION).toContain("unshieldSig");
    expect(UNSHIELD_ACTION).toContain('action: "unshield"');
  });

  it("TRANSFER_ACTION is a non-empty string", () => {
    expect(typeof TRANSFER_ACTION).toBe("string");
    expect(TRANSFER_ACTION.length).toBeGreaterThan(0);
  });

  it("TRANSFER_ACTION contains transfer-specific logic", () => {
    expect(TRANSFER_ACTION).toContain("Recipient not in whitelist");
    expect(TRANSFER_ACTION).toContain("transferSig");
    expect(TRANSFER_ACTION).toContain('action: "transfer"');
  });

  it("all actions parse params from JSON", () => {
    for (const action of [SHIELD_ACTION, UNSHIELD_ACTION, TRANSFER_ACTION]) {
      expect(action).toContain("JSON.parse(params)");
    }
  });

  it("all actions call signAndCombineEcdsa", () => {
    for (const action of [SHIELD_ACTION, UNSHIELD_ACTION, TRANSFER_ACTION]) {
      expect(action).toContain("Lit.Actions.signAndCombineEcdsa");
    }
  });

  it("all actions set a response", () => {
    for (const action of [SHIELD_ACTION, UNSHIELD_ACTION, TRANSFER_ACTION]) {
      expect(action).toContain("Lit.Actions.setResponse");
    }
  });

  it("all actions are self-invoking async functions", () => {
    for (const action of [SHIELD_ACTION, UNSHIELD_ACTION, TRANSFER_ACTION]) {
      expect(action).toContain("(async ()");
      expect(action.trim()).toMatch(/\)\(\)$/);
    }
  });
});
