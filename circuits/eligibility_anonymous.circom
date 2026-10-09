pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/eddsaposeidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "./merkle.circom";

// Select picks in[idx]; idx must be valid slot 0..N-1
template Select(N) {
    signal input in[N];
    signal input idx;
    signal output out;

    component eq[N];
    signal partial[N];
    var sumSel = 0;
    var acc = 0;
    for (var i = 0; i < N; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== idx;
        eq[i].in[1] <== i;
        partial[i] <== eq[i].out * in[i];
        sumSel += eq[i].out;
        acc += partial[i];
    }
    sumSel === 1;
    out <== acc;
}

// Predicate: "is fields[fieldIndex] <op> threshold ?" -> out = 0 or 1
template Predicate(N) {
    signal input fields[N];
    signal input fieldIndex;
    signal input op;
    signal input threshold;
    signal output out;

    component sel = Select(N);
    for (var i = 0; i < N; i++) { sel.in[i] <== fields[i]; }
    sel.idx <== fieldIndex;

    component vBits = Num2Bits(64);
    vBits.in <== sel.out;
    component tBits = Num2Bits(64);
    tBits.in <== threshold;

    component lt = LessThan(64);
    lt.in[0] <== sel.out;
    lt.in[1] <== threshold;
    component gt = LessThan(64);
    gt.in[0] <== threshold;
    gt.in[1] <== sel.out;
    component eqv = IsEqual();
    eqv.in[0] <== sel.out;
    eqv.in[1] <== threshold;

    signal r[5];
    r[0] <== 1 - lt.out;   // >=
    r[1] <== 1 - gt.out;   // <=
    r[2] <== gt.out;       // >
    r[3] <== lt.out;       // <
    r[4] <== eqv.out;      // ==

    component isOp[5];
    signal term[5];
    var opSum = 0;
    var acc = 0;
    for (var k = 0; k < 5; k++) {
        isOp[k] = IsEqual();
        isOp[k].in[0] <== op;
        isOp[k].in[1] <== k;
        term[k] <== isOp[k].out * r[k];
        opSum += isOp[k].out;
        acc += term[k];
    }
    opSum === 1;
    out <== acc;
}

// EligibilityAnonymous: Merkle Membership + Unlinkable Nullifiers + Attribute Checks
template EligibilityAnonymous(N, DEPTH) {
    // ---------- Private Inputs (Known only to student) ----------
    signal input fields[N];
    signal input salt;
    signal input sigR8x;
    signal input sigR8y;
    signal input sigS;
    signal input pathElements[DEPTH];
    signal input pathIndices[DEPTH];

    // ---------- Public Inputs (EVM Verification) ----------
    signal input root;          // On-chain Merkle root
    signal input issuerAx;
    signal input issuerAy;
    signal input nonce;         // Unique query id
    signal input fieldIndexA;
    signal input opA;
    signal input thresholdA;
    signal input fieldIndexB;
    signal input opB;
    signal input thresholdB;
    signal input useSecond;

    // ---------- Public Outputs ----------
    signal output result;       // 1 = Yes, 0 = No
    signal output nullifier;    // Poseidon(salt, nonce)

    // 1) Secret attributes hash to commitment (leaf)
    component h = Poseidon(N + 1);
    for (var i = 0; i < N; i++) { h.inputs[i] <== fields[i]; }
    h.inputs[N] <== salt;
    signal commitment;
    commitment <== h.out;

    // 2) Verified Issuer signed this leaf
    component sig = EdDSAPoseidonVerifier();
    sig.enabled <== 1;
    sig.Ax <== issuerAx;
    sig.Ay <== issuerAy;
    sig.S <== sigS;
    sig.R8x <== sigR8x;
    sig.R8y <== sigR8y;
    sig.M <== commitment;

    // 3) Merkle tree membership proof: leaf exists under public 'root'
    component mp = MerkleProof(DEPTH);
    mp.leaf <== commitment;
    for (var j = 0; j < DEPTH; j++) {
        mp.pathElements[j] <== pathElements[j];
        mp.pathIndices[j] <== pathIndices[j];
    }
    mp.root === root;

    // 4) Compute per-query unlinkable Nullifier: Poseidon(salt, nonce)
    component nullHasher = Poseidon(2);
    nullHasher.inputs[0] <== salt;
    nullHasher.inputs[1] <== nonce;
    nullifier <== nullHasher.out;

    // 5) Predicate checks
    component pA = Predicate(N);
    for (var i = 0; i < N; i++) { pA.fields[i] <== fields[i]; }
    pA.fieldIndex <== fieldIndexA;
    pA.op <== opA;
    pA.threshold <== thresholdA;

    component pB = Predicate(N);
    for (var i = 0; i < N; i++) { pB.fields[i] <== fields[i]; }
    pB.fieldIndex <== fieldIndexB;
    pB.op <== opB;
    pB.threshold <== thresholdB;

    useSecond * (useSecond - 1) === 0;
    signal bTerm;
    bTerm <== useSecond * pB.out;
    signal gate;
    gate <== 1 - useSecond + bTerm;
    result <== pA.out * gate;
}

// 8 fields, Merkle depth 8 (supports up to 256 credentials in demo ceremony)
component main { public [
    root, issuerAx, issuerAy, nonce,
    fieldIndexA, opA, thresholdA,
    fieldIndexB, opB, thresholdB,
    useSecond
] } = EligibilityAnonymous(8, 8);
