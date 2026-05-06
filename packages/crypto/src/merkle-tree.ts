import { poseidonHash2 } from "./poseidon.js";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface MerkleProof {
	pathElements: bigint[];
	pathIndices: number[];
}

// ---------------------------------------------------------------
// Off-chain Merkle Tree (Poseidon)
// ---------------------------------------------------------------

/**
 * Incremental Merkle tree using Poseidon hashing.
 * Mirrors the on-chain IncrementalMerkleTree exactly.
 */
export class MerkleTree {
	levels: number;
	private leaves: bigint[];
	private zeroValues: bigint[];

	constructor(levels: number) {
		this.levels = levels;
		this.leaves = [];
		this.zeroValues = [];
	}

	/**
	 * Initialize zero values (must be called before use).
	 */
	async init(): Promise<void> {
		// zeros[0] = 0, zeros[i] = Poseidon(zeros[i-1], zeros[i-1])
		this.zeroValues = [0n];
		let current = 0n;
		for (let i = 1; i <= this.levels; i++) {
			current = await poseidonHash2(current, current);
			this.zeroValues.push(current);
		}
	}

	/**
	 * Insert a leaf and return its index.
	 */
	insert(leaf: bigint): number {
		const index = this.leaves.length;
		if (index >= 2 ** this.levels) {
			throw new Error("Merkle tree is full");
		}
		this.leaves.push(leaf);
		return index;
	}

	/**
	 * Get the number of leaves inserted.
	 */
	get leafCount(): number {
		return this.leaves.length;
	}

	/**
	 * Compute the current Merkle root.
	 */
	async getRoot(): Promise<bigint> {
		let currentLevel = [...this.leaves];

		// Pad to full width at each level
		for (let level = 0; level < this.levels; level++) {
			const nextLevel: bigint[] = [];
			const levelSize = currentLevel.length;

			for (let i = 0; i < Math.ceil(levelSize / 2); i++) {
				const left = currentLevel[i * 2];
				const right =
					i * 2 + 1 < levelSize
						? currentLevel[i * 2 + 1]
						: this.zeroValues[level];
				nextLevel.push(await poseidonHash2(left, right));
			}

			// If no pairs at all (empty level), use zero hash at next level
			if (nextLevel.length === 0) {
				return this.zeroValues[this.levels];
			}

			// Pad remaining with zero hashes at the next level
			currentLevel = nextLevel;
		}

		return currentLevel[0];
	}

	/**
	 * Get the Merkle proof for a given leaf index.
	 * Returns pathElements (sibling nodes) and pathIndices (0=left, 1=right).
	 */
	async getProof(leafIndex: number): Promise<MerkleProof> {
		if (leafIndex >= this.leaves.length) {
			throw new Error(`Leaf index ${leafIndex} not inserted`);
		}

		const pathElements: bigint[] = [];
		const pathIndices: number[] = [];
		let currentIndex = leafIndex;

		// Build the tree level by level to find siblings
		let currentLevel = [...this.leaves];

		for (let level = 0; level < this.levels; level++) {
			// Is current node a left child (even) or right child (odd)?
			const isRight = currentIndex % 2 === 1;
			pathIndices.push(isRight ? 1 : 0);

			// Sibling is on the other side
			const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

			if (siblingIndex < currentLevel.length) {
				pathElements.push(currentLevel[siblingIndex]);
			} else {
				pathElements.push(this.zeroValues[level]);
			}

			// Build the next level
			const nextLevel: bigint[] = [];
			for (let i = 0; i < currentLevel.length; i += 2) {
				const left = currentLevel[i];
				const right =
					i + 1 < currentLevel.length
						? currentLevel[i + 1]
						: this.zeroValues[level];
				nextLevel.push(await poseidonHash2(left, right));
			}

			currentLevel = nextLevel;
			currentIndex = Math.floor(currentIndex / 2);
		}

		return { pathElements, pathIndices };
	}
}
