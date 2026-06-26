const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const tablyciDir = '/app/applet/tablyci';
const outputDir = path.join(tablyciDir, 'json');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const files = fs.readdirSync(tablyciDir).filter(f => f.endsWith('.xlsx'));

files.forEach(file => {
    try {
        const filePath = path.join(tablyciDir, file);
        const wb = XLSX.readFile(filePath);
        const sheetName = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        fs.writeFileSync(path.join(outputDir, file.replace('.xlsx', '.json')), JSON.stringify(data, null, 2));
        console.log(`Converted ${file} to JSON`);
    } catch (err) {
        console.error(`Error converting ${file}:`, err);
    }
});
