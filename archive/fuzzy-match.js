import fetch from "node-fetch";

const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
const FIREBASE_URL = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";

async function start() {
  try {
    const fbResp = await fetch(`${FIREBASE_URL}/members.json?auth=${DB_SECRET}`);
    const fbData = await fbResp.json();
    const fbKeys = Object.keys(fbData || {}).filter(k => fbData[k]);

    const fbNames = fbKeys.map(k => {
      const osob = fbData[k]["02_OSOBYSTE"] || {};
      const pib = fbData[k]["01_PIB"] || fbData[k]["pib"] || "";
      return { id: k, pib: pib || "" };
    });

    console.log("Searching for First+Patronymic 'Вікторія Володимирівна':");
    fbNames.forEach(m => {
      if (m.pib.includes("Вікторія Володимирівна")) {
        console.log(`  - ID: ${m.id}, PIB: "${m.pib}"`);
      }
    });

    console.log("\nSearching for First+Patronymic 'Тетяна Володимирівна':");
    fbNames.forEach(m => {
      if (m.pib.includes("Тетяна Володимирівна")) {
        console.log(`  - ID: ${m.id}, PIB: "${m.pib}"`);
      }
    });

    console.log("\nSearching for any name containing 'Груд' or 'Груз' (case-insensitive):");
    fbNames.forEach(m => {
      if (m.pib.toLowerCase().includes("груд") || m.pib.toLowerCase().includes("груз")) {
        console.log(`  - ID: ${m.id}, PIB: "${m.pib}"`);
      }
    });

  } catch (err) {
    console.error(err);
  }
}

start();
