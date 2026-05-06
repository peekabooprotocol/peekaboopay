// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoseidonHasher} from "./PoseidonHasher.sol";

/**
 * @title IncrementalMerkleTree
 * @notice Gas-efficient incremental Merkle tree using Poseidon hashing.
 *         Depth is fixed at construction. Supports up to 2^levels leaves.
 *
 *         Uses Poseidon(2) for SNARK-friendly hashing — the same hash
 *         function used in the withdrawal Circom circuit, ensuring
 *         on-chain and off-chain Merkle proofs match exactly.
 */
library IncrementalMerkleTree {
    uint32 constant ROOT_HISTORY_SIZE = 30;

    struct Tree {
        uint32 levels;
        uint32 nextIndex;
        // filledSubtrees[i] = the latest node at level i that is "full"
        mapping(uint256 => bytes32) filledSubtrees;
        // Circular buffer of recent roots
        mapping(uint256 => bytes32) roots;
        uint32 currentRootIndex;
    }

    /**
     * @notice Initialize the tree with pre-computed zero hashes.
     * @param self  The tree storage
     * @param levels  Tree depth (e.g. 20 for ~1M leaves)
     */
    function init(Tree storage self, uint32 levels) internal {
        require(levels > 0 && levels <= 32, "Invalid tree depth");
        self.levels = levels;

        // Compute zero hashes using Poseidon:
        // zeros[0] = 0, zeros[i] = Poseidon(zeros[i-1], zeros[i-1])
        bytes32 currentZero = bytes32(0);
        for (uint32 i = 0; i < levels; i++) {
            self.filledSubtrees[i] = currentZero;
            currentZero = hashLeftRight(currentZero, currentZero);
        }

        // Store initial root (all-zero tree)
        self.roots[0] = currentZero;
    }

    /**
     * @notice Insert a new leaf into the tree.
     * @param self  The tree storage
     * @param leaf  The leaf value (typically a commitment hash)
     * @return newRoot  The new Merkle root after insertion
     * @return leafIndex  The index at which the leaf was inserted
     */
    function insert(
        Tree storage self,
        bytes32 leaf
    ) internal returns (bytes32 newRoot, uint32 leafIndex) {
        uint32 _nextIndex = self.nextIndex;
        require(
            _nextIndex < uint32(2) ** self.levels,
            "Merkle tree is full"
        );

        uint32 currentIndex = _nextIndex;
        bytes32 currentLevelHash = leaf;
        bytes32 left;
        bytes32 right;

        for (uint32 i = 0; i < self.levels; i++) {
            if (currentIndex % 2 == 0) {
                // We're the left child: store ourselves and pair with the zero hash
                left = currentLevelHash;
                right = zeros(i);
                self.filledSubtrees[i] = currentLevelHash;
            } else {
                // We're the right child: pair with the stored left sibling
                left = self.filledSubtrees[i];
                right = currentLevelHash;
            }

            currentLevelHash = hashLeftRight(left, right);
            currentIndex /= 2;
        }

        uint32 newRootIndex = (self.currentRootIndex + 1) % ROOT_HISTORY_SIZE;
        self.currentRootIndex = newRootIndex;
        self.roots[newRootIndex] = currentLevelHash;

        leafIndex = _nextIndex;
        self.nextIndex = _nextIndex + 1;
        newRoot = currentLevelHash;
    }

    /**
     * @notice Check if a root is in the recent history.
     */
    function isKnownRoot(
        Tree storage self,
        bytes32 root
    ) internal view returns (bool) {
        if (root == bytes32(0)) return false;
        uint32 i = self.currentRootIndex;
        do {
            if (self.roots[i] == root) return true;
            if (i == 0) {
                i = ROOT_HISTORY_SIZE - 1;
            } else {
                i--;
            }
        } while (i != self.currentRootIndex);
        return false;
    }

    /**
     * @notice Get the latest Merkle root.
     */
    function getLatestRoot(
        Tree storage self
    ) internal view returns (bytes32) {
        return self.roots[self.currentRootIndex];
    }

    /**
     * @dev Hash two children together using Poseidon.
     *      Matches circomlib's Poseidon(2) circuit template.
     */
    function hashLeftRight(
        bytes32 left,
        bytes32 right
    ) internal pure returns (bytes32) {
        return PoseidonHasher.hash(left, right);
    }

    /**
     * @dev Return the zero hash at a given level.
     *      zeros(0) = bytes32(0)
     *      zeros(i) = Poseidon(zeros[i-1], zeros[i-1])
     */
    function zeros(uint256 level) internal pure returns (bytes32) {
        bytes32 currentZero = bytes32(0);
        for (uint256 i = 0; i < level; i++) {
            currentZero = hashLeftRight(currentZero, currentZero);
        }
        return currentZero;
    }
}
