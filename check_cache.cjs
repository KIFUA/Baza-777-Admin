const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('db_cache.json', 'utf8'));
const members = raw.members || raw;

let activeWithCaretaker = 0;
let activeWithoutCaretaker = 0;
let totalActive = 0;

Object.values(members).forEach(m => {
  if (!m) return;
  const isActive = !m.id_vybuttya || Number(m.id_vybuttya) === 0;
  if (isActive) {
    totalActive++;
    if (m.presviter && m.presviter.trim()) {
      activeWithCaretaker++;
    } else {
      activeWithoutCaretaker++;
    }
  }
});

console.log("Active total:", totalActive);
console.log("Active with caretaker (presviter):", activeWithCaretaker);
console.log("Active without caretaker:", activeWithoutCaretaker);
