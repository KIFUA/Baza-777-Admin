import fetch from "node-fetch";

async function run() {
  const dbBaseUrl = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";
  const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  
  const paths = [
    "/access_dostup.json",
    "/access.json",
    "/directories/access.json",
    "/directories.json"
  ];

  for (const path of paths) {
    const url = `${dbBaseUrl}${path}?auth=${DB_SECRET}`;
    console.log(`Fetching path: ${path}`);
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      if (!data) {
        console.log(`  No data at ${path}`);
        continue;
      }
      if (Array.isArray(data)) {
        console.log(`  Array found with length: ${data.length}`);
        console.log("  Sample item:", JSON.stringify(data.slice(0, 3), null, 2));
      } else {
        console.log(`  Object keys: ${Object.keys(data).slice(0, 10).join(", ")}`);
        if (data.access_dostup) {
            console.log("  Found access_dostup inside object!");
            console.log("  Sample items:", JSON.stringify(data.access_dostup.slice(0, 3), null, 2));
        }
      }
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
  }
}

run().catch(console.error);
