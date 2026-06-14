const fs = require('fs');

const content = fs.readFileSync('/app/applet/dist/assets/main-Cq7ATPY7.js', 'utf8');

const symbols = [
  'cleanAddress',
  'AVAILABLE_COLUMNS',
  'ReportGenerator',
  'Zvit_Chleniv_Tserkvy_',
  'Сформований список членів церкви',
  'Бевзюк В.'
];

symbols.forEach(sym => {
  const idx = content.indexOf(sym);
  console.log(`Symbol "${sym}": ${idx !== -1 ? 'FOUND at index ' + idx : 'NOT FOUND'}`);
});
