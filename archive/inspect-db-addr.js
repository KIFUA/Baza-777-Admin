import fs from "fs";

async function start() {
  try {
    const data = JSON.parse(fs.readFileSync("db_cache.json", "utf-8"));
    const members = data.members || [];
    console.log(`Loaded ${members.length} members`);
    
    // Find some members with addresses
    let count = 0;
    for (const m of members) {
      if (m.address) {
        console.log(`\nPIB: ${m.pib}`);
        console.log(`Formatted address: ${m.address}`);
        // Let's print raw 03_ADRESA if it exists in rawData or in the DB.
        // Wait, where is rawData or raw address stored?
        // Let's dump the whole member object to see where the raw address is.
        console.log("Member keys:", Object.keys(m));
        console.log("Member object:", JSON.stringify(m, null, 2));
        count++;
        if (count >= 5) break;
      }
    }
  } catch (err) {
    console.error(err);
  }
}

start();
