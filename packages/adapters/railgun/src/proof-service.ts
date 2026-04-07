import type { Hex, PASResult, Proof, ProofParams } from "@peekaboopay/types";
import type { RailgunProvider, RailgunState } from "./types";
import { toSuccess, toFailure, mapRailgunError } from "./errors";

export class ProofService {
	constructor(
		private getState: () => RailgunState,
		private provider: RailgunProvider,
	) {}

	async generate(params: ProofParams): Promise<PASResult<Proof>> {
		const state = this.getState();

		try {
			const result = await this.provider.generateProof(
				state.networkName,
				params.circuit,
				params.inputs,
			);

			return toSuccess<Proof>({
				protocol: "groth16",
				proof: result.proof,
				publicInputs: result.publicInputs,
			});
		} catch (err) {
			const mapped = mapRailgunError(err, "proof_generation");
			return toFailure(mapped.code, mapped.message, mapped.details);
		}
	}

	async verify(proof: Proof): Promise<boolean> {
		try {
			return await this.provider.verifyProof(proof.proof, proof.publicInputs);
		} catch {
			return false;
		}
	}
}
