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
К-сть завд. адміна;;;;;;;V;V
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

