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
  const sheetEnc = encodeURIComponent("СПИСОК");
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheetEnc}`;
  try {
    const sheetResp = await fetch(sheetUrl);
    const sheetText = await sheetResp.text();
    const sheetRows = parseCSV(sheetText);
    console.log(`Loaded ${sheetRows.length} rows`);
    
    // Look at columns: which column is PIB?
    console.log("Header row:", JSON.stringify(sheetRows[0]));
    
    console.log("\nSearching for rows containing part of names:");
    sheetRows.forEach((r, idx) => {
      // search in all columns
      const rowStr = r.join(" | ");
      if (rowStr.toLowerCase().includes("грудз") || rowStr.toLowerCase().includes("андрія") || rowStr.toLowerCase().includes("андрії") || rowStr.toLowerCase().includes("андріі")) {
        console.log(`Row ${idx}: ${rowStr}`);
      }
    });

  } catch (err) {
    console.error(err);
  }
}

start();
