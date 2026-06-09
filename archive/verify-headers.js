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

async function start() {
  const encName = encodeURIComponent("СПИСОК");
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encName}`;
  try {
    const resp = await fetch(url);
    const text = await resp.text();
    const rows = parseCSV(text);
    console.log(`Loaded ${rows.length} rows`);
    if (rows.length > 0) {
      console.log("Headers:");
      rows[0].forEach((h, idx) => {
        if (h) console.log(`Col ${idx}: "${h}"`);
      });
      console.log("\nFirst 5 data rows:");
      for (let i = 1; i <= 5; i++) {
        if (rows[i]) {
          console.log(`Row ${i} length: ${rows[i].length}`);
          console.log(`Row ${i} content:`, rows[i]);
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
}

start();
