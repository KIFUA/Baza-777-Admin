import fs from 'fs';
import vm from 'vm';

try {
  const content = fs.readFileSync('index_legacy.html', 'utf-8');
  // extract script sections
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gm;
  let match;
  let idx = 1;
  while ((match = scriptRegex.exec(content)) !== null) {
    const scriptCode = match[1];
    console.log(`Parsing script block ${idx}...`);
    try {
      new vm.Script(scriptCode);
      console.log(`Script block ${idx} parsed successfully.`);
    } catch (e) {
      console.error(`Syntax error in script block ${idx}:`, e);
    }
    idx++;
  }
} catch (err) {
  console.error("Error:", err);
}
