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

const cleanName = (val) => {
  return String(val || "")
    .replace(/\([^)]+\)/g, "") // Remove parenthesis and any characters inside
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const cleanAddressString = (val) => {
  return String(val || "")
    .replace(/\s+/g, " ")
    .replace(/,(\s*,)+/g, ",")
    .replace(/,+/g, ",")
    .replace(/\s*,\s*/g, ", ")
    .trim()
    .toLowerCase();
};

// Helper to format structured address (similar to server.ts formatAddress but with a clean layout)
function formatAddress(addrObj) {
  if (!addrObj) return "";
  
  let city = addrObj["1_nas_punkt"] !== undefined ? String(addrObj["1_nas_punkt"]) : (addrObj["1_misto"] !== undefined ? String(addrObj["1_misto"]) : "");
  let street = addrObj["2_vulycja"] !== undefined ? String(addrObj["2_vulycja"]) : (addrObj["2_vulitsya"] !== undefined ? String(addrObj["2_vulitsya"]) : "");
  let house = addrObj["3_budynok"] !== undefined ? String(addrObj["3_budynok"]) : (addrObj["3_budinok"] !== undefined ? String(addrObj["3_budinok"]) : "");
  let korpus = addrObj["4_korpus"] !== undefined ? String(addrObj["4_korpus"]) : "";
  let flat = addrObj["5_kvartyra"] !== undefined ? String(addrObj["5_kvartyra"]) : (addrObj["4_kvartira"] !== undefined ? String(addrObj["4_kvartira"]) : "");

  const cleanField = (val) => {
    return val.trim().replace(/^,+/, "").replace(/,+$/, "").trim();
  };

  city = cleanField(city);
  street = cleanField(street);
  house = cleanField(house);
  korpus = cleanField(korpus);
  flat = cleanField(flat);
  
  let cityPart = "";
  if (city) {
    const cityLower = city.toLowerCase();
    const isIF = cityLower.includes("івано-франківськ") || 
                 cityLower.includes("івано франківськ") || 
                 cityLower.includes("ів.-франк") || 
                 cityLower.includes("іва.-фран") ||
                 cityLower === "іванофранківськ" ||
                 cityLower === "іф" ||
                 cityLower === "і.ф.";
    
    if (!isIF) {
      const hasPrefix = /^(м\.|с\.|с-ще\.|смт\.|т\.)/i.test(city) || 
                        cityLower.startsWith("м ") || 
                        cityLower.startsWith("с ") || 
                        cityLower.startsWith("смт ") || 
                        cityLower.startsWith("с-ще ") || 
                        cityLower.startsWith("село ") || 
                        cityLower.startsWith("місто ");
                        
      if (!hasPrefix) {
        const regionalCities = [
          "калуш", "коломия", "долина", "яремче", "надвірна", "болєхів", "болехів",
          "рогатин", "снятин", "городенка", "косів", "тлумач", "тисмениця", "галич", "бурштин"
        ];
        const regionalSmt = [
          "богородчани", "отинія", "брошнів", "верховина", "войнилів", "делятин", 
          "заболотів", "ланчин", "перегінське", "рожнятів", "солотвин", "чернелиця", 
          "більшівці", "єзупіль", "кути", "печеніжин", "верховина"
        ];
        
        const cleanNameVal = city.replace(/^[,\s\.\-]+/, "").trim().toLowerCase();
        
        if (regionalCities.some(rc => cleanNameVal.includes(rc))) {
          cityPart = "м. " + city;
        } else if (regionalSmt.some(rs => cleanNameVal.includes(rs))) {
          cityPart = "смт. " + city;
        } else {
          cityPart = "с. " + city;
        }
      } else {
        cityPart = city;
      }
    }
  }
  
  let streetPart = "";
  if (street) {
    const streetLower = street.toLowerCase();
    const hasStreetPrefix = streetLower.startsWith("вул.") || 
                            streetLower.startsWith("вулиця") || 
                            streetLower.startsWith("пл.") || 
                            streetLower.startsWith("площа") || 
                            streetLower.startsWith("пров.") || 
                            streetLower.startsWith("провілок") || 
                            streetLower.startsWith("бул.") || 
                            streetLower.startsWith("бульвар") || 
                            streetLower.startsWith("просп.") || 
                            streetLower.startsWith("проспект") || 
                            streetLower.startsWith("тракт") || 
                            streetLower.startsWith("шосе");
    if (!hasStreetPrefix) {
      streetPart = "вул. " + street;
    } else {
      streetPart = street;
    }
  }
  
  let addressMain = streetPart;
  if (house) {
    if (addressMain) {
      addressMain += ", " + house;
    } else {
      addressMain = house;
    }
  }
  
  if (korpus) {
    if (addressMain) {
      addressMain += " / " + korpus;
    } else {
      addressMain = korpus;
    }
  }
  
  if (flat) {
    if (addressMain) {
      addressMain += " / " + flat;
    } else {
      addressMain = flat;
    }
  }
  
  let fullAddress = "";
  if (cityPart && addressMain) {
    fullAddress = cityPart + ", " + addressMain;
  } else if (cityPart) {
    fullAddress = cityPart;
  } else if (addressMain) {
    fullAddress = addressMain;
  }

  fullAddress = fullAddress
    .replace(/,(\s*,)+/g, ",")
    .replace(/,+/g, ",")
    .replace(/\s*,\s*/g, ", ")
    .trim();
  
  return fullAddress;
}

async function start() {
  try {
    console.log("Fetching members from Firebase RTDB...");
    const fbResp = await fetch(`${FIREBASE_URL}/members.json?auth=${DB_SECRET}`);
    const fbData = await fbResp.json();
    console.log(`Loaded ${fbData ? Object.keys(fbData).length : 0} members from Firebase`);

    console.log("Fetching Google Sheet СПИСОК...");
    const sheetEnc = encodeURIComponent("СПИСОК");
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheetEnc}`;
    const sheetResp = await fetch(sheetUrl);
    const sheetText = await sheetResp.text();
    const sheetRows = parseCSV(sheetText);
    console.log(`Loaded ${sheetRows.length} rows from Google Sheet`);

    const fbMap = new Map();
    Object.keys(fbData).forEach((stringId) => {
      const record = fbData[stringId];
      if (record) {
        const osobi = record["02_OSOBYSTE"] || {};
        const pib = osobi["pib"] || record["01_PIB"] || `${osobi["1_prizvysche"] || ""} ${osobi["2_imya"] || ""} ${osobi["3_pobatkovi"] || ""}`.trim();
        if (pib) {
          fbMap.set(cleanName(pib), { stringId, pib, record });
        }
      }
    });

    let misses = 0;
    let matches = 0;
    const mismatches = [];
    const missingPIBs = [];

    for (let i = 1; i < sheetRows.length; i++) {
      const row = sheetRows[i];
      if (row.length < 13) continue;
      const shPib = row[2]; // ПІБ
      const shAddr = row[12]; // Адрес

      if (!shPib) continue;

      const key = cleanName(shPib);
      const fbMatch = fbMap.get(key);

      if (!fbMatch) {
        misses++;
        missingPIBs.push(shPib);
        continue;
      }

      matches++;
      const fbRawAddr = fbMatch.record["03_ADRESA"] || {};
      const fbFormatted = formatAddress(fbRawAddr);

      const clShAddr = cleanAddressString(shAddr);
      const clFbAddr = cleanAddressString(fbFormatted);

      if (clShAddr !== clFbAddr) {
        mismatches.push({
          pib: shPib,
          fbPib: fbMatch.pib,
          stringId: fbMatch.stringId,
          sheetAddr: shAddr,
          fbFormatted: fbFormatted,
          fbRawAddr: fbRawAddr
        });
      }
    }

    console.log(`\nReconciliation Statistics:`);
    console.log(`Total Sheet members processed: ${sheetRows.length - 1}`);
    console.log(`Total Matches in Firebase: ${matches}`);
    console.log(`Total Missing matches: ${misses}`);
    console.log(`Total Mismatches found in Address string: ${mismatches.length}`);

    if (missingPIBs.length > 0) {
      console.log("\nStill missing matching names (first 10):", missingPIBs.slice(0, 10));
    }

  } catch (err) {
    console.error("Error occurred:", err);
  }
}

start();
