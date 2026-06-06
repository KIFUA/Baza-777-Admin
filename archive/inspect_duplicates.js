import XLSX from "xlsx";
const wb = XLSX.readFile("./tablyci/z_1.xlsx");
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

console.log("Total rows in z_1:", rows.length);
const idMap = {};
rows.forEach(r => {
  const id = r.id;
  if (!idMap[id]) idMap[id] = [];
  idMap[id].push(r);
});

const duplicateIds = Object.keys(idMap).filter(id => idMap[id].length > 1);
console.log("Number of duplicate member IDs in z_1.xlsx:", duplicateIds.length);

if (duplicateIds.length > 0) {
  const firstDupId = duplicateIds[0];
  console.log(`\nExample of duplicate record for Member ID: ${firstDupId}`);
  idMap[firstDupId].forEach((rec, idx) => {
    console.log(`Row ${idx+1}: PIB: ${rec.pib} | Address ID: ${rec.id_adresa} | Group: ${rec.s_klasgrup_ukr} | d_begin: ${rec.d_begin} | d_end: ${rec.d_end}`);
  });
}
