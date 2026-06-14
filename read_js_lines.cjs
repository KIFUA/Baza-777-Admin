const fs = require('fs');

const content = fs.readFileSync('/app/applet/dist/assets/main-Cq7ATPY7.js', 'utf8');
const searchStr = "Сформований список членів церкви";
const idx = content.indexOf(searchStr);

if (idx === -1) {
  console.log('Search string not found!');
} else {
  console.log('Found search string at index:', idx);
  // Print 5000 characters before and 20000 characters after
  const startIdx = Math.max(0, idx - 10000);
  const endIdx = Math.min(content.length, idx + 40000);
  console.log('--- RECONSTRUCTED CHUNK ---');
  console.log(content.substring(startIdx, endIdx));
  console.log('--- END CHUNK ---');
}
