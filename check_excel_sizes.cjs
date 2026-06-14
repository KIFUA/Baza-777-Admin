const fs = require('fs');
const path = require('path');

const dir = '/app/applet/tablyci';
try {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);
    console.log(`${file}: ${stats.size} bytes`);
  });
} catch (err) {
  console.error(err);
}
