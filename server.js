import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DB_FILE = "./licenses.json";

function loadDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]");
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

app.post("/api/license/validate", (req, res) => {
  const { licenseKey, machineId } = req.body;
  const db = loadDB();

  let record = db.find(x => x.key === licenseKey);
  if (!record) return res.status(400).send("INVALID_KEY");

  if (new Date(record.expiry) < new Date())
    return res.status(400).send("EXPIRED_KEY");

  if (!record.machine) {
    // First activation
    record.machine = machineId;
    saveDB(db);
  } else if (record.machine !== machineId) {
    return res.status(400).send("ALREADY_ACTIVATED_ON_ANOTHER_DEVICE");
  }

  // Response for plugin: KEY|expiry|machineID|60
  return res.send(`${licenseKey}|${record.expiry}|${record.machine}|60`);
});

app.listen(10000, () => console.log("Server running"));
