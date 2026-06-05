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
  let missingPrimitkaCount = 0;
  let missingExitDateCount = 0;
  let planToUpdate = [];

  for (const key of keys) {
    const record = data[key];
    if (!record) continue;
    
    const pibName = (record["01_PIB"] || record["pib"] || "").trim();
    if (!pibName) continue;

    const row = anketaMap.get(pibName.toLowerCase());
    if (row) {
      const excelPrimitka = String(row.primitka || "").trim();
      const structura = record["04_STRUCTURA"] || {};
      const fbPrimitka = String(structura["7_zvidky_primitka"] || "").trim();

      const vybuttya = record["06_VYBUTTYA"] || {};
      const fbExitDate = String(vybuttya["1_d_vybuttya"] || vybuttya["1_d_vybyttya"] || "").trim();
      const excelExitDateRaw = row.d_vibuttya;
      
      let pDate = "";
      if (excelExitDateRaw) {
        // Convert Excel date to formatted string like "01.01.2020" or similar
        const num = Number(excelExitDateRaw);
        if (!isNaN(num) && num > 0) {
          const utc_days = Math.floor(num - 25569);
          const date_info = new Date(utc_days * 86400 * 1000);
          const dd = String(date_info.getDate()).padStart(2, '0');
          const mm = String(date_info.getMonth() + 1).padStart(2, '0');
          const yyyy = date_info.getFullYear();
          pDate = `${dd}.${mm}.${yyyy}`;
        }
      }

      let meritsUpdate = false;
      const updates = {};

      // If excel has a comment/destination (like "в Київ"), but Firebase structura note is empty
      if (excelPrimitka && !fbPrimitka) {
        updates["04_STRUCTURA/7_zvidky_primitka"] = excelPrimitka;
        meritsUpdate = true;
        missingPrimitkaCount++;
      }

      // If excel has a departure date but Firebase has no departure date
      if (pDate && !fbExitDate) {
        updates["06_VYBUTTYA/1_d_vybuttya"] = pDate;
        updates["06_VYBUTTYA/1_d_vybyttya"] = pDate; // Let's populate both key variations to be safe!
        meritsUpdate = true;
        missingExitDateCount++;
      }

      if (meritsUpdate) {
        planToUpdate.push({
          key,
          pibName,
          updates,
          excelPrimitka,
          pDate
        });
      }
    }
  }

  console.log(`\nPlan analysis:`);
  console.log(`Total matched Firebase records that can be healed/filled: ${planToUpdate.length}`);
  console.log(`  - Missing structural comment / primitka: ${missingPrimitkaCount}`);
  console.log(`  - Missing exit date (d_vybuttya): ${missingExitDateCount}`);

  console.log("\nFirst 10 updates in plan:");
  console.log(JSON.stringify(planToUpdate.slice(0, 10), null, 2));
}

run().catch(console.error);
