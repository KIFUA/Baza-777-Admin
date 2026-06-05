import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
const firebaseBaseUrl = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";

async function createFullBackup() {
  console.log("=== STARTING FULL FIREBASE DATABASE BACKUP ===");
  try {
    // 1. Fetch entire database from Firebase
    const rawUrl = `${firebaseBaseUrl}/.json?auth=${DB_SECRET}`;
    console.log("Fetching entire database state from Firebase...");
    const resp = await fetch(rawUrl);
    
    if (!resp.ok) {
      throw new Error(`Failed to fetch from Firebase: ${resp.statusText}`);
    }
    
    const dbData = await resp.json();
    if (!dbData) {
      console.warn("Retrieved empty database or null value!");
      return;
    }
    
    // Calculate size of keys in members
    const membersCount = dbData.members ? Object.keys(dbData.members).length : 0;
    console.log(`Database downloaded successfully! Found ${membersCount} members in Firebase.`);

    // 2. Save locally as JSON file
    const backupFileName = "firebase_backup_2026_06_02.json";
    const backupPath = path.join(process.cwd(), backupFileName);
    fs.writeFileSync(backupPath, JSON.stringify(dbData, null, 2), "utf-8");
    console.log(`Local backup snapshot saved successfully at: ${backupPath}`);

    // Also take a backup of db_cache.json if it exists
    const dbCachePath = path.join(process.cwd(), "db_cache.json");
    if (fs.existsSync(dbCachePath)) {
      const dbCacheBackupPath = path.join(process.cwd(), "db_cache_backup_2026_06_02.json");
      fs.copyFileSync(dbCachePath, dbCacheBackupPath);
      console.log(`Local db_cache.json backed up to: ${dbCacheBackupPath}`);
    }

    // 3. Write a remote backup node inside Firebase Realtime DB for offsite recovery
    console.log("Writing offsite backup node into Firebase Realtime Database...");
    const remoteBackupUrl = `${firebaseBaseUrl}/backups/backup_2026_06_02.json?auth=${DB_SECRET}`;
    
    const uploadResp = await fetch(remoteBackupUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        backup_by: "AI Studio Agent Code Merger",
        data: dbData
      })
    });

    if (uploadResp.ok) {
      console.log("Remote Firebase backup stored successfully under '/backups/backup_2026_06_02' key!");
    } else {
      console.error(`Warning: Remote Firebase backup storage failed with status ${uploadResp.status}`);
    }

    console.log("=== BACKUP COMPLETED SUCESSFULLY ===");
  } catch (err) {
    console.error("Critical error during backup:", err);
  }
}

createFullBackup();
