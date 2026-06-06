import XLSX from "xlsx";
import path from "path";

// Simple script to compare anketa.xlsx and Firebase Realtime Database
async function run() {
  const dbBaseUrl = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";
  const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${dbBaseUrl}/members.json?auth=${DB_SECRET}`;

  console.log("Loading anketa.xlsx...");
  const wb = XLSX.readFile("./tablyci/anketa.xlsx");
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const anketaRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  console.log("Fetching Firebase database...");
  const resp = await fetch(url);
  const fbData = await resp.json();

  if (!fbData) {
    console.error("Failed to load Firebase data!");
    return;
  }

  // Map Firebase data by PIB (lowercase, cleaned)
  const fbMap = new Map();
  Object.keys(fbData).forEach(key => {
    const record = fbData[key];
    if (!record) return;
    const pibName = (record["01_PIB"] || record["pib"] || "").trim().toLowerCase();
    if (pibName) {
      fbMap.set(pibName, { key, record });
    }
  });

  console.log(`Matched ${fbMap.size} records in Firebase by PIB`);

  let countMismatch = 0;
  console.log("\nSome samples where anketa has primitive note/primitka and Firebase has status/notes:");
  
  for (const row of anketaRows) {
    const pib = String(row.pib || "").trim();
    const primitka = String(row.primitka || "").trim();
    if (!pib) continue;
    
    const fbMatch = fbMap.get(pib.toLowerCase());
    if (fbMatch) {
      const fbStructura = fbMatch.record["04_STRUCTURA"] || {};
      const fbVybuttya = fbMatch.record["06_VYBUTTYA"] || {};
      const fbPrimitka = fbStructura["7_zvidky_primitka"] || "";
      const fbExitReason = fbVybuttya["2_prichina"] || "";
      const fbExitDate = fbVybuttya["1_d_vybuttya"] || fbVybuttya["1_d_vybyttya"] || "";

      // If there's a departure note in anketa but not in Firebase structura, or it mismatches
      if (primitka && fbPrimitka !== primitka) {
        if (countMismatch < 15) {
          console.log(`PIB: "${pib}" (FB key: ${fbMatch.key})`);
          console.log(`  Excel notes: "${primitka}"`);
          console.log(`  FB Structura note: "${fbPrimitka}"`);
          console.log(`  FB Vybuttya key: prichina="${fbExitReason}", date="${fbExitDate}"`);
        }
        countMismatch++;
      }
    }
  }

  console.log(`\nTotal mismatches where anketa has primitive note but FB doesn't match: ${countMismatch}`);
}

run().catch(console.error);
