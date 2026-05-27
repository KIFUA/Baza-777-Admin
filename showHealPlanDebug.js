import XLSX from "xlsx";
import fetch from "node-fetch";

async function run() {
  const dbBaseUrl = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";
  const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${dbBaseUrl}/members.json?auth=${DB_SECRET}`;

  console.log("Loading anketa.xlsx...");
  const wb = XLSX.readFile("./tablyci/anketa.xlsx");
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const anketaRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const anketaMap = new Map();
  anketaRows.forEach(row => {
    const pibName = String(row.pib || "").trim().toLowerCase();
    if (pibName) {
      anketaMap.set(pibName, row);
    }
  });

  console.log(`Total anketa rows: ${anketaRows.length}`);
  console.log("Fetching members from Firebase...");
  const resp = await fetch(url);
  const data = await resp.json();
  if (!data) {
    console.log("No data returned");
    return;
  }

  const keys = Object.keys(data);
  console.log(`Firebase keys count: ${keys.length}`);

  // Let's test "Григорів Володимир Іванович"
  const testName = "Григорів Володимир Іванович".toLowerCase();
  console.log(`testName in anketaMap? ${anketaMap.has(testName)}`);
  const excelRow = anketaMap.get(testName);
  console.log("excelRow for test:", excelRow);

  // Let's find "Григорів Володимир Іванович" in Firebase
  const fbKey = keys.find(k => {
    const rec = data[k];
    if (!rec) return false;
    const pib = String(rec["01_PIB"] || rec["pib"] || "").trim().toLowerCase();
    return pib === testName;
  });
  console.log(`testName in FB? Key: ${fbKey}`);
  if (fbKey) {
    const rec = data[fbKey];
    console.log("FB record for test:", rec);
    
    // Let's run the check we did in showHealPlan:
    const excelPrimitka = String(excelRow.primitka || "").trim();
    const structura = rec["04_STRUCTURA"] || {};
    const fbPrimitka = String(structura["7_zvidky_primitka"] || "").trim();
    console.log(`excelPrimitka: "${excelPrimitka}"`);
    console.log(`fbPrimitka: "${fbPrimitka}"`);
    console.log(`excelPrimitka && !fbPrimitka: ${excelPrimitka && !fbPrimitka}`);
  }
}

run().catch(console.error);
