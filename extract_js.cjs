const fs = require('fs');

const content = fs.readFileSync('/app/applet/dist/assets/main-Cq7ATPY7.js', 'utf8');

// ReportGenerator index was 965427
// Zvit_Chleniv_Tserkvy_ index was 981892
// Let's grab indices from 955000 to 995000
const start = 955000;
const end = 995000;

fs.writeFileSync('/app/applet/extracted_component.txt', content.substring(start, end), 'utf8');
console.log('Successfully wrote extracted_component.txt');
