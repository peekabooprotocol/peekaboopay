// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoseidonT3} from "poseidon-solidity/PoseidonT3.sol";

/**
 * @title PoseidonHasher
 * @notice Thin wrapper around PoseidonT3 for 2-input Poseidon hashing.
 *         Used by IncrementalMerkleTree for SNARK-friendly Merkle trees.
 *         The constants match circomlib's Poseidon(2) circuit exactly.
 */
library PoseidonHasher {
    /**
     * @dev Hash two field elements using Poseidon.
     *      Matches circomlib's Poseidon(2) circuit template.
     */
    function hash(bytes32 left, bytes32 right) internal pure returns (bytes32) {
        return bytes32(PoseidonT3.hash([uint256(left), uint256(right)]));
    }
}
