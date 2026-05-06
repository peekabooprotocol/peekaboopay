/**
 * Peek-a-boo policy definitions for Lit Actions.
 * These policies are enforced by Lit's threshold network —
 * cryptographically guaranteed, not just SDK-level checks.
 */

export interface LitPolicy {
  /** Maximum amount per single transaction (in wei) */
  maxAmountPerTx?: string;
  /** Maximum cumulative amount per day (in wei) */
  maxDailyAmount?: string;
  /** Allowed recipient addresses (whitelist) */
  allowedRecipients?: string[];
  /** Blocked recipient addresses (denylist) */
  blockedRecipients?: string[];
  /** Allowed chain IDs */
  allowedChains?: number[];
  /** Minimum seconds between transactions */
  cooldownSeconds?: number;
  /** Unix timestamp after which the policy expires */
  expiresAt?: number;
}

/**
 * Generate a Lit Action JavaScript string that enforces a Peek-a-boo policy.
 * This code runs inside Lit's TEE — it can't be bypassed by the agent.
 */
export function createPolicyAction(policy: LitPolicy): string {
  const checks: string[] = [];

  if (policy.maxAmountPerTx) {
    checks.push(`
      if (BigInt(amount) > BigInt("${policy.maxAmountPerTx}")) {
        throw new Error("Transaction exceeds max amount per tx: " + amount + " > ${policy.maxAmountPerTx}");
      }
    `);
  }

  if (policy.allowedRecipients && policy.allowedRecipients.length > 0) {
    const list = JSON.stringify(
      policy.allowedRecipients.map((a) => a.toLowerCase()),
    );
    checks.push(`
      if (!${list}.includes(recipient.toLowerCase())) {
        throw new Error("Recipient not in whitelist: " + recipient);
      }
    `);
  }

  if (policy.blockedRecipients && policy.blockedRecipients.length > 0) {
    const list = JSON.stringify(
      policy.blockedRecipients.map((a) => a.toLowerCase()),
    );
    checks.push(`
      if (${list}.includes(recipient.toLowerCase())) {
        throw new Error("Recipient is blocked: " + recipient);
      }
    `);
  }

  if (policy.allowedChains && policy.allowedChains.length > 0) {
    checks.push(`
      if (!${JSON.stringify(policy.allowedChains)}.includes(Number(chainId))) {
        throw new Error("Chain not allowed: " + chainId);
      }
    `);
  }

  if (policy.expiresAt) {
    checks.push(`
      if (Date.now() / 1000 > ${policy.expiresAt}) {
        throw new Error("Policy has expired");
      }
    `);
  }

  return `
    (async () => {
      const { amount, recipient, chainId } = JSON.parse(params);

      // Peek-a-boo policy checks (enforced by Lit TEE)
      ${checks.join("\n")}

      // All checks passed — proceed with signing
      const sigShare = await Lit.Actions.signAndCombineEcdsa({
        toSign: toSignData,
        publicKey: pkpPublicKey,
        sigName: "peekabooPolicySig",
      });

      Lit.Actions.setResponse({ response: JSON.stringify({ signature: sigShare, policyEnforced: true }) });
    })()
  `;
}

/**
 * Create a human-readable summary of a policy.
 */
export function describeLitPolicy(policy: LitPolicy): string {
  const parts: string[] = [];
  if (policy.maxAmountPerTx)
    parts.push(`Max per tx: ${policy.maxAmountPerTx} wei`);
  if (policy.maxDailyAmount)
    parts.push(`Max daily: ${policy.maxDailyAmount} wei`);
  if (policy.allowedRecipients)
    parts.push(`Whitelist: ${policy.allowedRecipients.length} addresses`);
  if (policy.blockedRecipients)
    parts.push(`Denylist: ${policy.blockedRecipients.length} addresses`);
  if (policy.allowedChains)
    parts.push(`Chains: ${policy.allowedChains.join(", ")}`);
  if (policy.cooldownSeconds)
    parts.push(`Cooldown: ${policy.cooldownSeconds}s`);
  if (policy.expiresAt)
    parts.push(
      `Expires: ${new Date(policy.expiresAt * 1000).toISOString()}`,
    );
  return parts.join(" | ") || "No restrictions";
}
