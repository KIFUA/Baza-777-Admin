import fetch from "node-fetch";

const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
const FIREBASE_URL = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";

async function start() {
  try {
    const fbResp = await fetch(`${FIREBASE_URL}/members.json?auth=${DB_SECRET}`);
    const fbData = await fbResp.json();
    const fbKeys = Object.keys(fbData || {}).filter(k => fbData[k]);

    const phones = ['0964834728', '0964834683', '0688672234'];
    console.log("Searching Firebase for phone numbers:", phones);

    fbKeys.forEach(k => {
      const fbRec = fbData[k];
      const osobi = fbRec["02_OSOBYSTE"] || {};
      const t1 = String(osobi["2_tel"] || "").replace(/\D/g, "");
      const t2 = String(osobi["phone"] || "").replace(/\D/g, "");
      const t3 = String(osobi["tel"] || "").replace(/\D/g, "");
      const t4 = String(osobi["tel1"] || "").replace(/\D/g, "");
      
      phones.forEach(p => {
        if ((t1 && t1.includes(p)) || (t2 && t2.includes(p)) || (t3 && t3.includes(p)) || (t4 && t4.includes(p))) {
          console.log(`Match found! Key: ${k}, Name: "${fbRec["01_PIB"] || fbRec["pib"]}", Phone: ${t1 || t2 || t3 || t4}`);
        }
      });
    });

  } catch (err) {
    console.error(err);
  }
}

start();
