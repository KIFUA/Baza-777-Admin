import fetch from "node-fetch";

async function run() {
  const dbBaseUrl = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";
  const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${dbBaseUrl}/members/118.json?auth=${DB_SECRET}`;

  console.log("Fetching member 118 from Firebase...");
  const resp = await fetch(url);
  const data = await resp.json();
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
