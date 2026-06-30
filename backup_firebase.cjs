const fs = require('fs');
const https = require('https');
const path = require('path');

// Resolve URL and secret
const dbBaseUrl = (process.env.FIREBASE_URL || "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app").replace(/\/$/, "");
const dbSecret = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";

const url = `${dbBaseUrl}/.json?auth=${dbSecret}`;
const backupPath = path.join(__dirname, `firebase_backup_${new Date().toISOString().replace(/[:.]/g, '_')}.json`);

console.log(`Starting backup of Firebase Realtime Database...`);
console.log(`URL: ${dbBaseUrl}`);
console.log(`Destination: ${backupPath}`);

https.get(url, (res) => {
  let data = '';

  if (res.statusCode !== 200) {
    console.error(`Error: Failed to fetch database. Status code: ${res.statusCode}`);
    process.exit(1);
  }

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      // Validate that it's valid JSON
      const json = JSON.parse(data);
      fs.writeFileSync(backupPath, JSON.stringify(json, null, 2), 'utf8');
      const stats = fs.statSync(backupPath);
      console.log(`Backup completed successfully!`);
      console.log(`File: ${backupPath}`);
      console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
    } catch (e) {
      console.error(`Error: Failed to parse or write JSON. ${e.message}`);
      process.exit(1);
    }
  });

}).on('error', (err) => {
  console.error(`HTTP request error: ${err.message}`);
  process.exit(1);
});
