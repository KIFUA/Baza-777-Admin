import fs from "fs";

const files = [
  "db_cache.json",
  "db_cache_backup_2026_06_02.json",
  "db_cache_backup_before_rayon_fix_2026_06_11.json"
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  console.log(`\nText-scanning: ${file}`);
  const text = fs.readFileSync(file, "utf-8");
  
  // Find strings like "password": "..." and "user": "..."
  // Since the files are large, let's search for blocks
  const regex = /\{\s*"rayon"\s*:\s*"[^"]*"\s*,\s*"level"\s*:\s*"[^"]*"\s*,\s*"user"\s*:\s*"[^"]*"\s*,\s*"position"\s*:\s*"[^"]*"\s*,\s*"password"\s*:\s*"[^"]*"\s*,\s*"telegramId"\s*:\s*"[^"]*"/g;
  const matches = text.match(regex);
  if (matches) {
    console.log(`  Found ${matches.length} direct line-pattern matches!`);
    console.log("  Sample matches:", matches.slice(0, 5));
  } else {
    // Let's do a wider search for any object having "password" and "user"
    const regex2 = /\{[^{}]*"user"\s*:\s*"[^"]*"[^{}]*"password"\s*:\s*"[^"]*"[^{}]*\}/g;
    const matches2 = text.match(regex2);
    if (matches2) {
      console.log(`  Found ${matches2.length} general user/password object matches!`);
      // filter out things that are not our structure
      const goodOnes = matches2.filter(m => m.includes("rayon"));
      console.log(`  Filtered to ${goodOnes.length} containing 'rayon'`);
      console.log("  Sample filtered:", goodOnes.slice(0, 10));
    }
  }
}
