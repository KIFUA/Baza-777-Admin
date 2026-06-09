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
    const addresses = new Set();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][12]) {
        addresses.add(rows[i][12]);
      }
    }
    console.log("Distinct addresses in sheet:", addresses.size);
    const arr = Array.from(addresses).slice(0, 80);
    console.log("Sample addresses:");
    arr.forEach(a => console.log(` - "${a}"`));
  } catch (err) {
    console.error(err);
  }
}

start();
