const fs = require('fs');
const rawData = JSON.parse(fs.readFileSync('firebase_backup_before_refactor_2026.json', 'utf8'));
const backup = rawData.members || rawData;

console.log("Backup total top keys:", Object.keys(backup).length);

// Print first 2 non-null members
let count = 0;
let totalNonEmptyDilycia = 0;
let totalNonEmptyOpika = 0;
const dilyciaVals = new Set();
const opikaVals = new Set();

for (const [id, m] of Object.entries(backup)) {
  if (m) {
    const struct = m["04_STRUCTURA"] || {};
    const dilycia = struct["2_grupa"] || struct["grupa"] || m["n_dilyci"] || "";
    const opika = struct["4_opika"] || struct["opika"] || m["presviter"] || "";
    if (dilycia) {
      totalNonEmptyDilycia++;
      dilyciaVals.add(dilycia);
    }
    if (opika) {
      totalNonEmptyOpika++;
      opikaVals.add(opika);
    }
  }
}

console.log("Total non-empty dilycia/grupa:", totalNonEmptyDilycia);
console.log("Unique dilycia values:", Array.from(dilyciaVals));
console.log("Total non-empty opika/presviter:", totalNonEmptyOpika);
console.log("Unique opika values count:", opikaVals.size);

const dilyciaToCaretakers = {};
const groupToCaretakers = {};

Object.entries(backup).forEach(([id, member]) => {
  if (!member) return;
  const struct = member["04_STRUCTURA"] || {};
  const dilycia = struct["2_grupa"] || struct["grupa"] || member["n_dilyci"] || "";
  const caretaker = struct["4_opika"] || struct["opika"] || member["presviter"] || "";
  const area = struct["1_rayon"] || "";
  const status = struct["status"] || (member["02_OSOBYSTE"] && member["02_OSOBYSTE"]["13_status"]) || "";
  
  if (status === "вибув") return;

  if (dilycia) {
    if (!dilyciaToCaretakers[dilycia]) dilyciaToCaretakers[dilycia] = {};
    dilyciaToCaretakers[dilycia][caretaker] = (dilyciaToCaretakers[dilycia][caretaker] || 0) + 1;
  }
});

console.log("=== Caretakers by Dilycia ===");
Object.entries(dilyciaToCaretakers).sort().forEach(([dilycia, caretakers]) => {
  console.log(`Dilycia: ${dilycia}`);
  Object.entries(caretakers).sort((a,b) => b[1]-a[1]).forEach(([caretaker, count]) => {
    console.log(`  - Caretaker: "${caretaker}": ${count}`);
  });
});
