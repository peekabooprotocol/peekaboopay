import type { PASResult } from "./common";
import type { Credential, DisclosureRequest } from "./identity";
import type { PolicyRule } from "./policy";
import type { SessionConfig } from "./session";
import type {
	BridgeParams,
	BridgeReceipt,
	PayParams,
	PaymentReceipt,
	ReceiveAddress,
	ReceiveParams,
	SwapParams,
	SwapReceipt,
} from "./transaction";

/** Universal agent interface — what any agent framework receives */
export interface PASAgent {
	connect(config: AgentConfig): Promise<void>;
	disconnect(): Promise<void>;

	pay(params: PayParams): Promise<PASResult<PaymentReceipt>>;
	receive(params: ReceiveParams): Promise<PASResult<ReceiveAddress>>;
	swap(params: SwapParams): Promise<PASResult<SwapReceipt>>;
	bridge(params: BridgeParams): Promise<PASResult<BridgeReceipt>>;

	prove(credentialId: string, disclosure: DisclosureRequest): Promise<PASResult<unknown>>;
	credential(credential: Credential): Promise<PASResult<string>>;
	disclose(attributes: string[]): Promise<PASResult<unknown>>;

	setPolicy(rules: PolicyRule[]): Promise<void>;
}

export interface AgentConfig {
	agentId: string;
	session: SessionConfig;
	backend: "railgun" | "aztec" | "ethereum";
	rpcUrl: string;
	privateKey?: string;
}
