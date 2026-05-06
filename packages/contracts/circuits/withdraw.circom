pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

/**
 * PoseidonMerkleTreeChecker
 *
 * Verifies a Merkle proof using Poseidon hashing.
 * Given a leaf, path elements, and path indices, computes the root
 * and constrains it to match the expected root.
 */
template PoseidonMerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hashers[levels];
    component mux[levels];

    signal levelHashes[levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        // Verify pathIndices are binary (0 or 1)
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        // Determine left/right ordering based on path index
        // If pathIndices[i] == 0: current is left child, sibling is right
        // If pathIndices[i] == 1: current is right child, sibling is left
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== levelHashes[i] + (pathElements[i] - levelHashes[i]) * pathIndices[i];
        hashers[i].inputs[1] <== pathElements[i] + (levelHashes[i] - pathElements[i]) * pathIndices[i];

        levelHashes[i + 1] <== hashers[i].out;
    }

    // The computed root must match the expected root
    root === levelHashes[levels];
}

/**
 * Withdraw Circuit
 *
 * Proves that the prover:
 * 1. Knows (nullifier, secret) such that Poseidon(nullifier, secret) = commitment
 * 2. The commitment exists as a leaf in the Merkle tree at the given root
 * 3. Poseidon(nullifier) = nullifierHash
 * 4. Binds recipient and amount to the proof (prevents front-running)
 *
 * Follows the Tornado Cash withdrawal pattern adapted for Poseidon hashing.
 */
template Withdraw(levels) {
    // Public inputs
    signal input root;
    signal input nullifierHash;
    signal input recipient;   // address as field element
    signal input amount;      // uint256 as field element

    // Private inputs
    signal input nullifier;
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // Step 1: Compute commitment = Poseidon(nullifier, secret)
    component commitmentHasher = Poseidon(2);
    commitmentHasher.inputs[0] <== nullifier;
    commitmentHasher.inputs[1] <== secret;

    // Step 2: Compute nullifier hash and verify it matches the public input
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHash === nullifierHasher.out;

    // Step 3: Verify Merkle proof
    component tree = PoseidonMerkleTreeChecker(levels);
    tree.leaf <== commitmentHasher.out;
    tree.root <== root;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }

    // Step 4: Bind recipient and amount to prevent front-running
    // These are public inputs — constraining them into the proof
    // means the proof is only valid for this specific recipient and amount.
    // We use a "square constraint" trick to force the compiler to include them.
    signal recipientSquare;
    recipientSquare <== recipient * recipient;

    signal amountSquare;
    amountSquare <== amount * amount;
}

// Main circuit: 20-level tree (supports ~1M deposits)
component main {public [root, nullifierHash, recipient, amount]} = Withdraw(20);
