// Fixed 8-slot credential layout. Every number is a non-negative integer < 2^64.
// An issuer fills the slots it knows about and leaves the rest at 0.
const FIELD = {
  CGPA_X100: 0,        // 8.45 CGPA -> 845
  GRAD_YEAR: 1,        // 2024
  ANNUAL_INCOME: 2,    // father's / family annual income in rupees
  CATEGORY: 3,         // 0 General, 1 OBC, 2 SC, 3 ST
  BIRTH_YEAR: 4,       // 2002
  BACKLOGS: 5,         // number of active backlogs
  RESERVED_6: 6,
  RESERVED_7: 7,
};

// Must match the op codes in circuits/eligibility.circom
const OP = { GE: 0, LE: 1, GT: 2, LT: 3, EQ: 4 };

const NUM_FIELDS = 8;

function fieldsFromObject(obj) {
  const arr = new Array(NUM_FIELDS).fill(0n);
  for (const [name, value] of Object.entries(obj)) {
    if (!(name in FIELD)) throw new Error("unknown field " + name);
    arr[FIELD[name]] = BigInt(value);
  }
  return arr;
}

module.exports = { FIELD, OP, NUM_FIELDS, fieldsFromObject };
