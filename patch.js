const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const start = content.indexOf(`) : mainMode === 'questionnaire' ? (`);
const end = content.indexOf(`) : mainMode === 'settings' ? (`);

if (start !== -1 && end !== -1) {
    const replacement = `) : mainMode === 'questionnaire' ? (
              /* Questionnaire Legacy Embedded View */
              <div className="flex-1 flex flex-col min-h-0 bg-[#333333] overflow-hidden -mx-2 -mb-2 rounded-t-lg border-t border-[#1a3843]">
                <iframe src="/index_legacy.html" className="w-full h-full border-0" title="Legacy Questionnaire"></iframe>
              </div>
            `;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    fs.writeFileSync('src/App.tsx', newContent);
    console.log('App.tsx patched successfully');
} else {
    console.log('Could not find start or end markers');
}
