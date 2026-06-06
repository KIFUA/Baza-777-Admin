
const fs = require('fs');

try {
  const rawCache = fs.readFileSync('db_cache.json', 'utf-8');
  const db = JSON.parse(rawCache);
  const members = db.members || [];
  
  const activeMembers = members.filter(m => m.id_vybuttya === 0);
  
  const pibCounts = {};
  members.forEach(m => {
    pibCounts[m.pib] = (pibCounts[m.pib] || 0) + 1;
  });
  
  console.log("Total members:", members.length);
  console.log("Active members:", activeMembers.length);
  
  const duplicates = Object.keys(pibCounts).filter(pib => pibCounts[pib] > 1);
  console.log("Duplicates found:", duplicates.length);
  console.log("Example duplicates:", duplicates.slice(0, 5));
  
} catch (err) {
  console.error(err);
}
