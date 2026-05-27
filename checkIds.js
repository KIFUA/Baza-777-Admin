import XLSX from "xlsx";

async function run() {
  const wb = XLSX.readFile("./tablyci/anketa.xlsx");
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const anketaRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  // find row with ID 605
  const row605 = anketaRows.find(r => Number(r.id) === 605);
  console.log("anketa.xlsx ID 605 is:", row605);

  // find row with ID 695
  const row695 = anketaRows.find(r => Number(r.id) === 695);
  console.log("anketa.xlsx ID 695 is:", row695);
}

run().catch(console.error);
