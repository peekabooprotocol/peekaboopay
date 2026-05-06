/**
 * Pre-built Lit Actions for common Peek-a-boo operations.
 * These are JavaScript strings that run inside Lit's TEE.
 */

/** Lit Action for shielded deposits — enforces max deposit amount */
export const SHIELD_ACTION = `
  (async () => {
    const { amount, maxAmount, commitment } = JSON.parse(params);

    // Enforce max shield amount
    if (maxAmount && BigInt(amount) > BigInt(maxAmount)) {
      throw new Error("Shield amount exceeds maximum: " + amount);
    }

    // Sign the deposit transaction
    const sigShare = await Lit.Actions.signAndCombineEcdsa({
      toSign: toSignData,
      publicKey: pkpPublicKey,
      sigName: "shieldSig",
    });

    Lit.Actions.setResponse({
      response: JSON.stringify({ signature: sigShare, action: "shield", amount })
    });
  })()
`;

/** Lit Action for withdrawals — enforces daily limit and cooldown */
export const UNSHIELD_ACTION = `
  (async () => {
    const { amount, recipient, dailyLimit, lastWithdrawTime, cooldownSeconds } = JSON.parse(params);

    // Enforce daily withdrawal limit
    if (dailyLimit && BigInt(amount) > BigInt(dailyLimit)) {
      throw new Error("Withdrawal exceeds daily limit: " + amount);
    }

    // Enforce cooldown
    if (cooldownSeconds && lastWithdrawTime) {
      const elapsed = Math.floor(Date.now() / 1000) - Number(lastWithdrawTime);
      if (elapsed < Number(cooldownSeconds)) {
        throw new Error("Cooldown active. Wait " + (Number(cooldownSeconds) - elapsed) + " seconds.");
      }
    }

    const sigShare = await Lit.Actions.signAndCombineEcdsa({
      toSign: toSignData,
      publicKey: pkpPublicKey,
      sigName: "unshieldSig",
    });

    Lit.Actions.setResponse({
      response: JSON.stringify({ signature: sigShare, action: "unshield", recipient })
    });
  })()
`;

/** Lit Action for private transfers — enforces recipient whitelist */
export const TRANSFER_ACTION = `
  (async () => {
    const { amount, recipientPublicKey, allowedRecipients } = JSON.parse(params);

    // Enforce recipient whitelist (if set)
    if (allowedRecipients && allowedRecipients.length > 0) {
      if (!allowedRecipients.includes(recipientPublicKey)) {
        throw new Error("Recipient not in whitelist");
      }
    }

    const sigShare = await Lit.Actions.signAndCombineEcdsa({
      toSign: toSignData,
      publicKey: pkpPublicKey,
      sigName: "transferSig",
    });

    Lit.Actions.setResponse({
      response: JSON.stringify({ signature: sigShare, action: "transfer" })
    });
  })()
`;
