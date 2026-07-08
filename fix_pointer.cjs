const fs = require('fs');
let content = fs.readFileSync('src/components/SpreadsheetView.tsx', 'utf-8');
const target = "${isTooltipOpen ? 'opacity-100 visible pointer-events-auto' : 'invisible opacity-0 group-hover/contact:opacity-100 group-hover/contact:visible pointer-events-none'}`}";
const replacement = "${isTooltipOpen ? 'opacity-100 visible pointer-events-auto' : 'invisible opacity-0 group-hover/contact:opacity-100 group-hover/contact:visible pointer-events-none group-hover/contact:pointer-events-auto'}`}";
if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/components/SpreadsheetView.tsx', content);
    console.log('Fixed pointer-events');
} else {
    console.log('Target not found');
}
