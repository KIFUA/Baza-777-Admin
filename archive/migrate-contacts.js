import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
const firebaseBaseUrl = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";
const GOOGLE_SHEET_ID = '1s_Wio5niYvq2HRoBYwH3bS9NEcbtsJsWXv5P7u5Zhw8';
const sheetName = encodeURIComponent('СПИСОК');
const GOOGLE_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;

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

// Clean name helper to ensure match
const cleanName = (val) => {
  return String(val || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

async function executeMigration() {
  console.log("Loading Local db_cache.json...");
  const dbCachePath = path.join(process.cwd(), "db_cache.json");
  if (!fs.existsSync(dbCachePath)) {
    console.error("Local db_cache.json does not exist. Please check setup first.");
    return;
  }
  const dbData = JSON.parse(fs.readFileSync(dbCachePath, "utf-8"));
  const localMembers = dbData.members || [];
  console.log(`Loaded ${localMembers.length} members from local cache.`);

  console.log("Fetching Google Sheet CSV...");
  const csvResp = await fetch(GOOGLE_CSV_URL);
  const csvText = await csvResp.text();
  const sheetRows = parseCSV(csvText);
  console.log(`Parsed ${sheetRows.length} rows from Google Sheet.`);

  let matchCount = 0;
  let hasContactCount = 0;

  // Map sheet rows by cleaned Name (PIB)
  const sheetMap = new Map();
  for (let i = 1; i < sheetRows.length; i++) {
    const r = sheetRows[i];
    if (r.length < 3) continue;
    const nameStr = r[2]; // Column C is ПІБ
    const contactDatesStr = r[3]; // Column D is Дати контактів
    const commentsStr = r[4]; // Column E is Примітки
    
    if (nameStr) {
      sheetMap.set(cleanName(nameStr), {
        pib: nameStr,
        contactDates: contactDatesStr || "",
        comments: commentsStr || ""
      });
    }
  }

  // Correlate with local members
  for (const member of localMembers) {
    const cleaned = cleanName(member.pib);
    const matched = sheetMap.get(cleaned);
    if (matched) {
      matchCount++;
      if (matched.contactDates) {
        hasContactCount++;
      }
      // Populate new d_kontaktiv attribute
      member.d_kontaktiv = matched.contactDates;
      // Also update primitka with spreadsheet comments if empty or append them if there is a difference
      if (matched.comments) {
        if (!member.primitka) {
          member.primitka = matched.comments;
        } else if (!member.primitka.includes(matched.comments)) {
          member.primitka = member.primitka + " | " + matched.comments;
        }
      }
    }
  }

  console.log(`Mapped ${matchCount} members by Name.`);
  console.log(`Members that had contact dates: ${hasContactCount}`);

  // Save back local cache
  fs.writeFileSync(dbCachePath, JSON.stringify(dbData, null, 2), "utf-8");
  console.log("Updated db_cache.json saved successfully.");

  // Also update Firebase Database
  console.log("Fetching current Firebase members state to update Firebase Realtime DB...");
  const fbUrl = `${firebaseBaseUrl}/members.json?auth=${DB_SECRET}`;
  const fbResp = await fetch(fbUrl);
  const fbData = await fbResp.json();
  
  if (fbData) {
    console.log("Updating Firebase members with contact dates...");
    let fbUpdates = 0;
    for (const key in fbData) {
      const fbMember = fbData[key];
      if (!fbMember) continue;
      const pibName = fbMember.pib || fbMember["01_PIB"] || "";
      const cleaned = cleanName(pibName);
      const matched = sheetMap.get(cleaned);
      if (matched && matched.contactDates) {
        // We will update the member record in Firebase on key
        const userUrl = `${firebaseBaseUrl}/members/${key}.json?auth=${DB_SECRET}`;
        
        // Match the structure from original applet:
        // We can write it directly:
        // `d_kontaktiv` or inside `05_ISTORIJA/d_kontaktiv` or similar
        const patchData = {
          d_kontaktiv: matched.contactDates
        };
        // also store in standard nesting if it exists
        if (fbMember["05_ISTORIJA"]) {
          patchData["05_ISTORIJA"] = {
            ...fbMember["05_ISTORIJA"],
            d_kontaktiv: matched.contactDates
          };
        } else {
          patchData["05_ISTORIJA"] = {
            d_kontaktiv: matched.contactDates
          };
        }

        await fetch(userUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchData)
        });
        fbUpdates++;
      }
    }
    console.log(`Successfully patched ${fbUpdates} records directly on Firebase Realtime DB.`);
  } else {
    console.warn("Could not retrieve members from Firebase or Firebase database is empty.");
  }
  console.log("Migration complete!");
}

executeMigration().catch(console.error);
