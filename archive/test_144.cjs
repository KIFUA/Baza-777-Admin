const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db_cache.json', 'utf8'));

const p144 = db.collections.anketa.find(a => a.id == 144 || a.id == "144");
console.log("Anketa 144:", p144 ? p144.pib : 'Not found', p144 ? p144.stat : '');

const f144 = db.collections.simya.find(s => s.id == 144 || s.id == "144");
console.log("Family 144:", f144);
if (f144) {
    const cholovik144 = db.collections.anketa.find(a => a.id == f144.id_cholovik);
    console.log("Cholovik in Family 144:", cholovik144 ? cholovik144.pib : "None");
    const drujina144 = db.collections.anketa.find(a => a.id == f144.id_drujina);
    console.log("Drujina in Family 144:", drujina144 ? drujina144.pib : "None");
}
