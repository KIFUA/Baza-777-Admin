import fs from "fs";

async function start() {
  try {
    const data = JSON.parse(fs.readFileSync("db_cache.json", "utf-8"));
    const members = data.members || [];
    
    // We want to test some missed names
    const testNames = [
      "Сенюк",
      "Бабінчук",
      "Гузинська",
      "Тирлеш",
      "Лешків",
      "Федій"
    ];
    
    console.log("Searching database for similar names:");
    testNames.forEach(tn => {
      const found = members.filter(m => m.pib.toLowerCase().includes(tn.toLowerCase()));
      if (found.length > 0) {
        console.log(`\nResults for search "${tn}":`);
        found.forEach(f => {
          console.log(`  - ID: ${f.id}, PIB: "${f.pib}"`);
        });
      } else {
        console.log(`\nNo results for search "${tn}"`);
      }
    });

  } catch (err) {
    console.error(err);
  }
}

start();
