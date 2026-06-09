import fetch from "node-fetch";

const GOOGLE_SHEET_ID = '1s_Wio5niYvq2HRoBYwH3bS9NEcbtsJsWXv5P7u5Zhw8';

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

// Fixed address string parser using space/comma safe boundaries instead of \b for Cyrillic
function parseAddressString(addr) {
  if (!addr) {
    return {
      "1_misto": "",
      "1_nas_punkt": "",
      "2_vulitsya": "",
      "2_vulycja": "",
      "3_budinok": "",
      "3_budynok": "",
      "4_korpus": "",
      "4_kvartira": "",
      "5_kvartyra": ""
    };
  }

  // Normalize spaces
  addr = addr.replace(/\s+/g, " ").trim();

  let city = "";
  let street = "";
  let house = "";
  let korpus = "";
  let flat = "";

  // Regex to match the street prefix with Cyrillic/space boundary
  const streetRegex = /(?:^|[\s,])(вул\.|вулиця|пл\.|площа|пров\.|провулок|провіл\.|бул\.|бульвар|просп\.|проспект|тракт|шосе)(?:\s|$|\.)/i;
  const match = addr.match(streetRegex);

  let remain = addr;
  if (match && match.index !== undefined) {
    city = addr.slice(0, match.index).trim();
    remain = addr.slice(match.index).trim();
    // If the matched match starts with the prefix character (like space/comma), let's adjust it
    const prefixGroup = match[1];
    const actualPrefixIdx = remain.indexOf(prefixGroup);
    if (actualPrefixIdx !== -1) {
      city += " " + remain.slice(0, actualPrefixIdx);
      remain = remain.slice(actualPrefixIdx);
    }
  }

  city = city.replace(/^[,\s]+|[,\s]+$/g, "").trim();
  remain = remain.replace(/[\s,\/]+$/, "").trim();

  // Find flat part
  const slashIdx = remain.lastIndexOf("/");
  if (slashIdx !== -1) {
    const possibleFlat = remain.slice(slashIdx + 1).trim();
    const beforeSlash = remain.slice(0, slashIdx).trim();

    if (!possibleFlat || /^[,\s]+$/.test(possibleFlat)) {
      remain = beforeSlash;
    } else {
      flat = possibleFlat;
      remain = beforeSlash;
    }
  }

  // Find house part
  const houseRegex = /(?:^|\s|,\s*)(\d+[\s\-ЯяА-яA-z]*(?:\/\d+)?[\s\-ЯяА-яA-z]*)$/i;
  const houseMatch = remain.match(houseRegex);
  if (houseMatch) {
    house = houseMatch[1].trim();
    remain = remain.slice(0, houseMatch.index).trim();
  }

  street = remain.replace(/^[,\s\.\-]+|[,\s\.\-]+$/g, "").trim();
  house = house.replace(/^[,\s\.\-]+|[,\s\.\-]+$/g, "").trim();
  flat = flat.replace(/^[,\s\.\-]+|[,\s\.\-]+$/g, "").trim();

  return {
    "1_misto": city,
    "1_nas_punkt": city,
    "2_vulitsya": street,
    "2_vulycja": street,
    "3_budinok": house,
    "3_budynok": house,
    "4_korpus": korpus,
    "4_kvartira": flat,
    "5_kvartyra": flat
  };
}

async function start() {
  const encName = encodeURIComponent("СПИСОК");
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encName}`;
  try {
    const resp = await fetch(url);
    const text = await resp.text();
    const rows = parseCSV(text);
    console.log(`Loaded ${rows.length} rows`);

    let exactMatches = 0;
    let total = 0;

    for (let i = 1; i < rows.length; i++) {
      const addr = rows[i][12];
      if (!addr) continue;

      total++;
      const parsed = parseAddressString(addr);
      const formatted = formatAddress(parsed);

      const clOriginal = addr.toLowerCase().replace(/\s+/g, "").replace(/,/g, "").replace(/\./g, "").trim();
      const clFormatted = formatted.toLowerCase().replace(/\s+/g, "").replace(/,/g, "").replace(/\./g, "").trim();

      if (clOriginal === clFormatted) {
        exactMatches++;
      } else {
        console.log(`\nOriginal:  "${addr}"`);
        console.log(`Parsed:    `, JSON.stringify(parsed));
        console.log(`Formatted: "${formatted}"`);
      }
    }

    console.log(`\nReconciliation check: ${exactMatches} / ${total} match perfectly excluding spacing/commas.`);
  } catch (err) {
    console.error(err);
  }
}

start();
