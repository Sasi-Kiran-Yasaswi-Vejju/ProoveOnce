pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/eddsaposeidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

// Picks in[idx]; idx must be a valid slot 0..N-1.
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

// One question: "is fields[fieldIndex] <op> threshold ?"  ->  out = 0 or 1
// op codes: 0 >=, 1 <=, 2 >, 3 <, 4 ==
template Predicate(N) {
    signal input fields[N];
    signal input fieldIndex;
    signal input op;
    signal input threshold;
    signal output out;

    component sel = Select(N);
    for (var i = 0; i < N; i++) { sel.in[i] <== fields[i]; }
    sel.idx <== fieldIndex;

    // keep compared numbers inside 64 bits so LessThan(64) is sound
    component vBits = Num2Bits(64);
    vBits.in <== sel.out;
    component tBits = Num2Bits(64);
    tBits.in <== threshold;

    component lt = LessThan(64);      // value < threshold
    lt.in[0] <== sel.out;
    lt.in[1] <== threshold;
    component gt = LessThan(64);      // threshold < value
    gt.in[0] <== threshold;
    gt.in[1] <== sel.out;
    component eqv = IsEqual();        // value == threshold
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
    opSum === 1;           // op must be a valid code 0..4
    out <== acc;
}

template Eligibility(N) {
    // ---------- private (known only to the student) ----------
    signal input fields[N];
    signal input salt;
    signal input sigR8x;
    signal input sigR8y;
    signal input sigS;

    // ---------- public (declaration order = public signal order on-chain) ----------
    signal input commitment;
    signal input issuerAx;
    signal input issuerAy;
    signal input holder;        // student's Ethereum address as a number
    signal input nonce;         // query id chosen by the verifier
    signal input fieldIndexA;
    signal input opA;
    signal input thresholdA;
    signal input fieldIndexB;
    signal input opB;
    signal input thresholdB;
    signal input useSecond;     // 1 = answer is (A AND B), 0 = answer is A only

    // public output (comes FIRST in the public signals): 1 = Yes, 0 = No
    signal output result;

    // 1) the secret fields really hash to the public commitment
    component h = Poseidon(N + 1);
    for (var i = 0; i < N; i++) { h.inputs[i] <== fields[i]; }
    h.inputs[N] <== salt;
    h.out === commitment;

    // 2) the issuer signed exactly this commitment
    component sig = EdDSAPoseidonVerifier();
    sig.enabled <== 1;
    sig.Ax <== issuerAx;
    sig.Ay <== issuerAy;
    sig.S <== sigS;
    sig.R8x <== sigR8x;
    sig.R8y <== sigR8y;
    sig.M <== commitment;

    // 3) bind the proof to a holder and a query (dummy constraints keep the
    //    compiler from treating these signals as unused)
    signal holderSq;
    holderSq <== holder * holder;
    signal nonceSq;
    nonceSq <== nonce * nonce;

    // 4) the question(s)
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

    useSecond * (useSecond - 1) === 0;       // must be 0 or 1
    signal bTerm;
    bTerm <== useSecond * pB.out;
    signal gate;
    gate <== 1 - useSecond + bTerm;          // 1 if B unused, else B's answer
    result <== pA.out * gate;
}

component main { public [
    commitment, issuerAx, issuerAy, holder, nonce,
    fieldIndexA, opA, thresholdA,
    fieldIndexB, opB, thresholdB,
    useSecond
] } = Eligibility(8);
