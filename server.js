import express from "express";
import fs from "fs";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DB_FILE = "./licenses.json";

/* -------------------- Helpers -------------------- */
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* -------------------- License Validation -------------------- */
app.post("/api/license/validate", (req, res) => {
  const { licenseKey, machineId } = req.body;

  if (!licenseKey || !machineId) {
    return res.status(400).send("MISSING_PARAMETERS");
  }

  const db = loadDB();

  // Find exact license key (order does NOT matter)
  const license = db.find(l => l.key === licenseKey);

  if (!license)
    return res.status(400).send("INVALID_LICENSE_KEY");

  // Expiry check
  if (new Date(license.expiry) < new Date())
    return res.status(400).send("LICENSE_EXPIRED");

  // First-time activation
  if (!license.machine) {
    license.machine = machineId;
    saveDB(db);
  }
  // Already activated on another PC
  else if (license.machine !== machineId) {
    return res.status(403).send("LICENSE_ALREADY_USED_ON_ANOTHER_DEVICE");
  }

  // Success response
  return res.status(200).send({
    status: "OK",
    key: license.key,
    expiry: license.expiry,
    machine: license.machine,
    validityDays:
      Math.ceil(
        (new Date(license.expiry) - new Date()) / (1000 * 60 * 60 * 24)
      )
  });
});

/* -------------------- Server Start -------------------- */
const PORT = 10000;
app.listen(PORT, () => {
  console.log(`✅ License Server running on port ${PORT}`);
});
