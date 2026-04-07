import { describe, it, expect } from "vitest";
import {
	RailgunErrorCode,
	toSuccess,
	toFailure,
	mapRailgunError,
} from "../errors";

describe("errors", () => {
	describe("toSuccess", () => {
		it("wraps data in success result", () => {
			const result = toSuccess({ txHash: "0x123" });
			expect(result).toEqual({ success: true, data: { txHash: "0x123" } });
		});

		it("works with primitive values", () => {
			expect(toSuccess(42n)).toEqual({ success: true, data: 42n });
		});
	});

	describe("toFailure", () => {
		it("wraps error in failure result", () => {
			const result = toFailure("CODE", "message");
			expect(result).toEqual({
				success: false,
				error: { code: "CODE", message: "message", details: undefined },
			});
		});

		it("includes details when provided", () => {
			const result = toFailure("CODE", "msg", { extra: true });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.details).toEqual({ extra: true });
			}
		});
	});

	describe("mapRailgunError", () => {
		it("maps 'not initialized' errors", () => {
			const err = new Error("Engine not initialized");
			const mapped = mapRailgunError(err, "shield");
			expect(mapped.code).toBe(RailgunErrorCode.NOT_INITIALIZED);
		});

		it("maps 'not loaded' errors", () => {
			const err = new Error("Wallet not loaded");
			const mapped = mapRailgunError(err, "transfer");
			expect(mapped.code).toBe(RailgunErrorCode.NOT_INITIALIZED);
		});

		it("maps artifact errors", () => {
			const err = new Error("Failed to load snark artifacts");
			const mapped = mapRailgunError(err, "proof");
			expect(mapped.code).toBe(RailgunErrorCode.ARTIFACT_LOAD_FAILED);
		});

		it("maps balance errors", () => {
			const err = new Error("insufficient balance for transfer");
			const mapped = mapRailgunError(err, "transfer");
			expect(mapped.code).toBe(RailgunErrorCode.BALANCE_SCAN_FAILED);
		});

		it("uses context-based code for unknown errors", () => {
			const err = new Error("Something unexpected");
			const mapped = mapRailgunError(err, "shield");
			expect(mapped.code).toBe("RAILGUN_SHIELD_FAILED");
			expect(mapped.message).toBe("Something unexpected");
		});

		it("handles non-Error objects", () => {
			const mapped = mapRailgunError("string error", "transfer");
			expect(mapped.message).toBe("string error");
		});
	});

	describe("RailgunErrorCode", () => {
		it("has all expected codes", () => {
			expect(RailgunErrorCode.NOT_INITIALIZED).toBe(
				"RAILGUN_NOT_INITIALIZED",
			);
			expect(RailgunErrorCode.SHIELD_FAILED).toBe("RAILGUN_SHIELD_FAILED");
			expect(RailgunErrorCode.TRANSFER_FAILED).toBe(
				"RAILGUN_TRANSFER_FAILED",
			);
			expect(RailgunErrorCode.UNSUPPORTED_CHAIN).toBe(
				"RAILGUN_UNSUPPORTED_CHAIN",
			);
		});
	});
});
