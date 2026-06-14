const { execSync } = require('child_process');
try {
  const status = execSync('git status', { encoding: 'utf8' });
  console.log('GIT STATUS:\n', status);
  
  const diff = execSync('git diff --name-only', { encoding: 'utf8' });
  console.log('GIT DIFF:\n', diff);

  // Let's checkout ReportGenerator.tsx
  execSync('git checkout -- src/components/ReportGenerator.tsx');
  console.log('SUCCESSFULLY RESTORED ReportGenerator.tsx via git checkout');
} catch (err) {
  console.error('Error executing git command:', err.message);
  if (err.stdout) console.log('Stdout:', err.stdout.toString());
  if (err.stderr) console.log('Stderr:', err.stderr.toString());
}
