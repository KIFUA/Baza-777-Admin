import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const dbBaseUrl = "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";
const DB_SECRET = "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";

async function run() {
  const url = `${dbBaseUrl}/members.json?auth=${DB_SECRET}`;
  
  console.log("Fetching current database...");
  const resp = await fetch(url);
  const data = await resp.json();
  
  if (!data) {
    console.error("No database!");
    return;
  }
  
  const firebaseUpdates = {};

  // 1. ID 1221 (Гергелюк Людмила Василівна)
  // Story: sent "відп." to Tlumach (17.09.2001), water baptism (27.06.2009),
  // there she could be sent ("відп.") to K-Podilskyi (e.g. on 10.10.2012),
  // and then returned to us (acceptance on 01.01.2016).
  if (data["1221"]) {
    console.log("Processing ID 1221...");
    const m = JSON.parse(JSON.stringify(data["1221"]));
    m["02_OSOBYSTE"]["13_status"] = "активний";
    m["06_VYBUTTYA"] = {
      "1_d_vybuttya": "",
      "2_prichina": "",
      "vybuv_prymitka": ""
    };
    m["07_ISTORIYA"] = [
      {
        "d_podiyi": "17.09.2001",
        "podiya": "відп.",
        "prychyna_detali": "в Тлумач (розпорядж. Черняка Вал.)"
      },
      {
        "d_podiyi": "27.06.2009",
        "podiya": "Водне хрещення"
      },
      {
        "d_podiyi": "10.10.2012",
        "podiya": "відп.",
        "prychyna_detali": "з Тлумача в К-Подільський"
      },
      {
        "d_podiyi": "01.01.2016",
        "podiya": "прийн.",
        "prychyna_detali": "з громади з К-Подільського"
      }
    ];
    firebaseUpdates["1221"] = m;
  }

  // 2. ID 1507 (Севостьянов Юрій Валерійович)
  // Not active (not present - "не наявний"). Sent 30.12.2021 to Resurrection church.
  // Repeated acceptance/baptism on 22.05.2022 is an error.
  if (data["1507"]) {
    console.log("Processing ID 1507...");
    const m = JSON.parse(JSON.stringify(data["1507"]));
    m["02_OSOBYSTE"]["13_status"] = "вибув";
    m["04_STRUCTURA"]["5_d_vodnogo"] = "";
    m["04_STRUCTURA"]["6_d_vstupu"] = "";
    m["06_VYBUTTYA"] = {
      "1_d_vybuttya": "30.12.2021",
      "2_prichina": "відп.",
      "vybuv_prymitka": "в ц. \"Воскресіння\""
    };
    m["07_ISTORIYA"] = [
      {
        "d_podiyi": "30.12.2021",
        "podiya": "відп.",
        "prychyna_detali": "в ц. \"Воскресіння\""
      }
    ];
    firebaseUpdates["1507"] = m;
  }

  // 3. ID 678 (Сенюк (Бабінчук) Тетяна Юріївна)
  // Wife of the deceased Vladyslav. Water baptism on 29.06.2013, acceptance 29.06.2013.
  // Excluded on the same day as husband (25.10.2013) for the same reason (за блуд).
  // Then returned/received on 14.03.2014 from exclusion (з вилучення).
  if (data["678"]) {
    console.log("Processing ID 678...");
    const m = JSON.parse(JSON.stringify(data["678"]));
    m["02_OSOBYSTE"]["13_status"] = "активний";
    m["06_VYBUTTYA"] = {
      "1_d_vybuttya": "",
      "2_prichina": "",
      "vybuv_prymitka": ""
    };
    m["07_ISTORIYA"] = [
      {
        "d_podiyi": "29.06.2013",
        "podiya": "Водне хрещення"
      },
      {
        "d_podiyi": "29.06.2013",
        "podiya": "прийн.",
        "prychyna_detali": ""
      },
      {
        "d_podiyi": "25.10.2013",
        "podiya": "Вил.",
        "prychyna_detali": "за блуд"
      },
      {
        "d_podiyi": "14.03.2014",
        "podiya": "прийн.",
        "prychyna_detali": "з вилучення"
      }
    ];
    firebaseUpdates["678"] = m;
  }

  // 4. ID 804 (Передрук Галина Василівна)
  // Sent on 05.06.2017 to the temple of Christ's Resurrection (в ц. "Христового Воскресіння").
  if (data["804"]) {
    console.log("Processing ID 804...");
    const m = JSON.parse(JSON.stringify(data["804"]));
    m["02_OSOBYSTE"]["13_status"] = "вибув";
    m["06_VYBUTTYA"] = {
      "1_d_vybuttya": "05.06.2017",
      "2_prichina": "відп.",
      "vybuv_prymitka": "в ц. \"Христового Воскресіння\""
    };
    m["07_ISTORIYA"] = [
      {
        "d_podiyi": "01.02.1995",
        "podiya": "Водне хрещення"
      },
      {
        "d_podiyi": "01.02.1995",
        "podiya": "прийн.",
        "prychyna_detali": ""
      },
      {
        "d_podiyi": "05.06.2017",
        "podiya": "відп.",
        "prychyna_detali": "в ц. \"Христового Воскресіння\""
      }
    ];
    firebaseUpdates["804"] = m;
  }

  // Submit to Firebase
  const numUpdates = Object.keys(firebaseUpdates).length;
  if (numUpdates > 0) {
    console.log(`\nSending PATCH request to Firebase RTDB with updates for ${numUpdates} profiles...`);
    const patchResp = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(firebaseUpdates)
    });
    
    if (patchResp.ok) {
      console.log("Firebase RTDB updated successfully!");
    } else {
      console.error("Failed to update Firebase:", await patchResp.text());
      return;
    }
    
    // Sync local db_cache.json
    const cachePath = path.join(process.cwd(), "db_cache.json");
    if (fs.existsSync(cachePath)) {
      console.log("\nSyncing local db_cache.json file...");
      const cacheObj = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
      
      let syncedCount = 0;
      cacheObj.members.forEach(member => {
        const idStr = String(member.id);
        if (firebaseUpdates[idStr]) {
          const remoteRec = firebaseUpdates[idStr];
          member.id_vybuttya = remoteRec["02_OSOBYSTE"]["13_status"] === "вибув" ? 1 : 0;
          
          if (!member.rawData) {
            member.rawData = {};
          }
          member.rawData = remoteRec;
          
          syncedCount++;
        }
      });
      
      fs.writeFileSync(cachePath, JSON.stringify(cacheObj, null, 2), "utf-8");
      console.log(`Local db_cache.json successfully updated for ${syncedCount} profiles.`);
    }
  } else {
    console.log("No profiles updated.");
  }
}

run().catch(console.error);
