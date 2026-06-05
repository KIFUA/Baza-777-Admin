import XLSX from "xlsx";
import fetch from "node-fetch";

async function run() {
  const dbBaseUrl = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";
  const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${dbBaseUrl}/members.json?auth=${DB_SECRET}`;

  console.log("Loading Excel database...");
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

  console.log("Fetching Firebase database...");
  const resp = await fetch(url);
  const data = await resp.json();
  if (!data) return;

  const keys = Object.keys(data);
  let checked = 0;
  let matches = 0;
  let updateList = [];

  for (const key of keys) {
    const record = data[key];
    if (!record) continue;
    checked++;

    const pibName = (record["01_PIB"] || record["pib"] || "").trim();
    if (!pibName) continue;

    const row = anketaMap.get(pibName.toLowerCase());
    if (row) {
      matches++;
      const excelPrimitka = String(row.primitka || "").trim();
      const fbStructura = record["04_STRUCTURA"] || {};
      const fbVybuttya = record["06_VYBUTTYA"] || {};
      const fbStatus = record["02_OSOBYSTE"]?.["13_status"] || "";

      const prichina = fbVybuttya["2_prichina"] || "";
      const d_vybuttya = fbVybuttya["1_d_vybuttya"] || fbVybuttya["1_d_vybyttya"] || "";
      const zvidkyNote = fbStructura["7_zvidky_primitka"] || "";

      // Check if person has LEFT (vybuv) in Excel (id_vibuttya > 0)
      const excelIdVybuttya = Number(row.id_vibuttya || 0);

      if (excelIdVybuttya > 0 || excelPrimitka) {
        const needsNote = excelPrimitka && !zvidkyNote;
        
        // Let's also parse Excel departure date
        let excelDateFormatted = "";
        if (row.d_vibuttya) {
          const num = Number(row.d_vibuttya);
          if (!isNaN(num) && num > 0) {
            const utc_days = Math.floor(num - 25569);
            const date_info = new Date(utc_days * 86400 * 1000);
            const dd = String(date_info.getDate()).padStart(2, '0');
            const mm = String(date_info.getMonth() + 1).padStart(2, '0');
            const yyyy = date_info.getFullYear();
            excelDateFormatted = `${dd}.${mm}.${yyyy}`;
          }
        }

        const needsDate = excelDateFormatted && !d_vybuttya;
        const needsReason = excelIdVybuttya > 0 && !prichina;

        if (needsNote || needsDate || needsReason) {
          const updates = {};
          if (needsNote) {
            updates["04_STRUCTURA/7_zvidky_primitka"] = excelPrimitka;
          }
          if (needsDate) {
            updates["06_VYBUTTYA/1_d_vybuttya"] = excelDateFormatted;
            updates["06_VYBUTTYA/1_d_vybyttya"] = excelDateFormatted;
          }
          if (needsReason) {
            // map excel id_vibuttya to reason: 2=відп., 3=вилуч., 4=пом., 5=емігр. etc
            // Let's translate Excel id_vibuttya based on conventional mappings or string value!
            let translatedReason = "відп.";
            if (excelIdVybuttya === 2) translatedReason = "відп.";
            else if (excelIdVybuttya === 3) translatedReason = "вилуч.";
            else if (excelIdVybuttya === 4) translatedReason = "пом.";
            else if (excelIdVybuttya === 5) translatedReason = "емігр.";
            
            updates["06_VYBUTTYA/2_prichina"] = translatedReason;
            updates["02_OSOBYSTE/13_status"] = "вибув";
          }

          updateList.push({
            key,
            pibName,
            updates,
            reason: `excelIdVybuttya=${excelIdVybuttya}, primitka="${excelPrimitka}", date="${excelDateFormatted}"`
          });
        }
      }
    }
  }

  console.log(`Checked: ${checked}, Matches by PIB: ${matches}`);
  console.log(`Total records needing healing on Firebase: ${updateList.length}`);
  if (updateList.length > 0) {
    console.log("Samples of elements to update on Firebase:");
    console.log(JSON.stringify(updateList.slice(0, 15), null, 2));
  }
}

run().catch(console.error);
