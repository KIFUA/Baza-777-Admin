const fs = require('fs');
const path = require('path');

const ministryMap = {
  0: "Загальне служіння / Інше",
  1: "Старший пресвітер (пастор)",
  2: "Пресвітер (пастор)",
  3: "Диякон",
  4: "Хор / Співак",
  5: "Вчитель недільної школи",
  6: "Сестринське служіння",
  7: "Молодіжне служіння",
  8: "Опікунське служіння",
  9: "Бібліотекар",
  11: "Режисер / Драмгурт",
  13: "Господарське служіння",
  14: "Діловодство / Канцелярія",
  16: "Місіонерське служіння",
  17: "Музичне служіння / Інструменталіст",
  18: "Молитовна група",
  19: "Братська рада",
  20: "Скарбник / Касир",
  21: "Рада церкви",
  22: "Координатор служінь",
  23: "Християнська освіта",
  24: "Милосердя / Відвідування хворих",
  25: "Будівельний комітет",
  26: "Робота з аудіо-відео",
  27: "Група порядку / Упорядник",
  28: "Організатор заходів",
  29: "Звукооператор / Технік",
  30: "Інтернет-служіння",
  31: "Група прославлення",
  32: "Кухонне служіння",
  33: "Таборове служіння",
  34: "Проповідник",
  35: "Дитяче служіння"
};

function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

const dbCachePath = path.join(process.cwd(), 'db_cache.json');
const slujinnyaJsonPath = path.join(process.cwd(), 'tablyci/json/slujinnya.json');

const dbCache = JSON.parse(fs.readFileSync(dbCachePath, 'utf8'));
const slujinnyaData = JSON.parse(fs.readFileSync(slujinnyaJsonPath, 'utf8'));

dbCache.ministries = [];
let ministryIdCounter = 1;

slujinnyaData.forEach(record => {
    if (!record.id_anketa) return;
    
    const ministryName = ministryMap[record.id_slujinnya] || "Невідоме";
    
    dbCache.ministries.push({
        id: ministryIdCounter++,
        memberId: record.id_anketa,
        ministryId: record.id_slujinnya || 0,
        ministryName: ministryName,
        startDate: record.d_begin ? excelDateToJSDate(record.d_begin) : undefined,
        startDateExcel: record.d_begin,
        isActive: true
    });
});

fs.writeFileSync(dbCachePath, JSON.stringify(dbCache, null, 2));
console.log('Migration completed.');
