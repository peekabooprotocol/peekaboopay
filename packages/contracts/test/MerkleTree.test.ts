import { expect } from "chai";
import { ethers } from "hardhat";
import {
	randomCommitment,
	hashLeftRight,
	deployPoolWithVerifier,
} from "./helpers";

/**
 * MerkleTree tests exercise the IncrementalMerkleTree library (with Poseidon
 * hashing) through the ShieldedPool contract.
 * We use a small tree depth (5) for fast tests.
 */
describe("IncrementalMerkleTree", function () {
	const TREE_DEPTH = 5; // 2^5 = 32 leaves max — plenty for testing
	let pool: Awaited<ReturnType<typeof deployPoolWithVerifier>>["pool"];

	async function deployPool() {
		const { pool } = await deployPoolWithVerifier(TREE_DEPTH);
		return pool;
	}

	beforeEach(async function () {
		pool = await deployPool();
	});

	it("initial root is the zero-tree root (Poseidon)", async function () {
		// Compute expected root: hash chain of zero hashes using Poseidon
		let expectedRoot = ethers.ZeroHash;
		for (let i = 0; i < TREE_DEPTH; i++) {
			expectedRoot = await hashLeftRight(expectedRoot, expectedRoot);
		}

		const root = await pool.getLatestRoot();
		expect(root).to.equal(expectedRoot);
	});

	it("first insert changes the root from zero", async function () {
		const rootBefore = await pool.getLatestRoot();

		const commitment = await randomCommitment();
		await pool.deposit(commitment, { value: ethers.parseEther("1") });

		const rootAfter = await pool.getLatestRoot();
		expect(rootAfter).to.not.equal(rootBefore);
	});

	it("sequential inserts produce unique roots", async function () {
		const roots = new Set<string>();

		for (let i = 0; i < 5; i++) {
			const commitment = await randomCommitment();
			await pool.deposit(commitment, { value: ethers.parseEther("0.1") });
			const root = await pool.getLatestRoot();
			roots.add(root);
		}

		expect(roots.size).to.equal(5);
	});

	it("same leaves in same order produce deterministic root", async function () {
		const commitments: string[] = [];
		for (let i = 0; i < 3; i++) {
			commitments.push(await randomCommitment());
		}

		// Deploy two separate pools and insert the same commitments
		const pool2 = await deployPool();

		for (const c of commitments) {
			await pool.deposit(c, { value: ethers.parseEther("0.1") });
			await pool2.deposit(c, { value: ethers.parseEther("0.1") });
		}

		const root1 = await pool.getLatestRoot();
		const root2 = await pool2.getLatestRoot();
		expect(root1).to.equal(root2);
	});

	it("isKnownRoot works with root history buffer", async function () {
		const commitment1 = await randomCommitment();
		await pool.deposit(commitment1, { value: ethers.parseEther("0.1") });
		const root1 = await pool.getLatestRoot();

		const commitment2 = await randomCommitment();
		await pool.deposit(commitment2, { value: ethers.parseEther("0.1") });
		const root2 = await pool.getLatestRoot();

		// Both roots should be known
		expect(await pool.isKnownRoot(root1)).to.be.true;
		expect(await pool.isKnownRoot(root2)).to.be.true;

		// Random root should not be known
		const fakeRoot = await randomCommitment();
		expect(await pool.isKnownRoot(fakeRoot)).to.be.false;
	});
});
