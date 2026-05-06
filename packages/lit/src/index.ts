// Lit client
export { createLitClient, getLitClient, disconnectLit } from "./client.js";
export type { LitNetwork, LitClientConfig } from "./client.js";

// PKP signer (drop-in ethers.Signer replacement)
export { createPKPSigner, pkpToAddress } from "./pkp-signer.js";
export type { PKPSignerConfig } from "./pkp-signer.js";

// Wrapped key management
export {
  wrapPrivateKey,
  signWithWrappedKey,
  generateWrappedKey,
} from "./wrapped-keys.js";
export type { WrappedKeyResult } from "./wrapped-keys.js";

// Policy enforcement
export { createPolicyAction, describeLitPolicy } from "./policies.js";
export type { LitPolicy } from "./policies.js";

// Pre-built Lit Actions
export { SHIELD_ACTION, UNSHIELD_ACTION, TRANSFER_ACTION } from "./actions.js";
