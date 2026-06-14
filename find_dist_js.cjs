const fs = require('fs');
const path = require('path');

function findJSFiles(dir, results = []) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findJSFiles(fullPath, results);
      } else if (file.endsWith('.js') || file.endsWith('.cjs')) {
        results.push(fullPath);
      }
    }
  } catch (_) {}
  return results;
}

const distJS = findJSFiles('/app/applet/dist');
console.log('Dist JS files:', distJS);
