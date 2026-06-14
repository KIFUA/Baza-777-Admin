const fs = require('fs');
const path = require('path');

let curr = '/app/applet';
while (curr !== '/') {
  const gitPath = path.join(curr, '.git');
  if (fs.existsSync(gitPath)) {
    console.log('Found git repository at:', curr);
  }
  const parent = path.dirname(curr);
  if (parent === curr) break;
  curr = parent;
}
if (fs.existsSync('/.git')) {
  console.log('Found git repository at: /');
}
