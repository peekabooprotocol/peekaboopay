pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

// Re-include the same templates from withdraw.circom
// (circom doesn't support cross-file template imports without include)

template PoseidonMerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hashers[levels];

    signal levelHashes[levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== levelHashes[i] + (pathElements[i] - levelHashes[i]) * pathIndices[i];
        hashers[i].inputs[1] <== pathElements[i] + (levelHashes[i] - pathElements[i]) * pathIndices[i];

        levelHashes[i + 1] <== hashers[i].out;
    }

    root === levelHashes[levels];
}

template Withdraw(levels) {
    signal input root;
    signal input nullifierHash;
    signal input recipient;
    signal input amount;

    signal input nullifier;
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component commitmentHasher = Poseidon(2);
    commitmentHasher.inputs[0] <== nullifier;
    commitmentHasher.inputs[1] <== secret;

    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHash === nullifierHasher.out;

    component tree = PoseidonMerkleTreeChecker(levels);
    tree.leaf <== commitmentHasher.out;
    tree.root <== root;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }

    signal recipientSquare;
    recipientSquare <== recipient * recipient;

    signal amountSquare;
    amountSquare <== amount * amount;
}

// Test circuit: 5-level tree (32 leaves max — fast proofs for CI)
component main {public [root, nullifierHash, recipient, amount]} = Withdraw(5);
