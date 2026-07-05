// Function to parse the provided CSV data
export const parseAccessLevelsCSV = (csvData: string) => {
  const lines = csvData.trim().split('\n');
  console.log("Lines in CSV:", lines);
  if (lines.length < 2) return [];

  // Parse headers, skipping the first column (Role/Element)
  const headers = lines[0].split(';').map(h => h.trim()).slice(1);

  const parsedData = [];

  // Start from line 1 (the table body)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';').map(c => c.trim());
    if (cols.length < 1) continue;

    const rowName = cols[i === 1 ? 0 : 0]; // Using index 0 for role/element name
    if (!rowName) continue;
    
    // Create an object mapping each column in headers to boolean access
    const accessMap: Record<string, boolean> = {};
    headers.forEach((h, idx) => {
      accessMap[h] = cols[idx + 1] === 'V';
    });

    parsedData.push({
      role: rowName,
      access: accessMap,
      headers: headers 
    });
  }

  return parsedData;
};

export function normalizeSemantic(name: string): string {
  if (!name) return "";
  let s = String(name).toLowerCase().trim();
  
  // Replace Cyrillic/Latin homoglyphs for safety:
  const replacements: Record<string, string> = {
    'а': 'a', 'с': 'c', 'е': 'e', 'і': 'i', 'о': 'o', 'р': 'p', 'х': 'x', 'у': 'y',
    'в': 'b', 'н': 'h', 'к': 'k', 'м': 'm', 'т': 't'
  };
  let res = "";
  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    res += replacements[char] || char;
  }
  
  // Remove non-alphanumeric characters
  res = res.replace(/[^a-z0-9]/g, '');
  return res;
}

export function parsePrefixAndClean(rawName: string): { prefix: string, clean: string } {
  if (!rawName) return { prefix: "", clean: "" };
  let s = String(rawName).trim();
  
  // Support prefixes starting with a letter T/A (Latin or Cyrillic) followed by underscores
  const match = s.match(/^([tTaAтТаА])_+([\s\S]+)$/);
  if (match) {
    let pref = match[1].toUpperCase();
    if (pref === 'T' || pref === 'Т') pref = 'Т';
    if (pref === 'A' || pref === 'А') pref = 'А';
    return { prefix: pref, clean: match[2].trim() };
  }
  return { prefix: "", clean: s };
}

export function isSemanticMatch(roleName: string, targetName: string, context?: 'Т' | 'А'): boolean {
  const { prefix: rolePrefix, clean: roleCleanRaw } = parsePrefixAndClean(roleName);
  const { prefix: targetPrefix, clean: targetCleanRaw } = parsePrefixAndClean(targetName);

  // If a context is provided and the role specifies a prefix, they must match!
  if (context && rolePrefix && rolePrefix !== context) {
    return false;
  }

  // If both have prefixes, they must match
  if (rolePrefix && targetPrefix && rolePrefix !== targetPrefix) {
    return false;
  }

  const roleClean = normalizeSemantic(roleCleanRaw);
  const targetClean = normalizeSemantic(targetCleanRaw);

  if (roleClean === targetClean) return true;
  if (roleClean && targetClean && (roleClean.includes(targetClean) || targetClean.includes(roleClean))) return true;

  // Specific synonyms for safety
  const synonyms = [
    ['вх', 'вхр', 'воднехрещення'],
    ['сімстан', 'сімейнийстан', 'шлюб', 'роківвшлюбі', 'даташлюб', 'пібпартнера'],
    ['телефон', 'додатиномер', 'додатиномертелефону', 'tel', 'phone', 'номер'],
    ['переміщ', 'переміщеннятазміниадр', 'переміщеннятазміниадрес', 'переміщення', 'movement'],
    ['адрес', 'адреса'],
    ['примітки', 'примітка', 'здоров', 'приміткапоздоровю']
  ];

  for (const syn of synonyms) {
    const hasRole = syn.some(s => roleClean.includes(s) || s.includes(roleClean));
    const hasTarget = syn.some(s => targetClean.includes(s) || s.includes(targetClean));
    if (hasRole && hasTarget) return true;
  }

  return false;
}

export const ACCESS_LEVELS_CSV_DATA = `Елемент;І-бачить;І-змінювати;ІІ-бачить;ІІ-змінювати;ІІІ-бачить;ІІІ-змінювати;ІV-бачить;ІV-змінювати
Дані синхронізації;;;V;;V;;V;V
ВСЬОГО ЧЛЕНІВ ЦЕРКВИ;V;V;V;V;V;V;V;V
Кнопка СПИСОК;;;;;V;V;V;V
Кнопка АНКЕТИ;;;;;;;V;V
Кнопка СТАТИСТИКА;;;;V;;V;V
Кнопка НАЛАШТУВАННЯ;;;;;;;V;V
Поле статусів;;;;;;;V;V
Поле районів;;V;;V;;V;;V
Поле опіка;;V;;V;;V;;V
Поле пошук;V;V;V;V;V;V;V;V
Кнопка ВЛАСНІ СПИСКИ;;;;;;;V;V
Кнопка РАЙОН У ТАБЛИЦІ;;V;;V;;V;;V
РАЙОН;;V;;V;;V;;V
ПІБ;V;V;V;V;V;V;V;V
Дата контакт.;;V;;V;;V;;V;V
Примітки;;;;;V;V;V;V
Завд. для адм.;;;;;V;V;V;V
Опіка;;V;;V;;V;;V;V
Служіння;;V;;V;;V;;V;V
Відвідув.;;V;;V;;V;;V;V
Прич. відсутн.;;V;;V;;V;;V;V
Вік;;V;;V;;V;;V;V
Адрес;;V;;V;;V;;V;V
Телефон;;V;;V;;V;;V;V
Дата народж.;;V;;V;;V;;V;V
Освіта;;V;;V;;V;;V;V
Хр. С.Д.;;V;;V;;V;;V;V
Сім. стан;;V;;V;;V;;V;V
Дата шлюб.;;V;;V;;V;;V;V
К-ть рок.в шлюбі;;V;;V;;V;;V;V
ПІБ партнера;;V;;V;;V;;V;V
Діти;;V;;V;;V;;V;V
Соц. стан;;V;;V;;V;;V;V
Професія;;V;;V;;V;;V;V
В.Х.;;V;;V;;V;;V;V
В церкві з;V;V;V;V;V;V;V;V
К-ть рок. в Ц.;V;V;V;V;V;V;V;V
Прич. вибуття;;;;V;;V;;V
Дата вибуття;;;;V;;V;;V
Примітка вибуття;;;;V;;V;;V
Історія змін;;;;V;;V;;V
Переміщ. та зміни адр.;;;;V;;V;;V;V`;

