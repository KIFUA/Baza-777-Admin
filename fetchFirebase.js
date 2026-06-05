import fetch from "node-fetch";

async function run() {
  const dbBaseUrl = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";
  const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${dbBaseUrl}/members.json?auth=${DB_SECRET}`;

  console.log("Fetching members from Firebase...");
  const resp = await fetch(url);
  const data = await resp.json();
  if (!data) {
    console.log("No data returned or error");
    return;
  }

  const keys = Object.keys(data);
  console.log(`Total members keys found: ${keys.length}`);

  // Find occurrences of "Воронцова Оксана Валеріївна"
  const matches = [];
  for (const key of keys) {
    const record = data[key];
    if (!record) continue;
    const pibName = record["01_PIB"] || record["pib"] || "";
    if (pibName.toLowerCase().includes("воронцова")) {
      matches.push({ key, pibName, record });
    }
  }

  console.log("\nMatching records in Firebase for 'Воронцова':");
  console.log(JSON.stringify(matches, null, 2));
}

run().catch(console.error);
