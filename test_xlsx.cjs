const XLSX = require('xlsx');
const path = require('path');

try {
  const p = '/app/applet/tablyci/anketa.xlsx';
  console.log('Reading:', p);
  const wb = XLSX.readFile(p);
  console.log('Successfully read sheet names:', wb.SheetNames);
} catch (err) {
  console.error('Error reading file with sheetjs:', err);
}
