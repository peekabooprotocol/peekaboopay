import { expect } from "chai";
import { ethers } from "hardhat";
import {
	randomCommitment,
	generateDeposit,
	MerkleTree,
	generateWithdrawProof,
	deployPoolWithVerifier,
	toBytes32Hex,
	randomFieldElement,
} from "./helpers";
import type { ShieldedPool, MockERC20 } from "../typechain-types";

describe("ShieldedPool", function () {
	// Use depth-5 test circuit for fast proofs (~1s per proof)
	const TREE_DEPTH = 5;
	let pool: ShieldedPool;
	let token: MockERC20;
	let owner: Awaited<ReturnType<typeof ethers.provider.getSigner>>;
	let recipient: Awaited<ReturnType<typeof ethers.provider.getSigner>>;

	beforeEach(async function () {
		[owner, recipient] = await ethers.getSigners();

		// Deploy Groth16Verifier + ShieldedPool
		const deployed = await deployPoolWithVerifier(TREE_DEPTH);
		pool = deployed.pool;

		// Deploy MockERC20
		const TokenFactory = await ethers.getContractFactory("MockERC20");
		token = await TokenFactory.deploy("Mock USDC", "MUSDC", 6);
		await token.waitForDeployment();
	});

	// ---------------------------------------------------------------
	// Deposit — ETH
	// ---------------------------------------------------------------

	describe("ETH deposits", function () {
		it("accepts ETH deposit with valid commitment", async function () {
			const commitment = await randomCommitment();
			const tx = await pool.deposit(commitment, {
				value: ethers.parseEther("1"),
			});

			await expect(tx)
				.to.emit(pool, "Deposit")
				.withArgs(commitment, 0, await getBlockTimestamp(tx));
		});

		it("rejects zero commitment", async function () {
			await expect(
				pool.deposit(ethers.ZeroHash, {
					value: ethers.parseEther("1"),
				}),
			).to.be.revertedWith("Invalid commitment");
		});

		it("rejects duplicate commitment", async function () {
			const commitment = await randomCommitment();
			await pool.deposit(commitment, { value: ethers.parseEther("1") });

			await expect(
				pool.deposit(commitment, { value: ethers.parseEther("1") }),
			).to.be.revertedWith("Duplicate commitment");
		});

		it("rejects zero ETH value", async function () {
			const commitment = await randomCommitment();
			await expect(
				pool.deposit(commitment, { value: 0 }),
			).to.be.revertedWith("Deposit amount must be > 0");
		});

		it("increments leaf index for each deposit", async function () {
			const c1 = await randomCommitment();
			const c2 = await randomCommitment();

			const tx1 = await pool.deposit(c1, {
				value: ethers.parseEther("0.1"),
			});
			const tx2 = await pool.deposit(c2, {
				value: ethers.parseEther("0.1"),
			});

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
			await pool.deposit(commitment, {
				value: ethers.parseEther("1"),
			});
			const rootAfter = await pool.getLatestRoot();

			expect(rootAfter).to.not.equal(rootBefore);
		});
	});

	// ---------------------------------------------------------------
	// Deposit — ERC-20
	// ---------------------------------------------------------------

	describe("ERC-20 deposits", function () {
		const DEPOSIT_AMOUNT = 1_000_000n; // 1 USDC (6 decimals)

		beforeEach(async function () {
			// Mint tokens and approve pool
			await token.mint(await owner.getAddress(), DEPOSIT_AMOUNT * 10n);
			await token.approve(await pool.getAddress(), DEPOSIT_AMOUNT * 10n);
		});

		it("transfers tokens from sender to pool", async function () {
			const commitment = await randomCommitment();
			const poolAddr = await pool.getAddress();
			const ownerAddr = await owner.getAddress();

			const balBefore = await token.balanceOf(ownerAddr);
			await pool.depositERC20(
				commitment,
				await token.getAddress(),
				DEPOSIT_AMOUNT,
			);
			const balAfter = await token.balanceOf(ownerAddr);

			expect(balBefore - balAfter).to.equal(DEPOSIT_AMOUNT);
			expect(await token.balanceOf(poolAddr)).to.equal(DEPOSIT_AMOUNT);
		});

		it("emits Deposit event with correct leafIndex", async function () {
			const c1 = await randomCommitment();
			const c2 = await randomCommitment();
			const tokenAddr = await token.getAddress();

			await pool.depositERC20(c1, tokenAddr, DEPOSIT_AMOUNT);
			const tx2 = await pool.depositERC20(c2, tokenAddr, DEPOSIT_AMOUNT);

			await expect(tx2)
				.to.emit(pool, "Deposit")
				.withArgs(c2, 1, await getBlockTimestamp(tx2));
		});

		it("rejects zero amount", async function () {
			const commitment = await randomCommitment();
			await expect(
				pool.depositERC20(
					commitment,
					await token.getAddress(),
					0,
				),
			).to.be.revertedWith("Deposit amount must be > 0");
		});

		it("rejects zero token address", async function () {
			const commitment = await randomCommitment();
			await expect(
				pool.depositERC20(
					commitment,
					ethers.ZeroAddress,
					DEPOSIT_AMOUNT,
				),
			).to.be.revertedWith("Invalid token address");
		});
	});

	// ---------------------------------------------------------------
	// Withdraw — ETH (with real Groth16 proofs)
	// ---------------------------------------------------------------

	describe("ETH withdrawals", function () {
		it("sends ETH to recipient with valid proof", async function () {
			const recipientAddr = await recipient.getAddress();
			const depositAmount = ethers.parseEther("1");
			const withdrawAmount = depositAmount;

			// Create off-chain tree to mirror on-chain state
			const tree = new MerkleTree(TREE_DEPTH);
			await tree.init();

			// Generate deposit
			const deposit = await generateDeposit();
			const commitmentHex = toBytes32Hex(deposit.commitment);

			// Deposit on-chain
			await pool.deposit(commitmentHex, { value: depositAmount });

			// Insert into off-chain tree
			const leafIndex = tree.insert(deposit.commitment);

			// Generate proof
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
				amount: withdrawAmount,
			});

			const balBefore = await ethers.provider.getBalance(recipientAddr);

			const tx = await pool.withdraw(
				toBytes32Hex(deposit.nullifierHash),
				recipientAddr,
				withdrawAmount,
				ethers.ZeroAddress, // ETH
				toBytes32Hex(root),
				proofResult.proofBytes,
			);

			await expect(tx)
				.to.emit(pool, "Withdrawal")
				.withArgs(
					toBytes32Hex(deposit.nullifierHash),
					recipientAddr,
					withdrawAmount,
				);

			const balAfter = await ethers.provider.getBalance(recipientAddr);
			expect(balAfter - balBefore).to.equal(withdrawAmount);
		});

		it("rejects already-spent nullifier (double-spend)", async function () {
			const recipientAddr = await recipient.getAddress();
			const depositAmount = ethers.parseEther("2");
			const withdrawAmount = ethers.parseEther("1");

			const tree = new MerkleTree(TREE_DEPTH);
			await tree.init();

			const deposit = await generateDeposit();
			const commitmentHex = toBytes32Hex(deposit.commitment);

			await pool.deposit(commitmentHex, { value: depositAmount });
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
				amount: withdrawAmount,
			});

			// First withdrawal succeeds
			await pool.withdraw(
				toBytes32Hex(deposit.nullifierHash),
				recipientAddr,
				withdrawAmount,
				ethers.ZeroAddress,
				toBytes32Hex(root),
				proofResult.proofBytes,
			);

			// Second withdrawal with same nullifier fails
			await expect(
				pool.withdraw(
					toBytes32Hex(deposit.nullifierHash),
					recipientAddr,
					withdrawAmount,
					ethers.ZeroAddress,
					toBytes32Hex(root),
					proofResult.proofBytes,
				),
			).to.be.revertedWith("Nullifier already spent");
		});

		it("rejects unknown Merkle root", async function () {
			const recipientAddr = await recipient.getAddress();
			const depositAmount = ethers.parseEther("1");

			const tree = new MerkleTree(TREE_DEPTH);
			await tree.init();

			const deposit = await generateDeposit();
			const commitmentHex = toBytes32Hex(deposit.commitment);

			await pool.deposit(commitmentHex, { value: depositAmount });
			const leafIndex = tree.insert(deposit.commitment);

			const merkleProof = await tree.getProof(leafIndex);
			const root = await tree.getRoot();

			// Use a fake root (not in the contract's history)
			const fakeRoot = randomFieldElement();

			const proofResult = await generateWithdrawProof({
				nullifier: deposit.nullifier,
				secret: deposit.secret,
				pathElements: merkleProof.pathElements,
				pathIndices: merkleProof.pathIndices,
				root, // proof is valid for real root
				nullifierHash: deposit.nullifierHash,
				recipient: BigInt(recipientAddr),
				amount: depositAmount,
			});

			await expect(
				pool.withdraw(
					toBytes32Hex(deposit.nullifierHash),
					recipientAddr,
					depositAmount,
					ethers.ZeroAddress,
					toBytes32Hex(fakeRoot), // but we pass a fake root to the contract
					proofResult.proofBytes,
				),
			).to.be.revertedWith("Unknown Merkle root");
		});

		it("rejects withdrawal exceeding pool balance", async function () {
			const recipientAddr = await recipient.getAddress();
			const depositAmount = ethers.parseEther("1");
			const withdrawAmount = ethers.parseEther("2"); // More than deposited

			const tree = new MerkleTree(TREE_DEPTH);
			await tree.init();

			const deposit = await generateDeposit();
			const commitmentHex = toBytes32Hex(deposit.commitment);

			await pool.deposit(commitmentHex, { value: depositAmount });
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
				amount: withdrawAmount,
			});

			await expect(
				pool.withdraw(
					toBytes32Hex(deposit.nullifierHash),
					recipientAddr,
					withdrawAmount,
					ethers.ZeroAddress,
					toBytes32Hex(root),
					proofResult.proofBytes,
				),
			).to.be.revertedWith("Insufficient ETH in pool");
		});

		it("marks nullifier as spent after withdrawal", async function () {
			const recipientAddr = await recipient.getAddress();
			const amount = ethers.parseEther("1");

			const tree = new MerkleTree(TREE_DEPTH);
			await tree.init();

			const deposit = await generateDeposit();
			const commitmentHex = toBytes32Hex(deposit.commitment);
			const nullifierHashHex = toBytes32Hex(deposit.nullifierHash);

			await pool.deposit(commitmentHex, { value: amount });
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
				amount,
			});

			await pool.withdraw(
				nullifierHashHex,
				recipientAddr,
				amount,
				ethers.ZeroAddress,
				toBytes32Hex(root),
				proofResult.proofBytes,
			);

			expect(await pool.isSpentNullifier(nullifierHashHex)).to.be.true;
		});
	});

	// ---------------------------------------------------------------
	// Withdraw — ERC-20
	// ---------------------------------------------------------------

	describe("ERC-20 withdrawals", function () {
		const DEPOSIT_AMOUNT = 1_000_000n;

		it("sends ERC-20 tokens to recipient with valid proof", async function () {
			const recipientAddr = await recipient.getAddress();
			const tokenAddr = await token.getAddress();

			await token.mint(await owner.getAddress(), DEPOSIT_AMOUNT);
			await token.approve(await pool.getAddress(), DEPOSIT_AMOUNT);

			const tree = new MerkleTree(TREE_DEPTH);
			await tree.init();

			const deposit = await generateDeposit();
			const commitmentHex = toBytes32Hex(deposit.commitment);

			await pool.depositERC20(commitmentHex, tokenAddr, DEPOSIT_AMOUNT);
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
				amount: DEPOSIT_AMOUNT,
			});

			await pool.withdraw(
				toBytes32Hex(deposit.nullifierHash),
				recipientAddr,
				DEPOSIT_AMOUNT,
				tokenAddr,
				toBytes32Hex(root),
				proofResult.proofBytes,
			);

			expect(await token.balanceOf(recipientAddr)).to.equal(
				DEPOSIT_AMOUNT,
			);
		});

		it("rejects insufficient token balance", async function () {
			const recipientAddr = await recipient.getAddress();
			const tokenAddr = await token.getAddress();

			await token.mint(await owner.getAddress(), DEPOSIT_AMOUNT);
			await token.approve(await pool.getAddress(), DEPOSIT_AMOUNT);

			const tree = new MerkleTree(TREE_DEPTH);
			await tree.init();

			const deposit = await generateDeposit();
			const commitmentHex = toBytes32Hex(deposit.commitment);

			await pool.depositERC20(commitmentHex, tokenAddr, DEPOSIT_AMOUNT);
			const leafIndex = tree.insert(deposit.commitment);

			const merkleProof = await tree.getProof(leafIndex);
			const root = await tree.getRoot();

			// Try to withdraw double the deposited amount
			const proofResult = await generateWithdrawProof({
				nullifier: deposit.nullifier,
				secret: deposit.secret,
				pathElements: merkleProof.pathElements,
				pathIndices: merkleProof.pathIndices,
				root,
				nullifierHash: deposit.nullifierHash,
				recipient: BigInt(recipientAddr),
				amount: DEPOSIT_AMOUNT * 2n,
			});

			await expect(
				pool.withdraw(
					toBytes32Hex(deposit.nullifierHash),
					recipientAddr,
					DEPOSIT_AMOUNT * 2n,
					tokenAddr,
					toBytes32Hex(root),
					proofResult.proofBytes,
				),
			).to.be.revertedWith("Insufficient token balance in pool");
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
			await pool.deposit(commitment, {
				value: ethers.parseEther("0.1"),
			});
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
			await pool.deposit(c1, {
				value: ethers.parseEther("0.1"),
			});
			expect(await pool.getNextIndex()).to.equal(1);
			const c2 = await randomCommitment();
			await pool.deposit(c2, {
				value: ethers.parseEther("0.1"),
			});
			expect(await pool.getNextIndex()).to.equal(2);
		});
	});

	// ---------------------------------------------------------------
	// Multi-deposit + multi-withdraw scenario
	// ---------------------------------------------------------------

	describe("multi-deposit multi-withdraw", function () {
		it("handles multiple deposits followed by multiple withdrawals", async function () {
			this.timeout(60000); // Proof generation takes time

			const recipientAddr = await recipient.getAddress();
			const depositAmount = ethers.parseEther("1");
			const withdrawAmount = ethers.parseEther("0.5");

			const tree = new MerkleTree(TREE_DEPTH);
			await tree.init();

			// Generate 3 deposits
			const deposits = [];
			for (let i = 0; i < 3; i++) {
				const deposit = await generateDeposit();
				deposits.push(deposit);

				const commitmentHex = toBytes32Hex(deposit.commitment);
				await pool.deposit(commitmentHex, { value: depositAmount });
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
					amount: withdrawAmount,
				});

				await pool.withdraw(
					toBytes32Hex(deposit.nullifierHash),
					recipientAddr,
					withdrawAmount,
					ethers.ZeroAddress,
					toBytes32Hex(root),
					proofResult.proofBytes,
				);
			}

			const balAfter = await ethers.provider.getBalance(recipientAddr);
			expect(balAfter - balBefore).to.equal(ethers.parseEther("1.5"));
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
