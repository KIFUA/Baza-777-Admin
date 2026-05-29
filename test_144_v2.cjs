const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db_cache.json', 'utf8'));

const m144 = db.members.find(m => m.id == 144 || m.id == "144");
console.log("Member 144:", m144 ? m144.pib : 'Not found');

const fam144 = db.marriages.find(m => m.id == 144 || m.id == "144" || m.simya_id == 144);
console.log("Marriage 144:", fam144);
if (fam144) {
    const ch = db.members.find(m => m.id == fam144.id_cholovik);
    const dr = db.members.find(m => m.id == fam144.id_drujina);
    console.log("Husband:", ch ? ch.pib : "None");
    console.log("Wife:", dr ? dr.pib : "None");
}
