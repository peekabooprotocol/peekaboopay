/**
 * Wrapped key management for Peek-a-boo.
 * Import existing private keys into Lit's encrypted storage.
 * Keys are encrypted with Lit network's BLS key and stored in DynamoDB.
 * Decryption only happens inside TEE during signing — key is wiped after.
 */

export interface WrappedKeyResult {
  /** Unique ID for the wrapped key */
  id: string;
  /** The PKP address that controls this wrapped key */
  pkpAddress: string;
  /** The Ethereum address derived from the wrapped key */
  generatedPublicKey: string;
}

/**
 * Wrap (import) an existing private key into Lit's encrypted storage.
 * After wrapping, the original key can be discarded — Lit holds it securely.
 */
export async function wrapPrivateKey(
  litClient: any,
  privateKey: string,
  authSig: any,
): Promise<WrappedKeyResult> {
  try {
    const response = await litClient.executeJs({
      code: `
        (async () => {
          const resp = await Lit.Actions.importPrivateKey({
            privateKey: privateKeyParam,
            chain: "ethereum",
          });
          Lit.Actions.setResponse({ response: JSON.stringify(resp) });
        })()
      `,
      authSig,
      jsParams: {
        privateKeyParam: privateKey,
      },
    });

    const result = JSON.parse(response.response);
    return {
      id: result.id,
      pkpAddress: result.pkpAddress,
      generatedPublicKey: result.generatedPublicKey,
    };
  } catch (error: any) {
    throw new Error(`Failed to wrap private key: ${error.message}`);
  }
}

/**
 * Sign a transaction using a wrapped key.
 * The key is decrypted inside a TEE, used to sign, then wiped from memory.
 */
export async function signWithWrappedKey(
  litClient: any,
  wrappedKeyId: string,
  unsignedTransaction: any,
  authSig: any,
  chain = "ethereum",
): Promise<string> {
  try {
    const response = await litClient.executeJs({
      code: `
        (async () => {
          const sig = await Lit.Actions.signAndCombineEcdsa({
            wrappedKeyId: wrappedKeyIdParam,
            toSign: txToSign,
            chain: chainParam,
          });
          Lit.Actions.setResponse({ response: JSON.stringify(sig) });
        })()
      `,
      authSig,
      jsParams: {
        wrappedKeyIdParam: wrappedKeyId,
        txToSign: unsignedTransaction,
        chainParam: chain,
      },
    });

    return response.response;
  } catch (error: any) {
    throw new Error(`Failed to sign with wrapped key: ${error.message}`);
  }
}

/**
 * Generate a new key pair within Lit's network (no local key material).
 */
export async function generateWrappedKey(
  litClient: any,
  authSig: any,
): Promise<WrappedKeyResult> {
  try {
    const response = await litClient.executeJs({
      code: `
        (async () => {
          const resp = await Lit.Actions.generateEncryptedKey({
            chain: "ethereum",
          });
          Lit.Actions.setResponse({ response: JSON.stringify(resp) });
        })()
      `,
      authSig,
    });

    const result = JSON.parse(response.response);
    return {
      id: result.id,
      pkpAddress: result.pkpAddress,
      generatedPublicKey: result.generatedPublicKey,
    };
  } catch (error: any) {
    throw new Error(`Failed to generate wrapped key: ${error.message}`);
  }
}
