// University signing service for the web UI (off-chain part of issuing a credential).
//   npm run signer   ->  http://localhost:3002
// It only creates BabyJubJub keys and signs credentials; every on-chain step
// (addIssuer, register) is sent from the browser through MetaMask.
const express = require("express");
const cors = require("cors");
const { fieldsFromObject } = require("../lib/schema");
const { newIssuerKey, issueCredential } = require("../lib/zk");

const PORT = process.env.SIGNER_PORT || 3002;
const app = express();
app.use(cors());
app.use(express.json());

const str = (v) => (typeof v === "bigint" ? v.toString() : v);

app.get("/api/status", (req, res) => res.json({ success: true, service: "prove-once-signer" }));

// New issuer keypair. The private key goes back to the university's browser only.
app.post("/api/issuer/key", async (req, res) => {
  try {
    const key = await newIssuerKey();
    res.json({ success: true, prvHex: key.prv.toString("hex"), ax: str(key.ax), ay: str(key.ay) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sign a credential: { prvHex, fields: { CGPA_X100: 845, ... } } -> commitment + signature + salt
app.post("/api/issuer/sign", async (req, res) => {
  try {
    const { prvHex, fields } = req.body;
    if (!/^[0-9a-f]{64}$/i.test(prvHex || "")) throw new Error("prvHex must be 32 bytes of hex");
    const cred = await issueCredential(Buffer.from(prvHex, "hex"), fieldsFromObject(fields || {}));
    res.json({
      success: true,
      credential: {
        fields: cred.fields.map(str),
        salt: str(cred.salt),
        commitment: str(cred.commitment),
        sigR8x: str(cred.sigR8x),
        sigR8y: str(cred.sigR8y),
        sigS: str(cred.sigS),
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`ProveOnce signing service on http://localhost:${PORT}`));
