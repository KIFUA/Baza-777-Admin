import fs from 'fs';

const filepath = './src/components/DirectoriesManager.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const startMarker = `⚙️ <strong>Дії адміністратора (di_admin):</strong> Дільничі або дияконські адміністративні одиниці (переведення на каскади та центри). Це завдання адміністративних переміщень членів церкви, які поки що виконує адміністратор.
                    </span>
                  )}`;

const endMarker = `<div className={\`rounded-lg border border-[#224853]/55 p-3 bg-[#13282e]/40 space-y-2 \${
                  selectedDictKey === 'rayon' ? 'h-auto overflow-visible' : 'h-[280px] overflow-y-auto'
                }\`}>`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1) {
  console.error("Start marker not found");
  process.exit(1);
}
if (endIndex === -1) {
  console.error("End marker not found");
  process.exit(1);
}

const before = content.substring(0, startIndex + startMarker.length);
const after = content.substring(endIndex);

const replacement = `
                  {selectedDictKey === 'slujinnya' && (
                    <span>
                      ⛪ <strong>Служіння:</strong> Спеціалізовані християнські служіння та місії, в які залучені діючі члени нашої єдиної громади.
                    </span>
                  )}
                  {selectedDictKey === 'vidviduvanist' && (
                    <span>
                      📊 <strong>Характеристики відвідування:</strong> Статуси регулярності участі членів церкви у недільних зібраннях (Постійно, Періодично, Рідко, Ніколи).
                    </span>
                  )}
                  {selectedDictKey === 'prysutnist' && (
                    <span>
                      ❓ <strong>Причини відсутності:</strong> Довідник причин, через які опікувані члени могли пропустити богослужіння.
                    </span>
                  )}
                  {selectedDictKey === 'rayon' && (
                    <span>
                      🗺️ <strong>Райони структури:</strong> Окремі географічні або адміністративні райони та групи (наприклад, ЦЕНТР, КАСКАД, АЕРОПОРТ), що дозволяють групувати членів церкви для територіального опікунства та комунікації. Пресвітер за районом.
                    </span>
                  )}
                </div>

                {/* Items tag board */}
                `;

const newContent = before + replacement + after;
fs.writeFileSync(filepath, newContent, 'utf8');
console.log("Successfully replaced and repaired the corrupted block!");
