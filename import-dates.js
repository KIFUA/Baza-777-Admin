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

async function inspectTab(sheetName, limit = 20) {
  const encName = encodeURIComponent(sheetName);
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encName}`;
  try {
    console.log(`\n================ INSPECTING: "${sheetName}" ================`);
    const resp = await fetch(url);
    if (!resp.ok) {
      console.log(`Failed: ${resp.statusText}`);
      return;
    }
    const text = await resp.text();
    const rows = parseCSV(text);
    console.log(`Total rows: ${rows.length}`);
    for(let i=0; i<Math.min(limit, rows.length); i++) {
      console.log(`Row ${i}:`, rows[i].filter(x => x !== ''));
    }
  } catch (e) {
    console.error(e);
  }
}

async function start() {
  await inspectTab("ДОВІДНИКИ", 30);
  await inspectTab("ДОСТУП", 30);
}

start();
