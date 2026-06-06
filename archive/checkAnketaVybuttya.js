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

  const vybuttyaExcel = anketaRows.filter(r => Number(r.id_vibuttya || 0) > 0 || String(r.primitka || "").trim() !== "");
  console.log(`Total vybuttya/primitka rows in anketa.xlsx: ${vybuttyaExcel.length}`);

  console.log("Fetching Firebase database...");
  const resp = await fetch(url);
  const fbData = await resp.json();
  if (!fbData) return;

  // Let's inspect some of these excel rows and how they compare to Firebase!
  const samples = vybuttyaExcel.slice(0, 15);
  for (const row of samples) {
    const pibName = String(row.pib || "").trim();
    const excelIdVybuttya = Number(row.id_vibuttya || 0);
    const excelPrimitka = String(row.primitka || "").trim();
    const excelInshaGromada = String(row.insha_gromada || "").trim();

    // Find in fbData (case-insensitive)
    const fbKey = Object.keys(fbData).find(k => {
      const rec = fbData[k];
      if (!rec) return false;
      const recPib = String(rec["01_PIB"] || rec["pib"] || "").trim().toLowerCase();
      return recPib === pibName.toLowerCase();
    });

    console.log(`\nExcel PIB: "${pibName}" (id_vibuttya: ${excelIdVybuttya}, primitka: "${excelPrimitka}", insha_gromada: "${excelInshaGromada}")`);
    if (fbKey) {
      const rec = fbData[fbKey];
      const structura = rec["04_STRUCTURA"] || {};
      const vybuttya = rec["06_VYBUTTYA"] || {};
      const fbStatus = rec["02_OSOBYSTE"]?.["13_status"] || "";
      console.log(`  -> Firebase Key: ${fbKey}`);
      console.log(`     Status: "${fbStatus}"`);
      console.log(`     Structura / 7_zvidky_primitka: "${structura["7_zvidky_primitka"] || ""}"`);
      console.log(`     Vybuttya / 1_d_vybuttya: "${vybuttya["1_d_vybuttya"] || vybuttya["1_d_vybyttya"] || ""}"`);
      console.log(`     Vybuttya / 2_prichina: "${vybuttya["2_prichina"] || ""}"`);
    } else {
      console.log(`  -> NOT FOUND in Firebase!`);
    }
  }
}

run().catch(console.error);
