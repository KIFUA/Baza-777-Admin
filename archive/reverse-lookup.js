import fetch from "node-fetch";

const GOOGLE_SHEET_ID = '1s_Wio5niYvq2HRoBYwH3bS9NEcbtsJsWXv5P7u5Zhw8';
const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
const FIREBASE_URL = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";

const parseCSV = (text) => {
  const results = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"' && inQuotes && nextChar === '"') {
      field += '"'; i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(field.trim()); field = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (field || row.length > 0) {
        row.push(field.trim()); results.push(row); row = []; field = "";
      }
      if (char === '\r' && nextChar === '\n') i++;
    } else {
      field += char;
    }
  }
  if (field || row.length > 0) {
    row.push(field.trim()); results.push(row);
  }
  return results;
};

// Standard format address from server.ts
function formatAddress(addrObj) {
  if (!addrObj) return "";
  let city = addrObj["1_nas_punkt"] !== undefined ? String(addrObj["1_nas_punkt"]) : (addrObj["1_misto"] !== undefined ? String(addrObj["1_misto"]) : "");
  let street = addrObj["2_vulycja"] !== undefined ? String(addrObj["2_vulycja"]) : (addrObj["2_vulitsya"] !== undefined ? String(addrObj["2_vulitsya"]) : "");
  let house = addrObj["3_budynok"] !== undefined ? String(addrObj["3_budynok"]) : (addrObj["3_budinok"] !== undefined ? String(addrObj["3_budinok"]) : "");
  let korpus = addrObj["4_korpus"] !== undefined ? String(addrObj["4_korpus"]) : "";
  let flat = addrObj["5_kvartyra"] !== undefined ? String(addrObj["5_kvartyra"]) : (addrObj["4_kvartira"] !== undefined ? String(addrObj["4_kvartira"]) : "");

  const cleanField = (val) => val.trim().replace(/^,+/, "").replace(/,+$/, "").trim();
  city = cleanField(city); street = cleanField(street); house = cleanField(house); korpus = cleanField(korpus); flat = cleanField(flat);
  
  let cityPart = city; // simple approximation for comparison
  let streetPart = street;
  let addressMain = streetPart;
  if (house) addressMain += ", " + house;
  if (korpus) addressMain += " / " + korpus;
  if (flat) addressMain += " / " + flat;
  
  return `${cityPart}, ${addressMain}`.replace(/,(\s*,)+/g, ",").trim();
}

async function start() {
  try {
    const fbResp = await fetch(`${FIREBASE_URL}/members.json?auth=${DB_SECRET}`);
    const fbData = await fbResp.json();
    const fbKeys = Object.keys(fbData || {}).filter(k => fbData[k]);

    const fbMembers = fbKeys.map(k => {
      const fbRec = fbData[k];
      const pib = fbRec["01_PIB"] || fbRec["pib"] || "";
      const osobi = fbRec["02_OSOBYSTE"] || {};
      const tel = String(osobi["2_tel"] || osobi["phone"] || osobi["tel"] || "").replace(/\D/g, "");
      const addrObj = fbRec["03_ADRESA"] || {};
      const formattedAddr = formatAddress(addrObj).toLowerCase().replace(/\s+/g, "");

      return { id: k, pib: pib.trim(), tel, formattedAddr, raw: fbRec };
    });

    const sheetEnc = encodeURIComponent("СПИСОК");
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheetEnc}`;
    const sheetResp = await fetch(sheetUrl);
    const sheetText = await sheetResp.text();
    const sheetRows = parseCSV(sheetText);

    const misses = [
      'Андрііящук Віталій Сергійович',
      'Грудзевич Вікторія Володимирівна',
      'Грудзевич Тетяна Володимирівна'
    ];

    console.log("Analyzing each target miss against Google Sheet rows...");

    misses.forEach(missName => {
      // Find row in Google Sheet
      const sheetRow = sheetRows.find(r => r[1] && r[1].replace(/\s+/g, "").toLowerCase().includes(missName.replace(/\s+/g, "").toLowerCase().slice(0, 15)));
      if (!sheetRow) {
        console.log(`Could not find "${missName}" in Google Sheet!`);
        return;
      }

      const phone = String(sheetRow[13] || "").replace(/\D/g, "");
      const addr = String(sheetRow[12] || "");
      const cleanAddr = addr.toLowerCase().replace(/\s+/g, "");

      console.log(`\nGoogle Sheet Entry for: "${missName}"`);
      console.log(`  - Phone: "${sheetRow[13]}" (normalized: "${phone}")`);
      console.log(`  - Address: "${addr}"`);

      // 1. Look for matching phone number in Firebase
      if (phone) {
        const matchesByPhone = fbMembers.filter(m => m.tel && m.tel.includes(phone));
        if (matchesByPhone.length > 0) {
          console.log(`  * MATCH BY PHONE in Firebase:`);
          matchesByPhone.forEach(m => {
            console.log(`    - ID: ${m.id}, PIB: "${m.pib}", Phone in Firebase: "${m.raw["02_OSOBYSTE"]?.[ "2_tel" ] || ""}"`);
          });
        }
      }

      // 2. Look for matching address in Firebase
      const matchesByAddr = fbMembers.filter(m => m.formattedAddr && (m.formattedAddr.includes(cleanAddr) || cleanAddr.includes(m.formattedAddr)));
      if (matchesByAddr.length > 0) {
        console.log(`  * MATCH BY ADDRESS in Firebase:`);
        matchesByAddr.forEach(m => {
          console.log(`    - ID: ${m.id}, PIB: "${m.pib}"`);
        });
      }
    });

  } catch (err) {
    console.error(err);
  }
}

start();
