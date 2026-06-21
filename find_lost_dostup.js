import fs from "fs";
import path from "path";

const files = [
  "db_cache.json",
  "db_cache_backup_2026_06_02.json",
  "db_cache_backup_before_rayon_fix_2026_06_11.json",
  "firebase_backup_2026_06_02.json"
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`File not found: ${file}`);
    continue;
  }
  console.log(`\nScanning file: ${file}`);
  try {
    const raw = fs.readFileSync(file, "utf-8");
    // Look for occurrences of known user names or passwords
    const index1 = raw.indexOf("Скіцко І.");
    const index2 = raw.indexOf("Бевзюк В.");
    console.log(`  Occurrences: 'Скіцко І.': ${index1 !== -1}, 'Бевзюк В.': ${index2 !== -1}`);
    
    // Check if there are keys containing "access" or "dostup"
    if (file.endsWith(".json")) {
       const parsed = JSON.parse(raw);
       const keys = Object.keys(parsed);
       console.log(`  Top-level keys: ${keys.join(", ")}`);
       
       if (parsed.access_dostup) {
           console.log(`  Found access_dostup of length: ${parsed.access_dostup.length}`);
       }
       if (parsed.dostup) {
           console.log(`  Found dostup key!`);
       }
       // Seek deeper recursively for arrays with objects containing a "password" or "rayon": "АЕРОПОРТ"
       seek(parsed, file);
    }
  } catch (err) {
    console.error(`  Error reading ${file}: ${err.message}`);
  }
}

function seek(obj, file, depth = 0) {
  if (depth > 4 || !obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    const isAccessTable = obj.some(item => item && item.user && item.password && item.password !== "—");
    if (isAccessTable) {
      console.log(`  [Depth ${depth}] Found potential access table array of size ${obj.length}!`);
      console.log("  Sample:", JSON.stringify(obj.slice(0, 3), null, 2));
    }
  } else {
    for (const key of Object.keys(obj)) {
      seek(obj[key], file, depth + 1);
    }
  }
}
