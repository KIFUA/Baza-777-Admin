import fs from "fs";

const files = [
  "db_cache_backup_before_rayon_fix_2026_06_11.json",
  "db_cache_backup_2026_06_02.json"
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  console.log(`\nScanning: ${file}`);
  const text = fs.readFileSync(file, "utf-8");
  
  let index = 0;
  let count = 0;
  while ((index = text.indexOf('"password"', index)) !== -1) {
    count++;
    // print 300 characters around this occurrence
    const start = Math.max(0, index - 150);
    const end = Math.min(text.length, index + 150);
    console.log(`\n--- Match ${count} in ${file} at index ${index} ---`);
    console.log(text.slice(start, end));
    index += 10;
    if (count >= 15) {
      console.log("\nReached sample limit of 15 matches.");
      break;
    }
  }
}
