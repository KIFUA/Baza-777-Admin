const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = '/app/applet/tablyci';
try {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (file.endsWith('.xlsx')) {
      const fullPath = path.join(dir, file);
      try {
        const wb = XLSX.readFile(fullPath);
        console.log(`- ${file}: SUCCESS (${wb.SheetNames.join(', ')})`);
      } catch (err) {
        console.log(`- ${file}: FAILED with "${err.message}"`);
      }
    }
  });
} catch (err) {
  console.error(err);
}
