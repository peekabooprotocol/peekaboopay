import { expect } from "chai";
import { ethers } from "hardhat";
import {
	randomCommitment,
	generateDeposit,
	MerkleTree,
	generateWithdrawProof,
	deployDenominatedPoolWithVerifier,
	toBytes32Hex,
	randomFieldElement,
} from "./helpers";
import type { DenominatedPool } from "../typechain-types";

describe("DenominatedPool", function () {
	// Use depth-5 test circuit for fast proofs (~1s per proof)
	const TREE_DEPTH = 5;
	const DENOMINATION = ethers.parseEther("1"); // 1 TAO / ETH
	let pool: DenominatedPool;
	let owner: Awaited<ReturnType<typeof ethers.provider.getSigner>>;
	let recipient: Awaited<ReturnType<typeof ethers.provider.getSigner>>;
	let other: Awaited<ReturnType<typeof ethers.provider.getSigner>>;

	beforeEach(async function () {
		[owner, recipient, other] = await ethers.getSigners();

		// Deploy Groth16Verifier + DenominatedPool
		const deployed = await deployDenominatedPoolWithVerifier(
			TREE_DEPTH,
			DENOMINATION,
		);
		pool = deployed.pool as unknown as DenominatedPool;
	});

	// ---------------------------------------------------------------
	// Constructor & immutables
	// ---------------------------------------------------------------

	describe("constructor", function () {
		it("sets denomination correctly", async function () {
			expect(await pool.denomination()).to.equal(DENOMINATION);
		});

		it("sets levels correctly", async function () {
			expect(await pool.levels()).to.equal(TREE_DEPTH);
		});

		it("sets owner to deployer", async function () {
			expect(await pool.owner()).to.equal(await owner.getAddress());
		});

		it("sets fee basis points", async function () {
			expect(await pool.feeBasisPoints()).to.equal(50);
		});

		it("sets fee recipient", async function () {
			expect(await pool.feeRecipient()).to.equal(
				await owner.getAddress(),
			);
		});
	});

	// ---------------------------------------------------------------
	// Deposit — fixed denomination
	// ---------------------------------------------------------------

	describe("deposits", function () {
		it("accepts deposit with exact denomination", async function () {
			const commitment = await randomCommitment();
			const tx = await pool.deposit(commitment, {
				value: DENOMINATION,
			});

			await expect(tx)
				.to.emit(pool, "Deposit")
				.withArgs(commitment, 0, await getBlockTimestamp(tx));
		});

		it("rejects deposit with wrong amount (too little)", async function () {
			const commitment = await randomCommitment();
			await expect(
				pool.deposit(commitment, {
					value: ethers.parseEther("0.5"),
				}),
			).to.be.revertedWith("Must deposit exact denomination");
		});

		it("rejects deposit with wrong amount (too much)", async function () {
			const commitment = await randomCommitment();
			await expect(
				pool.deposit(commitment, {
					value: ethers.parseEther("2"),
				}),
			).to.be.revertedWith("Must deposit exact denomination");
		});

		it("rejects deposit with zero value", async function () {
			const commitment = await randomCommitment();
			await expect(
				pool.deposit(commitment, { value: 0 }),
			).to.be.revertedWith("Must deposit exact denomination");
		});

		it("rejects zero commitment", async function () {
			await expect(
				pool.deposit(ethers.ZeroHash, {
					value: DENOMINATION,
				}),
			).to.be.revertedWith("Invalid commitment");
		});

		it("rejects duplicate commitment", async function () {
			const commitment = await randomCommitment();
			await pool.deposit(commitment, { value: DENOMINATION });

			await expect(
				pool.deposit(commitment, { value: DENOMINATION }),
			).to.be.revertedWith("Duplicate commitment");
		});

		it("increments leaf index for each deposit", async function () {
			const c1 = await randomCommitment();
			const c2 = await randomCommitment();

			const tx1 = await pool.deposit(c1, { value: DENOMINATION });
			const tx2 = await pool.deposit(c2, { value: DENOMINATION });

			await expect(tx1)
				.to.emit(pool, "Deposit")
				.withArgs(c1, 0, await getBlockTimestamp(tx1));
			await expect(tx2)
				.to.emit(pool, "Deposit")
				.withArgs(c2, 1, await getBlockTimestamp(tx2));
		});

		it("updates Merkle root after deposit", async function () {
			const rootBefore = await pool.getLatestRoot();
			const commitment = await randomCommitment();
			await pool.deposit(commitment, { value: DENOMINATION });
			const rootAfter = await pool.getLatestRoot();

			expect(rootAfter).to.not.equal(rootBefore);
		});

		it("holds full denomination in pool (no deposit fee)", async function () {
			const commitment = await randomCommitment();
			const poolAddr = await pool.getAddress();

			await pool.connect(other).deposit(commitment, {
				value: DENOMINATION,
			});

			// Pool holds the full denomination — fees only on withdrawal
			const poolBal = await ethers.provider.getBalance(poolAddr);
			expect(poolBal).to.equal(DENOMINATION);
		});
	});

	// ---------------------------------------------------------------
	// Withdraw — fixed denomination with ZK proof
	// ---------------------------------------------------------------

	describe("withdrawals", function () {
		it("sends net amount to recipient with valid proof", async function () {
			const recipientAddr = await recipient.getAddress();

			// Create off-chain tree to mirror on-chain state
			const tree = new MerkleTree(TREE_DEPTH);
			await tree.init();

			// Generate deposit
			const deposit = await generateDeposit();
			const commitmentHex = toBytes32Hex(deposit.commitment);

			// Deposit on-chain (exact denomination)
			await pool.deposit(commitmentHex, { value: DENOMINATION });

			// Insert into off-chain tree
			const leafIndex = tree.insert(deposit.commitment);

			// Generate proof — amount is always the denomination
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
				amount: DENOMINATION,
			});

			const balBefore = await ethers.provider.getBalance(recipientAddr);

			const tx = await pool.withdraw(
				toBytes32Hex(deposit.nullifierHash),
				recipientAddr,
				toBytes32Hex(root),
				proofResult.proofBytes,
			);

			await expect(tx)
				.to.emit(pool, "Withdrawal")
				.withArgs(
					toBytes32Hex(deposit.nullifierHash),
					recipientAddr,
					DENOMINATION,
				);

			const balAfter = await ethers.provider.getBalance(recipientAddr);
			// Recipient gets denomination minus 0.5% withdrawal fee
			const expectedNet =
				DENOMINATION - (DENOMINATION * 50n) / 10000n;
			expect(balAfter - balBefore).to.equal(expectedNet);
		});

		it("rejects already-spent nullifier (double-spend)", async function () {
			const recipientAddr = await recipient.getAddress();

			const tree = new MerkleTree(TREE_DEPTH);
			await tree.init();

			const deposit = await generateDeposit();
			const commitmentHex = toBytes32Hex(deposit.commitment);

			await pool.deposit(commitmentHex, { value: DENOMINATION });
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
				amount: DENOMINATION,
			});

			// First withdrawal succeeds
			await pool.withdraw(
				toBytes32Hex(deposit.nullifierHash),
				recipientAddr,
				toBytes32Hex(root),
				proofResult.proofBytes,
			);

			// Second withdrawal with same nullifier fails
			await expect(
				pool.withdraw(
					toBytes32Hex(deposit.nullifierHash),
					recipientAddr,
					toBytes32Hex(root),
					proofResult.proofBytes,
				),
			).to.be.revertedWith("Nullifier already spent");
		});

		it("rejects unknown Merkle root", async function () {
			const recipientAddr = await recipient.getAddress();

			const tree = new MerkleTree(TREE_DEPTH);
			await tree.init();

			const deposit = await generateDeposit();
			const commitmentHex = toBytes32Hex(deposit.commitment);

			await pool.deposit(commitmentHex, { value: DENOMINATION });
			const leafIndex = tree.insert(deposit.commitment);

			const merkleProof = await tree.getProof(leafIndex);
			const root = await tree.getRoot();

			// Use a fake root
			const fakeRoot = randomFieldElement();

			const proofResult = await generateWithdrawProof({
				nullifier: deposit.nullifier,
				secret: deposit.secret,
				pathElements: merkleProof.pathElements,
				pathIndices: merkleProof.pathIndices,
				root,
				nullifierHash: deposit.nullifierHash,
				recipient: BigInt(recipientAddr),
				amount: DENOMINATION,
			});

			await expect(
				pool.withdraw(
					toBytes32Hex(deposit.nullifierHash),
					recipientAddr,
					toBytes32Hex(fakeRoot), // fake root
					proofResult.proofBytes,
				),
			).to.be.revertedWith("Unknown Merkle root");
		});

		it("marks nullifier as spent after withdrawal", async function () {
			const recipientAddr = await recipient.getAddress();

			const tree = new MerkleTree(TREE_DEPTH);
			await tree.init();

			const deposit = await generateDeposit();
			const commitmentHex = toBytes32Hex(deposit.commitment);
			const nullifierHashHex = toBytes32Hex(deposit.nullifierHash);

			await pool.deposit(commitmentHex, { value: DENOMINATION });
			const leafIndex = tree.insert(deposit.commitment);

			const merkleProof = await tree.getProof(leafIndex);
			const root = await tree.getRoot();

			expect(await pool.isSpentNullifier(nullifierHashHex)).to.be.false;

			const proofResult = await generateWithdrawProof({
				nullifier: deposit.nullifier,
				secret: deposit.secret,
				pathElements: merkleProof.pathElements,
				pathIndices: merkleProof.pathIndices,
				root,
				nullifierHash: deposit.nullifierHash,
				recipient: BigInt(recipientAddr),
				amount: DENOMINATION,
			});

			await pool.withdraw(
				nullifierHashHex,
				recipientAddr,
				toBytes32Hex(root),
				proofResult.proofBytes,
			);

			expect(await pool.isSpentNullifier(nullifierHashHex)).to.be.true;
		});
	});

	// ---------------------------------------------------------------
	// View functions
	// ---------------------------------------------------------------

	describe("view functions", function () {
		it("getLatestRoot returns current root", async function () {
			const root = await pool.getLatestRoot();
			expect(root).to.not.equal(ethers.ZeroHash);
		});

		it("isKnownRoot returns true for recent roots", async function () {
			const commitment = await randomCommitment();
			await pool.deposit(commitment, { value: DENOMINATION });
			const root = await pool.getLatestRoot();
			expect(await pool.isKnownRoot(root)).to.be.true;
		});

		it("isKnownRoot returns false for unknown root", async function () {
			const fakeRoot = await randomCommitment();
			expect(await pool.isKnownRoot(fakeRoot)).to.be.false;
		});

		it("getNextIndex tracks deposit count", async function () {
			expect(await pool.getNextIndex()).to.equal(0);
			const c1 = await randomCommitment();
			await pool.deposit(c1, { value: DENOMINATION });
			expect(await pool.getNextIndex()).to.equal(1);
			const c2 = await randomCommitment();
			await pool.deposit(c2, { value: DENOMINATION });
			expect(await pool.getNextIndex()).to.equal(2);
		});
	});

	// ---------------------------------------------------------------
	// Fee management
	// ---------------------------------------------------------------

	describe("fee management", function () {
		it("owner can update fee", async function () {
			await expect(pool.setFee(100))
				.to.emit(pool, "FeeUpdated")
				.withArgs(100);
			expect(await pool.feeBasisPoints()).to.equal(100);
		});

		it("rejects fee > MAX_FEE_BPS", async function () {
			await expect(pool.setFee(201)).to.be.revertedWith("Fee too high");
		});

		it("non-owner cannot update fee", async function () {
			await expect(
				pool.connect(other).setFee(100),
			).to.be.revertedWith("Not owner");
		});

		it("owner can update fee recipient", async function () {
			const newRecipient = await other.getAddress();
			await expect(pool.setFeeRecipient(newRecipient))
				.to.emit(pool, "FeeRecipientUpdated")
				.withArgs(newRecipient);
			expect(await pool.feeRecipient()).to.equal(newRecipient);
		});

		it("rejects zero address fee recipient", async function () {
			await expect(
				pool.setFeeRecipient(ethers.ZeroAddress),
			).to.be.revertedWith("Invalid fee recipient");
		});

		it("owner can transfer ownership", async function () {
			const newOwner = await other.getAddress();
			await expect(pool.transferOwnership(newOwner))
				.to.emit(pool, "OwnerTransferred")
				.withArgs(newOwner);
			expect(await pool.owner()).to.equal(newOwner);
		});

		it("rejects zero address owner", async function () {
			await expect(
				pool.transferOwnership(ethers.ZeroAddress),
			).to.be.revertedWith("Invalid owner");
		});
	});

	// ---------------------------------------------------------------
	// Multi-deposit + multi-withdraw scenario
	// ---------------------------------------------------------------

	describe("multi-deposit multi-withdraw", function () {
		it("handles multiple deposits followed by multiple withdrawals", async function () {
			this.timeout(60000); // Proof generation takes time

			const recipientAddr = await recipient.getAddress();

			const tree = new MerkleTree(TREE_DEPTH);
			await tree.init();

			// Generate 3 deposits (all same denomination)
			const deposits = [];
			for (let i = 0; i < 3; i++) {
				const deposit = await generateDeposit();
				deposits.push(deposit);

				const commitmentHex = toBytes32Hex(deposit.commitment);
				await pool.deposit(commitmentHex, { value: DENOMINATION });
				tree.insert(deposit.commitment);
			}

			const root = await tree.getRoot();
			const balBefore = await ethers.provider.getBalance(recipientAddr);

			// Withdraw from each deposit
			for (let i = 0; i < 3; i++) {
				const deposit = deposits[i];
				const merkleProof = await tree.getProof(i);

				const proofResult = await generateWithdrawProof({
					nullifier: deposit.nullifier,
					secret: deposit.secret,
					pathElements: merkleProof.pathElements,
					pathIndices: merkleProof.pathIndices,
					root,
					nullifierHash: deposit.nullifierHash,
					recipient: BigInt(recipientAddr),
					amount: DENOMINATION,
				});

				await pool.withdraw(
					toBytes32Hex(deposit.nullifierHash),
					recipientAddr,
					toBytes32Hex(root),
					proofResult.proofBytes,
				);
			}

			const balAfter = await ethers.provider.getBalance(recipientAddr);
			// Each withdrawal: 1 TAO minus 0.5% fee = 0.995 TAO x 3 = 2.985 TAO
			const perWithdrawNet =
				DENOMINATION - (DENOMINATION * 50n) / 10000n;
			expect(balAfter - balBefore).to.equal(perWithdrawNet * 3n);
		});
	});

	// ---------------------------------------------------------------
	// Different denominations
	// ---------------------------------------------------------------

	describe("different denomination sizes", function () {
		it("works with 0.1 TAO denomination", async function () {
			const smallDenom = ethers.parseEther("0.1");
			const deployed = await deployDenominatedPoolWithVerifier(
				TREE_DEPTH,
				smallDenom,
			);
			const smallPool = deployed.pool as unknown as DenominatedPool;

			const commitment = await randomCommitment();
			const tx = await smallPool.deposit(commitment, {
				value: smallDenom,
			});

			await expect(tx)
				.to.emit(smallPool, "Deposit")
				.withArgs(commitment, 0, await getBlockTimestamp(tx));

			expect(await smallPool.denomination()).to.equal(smallDenom);
		});

		it("works with 10 TAO denomination", async function () {
			const largeDenom = ethers.parseEther("10");
			const deployed = await deployDenominatedPoolWithVerifier(
				TREE_DEPTH,
				largeDenom,
			);
			const largePool = deployed.pool as unknown as DenominatedPool;

			const commitment = await randomCommitment();
			const tx = await largePool.deposit(commitment, {
				value: largeDenom,
			});

			await expect(tx)
				.to.emit(largePool, "Deposit")
				.withArgs(commitment, 0, await getBlockTimestamp(tx));

			expect(await largePool.denomination()).to.equal(largeDenom);
		});
	});
});

// ---------------------------------------------------------------
// Helper
// ---------------------------------------------------------------

async function getBlockTimestamp(
	tx: Awaited<
		ReturnType<typeof ethers.provider.getSigner>
	>["sendTransaction"] extends (...args: any[]) => infer R
		? Awaited<R>
		: any,
): Promise<number> {
	const receipt = await (tx as any).wait();
	const block = await ethers.provider.getBlock(receipt.blockNumber);
	return block!.timestamp;
}
