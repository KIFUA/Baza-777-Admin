const fs = require('fs');
const path = require('path');

function findFiles(dir, pattern, results = []) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      let stat;
      try {
        stat = fs.lstatSync(fullPath);
      } catch (_) {
        continue;
      }
      if (stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.next') && !file.includes('dist')) {
          findFiles(fullPath, pattern, results);
        }
      } else if (file.toLowerCase().includes(pattern.toLowerCase())) {
        results.push(fullPath);
      }
    }
  } catch (_) {}
  return results;
}

console.log('Searching for "ReportGenerator" files...');
const workspaceResults = findFiles('/app', 'ReportGenerator');
console.log('Workspace matches:', workspaceResults);

const tmpResults = findFiles('/tmp', 'ReportGenerator');
console.log('Tmp matches:', tmpResults);

const homeResults = findFiles('/home', 'ReportGenerator');
console.log('Home matches:', homeResults);
