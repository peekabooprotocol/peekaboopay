import type {
	BackendConfig,
	ChainId,
	Hex,
	PASResult,
	PrivacyBackend,
	PrivateTransferParams,
	Proof,
	ProofParams,
	PublicKey,
	ShieldParams,
	ShieldResult,
	TokenInfo,
	TransferResult,
	UnshieldParams,
	UnshieldResult,
	UTXONote,
} from "@peekaboopay/types";
import {
	MerkleTree,
	generateDeposit,
	toBytes32Hex,
	fromBytes32Hex,
	generateWithdrawProof,
	verifyWithdrawProof,
} from "@peekaboopay/crypto";
import type { WithdrawProofInput, ArtifactPaths } from "@peekaboopay/crypto";
import { AddressDerivationImpl } from "@peekaboopay/core";
import { ethers } from "ethers";

import {
	BITTENSOR_CHAIN_IDS,
	type BittensorNetwork,
	getBittensorNetwork,
} from "./chains.js";
import {
	SHIELDED_POOL_ABI,
	STEALTH_ANNOUNCER_ABI,
	MAINNET_CONTRACTS,
	NATIVE_TOKEN_ADDRESS,
} from "./contracts.js";
import { BittensorErrorCode, toSuccess, toFailure } from "./errors.js";
import { NoteStore } from "./note-store.js";
import { syncMerkleTree, getSpentNullifiers } from "./event-scanner.js";
import type { DepositNote } from "./types.js";

// ---------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------

/**
 * Configuration for the Bittensor adapter.
 * Extends BackendConfig with Bittensor-specific options.
 */
export interface BittensorAdapterConfig extends BackendConfig {
	/** Address of the deployed ShieldedPool contract */
	shieldedPoolAddress?: Hex;
	/** Address of the deployed Groth16Verifier contract */
	verifierAddress?: Hex;
	/** Address of the deployed StealthAnnouncer contract */
	stealthAnnouncerAddress?: Hex;
	/** Private key for signing transactions */
	privateKey?: Hex;
	/** Path to circuit artifacts (WASM + zkey files) */
	artifactsPath?: string;
	/** Merkle tree depth (default: 20) */
	merkleTreeLevels?: number;
}

// ---------------------------------------------------------------
// Bittensor Adapter
// ---------------------------------------------------------------

/**
 * Bittensor EVM privacy adapter.
 *
 * Interacts with Peek-a-boo's ShieldedPool, Groth16Verifier,
 * and StealthAnnouncer contracts on the Bittensor Subtensor EVM.
 *
 * Architecture:
 * - `shield()` deposits TAO into the Poseidon Merkle tree
 * - `unshield()` generates a Groth16 proof off-chain, calls withdraw on-chain
 * - `transfer()` does a stealth withdraw + announcement via StealthAnnouncer
 * - All transactions use legacy format (type 0) — Bittensor EVM does not support EIP-1559
 */
export class BittensorAdapter implements PrivacyBackend {
	readonly name = "bittensor";
	readonly supportedChains: ChainId[] = BITTENSOR_CHAIN_IDS;

	private config: BittensorAdapterConfig | null = null;
	private network: BittensorNetwork | null = null;
	private initialized = false;

	// Ethers.js instances
	private provider: ethers.JsonRpcProvider | null = null;
	private signer: ethers.Wallet | null = null;
	private poolContract: ethers.Contract | null = null;
	private announcerContract: ethers.Contract | null = null;

	// Off-chain state
	private merkleTree: MerkleTree | null = null;
	private noteStore = new NoteStore();
	private artifactPaths: ArtifactPaths | null = null;
	private addressDerivation = new AddressDerivationImpl();

	async initialize(config: BackendConfig): Promise<void> {
		const btConfig = config as BittensorAdapterConfig;
		const network = getBittensorNetwork(config.chainId);

		if (!network) {
			throw new Error(
				`Unsupported Bittensor chain ID: ${config.chainId}. ` +
					`Supported: 964 (mainnet), 945 (testnet)`,
			);
		}

		this.config = {
			...btConfig,
			rpcUrl: btConfig.rpcUrl || network.rpcUrl,
		};
		this.network = network;

		// Set up ethers provider
		this.provider = new ethers.JsonRpcProvider(
			this.config.rpcUrl,
			this.config.chainId,
		);

		// Set up signer if private key provided
		if (btConfig.privateKey) {
			this.signer = new ethers.Wallet(btConfig.privateKey, this.provider);
		}

		// Resolve contract addresses (config overrides > mainnet defaults)
		const poolAddress =
			btConfig.shieldedPoolAddress || MAINNET_CONTRACTS.shieldedPool;
		const announcerAddress =
			btConfig.stealthAnnouncerAddress ||
			MAINNET_CONTRACTS.stealthAnnouncer;

		// Instantiate contracts
		const signerOrProvider = this.signer || this.provider;
		this.poolContract = new ethers.Contract(
			poolAddress,
			SHIELDED_POOL_ABI,
			signerOrProvider,
		);
		this.announcerContract = new ethers.Contract(
			announcerAddress,
			STEALTH_ANNOUNCER_ABI,
			signerOrProvider,
		);

		// Initialize off-chain Merkle tree
		const levels = btConfig.merkleTreeLevels || 20;
		this.merkleTree = new MerkleTree(levels);
		await this.merkleTree.init();

		// Sync Merkle tree from on-chain Deposit events
		try {
			await syncMerkleTree(this.poolContract, this.merkleTree);
		} catch {
			// Non-fatal: tree starts empty if RPC call fails
		}

		// Resolve artifact paths
		if (btConfig.artifactsPath) {
			this.artifactPaths = {
				wasmPath: `${btConfig.artifactsPath}/withdraw_js/withdraw.wasm`,
				zkeyPath: `${btConfig.artifactsPath}/withdraw.zkey`,
			};
		}

		this.initialized = true;
	}

	// ---------------------------------------------------------------
	// shield — deposit TAO/ERC20 into the ShieldedPool
	// ---------------------------------------------------------------

	async shield(params: ShieldParams): Promise<PASResult<ShieldResult>> {
		this.assertInitialized();

		try {
			const pool = this.poolContract!;
			const tree = this.merkleTree!;

			// Generate random deposit secrets
			const deposit = await generateDeposit();
			const commitmentHex = toBytes32Hex(deposit.commitment);

			const isNative = this.isNativeToken(params.token);
			let tx: ethers.TransactionResponse;

			if (isNative) {
				// Shield native TAO
				tx = await pool.deposit(commitmentHex, {
					value: params.amount,
					type: 0, // legacy tx for Bittensor EVM
				});
			} else {
				// Shield ERC-20 — caller must have approved the pool first
				tx = await pool.depositERC20(
					commitmentHex,
					params.token.address,
					params.amount,
					{ type: 0 },
				);
			}

			const receipt = await tx.wait();
			if (!receipt) {
				return toFailure(
					BittensorErrorCode.SHIELD_FAILED,
					"Transaction receipt is null",
				);
			}

			// Insert into local Merkle tree
			const leafIndex = tree.insert(deposit.commitment);

			// Store the deposit note for future withdrawal
			const note: DepositNote = {
				nullifier: deposit.nullifier,
				secret: deposit.secret,
				commitment: deposit.commitment,
				nullifierHash: deposit.nullifierHash,
				leafIndex,
				amount: params.amount,
				token: isNative
					? NATIVE_TOKEN_ADDRESS
					: params.token.address,
				timestamp: Math.floor(Date.now() / 1000),
			};
			this.noteStore.addNote(note);

			// Build the UTXO note for the result
			const utxo: UTXONote = {
				commitment: commitmentHex as Hex,
				amount: params.amount,
				token: params.token,
				blinding: toBytes32Hex(deposit.secret) as Hex,
				index: leafIndex,
			};

			return toSuccess<ShieldResult>({
				txHash: tx.hash as Hex,
				utxo,
				timestamp: note.timestamp,
			});
		} catch (err: any) {
			return toFailure(
				BittensorErrorCode.SHIELD_FAILED,
				`Shield failed: ${err.message || err}`,
			);
		}
	}

	// ---------------------------------------------------------------
	// unshield — withdraw TAO/ERC20 from the ShieldedPool with ZK proof
	// ---------------------------------------------------------------

	async unshield(
		params: UnshieldParams,
	): Promise<PASResult<UnshieldResult>> {
		this.assertInitialized();

		try {
			const pool = this.poolContract!;
			const tree = this.merkleTree!;
			const tokenAddress = this.isNativeToken(params.token)
				? NATIVE_TOKEN_ADDRESS
				: params.token.address;

			// Find an unspent note matching the amount
			const note = this.noteStore.findNote(tokenAddress, params.amount);
			if (!note) {
				return toFailure(
					BittensorErrorCode.NO_MATCHING_NOTE,
					`No unspent note found for amount ${params.amount} of token ${tokenAddress}`,
				);
			}

			// Generate Merkle proof
			const merkleProof = await tree.getProof(note.leafIndex);
			const root = await tree.getRoot();
			const rootHex = toBytes32Hex(root);

			// Verify root is known on-chain
			const isKnown = await pool.isKnownRoot(rootHex);
			if (!isKnown) {
				// Re-sync tree and try again
				await syncMerkleTree(pool, tree);
				const newRoot = await tree.getRoot();
				const newRootHex = toBytes32Hex(newRoot);
				const retryKnown = await pool.isKnownRoot(newRootHex);
				if (!retryKnown) {
					return toFailure(
						BittensorErrorCode.INVALID_ROOT,
						"Merkle root not recognized on-chain. Tree may be out of sync.",
					);
				}
			}

			// Generate ZK proof
			if (!this.artifactPaths) {
				return toFailure(
					BittensorErrorCode.PROOF_GENERATION_FAILED,
					"No circuit artifacts configured. Set artifactsPath in config.",
				);
			}

			const proofInput: WithdrawProofInput = {
				nullifier: note.nullifier,
				secret: note.secret,
				pathElements: merkleProof.pathElements,
				pathIndices: merkleProof.pathIndices,
				root,
				nullifierHash: note.nullifierHash,
				recipient: BigInt(params.recipient),
				amount: params.amount,
			};

			const proofResult = await generateWithdrawProof(
				proofInput,
				this.artifactPaths,
			);

			const nullifierHashHex = toBytes32Hex(note.nullifierHash);
			const finalRoot = toBytes32Hex(root);

			// Call withdraw on-chain
			const tx = await pool.withdraw(
				nullifierHashHex,
				params.recipient,
				params.amount,
				tokenAddress,
				finalRoot,
				proofResult.proofBytes,
				{ type: 0 },
			);

			const receipt = await tx.wait();
			if (!receipt) {
				return toFailure(
					BittensorErrorCode.UNSHIELD_FAILED,
					"Withdraw transaction receipt is null",
				);
			}

			// Mark nullifier as spent
			this.noteStore.markSpent(nullifierHashHex);

			return toSuccess<UnshieldResult>({
				txHash: tx.hash as Hex,
				timestamp: Math.floor(Date.now() / 1000),
			});
		} catch (err: any) {
			return toFailure(
				BittensorErrorCode.UNSHIELD_FAILED,
				`Unshield failed: ${err.message || err}`,
			);
		}
	}

	// ---------------------------------------------------------------
	// transfer — private stealth transfer
	// ---------------------------------------------------------------

	async transfer(
		params: PrivateTransferParams,
	): Promise<PASResult<TransferResult>> {
		this.assertInitialized();

		try {
			const pool = this.poolContract!;
			const announcer = this.announcerContract!;
			const tree = this.merkleTree!;
			const tokenAddress = this.isNativeToken(params.token)
				? NATIVE_TOKEN_ADDRESS
				: params.token.address;

			// 1. Generate stealth address for recipient
			const stealth = this.addressDerivation.generateStealthAddress(
				params.recipientPublicKey as PublicKey,
			);

			// 2. Find a note to spend
			const note = this.noteStore.findNote(tokenAddress, params.amount);
			if (!note) {
				return toFailure(
					BittensorErrorCode.NO_MATCHING_NOTE,
					`No unspent note found for amount ${params.amount}`,
				);
			}

			// 3. Generate proof and withdraw to stealth address
			const merkleProof = await tree.getProof(note.leafIndex);
			const root = await tree.getRoot();

			if (!this.artifactPaths) {
				return toFailure(
					BittensorErrorCode.PROOF_GENERATION_FAILED,
					"No circuit artifacts configured. Set artifactsPath in config.",
				);
			}

			const proofInput: WithdrawProofInput = {
				nullifier: note.nullifier,
				secret: note.secret,
				pathElements: merkleProof.pathElements,
				pathIndices: merkleProof.pathIndices,
				root,
				nullifierHash: note.nullifierHash,
				recipient: BigInt(stealth.stealthAddress),
				amount: params.amount,
			};

			const proofResult = await generateWithdrawProof(
				proofInput,
				this.artifactPaths,
			);

			const nullifierHashHex = toBytes32Hex(note.nullifierHash);
			const rootHex = toBytes32Hex(root);

			// Withdraw to stealth address
			const withdrawTx = await pool.withdraw(
				nullifierHashHex,
				stealth.stealthAddress,
				params.amount,
				tokenAddress,
				rootHex,
				proofResult.proofBytes,
				{ type: 0 },
			);
			await withdrawTx.wait();

			// 4. Announce via StealthAnnouncer (schemeId=1 for secp256k1)
			const viewTagByte = stealth.viewTag.slice(0, 4) as `0x${string}`; // bytes1
			const metadata = params.memo
				? ethers.toUtf8Bytes(params.memo)
				: "0x";

			const announceTx = await announcer.announce(
				1, // schemeId: secp256k1
				stealth.stealthAddress,
				stealth.ephemeralPublicKey,
				viewTagByte,
				metadata,
				{ type: 0 },
			);
			await announceTx.wait();

			// Mark nullifier as spent
			this.noteStore.markSpent(nullifierHashHex);

			return toSuccess<TransferResult>({
				nullifier: nullifierHashHex as Hex,
				commitment: toBytes32Hex(note.commitment) as Hex,
				timestamp: Math.floor(Date.now() / 1000),
			});
		} catch (err: any) {
			return toFailure(
				BittensorErrorCode.TRANSFER_FAILED,
				`Transfer failed: ${err.message || err}`,
			);
		}
	}

	// ---------------------------------------------------------------
	// generateProof — create a Groth16 ZK proof
	// ---------------------------------------------------------------

	async generateProof(params: ProofParams): Promise<PASResult<Proof>> {
		this.assertInitialized();

		try {
			if (!this.artifactPaths) {
				return toFailure(
					BittensorErrorCode.PROOF_GENERATION_FAILED,
					"No circuit artifacts configured. Set artifactsPath in config.",
				);
			}

			if (params.circuit !== "withdraw") {
				return toFailure(
					BittensorErrorCode.PROOF_GENERATION_FAILED,
					`Unsupported circuit: ${params.circuit}. Only "withdraw" is supported.`,
				);
			}

			const input = params.inputs as unknown as WithdrawProofInput;
			const result = await generateWithdrawProof(
				input,
				this.artifactPaths,
			);

			return toSuccess<Proof>({
				protocol: "groth16",
				proof: result.proofBytes as Hex,
				publicInputs: result.publicSignals.map(
					(s) => toBytes32Hex(s) as Hex,
				),
			});
		} catch (err: any) {
			return toFailure(
				BittensorErrorCode.PROOF_GENERATION_FAILED,
				`Proof generation failed: ${err.message || err}`,
			);
		}
	}

	// ---------------------------------------------------------------
	// verifyProof — verify a Groth16 proof off-chain
	// ---------------------------------------------------------------

	async verifyProof(proof: Proof): Promise<boolean> {
		this.assertInitialized();

		if (!this.artifactPaths) {
			throw new Error(
				"No circuit artifacts configured. Set artifactsPath in config.",
			);
		}

		// Derive verification key path from artifacts path
		const vkeyPath = this.artifactPaths.zkeyPath.replace(
			/\.zkey$/,
			"_verification_key.json",
		);

		// Decode the proof back to Groth16 format
		// The proof bytes are the raw ABI-encoded (pA, pB, pC)
		const proofHex = proof.proof;
		const data = proofHex.slice(2); // remove 0x prefix
		const decode256 = (offset: number) =>
			BigInt("0x" + data.slice(offset * 64, (offset + 1) * 64));

		const groth16Proof = {
			pA: [decode256(0), decode256(1)] as [bigint, bigint],
			pB: [
				[decode256(2), decode256(3)] as [bigint, bigint],
				[decode256(4), decode256(5)] as [bigint, bigint],
			] as [[bigint, bigint], [bigint, bigint]],
			pC: [decode256(6), decode256(7)] as [bigint, bigint],
		};

		const publicSignals = proof.publicInputs.map((h) => fromBytes32Hex(h));

		return verifyWithdrawProof(groth16Proof, publicSignals, vkeyPath);
	}

	// ---------------------------------------------------------------
	// getShieldedBalance — sum unspent notes for a token
	// ---------------------------------------------------------------

	async getShieldedBalance(
		token: TokenInfo,
		_viewingKey: Hex,
	): Promise<bigint> {
		this.assertInitialized();

		const tokenAddress = this.isNativeToken(token)
			? NATIVE_TOKEN_ADDRESS
			: token.address;

		// Sync spent nullifiers from on-chain
		try {
			if (this.poolContract) {
				const spentOnChain = await getSpentNullifiers(
					this.poolContract,
				);
				for (const nh of spentOnChain) {
					this.noteStore.markSpent(nh);
				}
			}
		} catch {
			// Non-fatal: use locally tracked nullifiers
		}

		return this.noteStore.getBalance(tokenAddress);
	}

	// ---------------------------------------------------------------
	// Accessors
	// ---------------------------------------------------------------

	/** Get the current network configuration. */
	getNetwork(): BittensorNetwork | null {
		return this.network;
	}

	/** Get the current adapter configuration. */
	getConfig(): BittensorAdapterConfig | null {
		return this.config;
	}

	/** Check if the adapter is initialized. */
	isInitialized(): boolean {
		return this.initialized;
	}

	/** Get the note store (for testing/debugging). */
	getNoteStore(): NoteStore {
		return this.noteStore;
	}

	// ---------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------

	private assertInitialized(): void {
		if (!this.initialized || !this.config || !this.network) {
			throw new Error(
				"BittensorAdapter not initialized. Call initialize() first.",
			);
		}
	}

	/**
	 * Check if a token represents native TAO (not an ERC-20).
	 * Native TAO uses the zero address.
	 */
	private isNativeToken(token: TokenInfo): boolean {
		return (
			!token.address ||
			token.address === NATIVE_TOKEN_ADDRESS ||
			token.symbol === "TAO"
		);
	}
}
