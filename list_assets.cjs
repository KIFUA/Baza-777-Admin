const fs = require('fs');
try {
  const files = fs.readdirSync('/app/applet/dist/assets');
  console.log('All files in dist/assets:', files);
} catch (err) {
  console.error(err);
}
