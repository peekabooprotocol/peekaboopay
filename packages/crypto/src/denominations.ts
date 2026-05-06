/**
 * @module denominations
 * @description Standard pool denominations and helpers for multi-denomination
 *              privacy pools. Fixed-denomination pools (like Tornado Cash)
 *              ensure every deposit is the same size, creating larger anonymity
 *              sets where deposits cannot be correlated by amount.
 */

// ---------------------------------------------------------------
// Standard denomination constants (in wei)
// ---------------------------------------------------------------

/** Standard pool denominations in wei, keyed by chain + amount. */
export const DENOMINATIONS = {
  /** 0.1 TAO (Bittensor native token) */
  TAO_01: BigInt("100000000000000000"),      // 1e17
  /** 1 TAO */
  TAO_1:  BigInt("1000000000000000000"),     // 1e18
  /** 10 TAO */
  TAO_10: BigInt("10000000000000000000"),    // 1e19
  /** 0.1 ETH */
  ETH_01: BigInt("100000000000000000"),      // 1e17
  /** 1 ETH */
  ETH_1:  BigInt("1000000000000000000"),     // 1e18
} as const;

/** Ordered list of TAO denominations from largest to smallest. */
export const TAO_DENOMINATIONS = [
  DENOMINATIONS.TAO_10,
  DENOMINATIONS.TAO_1,
  DENOMINATIONS.TAO_01,
] as const;

/** Ordered list of ETH denominations from largest to smallest. */
export const ETH_DENOMINATIONS = [
  DENOMINATIONS.ETH_1,
  DENOMINATIONS.ETH_01,
] as const;

// ---------------------------------------------------------------
// Label formatting
// ---------------------------------------------------------------

/**
 * Get a human-readable label for a denomination amount.
 *
 * @param amount  The denomination in wei
 * @param symbol  Token symbol (default: "TAO")
 * @returns       A formatted string like "1 TAO" or "0.1 ETH"
 *
 * @example
 * ```ts
 * denominationLabel(DENOMINATIONS.TAO_1);          // "1 TAO"
 * denominationLabel(DENOMINATIONS.ETH_01, "ETH");  // "0.1 ETH"
 * ```
 */
export function denominationLabel(amount: bigint, symbol = "TAO"): string {
  if (amount <= 0n) return `0 ${symbol}`;

  const ONE_ETHER = BigInt("1000000000000000000"); // 1e18

  // Whole part
  const whole = amount / ONE_ETHER;
  // Fractional part in wei
  const fractionalWei = amount % ONE_ETHER;

  if (fractionalWei === 0n) {
    return `${whole} ${symbol}`;
  }

  // Convert fractional wei to a decimal string with up to 18 digits,
  // then strip trailing zeros
  const fracStr = fractionalWei.toString().padStart(18, "0").replace(/0+$/, "");

  return `${whole}.${fracStr} ${symbol}`;
}

// ---------------------------------------------------------------
// Denomination suggestion
// ---------------------------------------------------------------

/** A single entry in a denomination breakdown. */
export interface DenominationSplit {
  /** The denomination amount in wei */
  denomination: bigint;
  /** How many deposits of this denomination */
  count: number;
}

/**
 * Suggest an optimal split of an amount into standard denominations.
 *
 * Uses a greedy algorithm: fill as many of the largest denomination
 * as possible, then move to the next smaller one. Any remainder that
 * doesn't fit into the smallest denomination is reported separately.
 *
 * @param amount         Total amount in wei to split
 * @param denominations  Ordered denominations (largest first).
 *                       Defaults to TAO_DENOMINATIONS.
 * @returns              Array of { denomination, count } objects.
 *                       Only includes denominations with count > 0.
 *
 * @example
 * ```ts
 * suggestDenomination(parseEther("2.5"));
 * // => [{ denomination: 1e18, count: 2 }, { denomination: 1e17, count: 5 }]
 *
 * suggestDenomination(parseEther("25"));
 * // => [{ denomination: 1e19, count: 2 }, { denomination: 1e18, count: 5 }]
 * ```
 */
export function suggestDenomination(
  amount: bigint,
  denominations: readonly bigint[] = TAO_DENOMINATIONS,
): DenominationSplit[] {
  if (amount <= 0n) return [];
  if (denominations.length === 0) return [];

  const result: DenominationSplit[] = [];
  let remaining = amount;

  for (const denom of denominations) {
    if (denom <= 0n) continue;
    if (remaining < denom) continue;

    const count = remaining / denom;
    remaining = remaining % denom;

    result.push({
      denomination: denom,
      count: Number(count),
    });

    if (remaining === 0n) break;
  }

  return result;
}

/**
 * Check whether an amount can be exactly represented by a combination
 * of standard denominations (no remainder).
 *
 * @param amount         Total amount in wei
 * @param denominations  Ordered denominations (largest first).
 * @returns              true if the amount can be split with zero remainder
 */
export function isExactlyDenominatable(
  amount: bigint,
  denominations: readonly bigint[] = TAO_DENOMINATIONS,
): boolean {
  if (amount <= 0n) return amount === 0n;

  let remaining = amount;
  for (const denom of denominations) {
    if (denom <= 0n) continue;
    remaining = remaining % denom;
    if (remaining === 0n) return true;
  }
  return false;
}

/**
 * Calculate the total number of deposits needed to shield a given amount.
 *
 * @param amount         Total amount in wei
 * @param denominations  Ordered denominations (largest first).
 * @returns              Total deposit count, or -1 if not exactly denominatable
 */
export function totalDepositsNeeded(
  amount: bigint,
  denominations: readonly bigint[] = TAO_DENOMINATIONS,
): number {
  const splits = suggestDenomination(amount, denominations);
  const total = splits.reduce((sum, s) => sum + BigInt(s.denomination) * BigInt(s.count), 0n);
  if (total !== amount) return -1;
  return splits.reduce((sum, s) => sum + s.count, 0);
}
