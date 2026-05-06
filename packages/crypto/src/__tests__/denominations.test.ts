import { describe, it, expect } from "vitest";
import {
  DENOMINATIONS,
  TAO_DENOMINATIONS,
  ETH_DENOMINATIONS,
  denominationLabel,
  suggestDenomination,
  isExactlyDenominatable,
  totalDepositsNeeded,
} from "../denominations.js";
import type { DenominationSplit } from "../denominations.js";

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

const ONE_ETH = BigInt("1000000000000000000");   // 1e18
const POINT_ONE = BigInt("100000000000000000");   // 1e17
const TEN = BigInt("10000000000000000000");       // 1e19

// ---------------------------------------------------------------
// Denomination constants
// ---------------------------------------------------------------

describe("DENOMINATIONS", () => {
  it("TAO_01 equals 0.1 ether (1e17 wei)", () => {
    expect(DENOMINATIONS.TAO_01).toBe(POINT_ONE);
  });

  it("TAO_1 equals 1 ether (1e18 wei)", () => {
    expect(DENOMINATIONS.TAO_1).toBe(ONE_ETH);
  });

  it("TAO_10 equals 10 ether (1e19 wei)", () => {
    expect(DENOMINATIONS.TAO_10).toBe(TEN);
  });

  it("ETH_01 equals 0.1 ether (1e17 wei)", () => {
    expect(DENOMINATIONS.ETH_01).toBe(POINT_ONE);
  });

  it("ETH_1 equals 1 ether (1e18 wei)", () => {
    expect(DENOMINATIONS.ETH_1).toBe(ONE_ETH);
  });

  it("TAO_01 and ETH_01 are equal (same base unit)", () => {
    expect(DENOMINATIONS.TAO_01).toBe(DENOMINATIONS.ETH_01);
  });

  it("TAO_1 and ETH_1 are equal (same base unit)", () => {
    expect(DENOMINATIONS.TAO_1).toBe(DENOMINATIONS.ETH_1);
  });
});

describe("denomination arrays", () => {
  it("TAO_DENOMINATIONS is sorted largest to smallest", () => {
    for (let i = 1; i < TAO_DENOMINATIONS.length; i++) {
      expect(TAO_DENOMINATIONS[i - 1]).toBeGreaterThan(TAO_DENOMINATIONS[i]);
    }
  });

  it("ETH_DENOMINATIONS is sorted largest to smallest", () => {
    for (let i = 1; i < ETH_DENOMINATIONS.length; i++) {
      expect(ETH_DENOMINATIONS[i - 1]).toBeGreaterThan(ETH_DENOMINATIONS[i]);
    }
  });

  it("TAO_DENOMINATIONS has 3 entries", () => {
    expect(TAO_DENOMINATIONS).toHaveLength(3);
  });

  it("ETH_DENOMINATIONS has 2 entries", () => {
    expect(ETH_DENOMINATIONS).toHaveLength(2);
  });
});

// ---------------------------------------------------------------
// denominationLabel
// ---------------------------------------------------------------

describe("denominationLabel", () => {
  it("formats 1 TAO correctly", () => {
    expect(denominationLabel(ONE_ETH)).toBe("1 TAO");
  });

  it("formats 10 TAO correctly", () => {
    expect(denominationLabel(TEN)).toBe("10 TAO");
  });

  it("formats 0.1 TAO correctly", () => {
    expect(denominationLabel(POINT_ONE)).toBe("0.1 TAO");
  });

  it("uses custom symbol", () => {
    expect(denominationLabel(ONE_ETH, "ETH")).toBe("1 ETH");
    expect(denominationLabel(POINT_ONE, "ETH")).toBe("0.1 ETH");
  });

  it("handles zero amount", () => {
    expect(denominationLabel(0n)).toBe("0 TAO");
  });

  it("handles large amounts", () => {
    const oneHundred = BigInt("100000000000000000000"); // 100e18
    expect(denominationLabel(oneHundred)).toBe("100 TAO");
  });

  it("formats fractional amounts without trailing zeros", () => {
    // 1.5 TAO = 1.5e18 wei
    const onePointFive = BigInt("1500000000000000000");
    expect(denominationLabel(onePointFive)).toBe("1.5 TAO");
  });

  it("formats very small amounts", () => {
    // 1 wei
    expect(denominationLabel(1n)).toBe("0.000000000000000001 TAO");
  });
});

// ---------------------------------------------------------------
// suggestDenomination
// ---------------------------------------------------------------

describe("suggestDenomination", () => {
  it("splits 2.5 TAO into 2x 1 TAO + 5x 0.1 TAO", () => {
    const amount = BigInt("2500000000000000000"); // 2.5e18
    const result = suggestDenomination(amount);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ denomination: DENOMINATIONS.TAO_1, count: 2 });
    expect(result[1]).toEqual({ denomination: DENOMINATIONS.TAO_01, count: 5 });
  });

  it("splits 25 TAO into 2x 10 TAO + 5x 1 TAO", () => {
    const amount = BigInt("25000000000000000000"); // 25e18
    const result = suggestDenomination(amount);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ denomination: DENOMINATIONS.TAO_10, count: 2 });
    expect(result[1]).toEqual({ denomination: DENOMINATIONS.TAO_1, count: 5 });
  });

  it("splits exact denomination with single entry", () => {
    const result = suggestDenomination(DENOMINATIONS.TAO_10);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ denomination: DENOMINATIONS.TAO_10, count: 1 });
  });

  it("splits 0.3 TAO into 3x 0.1 TAO", () => {
    const amount = BigInt("300000000000000000"); // 0.3e18
    const result = suggestDenomination(amount);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ denomination: DENOMINATIONS.TAO_01, count: 3 });
  });

  it("returns empty array for zero amount", () => {
    expect(suggestDenomination(0n)).toEqual([]);
  });

  it("returns empty array for negative amount", () => {
    expect(suggestDenomination(-1n)).toEqual([]);
  });

  it("handles amounts smaller than smallest denomination", () => {
    // 0.05 TAO — smaller than 0.1 TAO minimum
    const amount = BigInt("50000000000000000"); // 5e16
    const result = suggestDenomination(amount);
    expect(result).toEqual([]);
  });

  it("handles partial remainder below smallest denomination", () => {
    // 1.05 TAO — the 0.05 remainder is below 0.1 TAO
    const amount = BigInt("1050000000000000000"); // 1.05e18
    const result = suggestDenomination(amount);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ denomination: DENOMINATIONS.TAO_1, count: 1 });
    // 0.05 TAO remainder is lost (not representable)
  });

  it("uses ETH denominations when provided", () => {
    const amount = BigInt("1500000000000000000"); // 1.5 ETH
    const result = suggestDenomination(amount, ETH_DENOMINATIONS);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ denomination: DENOMINATIONS.ETH_1, count: 1 });
    expect(result[1]).toEqual({ denomination: DENOMINATIONS.ETH_01, count: 5 });
  });

  it("handles very large amount", () => {
    const amount = BigInt("123400000000000000000"); // 123.4 TAO
    const result = suggestDenomination(amount);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ denomination: DENOMINATIONS.TAO_10, count: 12 });
    expect(result[1]).toEqual({ denomination: DENOMINATIONS.TAO_1, count: 3 });
    expect(result[2]).toEqual({ denomination: DENOMINATIONS.TAO_01, count: 4 });
  });

  it("returns empty array for empty denominations list", () => {
    expect(suggestDenomination(ONE_ETH, [])).toEqual([]);
  });
});

// ---------------------------------------------------------------
// isExactlyDenominatable
// ---------------------------------------------------------------

describe("isExactlyDenominatable", () => {
  it("returns true for exact denomination", () => {
    expect(isExactlyDenominatable(ONE_ETH)).toBe(true);
    expect(isExactlyDenominatable(TEN)).toBe(true);
    expect(isExactlyDenominatable(POINT_ONE)).toBe(true);
  });

  it("returns true for exact multiples", () => {
    // 2.5 TAO = 2 * 1 TAO + 5 * 0.1 TAO
    expect(isExactlyDenominatable(BigInt("2500000000000000000"))).toBe(true);
  });

  it("returns false for amounts with remainder", () => {
    // 1.05 TAO — 0.05 doesn't fit any denomination
    expect(isExactlyDenominatable(BigInt("1050000000000000000"))).toBe(false);
  });

  it("returns true for zero", () => {
    expect(isExactlyDenominatable(0n)).toBe(true);
  });

  it("returns false for negative amount", () => {
    expect(isExactlyDenominatable(-1n)).toBe(false);
  });

  it("returns false for amount below smallest denomination", () => {
    expect(isExactlyDenominatable(BigInt("50000000000000000"))).toBe(false); // 0.05
  });
});

// ---------------------------------------------------------------
// totalDepositsNeeded
// ---------------------------------------------------------------

describe("totalDepositsNeeded", () => {
  it("returns 1 for exact denomination", () => {
    expect(totalDepositsNeeded(ONE_ETH)).toBe(1);
    expect(totalDepositsNeeded(TEN)).toBe(1);
    expect(totalDepositsNeeded(POINT_ONE)).toBe(1);
  });

  it("returns correct count for 2.5 TAO", () => {
    // 2x 1 TAO + 5x 0.1 TAO = 7 deposits
    expect(totalDepositsNeeded(BigInt("2500000000000000000"))).toBe(7);
  });

  it("returns correct count for 25 TAO", () => {
    // 2x 10 TAO + 5x 1 TAO = 7 deposits
    expect(totalDepositsNeeded(BigInt("25000000000000000000"))).toBe(7);
  });

  it("returns -1 for non-denominatable amounts", () => {
    // 1.05 TAO
    expect(totalDepositsNeeded(BigInt("1050000000000000000"))).toBe(-1);
  });

  it("returns 0 for zero amount", () => {
    expect(totalDepositsNeeded(0n)).toBe(0);
  });

  it("returns -1 for amounts below smallest denomination", () => {
    expect(totalDepositsNeeded(BigInt("50000000000000000"))).toBe(-1); // 0.05
  });
});
