pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

// DualMux switches the order of two elements based on selector bit s
// s = 0: out[0] = in[0], out[1] = in[1] (current is left child)
// s = 1: out[0] = in[1], out[1] = in[0] (current is right child)
template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];

    s * (1 - s) === 0; // ensure s is binary (0 or 1)
    out[0] <== (in[1] - in[0]) * s + in[0];
    out[1] <== (in[0] - in[1]) * s + in[1];
}

// MerkleProof: Verifies membership of a secret leaf in a tree of depth DEPTH
template MerkleProof(DEPTH) {
    signal input leaf;
    signal input pathElements[DEPTH];
    signal input pathIndices[DEPTH];
    signal output root;

    component mux[DEPTH];
    component hashers[DEPTH];

    signal current[DEPTH + 1];
    current[0] <== leaf;

    for (var i = 0; i < DEPTH; i++) {
        mux[i] = DualMux();
        mux[i].in[0] <== current[i];
        mux[i].in[1] <== pathElements[i];
        mux[i].s <== pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];

        current[i + 1] <== hashers[i].out;
    }

    root <== current[DEPTH];
}
