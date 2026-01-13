import express from "express";
import fs from "fs";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, "licenses.json");

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

  const key = licenseKey.trim().toUpperCase();
  const machine = machineId.trim().toUpperCase();

  const db = loadDB();
  const license = db.find(l => l.key === key);

  if (!license) {
    return res.status(400).send("INVALID_LICENSE_KEY");
  }

  const expiryDate = new Date(license.expiry + "T23:59:59Z");
  if (expiryDate < new Date()) {
    return res.status(400).send("LICENSE_EXPIRED");
  }

  // First activation
  if (!license.machine) {
    license.machine = machine;
    saveDB(db);
  }
  // Already activated elsewhere
  else if (license.machine !== machine) {
    return res.status(403).send("LICENSE_ALREADY_USED_ON_ANOTHER_DEVICE");
  }

  return res.status(200).json({
    status: "OK",
    key: license.key,
    expiry: license.expiry,
    machine: license.machine,
    validityDays: Math.ceil(
      (expiryDate - new Date()) / (1000 * 60 * 60 * 24)
    )
  });
});

/* -------------------- Server Start -------------------- */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ License Server running on port ${PORT}`);
});
