const { execSync } = require('child_process');

const commands = ['zip', 'unzip', 'python3', 'python', '7z', 'jar', 'tar'];
commands.forEach(cmd => {
  try {
    const out = execSync(`which ${cmd}`, { encoding: 'utf8' }).trim();
    console.log(`- ${cmd}: AVAILABLE at ${out}`);
  } catch (_) {
    console.log(`- ${cmd}: NOT FOUND`);
  }
});
