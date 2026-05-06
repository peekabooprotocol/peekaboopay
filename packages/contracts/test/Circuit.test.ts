import { expect } from "chai";
import { ethers } from "hardhat";
import {
	generateDeposit,
	MerkleTree,
	generateWithdrawProof,
	deployPoolWithVerifier,
	toBytes32Hex,
	randomFieldElement,
	computeNullifierHash,
} from "./helpers";
import type { ShieldedPool, Groth16Verifier } from "../typechain-types";

/**
 * Circuit-level tests for the Groth16 ZK proof system.
 * These tests focus on the cryptographic correctness of the proof
 * verification pipeline: circuit → proof → on-chain verifier.
 *
 * Uses the depth-5 test circuit for speed.
 */
describe("ZK Circuit Verification", function () {
	const TREE_DEPTH = 5;
	let pool: ShieldedPool;
	let verifier: Groth16Verifier;
	let owner: Awaited<ReturnType<typeof ethers.provider.getSigner>>;
	let recipient: Awaited<ReturnType<typeof ethers.provider.getSigner>>;

	beforeEach(async function () {
		[owner, recipient] = await ethers.getSigners();
		const deployed = await deployPoolWithVerifier(TREE_DEPTH);
		pool = deployed.pool;
		verifier = deployed.verifier;
	});

	/**
	 * Helper: deposit + generate proof for a single deposit.
	 */
	async function depositAndProve(
		recipientAddr: string,
		amount: bigint,
		depositAmount?: bigint,
	) {
		const tree = new MerkleTree(TREE_DEPTH);
		await tree.init();

		const deposit = await generateDeposit();
		const commitmentHex = toBytes32Hex(deposit.commitment);

		// Deposit extra to cover 0.5% fee
		await pool.deposit(commitmentHex, { value: depositAmount || amount * 2n });
		const leafIndex = tree.insert(deposit.commitment);

		const merkleProof = await tree.getProof(leafIndex);
		const root = await tree.getRoot();

		const proofResult = await generateWithdrawProof({
			nullifier: deposit.nullifier,
			secret: deposit.secret,
			pathElements: merkleProof.pathElements,
			pathIndices: merkleProof.pathIndices,
			root,
			nullifierHash: deposit.nullifierHash,
			recipient: BigInt(recipientAddr),
			amount,
		});

		return { deposit, tree, root, proofResult, commitmentHex };
	}

	it("valid proof verifies on-chain and allows withdrawal", async function () {
		const recipientAddr = await recipient.getAddress();
		const amount = ethers.parseEther("1");

		const { deposit, root, proofResult } = await depositAndProve(
			recipientAddr,
			amount,
		);

		// Verify the proof passes the on-chain verifier
		const tx = await pool.withdraw(
			toBytes32Hex(deposit.nullifierHash),
			recipientAddr,
			amount,
			ethers.ZeroAddress,
			toBytes32Hex(root),
			proofResult.proofBytes,
		);

		await expect(tx)
			.to.emit(pool, "Withdrawal")
			.withArgs(
				toBytes32Hex(deposit.nullifierHash),
				recipientAddr,
				amount,
			);
	});

	it("proof with wrong recipient fails verification", async function () {
		const recipientAddr = await recipient.getAddress();
		const amount = ethers.parseEther("1");

		// Generate proof for the correct recipient
		const { deposit, root, proofResult } = await depositAndProve(
			recipientAddr,
			amount,
		);

		// Try to use the proof with a DIFFERENT recipient address
		const wrongRecipient = await owner.getAddress();

		await expect(
			pool.withdraw(
				toBytes32Hex(deposit.nullifierHash),
				wrongRecipient, // Wrong recipient — proof was for `recipientAddr`
				amount,
				ethers.ZeroAddress,
				toBytes32Hex(root),
				proofResult.proofBytes,
			),
		).to.be.revertedWith("Invalid proof");
	});

	it("proof with wrong amount fails verification", async function () {
		const recipientAddr = await recipient.getAddress();
		const amount = ethers.parseEther("1");

		// Generate proof for 1 ETH
		const { deposit, root, proofResult } = await depositAndProve(
			recipientAddr,
			amount,
		);

		// Try to withdraw a DIFFERENT amount (front-running attack)
		const wrongAmount = ethers.parseEther("0.5");

		await expect(
			pool.withdraw(
				toBytes32Hex(deposit.nullifierHash),
				recipientAddr,
				wrongAmount, // Wrong amount — proof was for 1 ETH
				ethers.ZeroAddress,
				toBytes32Hex(root),
				proofResult.proofBytes,
			),
		).to.be.revertedWith("Invalid proof");
	});

	it("proof with wrong nullifier hash fails verification", async function () {
		const recipientAddr = await recipient.getAddress();
		const amount = ethers.parseEther("1");

		const { deposit, root, proofResult } = await depositAndProve(
			recipientAddr,
			amount,
		);

		// Use a different nullifier hash (doesn't match the proof)
		const wrongNullifier = randomFieldElement();
		const wrongNullifierHash = await computeNullifierHash(wrongNullifier);

		await expect(
			pool.withdraw(
				toBytes32Hex(wrongNullifierHash), // Wrong nullifier hash
				recipientAddr,
				amount,
				ethers.ZeroAddress,
				toBytes32Hex(root),
				proofResult.proofBytes,
			),
		).to.be.revertedWith("Invalid proof");
	});

	it("tampered proof (modified pA) fails verification", async function () {
		const recipientAddr = await recipient.getAddress();
		const amount = ethers.parseEther("1");

		const { deposit, root, proofResult } = await depositAndProve(
			recipientAddr,
			amount,
		);

		// Tamper with the proof: modify pA[0] by incrementing it
		const tamperedProof = { ...proofResult.proof };
		tamperedProof.pA = [
			tamperedProof.pA[0] + 1n,
			tamperedProof.pA[1],
		];

		// Re-encode the tampered proof
		const tamperedBytes = ethers.AbiCoder.defaultAbiCoder().encode(
			["uint256[2]", "uint256[2][2]", "uint256[2]"],
			[tamperedProof.pA, tamperedProof.pB, tamperedProof.pC],
		);

		// The verifier should revert (point not on curve or invalid proof)
		await expect(
			pool.withdraw(
				toBytes32Hex(deposit.nullifierHash),
				recipientAddr,
				amount,
				ethers.ZeroAddress,
				toBytes32Hex(root),
				tamperedBytes,
			),
		).to.be.reverted;
	});

	it("double-spend with same nullifier is prevented", async function () {
		const recipientAddr = await recipient.getAddress();
		const amount = ethers.parseEther("1");

		// Deposit enough for two withdrawals
		const tree = new MerkleTree(TREE_DEPTH);
		await tree.init();

		const deposit = await generateDeposit();
		const commitmentHex = toBytes32Hex(deposit.commitment);

		await pool.deposit(commitmentHex, { value: amount * 2n });
		const leafIndex = tree.insert(deposit.commitment);

		const merkleProof = await tree.getProof(leafIndex);
		const root = await tree.getRoot();

		const proofResult = await generateWithdrawProof({
			nullifier: deposit.nullifier,
			secret: deposit.secret,
			pathElements: merkleProof.pathElements,
			pathIndices: merkleProof.pathIndices,
			root,
			nullifierHash: deposit.nullifierHash,
			recipient: BigInt(recipientAddr),
			amount,
		});

		// First withdrawal succeeds
		await pool.withdraw(
			toBytes32Hex(deposit.nullifierHash),
			recipientAddr,
			amount,
			ethers.ZeroAddress,
			toBytes32Hex(root),
			proofResult.proofBytes,
		);

		// Same proof, same nullifier → double-spend rejected
		await expect(
			pool.withdraw(
				toBytes32Hex(deposit.nullifierHash),
				recipientAddr,
				amount,
				ethers.ZeroAddress,
				toBytes32Hex(root),
				proofResult.proofBytes,
			),
		).to.be.revertedWith("Nullifier already spent");
	});

	it("proof against stale but valid root succeeds", async function () {
		const recipientAddr = await recipient.getAddress();
		const amount = ethers.parseEther("1");

		const tree = new MerkleTree(TREE_DEPTH);
		await tree.init();

		// First deposit — proof will be against this root
		const deposit1 = await generateDeposit();
		await pool.deposit(toBytes32Hex(deposit1.commitment), {
			value: amount,
		});
		tree.insert(deposit1.commitment);

		const rootAfterFirst = await tree.getRoot();

		// Generate proof against the first root
		const merkleProof = await tree.getProof(0);

		const proofResult = await generateWithdrawProof({
			nullifier: deposit1.nullifier,
			secret: deposit1.secret,
			pathElements: merkleProof.pathElements,
			pathIndices: merkleProof.pathIndices,
			root: rootAfterFirst,
			nullifierHash: deposit1.nullifierHash,
			recipient: BigInt(recipientAddr),
			amount,
		});

		// Second deposit — this changes the root
		const deposit2 = await generateDeposit();
		await pool.deposit(toBytes32Hex(deposit2.commitment), {
			value: amount,
		});
		tree.insert(deposit2.commitment);

		// Withdraw using the OLD root (should still be in the 30-root history buffer)
		const tx = await pool.withdraw(
			toBytes32Hex(deposit1.nullifierHash),
			recipientAddr,
			amount,
			ethers.ZeroAddress,
			toBytes32Hex(rootAfterFirst), // Stale root, but still in history
			proofResult.proofBytes,
		);

		await expect(tx).to.emit(pool, "Withdrawal");
	});

	it("off-chain and on-chain Merkle trees produce matching roots", async function () {
		const tree = new MerkleTree(TREE_DEPTH);
		await tree.init();

		// Insert several commitments into both trees
		for (let i = 0; i < 4; i++) {
			const deposit = await generateDeposit();
			const commitmentHex = toBytes32Hex(deposit.commitment);

			await pool.deposit(commitmentHex, {
				value: ethers.parseEther("0.1"),
			});
			tree.insert(deposit.commitment);
		}

		// Compare roots
		const onChainRoot = await pool.getLatestRoot();
		const offChainRoot = toBytes32Hex(await tree.getRoot());

		expect(onChainRoot).to.equal(offChainRoot);
	});
});
