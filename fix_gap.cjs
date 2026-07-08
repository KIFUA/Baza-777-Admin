const fs = require('fs');
let content = fs.readFileSync('src/components/SpreadsheetView.tsx', 'utf-8');
const targetClass = "className={`absolute left-1/2 -translate-x-1/2 top-full mt-1 w-max min-w-[85px] max-w-[125px] bg-sky-50 text-sky-950 border border-sky-300 rounded shadow-md p-1.5 z-[250] text-center font-sans transition-all duration-150 ${isTooltipOpen ? 'opacity-100 visible pointer-events-auto' : 'invisible opacity-0 group-hover/contact:opacity-100 group-hover/contact:visible pointer-events-none group-hover/contact:pointer-events-auto'}`}";
const replacementClass = "className={`absolute left-1/2 -translate-x-1/2 top-full mt-1 before:absolute before:-top-2 before:left-0 before:w-full before:h-2 before:bg-transparent w-max min-w-[85px] max-w-[125px] bg-sky-50 text-sky-950 border border-sky-300 rounded shadow-md p-1.5 z-[250] text-center font-sans transition-all duration-150 ${isTooltipOpen ? 'opacity-100 visible pointer-events-auto' : 'invisible opacity-0 group-hover/contact:opacity-100 group-hover/contact:visible pointer-events-none group-hover/contact:pointer-events-auto'}`}";

if (content.includes(targetClass)) {
    content = content.replace(targetClass, replacementClass);
    fs.writeFileSync('src/components/SpreadsheetView.tsx', content);
    console.log('Fixed gap');
} else {
    console.log('Target not found');
}
