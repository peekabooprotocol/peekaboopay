import type {
	AgentConfig,
	BridgeParams,
	BridgeReceipt,
	Credential,
	DisclosureRequest,
	PASResult,
	PaymentReceipt,
	PayParams,
	PolicyRule,
	Proof,
	ReceiveAddress,
	ReceiveParams,
	SwapParams,
	SwapReceipt,
} from "@pas/types";
import { PASEngine } from "@pas/core";
import type { PrivacyBackend } from "@pas/types";
import { pay } from "./transaction/pay";
import { receive } from "./transaction/receive";
import { swap } from "./transaction/swap";
import { bridge } from "./transaction/bridge";
import { prove } from "./identity/prove";
import { storeCredential } from "./identity/credential";
import { disclose } from "./identity/disclose";
import { setPolicy } from "./policy";

/**
 * PASClient — the public API surface for @pas/sdk.
 *
 * Usage:
 *   const pas = new PASClient({ backend, ... });
 *   await pas.connect(config);
 *   await pas.pay({ to, amount, token });
 */
export class PASClient {
	private engine: PASEngine;

	constructor(backend: PrivacyBackend) {
		this.engine = new PASEngine({ backend, backendConfig: { chainId: 1, rpcUrl: "" } });
	}

	async connect(config: AgentConfig): Promise<void> {
		await this.engine.initialize({
			chainId: 1,
			rpcUrl: config.rpcUrl,
		});
	}

	async disconnect(): Promise<void> {
		// Cleanup sessions, etc.
	}

	// Transaction API
	async pay(params: PayParams): Promise<PASResult<PaymentReceipt>> {
		return pay(this.engine, params);
	}

	async receive(params: ReceiveParams): Promise<PASResult<ReceiveAddress>> {
		return receive(this.engine, params);
	}

	async swap(params: SwapParams): Promise<PASResult<SwapReceipt>> {
		return swap(this.engine, params);
	}

	async bridge(params: BridgeParams): Promise<PASResult<BridgeReceipt>> {
		return bridge(this.engine, params);
	}

	// Identity API
	async prove(credentialId: string, disclosure: DisclosureRequest): Promise<PASResult<Proof>> {
		return prove(this.engine, credentialId, disclosure);
	}

	async credential(credential: Credential): Promise<PASResult<string>> {
		return storeCredential(this.engine, credential);
	}

	async disclose(attributes: string[]): Promise<PASResult<Proof>> {
		return disclose(this.engine, attributes);
	}

	// Policy API
	async setPolicy(rules: PolicyRule[]): Promise<void> {
		return setPolicy(this.engine, rules);
	}
}
