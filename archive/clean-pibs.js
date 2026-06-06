import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
const firebaseBaseUrl = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";

// Helper to clean up parentheses and extra whitespaces
function cleanMaidenName(pib) {
  if (!pib) return "";
  return pib
    .replace(/\s*\([^)]+\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function cleanEntireDatabase() {
  console.log("=== STARTING MAIDEN NAME PARENTHESES CLEANUP MIGRATION ===");
  
  // 1. Clean Local JSON Cache (db_cache.json)
  const dbCachePath = path.join(process.cwd(), "db_cache.json");
  if (!fs.existsSync(dbCachePath)) {
    console.error("Local db_cache.json does not exist. Skipping local migration.");
    return;
  }
  
  const dbData = JSON.parse(fs.readFileSync(dbCachePath, "utf-8"));
  const localMembers = dbData.members || [];
  
  let localUpdated = 0;
  console.log(`Scanning ${localMembers.length} local member records...`);
  
  for (const m of localMembers) {
    if (m.pib && m.pib.includes("(")) {
      const original = m.pib;
      const stripped = cleanMaidenName(m.pib);
      console.log(`  [LOCAL] Cleaned: "${original}" -> "${stripped}"`);
      m.pib = stripped;
      localUpdated++;
    }
  }
  
  if (localUpdated > 0) {
    fs.writeFileSync(dbCachePath, JSON.stringify(dbData, null, 2), "utf-8");
    console.log(`Successfully updated ${localUpdated} records in db_cache.json.`);
  } else {
    console.log("No parentheses found in local db_cache.json.");
  }
  
  // 2. Clean Firebase Realtime Database
  console.log("\nConnecting to Firebase Realtime Database to scan and update...");
  try {
    const fbUrl = `${firebaseBaseUrl}/members.json?auth=${DB_SECRET}`;
    const fbResp = await fetch(fbUrl);
    const fbData = await fbResp.json();
    
    if (!fbData) {
      console.log("Firebase Realtime DB is empty.");
      return;
    }
    
    let fbUpdated = 0;
    for (const key in fbData) {
      const fbMember = fbData[key];
      if (!fbMember) continue;
      
      const originalPib = fbMember.pib || fbMember["01_PIB"] || "";
      if (originalPib && originalPib.includes("(")) {
        const strippedPib = cleanMaidenName(originalPib);
        
        console.log(`  [FIREBASE] Updating key ${key}: "${originalPib}" -> "${strippedPib}"`);
        
        // Prepare patch payload
        const patchUrl = `${firebaseBaseUrl}/members/${key}.json?auth=${DB_SECRET}`;
        const patchPayload = { pib: strippedPib };
        
        // If there's a legacy "01_PIB" field, clean that too
        if (fbMember["01_PIB"]) {
          patchPayload["01_PIB"] = strippedPib;
        }
        
        const updateResp = await fetch(patchUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchPayload)
        });
        
        if (updateResp.ok) {
          fbUpdated++;
        } else {
          console.error(`  [FIREBASE] Failed patch update for key ${key}`);
        }
      }
    }
    
    console.log(`\n=== CLEANUP SUMMARY ===`);
    console.log(`Local Cache Updated: ${localUpdated} names.`);
    console.log(`Firebase Realtime DB Updated: ${fbUpdated} names.`);
    console.log("=== MIGRATION COMPLETED SUCCESSFULLY ===");
    
  } catch (error) {
    console.error("Error updating Firebase Realtime Database:", error);
  }
}

cleanEntireDatabase();
