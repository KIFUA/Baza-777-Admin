const fs = require('fs');

const data = JSON.parse(fs.readFileSync('db_cache.json', 'utf8'));
const members = data.members;

const allKeys = new Set();

members.forEach(member => {
    Object.keys(member).forEach(key => {
        allKeys.add(key);
    });
});

console.log(Array.from(allKeys).sort());
