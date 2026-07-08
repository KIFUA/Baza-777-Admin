const fs = require('fs');
let content = fs.readFileSync('src/components/SpreadsheetView.tsx', 'utf-8');

const regex = /<td\s+className=\{\`py-0\.5 px-0\.5 border-r border-\[\#8fba94\] text-center relative cursor-pointer select-none hover:brightness-95 transition-all group\/contact \$\{bgClass\}\`\}[\s\S]*?<\/td>/;

const replacement = `<td 
                          className={\`py-0.5 px-0.5 border-r border-[#8fba94] text-center relative cursor-pointer select-none hover:brightness-95 transition-all \${bgClass}\`}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (!getPermission('ДАТИ КОНТАКТІВ З ПРЕСВ.').edit) {
                              alert("Тимчасово вносити зміни не можна");
                              return;
                            }
                            handleOpenContactModal(m);
                          }}
                          title="Двічі клацніть для редагування"
                        >
                          <div className="flex flex-col items-center justify-center min-h-6 leading-none space-y-0.5">
                            {allDates.slice(-2).map((dt, idx) => (
                              <span key={idx} className={\`font-extrabold font-mono text-[9px] mx-auto \${textClass}\`}>
                                {dt}
                              </span>
                            ))}
                            {allDates.length === 0 && (
                              <span className={\`font-extrabold font-mono text-[10px] mx-auto \${textClass}\`}>
                                —
                              </span>
                            )}
                          </div>
                        </td>`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/SpreadsheetView.tsx', content);
    console.log('Fixed cell rendering');
} else {
    console.log('Target not found');
}
