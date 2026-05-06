/**
 * PKP (Programmable Key Pair) signer for Peek-a-boo.
 * Drop-in replacement for ethers.Wallet — signs via Lit's threshold network.
 * No raw private key is ever held locally.
 */

import { ethers } from "ethers";

export interface PKPSignerConfig {
  /** The Lit client instance (from createLitClient) */
  litClient: any;
  /** PKP public key (uncompressed, 0x-prefixed) */
  pkpPublicKey: string;
  /** Authentication signature for Lit network access */
  authSig: any;
  /** Optional ethers provider to connect to */
  provider?: ethers.Provider;
}

/**
 * Create a PKP-backed ethers Signer.
 * This signer uses Lit's threshold network for all signing operations.
 * It implements the ethers.Signer interface — drop-in replacement for ethers.Wallet.
 */
export async function createPKPSigner(
  config: PKPSignerConfig,
): Promise<ethers.Signer> {
  try {
    const { PKPEthersWallet } = await import("@lit-protocol/pkp-ethers");

    const walletConfig: any = {
      controllerAuthSig: config.authSig,
      pkpPubKey: config.pkpPublicKey,
      litNodeClient: config.litClient,
    };

    const pkpWallet: any = new (PKPEthersWallet as any)(walletConfig);

    if (pkpWallet.init) await pkpWallet.init();

    if (config.provider && pkpWallet.connect) {
      return pkpWallet.connect(config.provider) as ethers.Signer;
    }

    return pkpWallet as ethers.Signer;
  } catch (error: any) {
    throw new Error(`Failed to create PKP signer: ${error.message}`);
  }
}

/**
 * Get the Ethereum address for a PKP public key.
 * Useful for checking balances before signing.
 */
export function pkpToAddress(pkpPublicKey: string): string {
  return ethers.computeAddress(pkpPublicKey);
}
