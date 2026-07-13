import express from "express";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { initBirthdayCron, BirthdaySettings } from "./src/lib/birthdayCron";
import XLSX from "xlsx";
import { 
  Member, 
  Spouse, 
  Child, 
  MinistryRecord, 
  DisciplineRecord, 
  AuditLogItem, 
  MemberDetailExtended,
  DashboardStats 
} from "./src/types";

export const app = express();
if (process.env.FIREBASE_SECRET === "YOUR_FIREBASE_SECRET_KEY") {
  process.env.FIREBASE_SECRET = "";
}
const PORT = 3000;
const DB_CACHE_FILE = path.join(process.cwd(), "db_cache.json");
const tablyciDir = path.join(process.cwd(), "tablyci");

app.use(express.json());

// Prevent browser/proxy/CDN caching for all API endpoints to guarantee active synchronization
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

let initialSyncPromise: Promise<void> | null = null;

function ensureInitialSync() {
  if (!initialSyncPromise) {
    initialSyncPromise = syncDatabaseWithFirebase()
      .then(async () => {
        // One-time cleanup for di_admin (Request 5)
        let cleanedCount = 0;
        for (const m of members) {
          if (m.di_admin === "Пресвітер" || m.di_admin === "єпископ" || (m.di_admin || "").toLowerCase().includes("єпископ")) {
            m.di_admin = "";
            await syncMemberToFirebase(m.id, m);
            cleanedCount++;
          }
        }
        if (cleanedCount > 0) {
          console.log(`[ensureInitialSync] Cleaned ${cleanedCount} members with invalid di_admin.`);
        }
        console.log("[ensureInitialSync] Initial Firebase sync finished successfully.");
        await loadSettingsFromFirebase();
      })
      .catch((err) => {
        console.error("[ensureInitialSync] Initial Firebase sync failed:", err);
        // Reset so that a subsequent request can retry syncing if it failed
        initialSyncPromise = null;
      });
  }
  return initialSyncPromise;
}

// Middleware to guarantee that database is fully initialized/synced before serving any API route
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api") && req.path !== "/api/health") {
    try {
    
  await ensureInitialSync();

  initBirthdayCron(getBirthdaysForThisWeek, getSettings);

    } catch (err: any) {
      console.error("[Sync Middleware] Error awaiting database sync:", err.message);
    }
  }
  next();
});

// In-memory Database State
let members: Member[] = [];
let marriages: any[] = [];
let children: any[] = [];
let ministries: any[] = [];
let disciplines: any[] = [];
let auditLogs: AuditLogItem[] = [];
let ignoreAdminLogs = true;

// Dictionary tables loaded from Excel
let s_osvita: any[] = [];
let s_socialniy: any[] = [];
let s_simeyniy: any[] = [];
let s_vybuv: any[] = [];
let s_profesiya: any[] = [];
let s_selo: any[] = [];
let s_vulicya: any[] = [];

// Google Sheets Tab: ДОВІДНИКИ - Default Fallback Constants
const DEFAULT_OPIKA = [
  "Бевзюк В.", "Бурчак Ю.", "Галюк Б.", "Дмитраш М.", "Євстратов О.", 
  "Ільницький О.", "Луцак М.", "Марунчак В.", "Мельничук В.", "Несен Ю.", 
  "Прохніцький Б.", "Решетило Р.", "Самелюк О.", "Скіцко І.", "Скриник М.", 
  "Стасінчук В.", "Стафіїв М.", "Стефурак Д.", "Факас О.", "Черняк Вал.", 
  "Черняк Вікт.", "Шегда П.", "Шпарман Ю.", "Черняк Вас."
];

const DEFAULT_SLUJINNYA = [
  "SUN SHINE", "WAW WOMAN", "АДМІНІСТРАТИВНЕ", "ГОСПОДАРСЬКЕ", "ГОСТИННОСТІ", 
  "ГРУПА ПОРЯДКУ", "ДИЗАЙНЕРСЬКЕ", "ДИТЯЧЕ", "ДИЯКОН", "Інформаційне", 
  "Лідер ДГ", "МЕДІА", "Молитовне", "МОЛОДІЖНЕ", "СОЦІАЛЬНЕ", "МУЗИЧНЕ", 
  "ПЕРЕКЛАДЧІ", "ПІДЛІТКОВЕ", "Підтр. мал. церков", "ПРЕСВІТЕР", "Проповідники", 
  "СЕСТРИНСЬКЕ", "Служіння Г/Н", "Служіння Дарами", "Милосердя", "Похоронне"
];

const DEFAULT_VIDVIDUVANIST_PARAMS = [
  "Постійно", "Періодично", "Рідко", "Ніколи"
];

const DEFAULT_PRYSUTNIST_PARAMS = [
  "За кордоном", "ЗСУ", "Не ходить", "Немічний", "відпустити в іншу громаду", "вилучити", "замітка"
];

const DEFAULT_DI_ADMIN = [
  "перевести на КАСКАД", "перевести на АЕРОПОРТ", "перевести на ЦЕНТР", "перевести на ОБ'ЇЗНУ"
];

const DEFAULT_RAYON2 = [
  "АЕРОПОРТ", "КАСКАД", "ОБ'ЇЗНА", "ЦЕНТР"
];

// Google Sheets Tab: ДОСТУП - Default Fallback Constants
const DEFAULT_DOSTUP = [
  { "rayon": "ЦЕНТР", "level": "IV-й", "user": "Адміністратор", "position": "Адміністратор", "password": "777", "telegramId": "240931069", "email": "240931069" },
  { "rayon": "ЦЕНТР", "level": "IV-й", "user": "Григорів В.", "position": "Адміністратор", "password": "777", "telegramId": "240931069", "email": "240931069" },
  { "rayon": "АЕРОПОРТ", "level": "ІІ-й", "user": "Григорів Г.", "position": "тестувальник", "password": "999", "telegramId": "858036501", "email": "858036501" },
  { "rayon": "АЕРОПОРТ", "level": "ІІІ-й", "user": "Бевзюк В.", "position": "Пресвітер", "password": "222-1", "telegramId": "951757352", "email": "951757352" },
  { "rayon": "КАСКАД", "level": "ІІІ-й", "user": "Скіцко І.", "position": "Пресвітер", "password": "222-2", "telegramId": "435624187", "email": "435624187" },
  { "rayon": "ЦЕНТР", "level": "І-й", "user": "Босик Л.", "position": "Відповідальний за опіку", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "ЦЕНТР", "level": "І-й", "user": "Євстратов О.", "position": "Відповідальний", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "ЦЕНТР", "level": "ІІ-й", "user": "Мельничук В.", "position": "Диякон", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "ЦЕНТР", "level": "І-й", "user": "Несен Ю.", "position": "Відповідальний", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "ЦЕНТР", "level": "І-й", "user": "Прохніцький Б.", "position": "Відповідальний", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "ЦЕНТР", "level": "І-й", "user": "Скриник М.", "position": "Відповідальний", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "ЦЕНТР", "level": "ІІ-й", "user": "Стасінчук В.", "position": "Диякон", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "ЦЕНТР", "level": "ІІ-й", "user": "Стафіїв М.", "position": "Диякон", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "ЦЕНТР", "level": "І-й", "user": "Факас О.", "position": "Відповідальний", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "ЦЕНТР", "level": "IV-й", "user": "Черняк Вал.", "position": "Пресвітер (Старший)", "password": "123", "telegramId": "969538290", "email": "969538290" },
  { "rayon": "ЦЕНТР", "level": "ІІ-й", "user": "Шегда П.", "position": "Диякон", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "ОБ'ЇЗНА", "level": "ІІ-й", "user": "Бурчак Ю.", "position": "Диякон", "password": "333", "telegramId": "61234567", "email": "gvi.dim.777@gmail.com" },
  { "rayon": "ОБ'ЇЗНА", "level": "ІІ-й", "user": "Дмитраш М.", "position": "Диякон", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "ОБ'ЇЗНА", "level": "ІІ-й", "user": "Решетило Р.", "position": "Диякон", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "ОБ'ЇЗНА", "level": "ІІ-й", "user": "Стефурак Д.", "position": "Диякон", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "ОБ'ЇЗНА", "level": "ІІІ-й", "user": "Черняк Вас.", "position": "Пресвітер", "password": "666", "telegramId": "969538290", "email": "cherniakvasylcherniak@gmail.com" },
  { "rayon": "КАСКАД", "level": "ІІ-й", "user": "Ільницький О.", "position": "Диякон", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "КАСКАД", "level": "ІІ-й", "user": "Луцак М.", "position": "Диякон", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "КАСКАД", "level": "ІІ-й", "user": "Марунчак В.", "position": "Диякон", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "АЕРОПОРТ", "level": "ІІ-й", "user": "Галюк Б.", "position": "Диякон", "password": "444", "telegramId": "Alla1967", "email": "+380967303099, Alla1967" },
  { "rayon": "АЕРОПОРТ", "level": "ІІ-й", "user": "Самелюк О.", "position": "Диякон", "password": "555", "telegramId": "solbo1971@gmail.com", "email": "solbo1971@gmail.com" },
  { "rayon": "АЕРОПОРТ", "level": "ІІ-й", "user": "Черняк Вікт.", "position": "Диякон", "password": "—", "telegramId": "—", "email": "" },
  { "rayon": "АЕРОПОРТ", "level": "І-й", "user": "Шпарман Ю.", "position": "Відповідальний", "password": "—", "telegramId": "—", "email": "" }
];

// Active State Tables (loaded from Cache or Google sheets, falling back to constants)
let directories_opika: string[] = [...DEFAULT_OPIKA];
let directories_slujinnya: string[] = [...DEFAULT_SLUJINNYA];
let directories_vidviduvanist: string[] = [...DEFAULT_VIDVIDUVANIST_PARAMS];
let directories_prysutnist: string[] = [...DEFAULT_PRYSUTNIST_PARAMS];
let directories_di_admin: string[] = [...DEFAULT_DI_ADMIN];
let directories_rayon2: string[] = [...DEFAULT_RAYON2];
let directories_custom: Record<string, string[]> = {};
let directories_rayon_bindings: any[] = [];
let directories_opika_bindings: any[] = [];
let access_dostup: any[] = [...DEFAULT_DOSTUP];
let permission_levels: any[] = [];

// Standard ministry translation name mapping for IDs (from 0 to 37)
const MINISTRY_MAP: Record<number, string> = {
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
  35: "Дитяче служіння",
  36: "Душпастирське консультування",
  37: "Регент хору / Диригент"
};

// Standard discipline names for IDs (0, 2, 3)
const DISCIPLINE_MAP: Record<number, string> = {
  0: "Зауваження",
  2: "Попередження",
  3: "Вилучення з членства"
};

// Helper to convert Excel date representation to string format "YYYY-MM-DD"
function formatExcelDate(excelDate: any): string {
  if (!excelDate) return "";
  const num = Number(excelDate);
  if (isNaN(num) || num <= 0) {
    if (typeof excelDate === "string" && excelDate.includes("-")) {
      return excelDate;
    }
    return String(excelDate).trim();
  }
  try {
    const utc_days = Math.floor(num - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const yyyy = date_info.getFullYear();
    const mm = String(date_info.getMonth() + 1).padStart(2, "0");
    const dd = String(date_info.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    return String(excelDate);
  }
}

// Convert "YYYY-MM-DD" to Excel date serial for backward syncing
function dateToExcelSerialNumber(dateStr: string): number {
  if (!dateStr) return 0;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 0;
    // Difference in ms between selected date and Excel epoch (Dec 30 1899)
    const excelEpoch = new Date(1899, 11, 30);
    const diffMs = d.getTime() - excelEpoch.getTime();
    return Math.round(diffMs / (24 * 60 * 60 * 1000));
  } catch (err) {
    return 0;
  }
}

// Initialize and parse files
function healDatabaseWithAnketa() {
  try {
    const anketaPath = path.join(tablyciDir, "anketa.xlsx");
    if (!fs.existsSync(anketaPath)) {
      console.warn("anketa.xlsx not found, skipping healing.");
      return;
    }
    console.log("Healing database records (vybuttya and general notes) using raw anketa.xlsx...");
    const wb = XLSX.readFile(anketaPath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const anketaRows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
    
    // Create map ID -> row
    const anketaMap = new Map<number, any>();
    anketaRows.forEach(row => {
      if (row.id) {
        anketaMap.set(Number(row.id), row);
      }
    });

    let healedCount = 0;
    let healedHsdCount = 0;
    members.forEach(member => {
      const row = anketaMap.get(member.id);
      if (row) {
        // Heal hsd (Holy Spirit baptism)
        if (row.hsd !== undefined) {
          const rawHsd = row.hsd;
          const computedHsd = (typeof rawHsd === "boolean")
            ? rawHsd
            : (String(rawHsd || "").trim().toLowerCase() === "так" || String(rawHsd || "").trim().toLowerCase() === "true");
          
          if (member.hsd !== computedHsd) {
            member.hsd = computedHsd;
            healedHsdCount++;
          }
        }

        const rawPrimitka = String(row.primitka || "").trim();
        if (rawPrimitka) {
          // If member has left and does not have a departure explanation, heal it!
          if (member.id_vybuttya > 0 && !member.vybutty_prymitka) {
            member.vybutty_prymitka = rawPrimitka;
            healedCount++;
          }
          // Also set general note if it is currently empty
          if (!member.prymitka) {
            member.prymitka = rawPrimitka;
            healedCount++;
          }
        }
      }
    });
    console.log(`Successfully healed and restored ${healedCount} notes/comments, and ${healedHsdCount} "Хр. С.Д." values from anketa.xlsx.`);
  } catch (err: any) {
    console.log(`Note: anketa.xlsx healing skipped (${err.message}). The fully functional and pre-healed cached database remains authoritative.`);
  }
}

function loadDatabase() {
  let loadedFromCache = false;
  // 1. Check if cached database exists. If yes, reload it
  if (fs.existsSync(DB_CACHE_FILE)) {
    try {
      console.log(`Loading database state from cache file: ${DB_CACHE_FILE}`);
      const rawData = fs.readFileSync(DB_CACHE_FILE, "utf-8");
      const db = JSON.parse(rawData);
      members = db.members || [];
      marriages = db.marriages || [];
      children = db.children || [];
      ministries = db.ministries || [];
      disciplines = db.disciplines || [];
      auditLogs = db.auditLogs || [];
      ignoreAdminLogs = db.ignoreAdminLogs !== undefined ? db.ignoreAdminLogs : true;
      s_osvita = db.s_osvita || [];
      s_socialniy = db.s_socialniy || [];
      s_simeyniy = db.s_simeyniy || [];
      s_vybuv = db.s_vybuv || [];
      s_profesiya = db.s_profesiya || [];
      s_selo = db.s_selo || [];
      s_vulicya = db.s_vulicya || [];
      directories_opika = db.directories_opika || [...DEFAULT_OPIKA];
      directories_slujinnya = db.directories_slujinnya || [...DEFAULT_SLUJINNYA];
      directories_vidviduvanist = (db.directories_vidviduvanist || [...DEFAULT_VIDVIDUVANIST_PARAMS]).filter((x: string) => ["Постійно", "Періодично", "Рідко", "Ніколи"].includes(x));
      if (directories_vidviduvanist.length === 0) directories_vidviduvanist = [...DEFAULT_VIDVIDUVANIST_PARAMS];
      directories_prysutnist = db.directories_prysutnist || [...DEFAULT_PRYSUTNIST_PARAMS];
      directories_di_admin = db.directories_di_admin || [...DEFAULT_DI_ADMIN];
      directories_custom = db.directories_custom || {};
      directories_rayon2 = ((db as any).directories_rayon2 || [...DEFAULT_RAYON2])
        .map((r: string) => String(r || "").replace(/\s*-\s*SOS/gi, "").trim())
        .filter((r: string, idx: number, arr: string[]) => r && arr.indexOf(r) === idx);
      directories_rayon_bindings = (db as any).directories_rayon_bindings || [];
      directories_opika_bindings = (db as any).directories_opika_bindings || [];
      access_dostup = db.access_dostup || [...DEFAULT_DOSTUP];
      if (Array.isArray(access_dostup) && (access_dostup.length === 0 || access_dostup.some(item => !item || item.role !== undefined || !item.user))) {
        console.warn("Detected corrupted or empty access_dostup in cache. Resetting to DEFAULT_DOSTUP...");
        access_dostup = [...DEFAULT_DOSTUP];
      }
      permission_levels = db.permission_levels || [];
      console.log(`Loaded cache: ${members.length} members.`);
      loadedFromCache = true;
    } catch (err: any) {
      console.error(`Error loading cached database, falling back to EXCEL files: ${err.message}`);
    }
  }

  if (!loadedFromCache) {
    console.log("No cache found, parsing Excel files in tablyci/ directory...");
    try {
      const loadExcelSheet = (fileName: string) => {
        const filePath = path.join(tablyciDir, fileName);
        if (!fs.existsSync(filePath)) {
          console.warn(`File not found: ${fileName}. Returning empty.`);
          return [];
        }
        const wb = XLSX.readFile(filePath);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        return XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
      };

      // Load static catalog lists
      s_osvita = loadExcelSheet("s_osvita.xlsx");
      s_socialniy = loadExcelSheet("s_socialniy.xlsx");
      s_simeyniy = loadExcelSheet("s_simeyniy.xlsx");
      s_vybuv = loadExcelSheet("s_vybuv.xlsx");
      s_profesiya = loadExcelSheet("s_profesiya.xlsx");
      s_selo = loadExcelSheet("s_selo.xlsx");
      s_vulicya = loadExcelSheet("s_vulicya.xlsx");

      // Load core relation spreadsheets
      marriages = loadExcelSheet("simya.xlsx");
      children = loadExcelSheet("z_simya_diti.xlsx");
      ministries = loadExcelSheet("slujinnya.xlsx");
      disciplines = loadExcelSheet("styagnennya.xlsx");

      // Load master participants table (z_1.xlsx is pre-joined)
      const masterRows = loadExcelSheet("z_1.xlsx");
      members = masterRows.map((row) => {
        const birthDate = formatExcelDate(row.d_narodjennya);
        const pokDate = formatExcelDate(row.d_pokayannya);
        const vodDate = formatExcelDate(row.d_vodnogo);
        const vstDate = formatExcelDate(row.d_vstupu);
        const vybDate = formatExcelDate(row.d_vybuttya);

        // Clean default attendance and presence states
        const attendanceAttr = (row.vidviduvanist || "").trim();
        const presenceAttr = (row.prysutnist || "").trim();

        const memberMinistries = ministries
          .filter(m => Number(m.id_anketa) === Number(row.id) && !m.d_end)
          .map(m => {
            const minId = Number(m.id_slujinnya);
            return MINISTRY_MAP[minId] || `Служіння #${minId}`;
          })
          .filter(Boolean);
        const ministriesStr = memberMinistries.join(", ");

        return {
          id: Number(row.id),
          pib: String(row.pib || "").trim(),
          gender: String(row.gender || row.stat || "н/д").trim(),
          stat: String(row.gender || row.stat || "н/д").trim(),
          
          s_simeyniy_ukr: String(row.s_simeyniy_ukr || "н/д").trim(),
          id_simeyniy: Number(row.id_simeyniy || 5),
          s_socialniy_ukr: String(row.s_socialniy_ukr || "н/д").trim(),
          id_socialniy: Number(row.id_socialniy || 6),
          s_osvita_ukr: String(row.s_osvita_ukr || "н/д").trim(),
          id_osvita: Number(row.id_osvita || 4),
          s_profesiya_ukr: String(row.s_profesiya_ukr || "").trim(),
          id_profesiya: Number(row.id_profesiya || 41),
          s_slujinnya_spysok: ministriesStr,
          zaklad_osv: String(row.zaklad_osv || "").trim(),
          
          d_narodjennya: birthDate,
          d_narodjennya_excel: Number(row.d_narodjennya || 0),
          tel_mob: String(row.tel_mob || "").trim(),
          tel1: String(row.tel1 || "").trim(),
          skype: String(row.skype || "").trim(),
          vik_rokiv1: row.vik_rokiv1 ? Number(row.vik_rokiv1) : undefined,

          d_pokayannya: pokDate,
          d_pokayannya_excel: Number(row.d_pokayannya || 0),
          d_vodnogo: vodDate,
          d_vodnogo_excel: Number(row.d_vodnogo || 0),
          hsd: !!row.hsd,
          d_vstupu: vstDate,
          d_vstupu_excel: Number(row.d_vstupu || 0),

          vidviduvanist: attendanceAttr,
          prysutnist: presenceAttr,

          presviter: String(row.presviter || "").trim(),
          rayon2_ukr: String(row.rayon2_ukr || "").trim(),
          id_rayon2: row.id_rayon2 ? String(row.id_rayon2) : "",
          id_dilnicya: row.id_dilnicya ? String(row.id_dilnicya) : "",
          n_dilyci: String(row.n_dilyci || "").trim(),
          vidpov_grupy: String(row.vidpov_grupy || "").trim(),

          id_vybuttya: Number(row.id_vybuttya || row.vyb1 || 0),
          s_vybuv_ukr: String(row.s_vybuv_ukr || "").trim(),
          d_vybuttya: vybDate,
          d_vybuttya_excel: Number(row.d_vybuttya || 0),
          vybutty_prymitka: String(row.vybutty_prymitka || row.primitka || "").trim(),

          hvoryi: String(row.hvoryi || "").trim(),
          insha_gromada: String(row.insha_gromada || "").trim(),
          primitka: String(row.primitka || "").trim(),
          efile: row.efile
        };
      });

      // Populate initial Audit Log to start with
      auditLogs.push({
        id: "init",
        timestamp: new Date().toISOString(),
        memberId: 0,
        memberName: "Система",
        action: "load",
        details: `Успішно імпортовано<sup><b>${members.length}</b></sup> записів членів церкви з Access.`
      });

      console.log(`Excel files parsed successfully: ${members.length} members cache created.`);
    } catch (err: any) {
      console.error(`CRITICAL error loading excel files: ${err.message}`);
    }
  }

  // Heal records with explanations from the raw anketa.xlsx and rewrite cache
  healDatabaseWithAnketa();
  saveDatabaseToCache();
}

let cachedMembersJson: any = null;
let lastCacheUpdateTime = 0;
let lastDatabaseSyncTime = 0;
const DB_SYNC_TTL_MS = 10000; // 10 seconds TTL to keep serverless / warm container state in perfect synchronization

function saveDatabaseToCache() {
  try {
    const db = {
      ignoreAdminLogs,
      members, marriages, children, ministries, disciplines, auditLogs,
      s_osvita, s_socialniy, s_simeyniy, s_vybuv, s_profesiya, s_selo, s_vulicya,
      directories_opika,
      directories_slujinnya,
      directories_vidviduvanist,
      directories_prysutnist,
      directories_di_admin,
      directories_custom,
      directories_rayon2,
      directories_rayon_bindings,
      directories_opika_bindings,
      access_dostup,
      permission_levels
    };
    fs.writeFileSync(DB_CACHE_FILE, JSON.stringify(db, null, 2), "utf-8");
    
    // Invalidate the cache of members.json so any query dynamically gets the freshest Firebase details
    cachedMembersJson = null;
    lastCacheUpdateTime = 0;
    console.log("[Cache Invalidation] Successfully invalidated members.json cache during write/update operation.");
  } catch (err: any) {
    console.error(`Error saving cache file: ${err.message}`);
  }
}

async function saveAuditLogToFirebase(log: AuditLogItem) {
  const user = (log.userPib || log.memberName || "").toLowerCase();
  if (ignoreAdminLogs && (user.includes("адміністр") || user.includes("адмін"))) {
    return; // Don't save administrator logs to Firebase
  }
  try {
    const url = `${FIREBASE_URL}/audit_logs/${log.id}.json?auth=${FIREBASE_SECRET}`;
    await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log)
    });
  } catch (err: any) {
    console.error(`[Firebase Audit] Failed to save audit log: ${err.message}`);
  }
}

async function saveDisciplineToFirebase(row: any) {
  try {
    const url = `${FIREBASE_URL}/disciplines/${row.id}.json?auth=${FIREBASE_SECRET}`;
    await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row)
    });
  } catch (err: any) {
    console.error(`[Firebase Discipline] Failed to save discipline record to Firebase: ${err.message}`);
  }
}


// --- API REST ROUTES ---

// 0. Transparent Firebase Proxy for legacy app with optimized memory caching
let FIREBASE_URL = process.env.FIREBASE_URL || "https://baza-777-default-rtdb.europe-west1.firebasedatabase.app";
if (FIREBASE_URL.endsWith("/")) {
  FIREBASE_URL = FIREBASE_URL.slice(0, -1);
}
const FIREBASE_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";

const CACHE_TTL_MS = 60000; // 1 minute local server-side cache

app.use('/api/firebase', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const isGetMembers = req.method === 'GET' && req.path === '/members.json';
    const now = Date.now();

    // Serve from fresh cache if possible
    if (isGetMembers && cachedMembersJson && (now - lastCacheUpdateTime < CACHE_TTL_MS)) {
      console.log(`[Firebase Proxy] Serving members.json from server cache`);
      return res.json(cachedMembersJson);
    }

    const reqPath = req.path.startsWith('/') ? req.path : '/' + req.path;
    const targetUrl = `${FIREBASE_URL}${reqPath}?auth=${FIREBASE_SECRET}`;
    console.log(`[Firebase Proxy] Requesting URL: ${targetUrl}`);
    console.log(`[Firebase Proxy] Requesting target: ${req.method} ${req.path}`);
    
    const options: any = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
    }
    
    const response = await fetch(targetUrl, options);
    const data = await response.text();
    
    let parsedData: any = null;
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      // Body is not JSON (e.g. error page or raw string)
    }

    if (response.ok && parsedData) {
      if (isGetMembers) {
        // Perform dynamic bidirectional relationship healing for spouse children arrays and marriage connections on the fly
        const originalKeys = Object.keys(parsedData);
        let healedAny = false;

        originalKeys.forEach((stringId) => {
          const id = Number(stringId);
          const raw = parsedData[stringId];
          if (!raw || isNaN(id)) return;

          const особисте = raw["02_OSOBYSTE"] || {};
          const shlyubArr = особисте["4_shlyub_history"];
          if (Array.isArray(shlyubArr) && shlyubArr.length > 0) {
            const sh = shlyubArr[shlyubArr.length - 1];
            if (sh) {
              const spouseId = Number(sh["podruzhzhya_id"] || sh["podrujya_id"]);
              if (spouseId > 0 && parsedData[spouseId]) {
                const spouseRaw = parsedData[spouseId];
                const spouseОсобисте = spouseRaw["02_OSOBYSTE"] || {};
                const spouseShlyubArr = Array.isArray(spouseОсобисте["4_shlyub_history"]) ? spouseОсобисте["4_shlyub_history"] : [];

                // --- 1. Bidirectional Marriage / Spouse Healing ---
                let partnerShIndex = spouseShlyubArr.length - 1;
                let partnerSh = spouseShlyubArr[partnerShIndex];

                if (!partnerSh || (Number(partnerSh["podruzhzhya_id"]) !== id && Number(partnerSh["podrujya_id"]) !== id)) {
                  // Spouse does not have a marriage record pointing back to current member. Look for one or create one.
                  const foundIdx = spouseShlyubArr.findIndex((s: any) => s && (Number(s["podruzhzhya_id"]) === id || Number(s["podrujya_id"]) === id));
                  if (foundIdx !== -1) {
                    partnerShIndex = foundIdx;
                    partnerSh = spouseShlyubArr[partnerShIndex];
                  } else {
                    console.log(`[Proxy Spouse-Healing] Spouse ${spouseId} is missing marriage back-reference to ${id}. Inserting and syncing.`);
                    const newShRecord = {
                      d_shlyubu_begin: sh["d_shlyubu_begin"] || "",
                      d_shlyubu_end: sh["d_shlyubu_end"] || "",
                      podruzhzhya_id: id,
                      podrujya_id: id,
                      status: sh["status"] || "одр."
                    };
                    const updatedSpouseShlyubArr = [...spouseShlyubArr, newShRecord];
                    spouseОсобисте["4_shlyub_history"] = updatedSpouseShlyubArr;
                    spouseRaw["02_OSOBYSTE"] = spouseОсобисте;

                    const spousePatchUrl = `${FIREBASE_URL}/members/${spouseId}/02_OSOBYSTE.json?auth=${FIREBASE_SECRET}`;
                    fetch(spousePatchUrl, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ "4_shlyub_history": updatedSpouseShlyubArr })
                    }).catch(e => console.error("Auto patch spouse marriage history error:", e));

                    healedAny = true;
                    spouseОсобисте["4_shlyub_history"] = updatedSpouseShlyubArr;
                    partnerShIndex = updatedSpouseShlyubArr.length - 1;
                    partnerSh = updatedSpouseShlyubArr[partnerShIndex];
                  }
                }

                if (partnerSh) {
                  let changedPartner = false;
                  if (Number(partnerSh["podruzhzhya_id"]) !== id) {
                    partnerSh["podruzhzhya_id"] = id;
                    changedPartner = true;
                  }
                  if (Number(partnerSh["podrujya_id"]) !== id) {
                    partnerSh["podrujya_id"] = id;
                    changedPartner = true;
                  }
                  if (!partnerSh["status"] && sh["status"]) {
                    partnerSh["status"] = sh["status"];
                    changedPartner = true;
                  }
                  if (!partnerSh["d_shlyubu_begin"] && sh["d_shlyubu_begin"]) {
                    partnerSh["d_shlyubu_begin"] = sh["d_shlyubu_begin"];
                    changedPartner = true;
                  }

                  if (changedPartner) {
                    spouseОсобисте["4_shlyub_history"] = spouseShlyubArr;
                    spouseRaw["02_OSOBYSTE"] = spouseОсобисте;
                    const spousePatchUrl = `${FIREBASE_URL}/members/${spouseId}/02_OSOBYSTE.json?auth=${FIREBASE_SECRET}`;
                    fetch(spousePatchUrl, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ "4_shlyub_history": spouseShlyubArr })
                    }).catch(e => console.error("Auto patch spouse keys compatibility error:", e));
                    healedAny = true;
                  }
                }

                let changedSelf = false;
                if (Number(sh["podruzhzhya_id"]) !== spouseId) {
                  sh["podruzhzhya_id"] = spouseId;
                  changedSelf = true;
                }
                if (Number(sh["podrujya_id"]) !== spouseId) {
                  sh["podrujya_id"] = spouseId;
                  changedSelf = true;
                }
                if (changedSelf) {
                  особисте["4_shlyub_history"] = shlyubArr;
                  raw["02_OSOBYSTE"] = особисте;
                  const selfPatchUrl = `${FIREBASE_URL}/members/${id}/02_OSOBYSTE.json?auth=${FIREBASE_SECRET}`;
                  fetch(selfPatchUrl, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ "4_shlyub_history": shlyubArr })
                  }).catch(e => console.error("Auto patch self keys compatibility error:", e));
                  healedAny = true;
                }

                // --- 2. Bidirectional Children Healing ---
                const listSelf = Array.isArray(особисте["9_dity"]) ? особисте["9_dity"] : [];
                const listSpouse = Array.isArray(spouseОсобисте["9_dity"]) ? spouseОсобисте["9_dity"] : [];

                const combinedList: any[] = [...listSelf];
                listSpouse.forEach((chSp: any) => {
                  if (!chSp || !chSp.name) return;
                  const spNameNorm = String(chSp.name).trim().toLowerCase().split(" ")[0];
                  const exists = combinedList.some((chSl: any) => {
                    if (!chSl || !chSl.name) return false;
                    const slNameNorm = String(chSl.name).trim().toLowerCase().split(" ")[0];
                    return slNameNorm === spNameNorm;
                  });
                  if (!exists) {
                    combinedList.push(chSp);
                  }
                });

                if (combinedList.length > listSelf.length || combinedList.length > listSpouse.length) {
                  console.log(`[Proxy Auto-Healing] Mismatch found between spouse ${id} and ${spouseId}. Combining to ${combinedList.length} children.`);
                  
                  if (combinedList.length > listSelf.length) {
                    особисте["9_dity"] = combinedList;
                    raw["02_OSOBYSTE"] = особисте;
                    const parentPatchUrl = `${FIREBASE_URL}/members/${id}/02_OSOBYSTE.json?auth=${FIREBASE_SECRET}`;
                    fetch(parentPatchUrl, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ "9_dity": combinedList })
                    }).catch(e => console.error("Auto patch family child list error:", e));
                    healedAny = true;
                  }

                  if (combinedList.length > listSpouse.length) {
                    spouseОсобисте["9_dity"] = combinedList;
                    spouseRaw["02_OSOBYSTE"] = spouseОсобисте;
                    const spousePatchUrl = `${FIREBASE_URL}/members/${spouseId}/02_OSOBYSTE.json?auth=${FIREBASE_SECRET}`;
                    fetch(spousePatchUrl, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ "9_dity": combinedList })
                    }).catch(e => console.error("Auto patch family child list error:", e));
                    healedAny = true;
                  }
                }
              }
            }
          }
        });

        cachedMembersJson = parsedData;
        lastCacheUpdateTime = now;
        console.log(`[Firebase Proxy] Cached members.json successfully (${originalKeys.length} items, healedAny: ${healedAny})`);
      }
      res.status(response.status).json(parsedData);
    } else {
      res.status(response.status).send(parsedData || data);
    }

    // Invalidate cache on non-GET write mutations
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      console.log(`[Firebase Proxy] Mutation detected: ${req.method} ${req.path}. Invalidating cache.`);
      cachedMembersJson = null;
      lastCacheUpdateTime = 0;
      lastDatabaseSyncTime = 0; // force dynamic cache loading immediately on next query
      // Trigger background sync to also keep modern view state updated
      setTimeout(() => {
        syncDatabaseWithFirebase().catch(err => console.error("Mutation background sync error:", err));
      }, 50);
    }
  } catch (error: any) {
    console.error(`[Firebase Proxy] Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// 1. Get List of directories for diagnostic or verification

const SETTINGS_FILE = path.join(process.cwd(), "settings.json");
let cachedSettings: any = null;

async function loadSettingsFromFirebase() {
  try {
    const url = `${FIREBASE_URL}/settings.json?auth=${FIREBASE_SECRET}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data && typeof data === 'object') {
        cachedSettings = data;
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
        console.log("[Firebase Settings] Successfully loaded and cached notification settings from Firebase Realtime DB.");
        return;
      }
    }
    console.log("[Firebase Settings] Settings empty or failed to load from Firebase Realtime DB, falling back to local file.");
  } catch (err: any) {
    console.error(`[Firebase Settings] Error loading settings from Firebase: ${err.message}`);
  }
}

function getSettings() {
  if (cachedSettings) {
    return cachedSettings;
  }
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    cachedSettings = data;
    return data;
  } catch (e) {
    const defaults = {
      mondayEmails: "",
      wednesdayEmails: "",
      mondayTelegramIds: "",
      wednesdayTelegramIds: "",
      botToken: "",
      appPassword: ""
    };
    cachedSettings = defaults;
    return defaults;
  }
}

app.get("/api/settings/notifications", (req, res) => {
  res.json(getSettings());
});

app.post("/api/settings/notifications", async (req, res) => {
  const settings = req.body;
  cachedSettings = settings;
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    
    // Save to Firebase Realtime DB
    const url = `${FIREBASE_URL}/settings.json?auth=${FIREBASE_SECRET}`;
    await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    console.log("[Firebase Settings] Successfully synchronized settings to Firebase Realtime DB.");
  } catch (err: any) {
    console.error(`[Firebase Settings] Error saving settings to Firebase Realtime DB: ${err.message}`);
  }
  res.json({ success: true });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", numMembers: members.length });
});

function sortRayonsArray(rayons: string[]): string[] {
  const customOrder = ["АЕРОПОРТ", "КАСКАД", "ОБ'ЇЗНА", "ЦЕНТР"];
  return [...rayons].sort((a, b) => {
    const idxA = customOrder.indexOf(a.toUpperCase());
    const idxB = customOrder.indexOf(b.toUpperCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

// 2. Lookup Tables Catalog Access
app.get("/api/lookups", async (req, res) => {
  await ensureDatabaseIsFresh();
  res.json({
    osvita: s_osvita,
    socialniy: s_socialniy,
    simeyniy: s_simeyniy,
    vybuv: s_vybuv,
    profesiya: s_profesiya,
    selo: s_selo,
    vulicya: s_vulicya,
    ministry_types: MINISTRY_MAP,
    discipline_types: DISCIPLINE_MAP,
    
    // New Google Sheets derived tabs
    directories: {
      opika: directories_opika,
      slujinnya: directories_slujinnya,
      vidviduvanist: directories_vidviduvanist,
      prysutnist: directories_prysutnist,
      di_admin: directories_di_admin,
      rayon2: sortRayonsArray(directories_rayon2),
      rayon: sortRayonsArray(directories_rayon2),
      custom: {
        ...directories_custom,
        dystsyplina: directories_custom["dystsyplina"] || directories_custom["Дисципліна"] || [],
        "Дисципліна": directories_custom["dystsyplina"] || directories_custom["Дисципліна"] || []
      },
      custom_lists: Array.from(new Set([...Object.keys(directories_custom), "dystsyplina", "Дисципліна"])),
      rayon_bindings: directories_rayon_bindings,
      opika_bindings: directories_opika_bindings,
      ...directories_custom,
      dystsyplina: directories_custom["dystsyplina"] || directories_custom["Дисципліна"] || [],
      "Дисципліна": directories_custom["dystsyplina"] || directories_custom["Дисципліна"] || []
    },
    access: access_dostup,
    permission_levels: permission_levels
  });
});

app.get("/api/custom-colors", async (req, res) => {
  if (cachedCustomColorsMap === null) {
    await fetchCustomColorsFromFirebase().catch(() => {});
  }
  res.json(cachedCustomColorsMap || {});
});

app.post("/api/custom-colors", async (req, res) => {
  try {
    const colorsMap = req.body;
    await saveCustomColorsToFirebase(colorsMap);
    res.json({ success: true, custom_colors_map: cachedCustomColorsMap });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Parse Google Sheet CSV (Simple quote-aware parser)
function parseCSV(text: string): string[][] {
  const results: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"' && inQuotes && nextChar === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(field.trim());
      field = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (field || row.length > 0) {
        row.push(field.trim());
        results.push(row);
        row = [];
        field = "";
      }
      if (char === '\r' && nextChar === '\n') i++;
    } else {
      field += char;
    }
  }
  
  if (field || row.length > 0) {
    row.push(field.trim());
    results.push(row);
  }
  
  // Post-process to clean values
  return results.map(rowCols => 
    rowCols.map(v => {
      let val = v.trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).trim();
      }
      return val;
    })
  ).filter(rowCols => rowCols.length > 0 && rowCols.some(col => col !== ""));
}

// 2.1 Sync Directories & Access Lists with Google Sheets
app.post("/api/sync-sheets", async (req, res) => {
  try {
    const GOOGLE_SHEET_ID = "1s_Wio5niYvq2HRoBYwH3bS9NEcbtsJsWXv5P7u5Zhw8";
    
    // Fetch direct XLSX export of Google Sheets to completely bypass server-side caching and fetch correct merged cell values
    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=xlsx`;
    const xlsxResp = await fetch(xlsxUrl);
    if (!xlsxResp.ok) throw new Error("Could not fetch XLSX export from Google Sheets");
    
    const arrayBuffer = await xlsxResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Date/Number formatting helpers for XLSX parsing compatibility
    const convertExcelSerialToDateString = (serialStr: string): string => {
      const serial = Number(serialStr);
      if (isNaN(serial) || serial <= 0) return String(serialStr);
      const excelEpoch = new Date(1899, 11, 30);
      const tempDate = new Date(excelEpoch.getTime() + Math.round(serial) * 86400000);
      const dd = String(tempDate.getDate()).padStart(2, '0');
      const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
      const yyyy = tempDate.getFullYear();
      return `${dd}.${mm}.${yyyy}`;
    };

    const formatXlsxCell = (val: any): string => {
      if (val === null || val === undefined) return "";
      const str = String(val).trim();
      if (!str) return "";
      if (/^\d{5}$/.test(str)) {
        return convertExcelSerialToDateString(str);
      }
      return str;
    };

    // 1. Process "ДОВІДНИКИ" sheet
    const dirSheet = workbook.Sheets["ДОВІДНИКИ"];
    if (!dirSheet) throw new Error("Sheet 'ДОВІДНИКИ' not found in spreadsheet");
    const dirRowsRaw = XLSX.utils.sheet_to_json<any[]>(dirSheet, { header: 1, raw: false });
    const dirRows = (dirRowsRaw || []).map(row => 
      (row || []).map(cell => formatXlsxCell(cell))
    );

    const freshOpika: string[] = [];
    const freshSlujinnya: string[] = [];
    const freshVidviduvanist: string[] = [];
    const freshPrysutnist: string[] = [];
    const freshDiAdmin: string[] = [];
    
    // Skip row 0 (headers)
    for (let r = 1; r < dirRows.length; r++) {
      const cols = dirRows[r];
      if (!cols) continue;
      if (cols[0]) freshOpika.push(cols[0]);
      if (cols[2]) freshSlujinnya.push(cols[2]);
      if (cols[4]) freshVidviduvanist.push(cols[4]);
      if (cols[6]) freshPrysutnist.push(cols[6]);
      if (cols[8]) freshDiAdmin.push(cols[8]);
    }
    
    if (freshOpika.length > 0) directories_opika = freshOpika;
    if (freshSlujinnya.length > 0) directories_slujinnya = freshSlujinnya;
    if (freshVidviduvanist.length > 0) {
      directories_vidviduvanist = freshVidviduvanist.filter((x: string) => ["Постійно", "Періодично", "Рідко", "Ніколи"].includes(x));
      if (directories_vidviduvanist.length === 0) directories_vidviduvanist = [...DEFAULT_VIDVIDUVANIST_PARAMS];
    }
    if (freshPrysutnist.length > 0) directories_prysutnist = freshPrysutnist;
    if (freshDiAdmin.length > 0) directories_di_admin = freshDiAdmin;

    // 2. Skip "ДОСТУП" sheet - registry is managed exclusively in Firebase RTDB
    console.log("[Google Sheets Sync] Skipping ДОСТУП tab import - registry is managed in Firebase.");
    
    // Write synchronized directories to Firebase Realtime Database
    await syncDirectoriesToFirebase();

    // 3. Fetch and Sync members list "СПИСОК" from Google Sheets
    let syncedMembersCount = 0;
    let syncMemberDetailsMsg = "";
    try {
      const listSheet = workbook.Sheets["СПИСОК"];
      if (!listSheet) throw new Error("Sheet 'СПИСОК' not found in spreadsheet");
      const listRowsRaw = XLSX.utils.sheet_to_json<any[]>(listSheet, { header: 1, raw: false });
      const listRows = (listRowsRaw || []).map(row => 
        (row || []).map(cell => formatXlsxCell(cell))
      );

      if (listRows.length > 1) {
        const headers = listRows[0];
          
          // Helper to normalize and match headers
          const normalizeString = (str: string): string => {
            if (!str) return "";
            let res = str
              .toLowerCase()
              .replace(/[\s\-_.,;()]/g, "")
              .replace(/і/gi, "i")
              .replace(/ї/gi, "i")
              .replace(/є/gi, "e")
              .trim();
            // Deduplicate English 'i' to handle double-i letters (e.g., 'ii' -> 'i')
            return res.replace(/ii+/g, "i");
          };

          const getColIndex = (hdrs: string[], searchTerms: string[]): number => {
            const normTerms = searchTerms.map(t => normalizeString(t));
            return hdrs.findIndex(h => {
              const normH = normalizeString(h);
              return normTerms.some(term => normH.includes(term) || term.includes(normH));
            });
          };

          const matchesName = (memberPib: string, sheetPib: string): boolean => {
            const cleanMember = cleanMaidenName(memberPib);
            const cleanSheet = cleanMaidenName(sheetPib);
            return normalizeString(cleanMember) === normalizeString(cleanSheet);
          };

          const parseSheetDate = (dateStr: string): string => {
            if (!dateStr) return "";
            const trimmed = dateStr.trim();
            const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
            if (match) {
              const [_, dd, mm, yyyy] = match;
              return `${yyyy}-${mm}-${dd}`;
            }
            return trimmed;
          };

          // Define columns - Do NOT use sequential row ID matching for Google Sheets
          const pibColIdx = getColIndex(headers, ["ПІБ", "піб", "пiб", "pib", "pib_full", "член", "прізвище"]);
          const rayonColIdx = getColIndex(headers, ["РАЙОН", "район", "rayon"]);
          const contactColIdx = getColIndex(headers, ["Дати контактів з пресвітером", "ДАТА КОНТАКТУ з пресвітером", "ДАТА КОНТАКТУ", "контакт", "пресвітер", "пресвитер", "d_kontaktiv", "kontakt"]);
          const ministryColIdx = getColIndex(headers, ["СЛУЖІННЯ", "служiння", "СОУДІЕЕЯ", "соудiеея", "sluj", "slujinnya"]);
          const attendanceColIdx = getColIndex(headers, ["ВІДВІДУВАННЯ", "відвідуваність", "вiдвiдуванiсть", "відвідув", "vidviduvanist", "attendance"]);
          const presenceColIdx = getColIndex(headers, ["ПРИЧ. ВІДСУТНОСТІ", "причина відсутності", "прич. відсутності", "ПРИСУТНІСТЬ", "присутність", "присутнiсть", "prysutnist", "presence"]);

          const opikaColIdx = getColIndex(headers, ["ОПІКА", "опіка", "опiка", "opika", "presviter"]);
          const diAdminColIdx = getColIndex(headers, ["ДІЇ", "дiї", "di_admin", "адміністратор"]);
          const addressColIdx = getColIndex(headers, ["АДРЕС", "адрес", "адреса", "address"]);
          const phoneColIdx = getColIndex(headers, ["ТЕЛЕФОН", "телефон", "tel_mob", "phone"]);
          const bdayColIdx = getColIndex(headers, ["ДАТА НАРОДЖЕННЯ", "дата народж", "народж", "d_narodjennya"]);
          const osvitaColIdx = getColIndex(headers, ["ОСВІТА", "освіта", "освiта", "ос-та", "osvita"]);
          const hsdColIdx = getColIndex(headers, ["ХР. С.Д.", "хр. с.д.", "хрсд", "hsd"]);
          const simeyniyColIdx = getColIndex(headers, ["СІМ. СТАН", "сім. стан", "сiм. стан", "сімейний", "simeyniy"]);
          const socialniyColIdx = getColIndex(headers, ["СОЦ. СТАН", "соц. стан", "соціальний", "socialniy"]);
          const vstupuColIdx = getColIndex(headers, ["В_ЦЕРКВІ_З", "в_церкві_з", "вцерквiз", "v_cerkvi_z", "вступ"]);

          console.log(`[Google Sheet Sync] Found Column Indexes: PIB=${pibColIdx}, RAYON=${rayonColIdx}, CONTACT=${contactColIdx}, MINISTRY=${ministryColIdx}, ATTENDANCE=${attendanceColIdx}, PRESENCE=${presenceColIdx}, OPIKA=${opikaColIdx}`);

          const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
          const firebaseUpdates: any = {};
          
          for (let r = 1; r < listRows.length; r++) {
            const row = listRows[r];
            if (!row || row.length === 0) continue;

            const pibVal = pibColIdx !== -1 && row[pibColIdx] ? row[pibColIdx].trim() : "";
            if (!pibVal) continue;

            let matchedMember = members.find(m => matchesName(m.pib, pibVal));

            if (matchedMember) {
              let rowUpdated = false;
              const memId = matchedMember.id;

              // Update rayon column
              if (rayonColIdx !== -1) {
                const rVal = row[rayonColIdx].trim();
                if (rVal !== undefined && matchedMember.rayon2_ukr !== rVal) {
                  matchedMember.rayon2_ukr = rVal;
                  firebaseUpdates[`members/${memId}/04_STRUCTURA/1_rayon`] = rVal;
                  rowUpdated = true;
                }
              }

              // Update contact date column
              if (contactColIdx !== -1) {
                const cVal = row[contactColIdx].trim();
                if (cVal !== undefined && matchedMember.d_kontaktiv !== cVal) {
                  matchedMember.d_kontaktiv = cVal;
                  firebaseUpdates[`members/${memId}/04_STRUCTURA/7_d_kontaktiv`] = cVal;
                  firebaseUpdates[`members/${memId}/04_STRUCTURA/d_kontaktiv`] = cVal;
                  rowUpdated = true;
                }
              }

              // Update ministry column (SOUDIEEJA)
              if (ministryColIdx !== -1) {
                const mVal = row[ministryColIdx].trim();
                if (mVal !== undefined && matchedMember.s_slujinnya_spysok !== mVal) {
                  matchedMember.s_slujinnya_spysok = mVal;
                  const slujList = mVal.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
                  firebaseUpdates[`members/${memId}/s_slujinnya_spysok`] = mVal;
                  firebaseUpdates[`members/${memId}/04_STRUCTURA/slujinnya`] = slujList;
                  firebaseUpdates[`members/${memId}/ISTORIJA/1_slujinnya`] = slujList;
                  firebaseUpdates[`members/${memId}/slujinnya`] = slujList;
                  rowUpdated = true;
                }
              }

              // Update attendance column
              if (attendanceColIdx !== -1) {
                const aVal = row[attendanceColIdx].trim();
                if (aVal !== undefined && matchedMember.vidviduvanist !== aVal) {
                  matchedMember.vidviduvanist = aVal;
                  firebaseUpdates[`members/${memId}/04_STRUCTURA/8_vidviduvanist`] = aVal;
                  rowUpdated = true;
                }
              }

              // Update presence column
              if (presenceColIdx !== -1) {
                const pVal = row[presenceColIdx].trim();
                if (pVal !== undefined && matchedMember.prysutnist !== pVal) {
                  matchedMember.prysutnist = pVal;
                  firebaseUpdates[`members/${memId}/04_STRUCTURA/9_prysutnist`] = pVal;
                  rowUpdated = true;
                }
              }

              // Update supervisor (opika)
              if (opikaColIdx !== -1) {
                const opVal = row[opikaColIdx].trim();
                if (opVal !== undefined && matchedMember.presviter !== opVal) {
                  matchedMember.presviter = opVal;
                  firebaseUpdates[`members/${memId}/04_STRUCTURA/4_opika`] = opVal;
                  rowUpdated = true;
                }
              }

              // Update admin actions (di_admin / san)
              if (diAdminColIdx !== -1) {
                const daVal = row[diAdminColIdx].trim();
                if (daVal !== undefined && matchedMember.di_admin !== daVal) {
                  matchedMember.di_admin = daVal;
                  firebaseUpdates[`members/${memId}/04_STRUCTURA/3_san`] = daVal;
                  firebaseUpdates[`members/${memId}/di_admin`] = daVal;
                  rowUpdated = true;
                }
              }

              // Update phone number
              if (phoneColIdx !== -1) {
                const phVal = row[phoneColIdx].trim();
                if (phVal !== undefined && matchedMember.tel_mob !== phVal) {
                  matchedMember.tel_mob = phVal;
                  firebaseUpdates[`members/${memId}/02_OSOBYSTE/2_tel`] = phVal;
                  firebaseUpdates[`members/${memId}/02_OSOBYSTE/phone`] = phVal;
                  firebaseUpdates[`members/${memId}/02_OSOBYSTE/tel`] = phVal;
                  rowUpdated = true;
                }
              }

              // Update address
              if (addressColIdx !== -1) {
                const addrVal = row[addressColIdx].trim();
                if (addrVal !== undefined && matchedMember.address !== addrVal) {
                  matchedMember.address = addrVal;
                  firebaseUpdates[`members/${memId}/03_ADRESA/address`] = addrVal;
                  rowUpdated = true;
                }
              }

              // Update birthday
              if (bdayColIdx !== -1) {
                const bdayVal = row[bdayColIdx].trim();
                if (bdayVal) {
                  const parsedBday = parseSheetDate(bdayVal);
                  if (parsedBday && matchedMember.d_narodjennya !== parsedBday) {
                    matchedMember.d_narodjennya = parsedBday;
                    firebaseUpdates[`members/${memId}/02_OSOBYSTE/1_d_narodjennya`] = parsedBday;
                    firebaseUpdates[`members/${memId}/02_OSOBYSTE/3_d_nar`] = parsedBday;
                    rowUpdated = true;
                  }
                }
              }

              // Update education level
              if (osvitaColIdx !== -1) {
                const oVal = row[osvitaColIdx].trim();
                if (oVal !== undefined && matchedMember.s_osvita_ukr !== oVal) {
                  matchedMember.s_osvita_ukr = oVal;
                  firebaseUpdates[`members/${memId}/02_OSOBYSTE/7_osvita`] = oVal;
                  rowUpdated = true;
                }
              }

              // Update Holy Spirit baptism (hsd)
              if (hsdColIdx !== -1) {
                const hsdVal = row[hsdColIdx].trim().toLowerCase() === "так";
                if (matchedMember.hsd !== hsdVal) {
                  matchedMember.hsd = hsdVal;
                  firebaseUpdates[`members/${memId}/04_STRUCTURA/hsd`] = hsdVal;
                  rowUpdated = true;
                }
              }

              // Update family marital status
              if (simeyniyColIdx !== -1) {
                const sVal = row[simeyniyColIdx].trim();
                if (sVal !== undefined && matchedMember.s_simeyniy_ukr !== sVal) {
                  matchedMember.s_simeyniy_ukr = sVal;
                  firebaseUpdates[`members/${memId}/02_OSOBYSTE/s_simeyniy_ukr`] = sVal;
                  rowUpdated = true;
                }
              }

              // Update social status
              if (socialniyColIdx !== -1) {
                const socVal = row[socialniyColIdx].trim();
                if (socVal !== undefined && matchedMember.s_socialniy_ukr !== socVal) {
                  matchedMember.s_socialniy_ukr = socVal;
                  firebaseUpdates[`members/${memId}/02_OSOBYSTE/6_socialniy`] = socVal;
                  rowUpdated = true;
                }
              }

              // Update entry date (vstupu)
              if (vstupuColIdx !== -1) {
                const vVal = row[vstupuColIdx].trim();
                if (vVal) {
                  const parsedVstupu = parseSheetDate(vVal);
                  if (parsedVstupu && matchedMember.d_vstupu !== parsedVstupu) {
                    matchedMember.d_vstupu = parsedVstupu;
                    firebaseUpdates[`members/${memId}/04_STRUCTURA/6_d_vstupu`] = parsedVstupu;
                    rowUpdated = true;
                  }
                }
              }

              if (rowUpdated) {
                syncedMembersCount++;
              }
            } else {
              // Automatically CREATE unmatched members from Google SheetСПИСОК tab
              const nextId = Math.max(...members.map(m => m.id), 1200) + 1;
              const genderCol = getColIndex(headers, ["Стать", "стать", "stat"]);
              let rawStat = genderCol !== -1 && row[genderCol] ? row[genderCol].trim().toLowerCase() : "";
              let normStat = "брат";
              if (rawStat.includes("сестр") || rawStat.includes("сес") || rawStat === "с") {
                normStat = "сестра";
              }

              const birthDateRaw = bdayColIdx !== -1 && row[bdayColIdx] ? row[bdayColIdx].trim() : "";
              const birthDate = parseSheetDate(birthDateRaw);
              let calculatedAge = 0;
              if (birthDate) {
                try {
                  const birth = new Date(birthDate);
                  const ageDiff = Date.now() - birth.getTime();
                  const ageDate = new Date(ageDiff);
                  calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
                } catch (_) {}
              }

              const newMember: Member = {
                id: nextId,
                pib: pibVal,
                stat: normStat,
                s_simeyniy_ukr: simeyniyColIdx !== -1 && row[simeyniyColIdx] ? row[simeyniyColIdx].trim() : "неодружений",
                id_simeyniy: 5,
                s_socialniy_ukr: socialniyColIdx !== -1 && row[socialniyColIdx] ? row[socialniyColIdx].trim() : "н/д",
                id_socialniy: 6,
                s_osvita_ukr: osvitaColIdx !== -1 && row[osvitaColIdx] ? row[osvitaColIdx].trim() : "н/д",
                id_osvita: 4,
                s_profesiya_ukr: "н/д",
                id_profesiya: 41,
                s_slujinnya_spysok: ministryColIdx !== -1 && row[ministryColIdx] ? row[ministryColIdx].trim() : "",
                zaklad_osv: "",
                d_narodjennya: birthDate,
                d_narodjennya_excel: dateToExcelSerialNumber(birthDate),
                tel_mob: phoneColIdx !== -1 && row[phoneColIdx] ? row[phoneColIdx].trim() : "",
                tel1: "",
                skype: "",
                vik_rokiv1: calculatedAge,
                d_pokayannya: "",
                d_pokayannya_excel: 0,
                d_vodnogo: "",
                d_vodnogo_excel: 0,
                hsd: hsdColIdx !== -1 && row[hsdColIdx] ? row[hsdColIdx].trim().toLowerCase() === "так" : false,
                d_vstupu: vstupuColIdx !== -1 && row[vstupuColIdx] ? parseSheetDate(row[vstupuColIdx].trim()) : "",
                d_vstupu_excel: 0,
                vidviduvanist: attendanceColIdx !== -1 && row[attendanceColIdx] ? row[attendanceColIdx].trim() : "",
                prysutnist: presenceColIdx !== -1 && row[presenceColIdx] ? row[presenceColIdx].trim() : "",
                di_admin: diAdminColIdx !== -1 && row[diAdminColIdx] ? row[diAdminColIdx].trim() : "",
                d_kontaktiv: contactColIdx !== -1 && row[contactColIdx] ? row[contactColIdx].trim() : "",
                presviter: opikaColIdx !== -1 && row[opikaColIdx] ? row[opikaColIdx].trim() : "",
                rayon2_ukr: rayonColIdx !== -1 && row[rayonColIdx] ? row[rayonColIdx].trim() : "",
                id_rayon2: "",
                id_dilnicya: "",
                n_dilyci: "",
                vidpov_grupy: "",
                id_vybuttya: 0,
                s_vybuv_ukr: "",
                d_vybuttya: "",
                d_vybuttya_excel: 0,
                vybutty_prymitka: "",
                hvoryi: "",
                insha_gromada: "",
                prymitka: "",
                efile: true,
                address: addressColIdx !== -1 && row[addressColIdx] ? row[addressColIdx].trim() : ""
              };

              members.push(newMember);

              // Structure for Firebase atomic batch write
              firebaseUpdates[`members/${nextId}/01_PIB`] = pibVal;
              firebaseUpdates[`members/${nextId}/pib`] = pibVal;
              firebaseUpdates[`members/${nextId}/stat`] = normStat;
              firebaseUpdates[`members/${nextId}/02_OSOBYSTE/1_d_narodjennya`] = birthDate;
              firebaseUpdates[`members/${nextId}/02_OSOBYSTE/3_d_nar`] = birthDate;
              firebaseUpdates[`members/${nextId}/02_OSOBYSTE/2_tel`] = newMember.tel_mob;
              firebaseUpdates[`members/${nextId}/02_OSOBYSTE/phone`] = newMember.tel_mob;
              firebaseUpdates[`members/${nextId}/02_OSOBYSTE/tel`] = newMember.tel_mob;
              firebaseUpdates[`members/${nextId}/02_OSOBYSTE/2_stat`] = normStat;
              firebaseUpdates[`members/${nextId}/02_OSOBYSTE/7_osvita`] = newMember.s_osvita_ukr;
              firebaseUpdates[`members/${nextId}/02_OSOBYSTE/13_status`] = "наявний";
              firebaseUpdates[`members/${nextId}/02_OSOBYSTE/s_simeyniy_ukr`] = newMember.s_simeyniy_ukr;
              firebaseUpdates[`members/${nextId}/02_OSOBYSTE/6_socialniy`] = newMember.s_socialniy_ukr;
              firebaseUpdates[`members/${nextId}/04_STRUCTURA/1_rayon`] = newMember.rayon2_ukr;
              firebaseUpdates[`members/${nextId}/04_STRUCTURA/4_opika`] = newMember.presviter;
              firebaseUpdates[`members/${nextId}/04_STRUCTURA/8_vidviduvanist`] = newMember.vidviduvanist;
              firebaseUpdates[`members/${nextId}/04_STRUCTURA/9_prysutnist`] = newMember.prysutnist;
              firebaseUpdates[`members/${nextId}/04_STRUCTURA/7_d_kontaktiv`] = newMember.d_kontaktiv;
              firebaseUpdates[`members/${nextId}/04_STRUCTURA/d_kontaktiv`] = newMember.d_kontaktiv;
              firebaseUpdates[`members/${nextId}/04_STRUCTURA/3_san`] = newMember.di_admin;
              firebaseUpdates[`members/${nextId}/04_STRUCTURA/hsd`] = !!newMember.hsd;
              firebaseUpdates[`members/${nextId}/03_ADRESA/address`] = newMember.address;
              if (newMember.s_slujinnya_spysok) {
                const slujList = newMember.s_slujinnya_spysok.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
                firebaseUpdates[`members/${nextId}/s_slujinnya_spysok`] = newMember.s_slujinnya_spysok;
                firebaseUpdates[`members/${nextId}/04_STRUCTURA/slujinnya`] = slujList;
                firebaseUpdates[`members/${nextId}/ISTORIJA/1_slujinnya`] = slujList;
                firebaseUpdates[`members/${nextId}/slujinnya`] = slujList;
              }

              syncedMembersCount++;
              console.log(`[Google Sheet Sync] Automatically created brand new synced member: ${pibVal} with ID ${nextId}`);
            }
          }

          if (Object.keys(firebaseUpdates).length > 0) {
            const bulkRes = await fetch(`${FIREBASE_URL}/.json?auth=${DB_SECRET}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(firebaseUpdates)
            });
            if (bulkRes.ok) {
              syncMemberDetailsMsg = `, також успішно перенесено дані ${syncedMembersCount} членів з Google-Таблиці на Firebase.`;
            } else {
              syncMemberDetailsMsg = `, проте виникла помилка Firebase під час запису супутніх полів для членів.`;
            }
          } else {
            syncMemberDetailsMsg = `, розбіжностей у даних членів церкви не зафіксовано.`;
          }
        }
      } catch (errMembers: any) {
      console.error("Error syncing spreadsheet members list:", errMembers);
      syncMemberDetailsMsg = `, помилка при аналізі аркушу СПИСОК: ${errMembers.message}`;
    }

    auditLogs.push({
      id: "sync_" + Date.now(),
      timestamp: new Date().toISOString(),
      memberId: 0,
      memberName: "Адмін",
      action: "sync",
      details: `<b>Синхронізація з Sheets</b>: завантажено актуальні списки опікунів, служінь, параметрів та рівнів доступу${syncMemberDetailsMsg}`
    });
    
    saveDatabaseToCache();
    
    res.json({
      success: true,
      directories: {
        opika: directories_opika.length,
        slujinnya: directories_slujinnya.length,
        vidviduvanist: directories_vidviduvanist.length,
        prysutnist: directories_prysutnist.length,
        di_admin: directories_di_admin.length,
        rayon2: directories_rayon2.length,
        syncedMembersCount: syncedMembersCount
      },
      access: access_dostup.length
    });
  } catch (err: any) {
    console.error("Sheets Sync Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2.2 Force synchronization with Firebase Realtime Database
app.post("/api/sync-firebase", async (req, res) => {
  try {
    await syncDatabaseWithFirebase();
    res.json({ success: true, count: members.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper functions for names
function cleanMaidenName(pib: string): string {
  if (!pib) return "";
  return pib.replace(/\s*\([^)]+\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function extractShortName(fullName: string): string {
  if (!fullName) return "";
  const nameParts = fullName.split(" ");
  return nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : fullName.trim();
}

// Helper to calculate birthday lists
function getBirthdaysForThisWeek() {
  const currentDate = new Date();
  
  // Find Monday of the current week (Monday=1, Sunday=0)
  const currentDay = currentDate.getDay(); // 0 is Sunday, 1 is Monday ...
  const startWeek = new Date(currentDate);
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  startWeek.setDate(currentDate.getDate() + diffToMonday);
  startWeek.setHours(0, 0, 0, 0);

  const endWeek = new Date(startWeek);
  endWeek.setDate(startWeek.getDate() + 6);
  endWeek.setHours(23, 59, 59, 999);

  const list: any[] = [];
  const activeMembers = members.filter(m => m.id_vybuttya === 0 && m.d_narodjennya);

  activeMembers.forEach(m => {
    const rawBirth = m.d_narodjennya!;
    let birthYear = 0;
    let birthMonth = 0;
    let birthDay = 0;

    if (rawBirth.includes(".")) {
      const parts = rawBirth.split(".");
      if (parts.length !== 3) return;
      birthDay = parseInt(parts[0], 10);
      birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed
      birthYear = parseInt(parts[2], 10);
    } else if (rawBirth.includes("-")) {
      const parts = rawBirth.split("-");
      if (parts.length !== 3) return;
      birthYear = parseInt(parts[0], 10);
      birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed
      birthDay = parseInt(parts[2], 10);
    } else {
      return;
    }

    const birthdayThisYear = new Date(currentDate.getFullYear(), birthMonth, birthDay);
    birthdayThisYear.setHours(12, 0, 0, 0);

    if (birthdayThisYear >= startWeek && birthdayThisYear <= endWeek) {
      const age = currentDate.getFullYear() - birthYear;
      const isJubilee = age % 10 === 0 && age !== 0;
      const clean = cleanMaidenName(m.pib);
      const short = extractShortName(clean);

      list.push({
        id: m.id,
        fullName: m.pib,
        cleanName: clean,
        shortName: short,
        birthDate: rawBirth,
        celebrationDate: birthdayThisYear.toISOString().split("T")[0],
        dayOfWeekNum: birthdayThisYear.getDay(), // 0 = Sunday, 1 = Monday etc.
        age,
        isJubilee,
        gender: m.gender,
        stat: m.gender,
        tel_mob: m.tel_mob,
        rayon2_ukr: m.rayon2_ukr,
        presviter: m.presviter
      });
    }
  });

  // Sort celebration list by date
  list.sort((a, b) => a.celebrationDate.localeCompare(b.celebrationDate));

  // Week range formatted string e.g. "01.06.2026 - 07.06.2026"
  const fmt = (d: Date) => `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()}`;
  return {
    list,
    weekRangeText: `${fmt(startWeek)} - ${fmt(endWeek)}`
  };
}

// 2.2 API: Get Current Week's Birthday celebrants
app.get("/api/birthdays", async (req, res) => {
  await ensureDatabaseIsFresh();
  res.json(getBirthdaysForThisWeek());
});

// 2.3 API: Send Birthday Celebrants reports (Email or Telegram Bot)
app.post("/api/birthdays/send", async (req, res) => {
  const { type, customToken, customChatId } = req.body;
  const birthdays = getBirthdaysForThisWeek();
  
  if (birthdays.list.length === 0) {
    return res.json({ success: true, message: "Немає іменинників на цьому тижні. Розсилку пропущено." });
  }

  // Construct Ukrainian week days array
  const UKR_DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];

  // Prepare beautifully formatted Markdown message text
  let msg = `🎂 **ІМЕНИННИКИ НА ТИЖДЕНЬ: ${birthdays.weekRangeText}** 🎂\n\n`;
  birthdays.list.forEach((item, idx) => {
    const dayName = UKR_DAYS[item.dayOfWeekNum];
    const dateFormatted = item.celebrationDate.split("-").reverse().join(".");
    const jubileeText = item.isJubilee ? ` 🎖️ **ЮВІЛЕЙ: ${item.age} років!**` : ` (${item.age} років)`;
    msg += `${idx + 1}. **${item.shortName}** — ${dayName}, ${dateFormatted}${jubileeText}\n`;
    if (item.tel_mob) msg += `   📞 Тел: ${item.tel_mob}\n`;
    if (item.rayon2_ukr) msg += `   📍 Район: ${item.rayon2_ukr} (Опікун: ${item.presviter || "не вказано"})\n`;
    msg += `\n`;
  });

  let telegramLogs = "";
  let emailLogs = "";

  if (type === "telegram_me" || type === "telegram_group") {
    const settings = getSettings();
    const token = customToken || settings.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const defaultChatId = type === "telegram_me" ? "1919236304" : "-1001914940560";
    
    let chatIdStr = customChatId;
    if (!chatIdStr) {
      if (type === "telegram_me") {
        chatIdStr = settings.mondayTelegramIds || defaultChatId;
      } else {
        chatIdStr = settings.wednesdayTelegramIds || defaultChatId;
      }
    }

    if (!token) {
      telegramLogs = `[Симуляція] Telegram бот токен НЕ налаштований. Список було б надіслано в чат: ${chatIdStr}.`;
    } else {
      const chatIds = chatIdStr.split(",").map(id => id.trim()).filter(Boolean);
      let tgSuccessCount = 0;
      let tgFailCount = 0;
      let lastError = "";
      
      for (const singleChatId of chatIds) {
        try {
          const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
          const response = await fetch(tgUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: singleChatId,
              text: msg,
              parse_mode: "Markdown"
            })
          });
          const rJson = await response.json() as any;
          if (rJson.ok) {
            tgSuccessCount++;
          } else {
            tgFailCount++;
            lastError = rJson.description || "unknown error";
          }
        } catch (tgErr: any) {
          tgFailCount++;
          lastError = tgErr.message;
        }
      }
      
      telegramLogs = `Telegram: надіслано успішно до ${tgSuccessCount} чатів. Помилок: ${tgFailCount}${lastError ? ' (' + lastError + ')' : ''}`;
    }
  } else if (type === "email_text" || type === "email_pdf") {
    const settings = getSettings();
    const appPassword = settings.appPassword;
    const destinationsStr = type === "email_pdf" ? settings.wednesdayEmails : settings.mondayEmails;
    const destinations = destinationsStr ? destinationsStr.split(",").map(e => e.trim()).filter(Boolean) : [];
    
    if (destinations.length === 0) {
      destinations.push("kostel.if.ua@gmail.com", "liliiachupryna@gmail.com", "solbo1971@gmail.com");
    }

    if (!appPassword) {
      emailLogs = `[Помилка] Не вказано App Password (пароль додатка Gmail) в налаштуваннях розсилки. Будь ласка, перейдіть до Налаштування -> Автоматичні розсилки іменинників та введіть 16-значний пароль додатка.`;
    } else {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'kostel.if.ua@gmail.com',
            pass: appPassword
          }
        });

        const subject = `🎂 Іменинники тижня (${birthdays.weekRangeText})`;
        const mailOptions: any = {
          from: '"База 777" <kostel.if.ua@gmail.com>',
          to: destinations,
          subject: subject,
          text: msg.replace(/\*\*/g, "") // Remove Markdown bold styling for plain text email
        };

        let tempPdfPath = "";
        if (type === "email_pdf") {
          tempPdfPath = path.join(process.cwd(), `birthdays_manual_${Date.now()}.pdf`);
          const doc = new PDFDocument({ size: 'A5', layout: 'portrait', margin: 40 });
          const writeStream = fs.createWriteStream(tempPdfPath);
          doc.pipe(writeStream);

          const regularFont = path.join(process.cwd(), 'fonts', 'Roboto-Regular.ttf');
          const boldFont = path.join(process.cwd(), 'fonts', 'Roboto-Bold.ttf');
          
          if (fs.existsSync(regularFont) && fs.existsSync(boldFont)) {
            doc.font(boldFont).fontSize(14).text('ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ', { align: 'center' });
            doc.moveDown(0.5);
            doc.font(regularFont).fontSize(10).text(`/ ${birthdays.weekRangeText} /`, { align: 'center' });
            doc.moveDown(2);

            birthdays.list.forEach((item: any) => {
              doc.font(boldFont).fontSize(12);
              if (item.isJubilee) {
                doc.fillColor('red');
              } else {
                doc.fillColor('black');
              }
              doc.text(item.shortName, { align: 'center' });
              doc.moveDown(0.5);
            });
          } else {
            doc.fontSize(14).text('ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).text(`/ ${birthdays.weekRangeText} /`, { align: 'center' });
            doc.moveDown(2);
            birthdays.list.forEach((item: any) => {
              doc.fontSize(12);
              doc.text(item.shortName, { align: 'center' });
              doc.moveDown(0.5);
            });
          }
          
          doc.end();

          await new Promise<void>((resolve, reject) => {
            writeStream.on('finish', () => resolve());
            writeStream.on('error', (err) => reject(err));
          });

          mailOptions.attachments = [{
            filename: 'Imenynnyky.pdf',
            path: tempPdfPath
          }];
        }

        await transporter.sendMail(mailOptions);
        emailLogs = `Email: успішно надіслано на адреси: ${destinations.join(", ")}`;

        if (tempPdfPath && fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath);
        }
      } catch (mailErr: any) {
        emailLogs = `Помилка надсилання пошти: ${mailErr.message}`;
        console.error("Email send error manually:", mailErr);
      }
    }
  }

  // Insert Audit Log entry
  auditLogs.push({
    id: "bday_" + Date.now(),
    timestamp: new Date().toISOString(),
    memberId: 0,
    memberName: "Система",
    action: "birthday_notification",
    details: `Розсилка іменинників: задіяна функція "<b>${type}</b>". Надіслано <b>${birthdays.list.length}</b> іменинників тижня.`
  });
  saveDatabaseToCache();

  res.json({
    success: true,
    message: "Розсилка успішно активована та опрацьована.",
    logs: telegramLogs || emailLogs,
    rawText: msg
  });
});

// 2.4 API: Save Custom Directories manually edited in directories tab
app.post("/api/directories/save", async (req, res) => {
  const data = req.body;
  
  if (Array.isArray(data.opika)) directories_opika = data.opika;
  if (Array.isArray(data.rayon_bindings)) directories_rayon_bindings = data.rayon_bindings;
  if (Array.isArray(data.opika_bindings)) directories_opika_bindings = data.opika_bindings;
  if (Array.isArray(data.slujinnya)) directories_slujinnya = data.slujinnya;
  if (Array.isArray(data.vidviduvanist)) {
    directories_vidviduvanist = data.vidviduvanist.filter((x: string) => ["Постійно", "Періодично", "Рідко", "Ніколи"].includes(x));
    if (directories_vidviduvanist.length === 0) directories_vidviduvanist = [...DEFAULT_VIDVIDUVANIST_PARAMS];
  }
  if (Array.isArray(data.prysutnist)) directories_prysutnist = data.prysutnist;
  if (Array.isArray(data.di_admin)) directories_di_admin = data.di_admin;
  
  console.log("Saving directories data:", Object.keys(data));
  console.log("Full payload data:", JSON.stringify(data));
  console.log("Payload custom_lists:", JSON.stringify(data.custom_lists));
  
  if (Array.isArray(data.custom_lists)) {
    directories_custom = {};
    data.custom_lists.forEach((listName: string) => {
      let finalName = listName;
      if (listName === "vibuv") {
        finalName = "vybuv";
      }
      console.log("Processing list:", listName, "->", finalName, "Data found:", Array.isArray(data[listName]), "Data length:", Array.isArray(data[listName]) ? data[listName].length : "N/A");
      if (Array.isArray(data[listName])) {
        directories_custom[finalName] = data[listName];
      }
    });

    const disciplineList = directories_custom["Дисципліна"] || directories_custom["dystsyplina"];
    if (disciplineList) {
      directories_custom["Дисципліна"] = disciplineList;
      directories_custom["dystsyplina"] = disciplineList;
    }
  }
  
  const targetRayons = Array.isArray(data.rayon) ? data.rayon : data.rayon2;
  if (Array.isArray(targetRayons)) directories_rayon2 = targetRayons;
  
  let isPermissionsArray = false;
  if (Array.isArray(data.access)) {
    if (data.access.length > 0 && data.access[0] && (data.access[0].role !== undefined || data.access[0].headers !== undefined)) {
      isPermissionsArray = true;
      permission_levels = data.access;
    } else {
      access_dostup = data.access;
    }
  }

  auditLogs.push({
    id: "dir_" + Date.now(),
    timestamp: new Date().toISOString(),
    memberId: 0,
    memberName: "Адмін",
    action: "directories_update",
    details: "<b>Оновлення довідників</b>: вручну внесені та збережені зміни в налаштування списків."
  });

  saveDatabaseToCache();
  try {
    await syncDirectoriesToFirebase();
    if (Array.isArray(data.access)) {
      if (isPermissionsArray) {
        await syncPermissionLevelsToFirebase();
      } else {
        await syncAccessDostupToFirebase();
      }
    }
    lastDatabaseSyncTime = Date.now();
  } catch (e) {
    console.error("Firebase manual directories save error:", e);
  }
  res.json({ success: true });
});

// Helper to determine if a member is a merged/archived duplicate profile
function isMergedProfileServer(m: any, list: any[]) {
  const pibSelf = String(m.pib || "").trim().toLowerCase();
  if (!pibSelf) return false;
  
  const selfId = Number(m.id);
  return list.some(other => {
    const otherId = Number(other.id);
    if (otherId <= selfId) return false;
    
    const otherPib = String(other.pib || "").trim().toLowerCase();
    if (otherPib !== pibSelf) return false;
    
    return other.id_vybuttya === 0;
  });
}

// Cache Invalidation Hook
app.post("/api/members/invalidate-cache", async (req, res) => {
  console.log("[Invalidate Cache Endpoint] Invalidation triggered by client. Setting lastDatabaseSyncTime = 0...");
  lastDatabaseSyncTime = 0;
  cachedMembersJson = null;
  lastCacheUpdateTime = 0;
  try {
    await syncDatabaseWithFirebase();
  } catch (e: any) {
    console.error("Cache invalidated manual sync error:", e.message);
  }
  res.json({ success: true });
});

// 3. Get Members (summary list with options to search, filter by tag, caretakers, etc)
app.get("/api/members", async (req, res) => {
  await ensureDatabaseIsFresh();
  const query = (req.query.q as string || "").toLowerCase();
  const gender = req.query.gender as string || ""; // 'брат' | 'сестра'
  const area = req.query.area as string || ""; // 'АЕРОПОРТ' etc
  const group = req.query.group as string || ""; // 'Дільниця №1' etc
  const status = req.query.status as string || ""; // 'active' | 'dismissed' (vybuv)
  const caretaker = req.query.caretaker as string || ""; // presviter Carey
  
  let result = members;

  // Search by Name, Address, Phone
  if (query) {
    result = result.filter(m => 
      m.pib.toLowerCase().includes(query) ||
      m.tel_mob.includes(query) ||
      m.tel1.includes(query) ||
      m.id.toString() === query ||
      m.s_profesiya_ukr.toLowerCase().includes(query) ||
      (m.s_slujinnya_spysok && m.s_slujinnya_spysok.toLowerCase().includes(query))
    );
  }

  // Filter Gender
  if (gender) {
    result = result.filter(m => (m.gender || m.stat) === gender);
  }

  // Filter Area
  if (area && area.toLowerCase() !== "всі" && area.toLowerCase() !== "все" && area.toLowerCase() !== "всі райони") {
    result = result.filter(m => m.rayon2_ukr.toLowerCase() === area.toLowerCase());
  }

  // Filter Section/Group
  if (group) {
    result = result.filter(m => m.n_dilyci.toLowerCase() === group.toLowerCase());
  }

  // Filter Care Giver / Supervisor
  if (caretaker) {
    result = result.filter(m => m.presviter.toLowerCase() === caretaker.toLowerCase());
  }

  // Filter Status
  if (status) {
    if (status === "active") {
      result = result.filter(m => m.id_vybuttya === 0 && !isMergedProfileServer(m, members));
    } else if (status === "dismissed") {
      result = result.filter(m => m.id_vybuttya > 0 && !isMergedProfileServer(m, members));
    }
  }

  // Enrich with active disciplines
  const enrichedResult = result.map(m => {
    // Check if member has active discipline
    const activeDiscipline = disciplines.find(d => Number(d.id_anketa) === m.id && !d.d_znyato && !d.d_end);
    let reason = m.discipline_reason || '';
    let startDate = m.discipline_date_start || '';
    
    if (activeDiscipline) {
      startDate = activeDiscipline.d_begin ? formatExcelDate(activeDiscipline.d_begin) : startDate;
    }

    return {
      ...m,
      discipline_reason: reason,
      discipline_date_start: startDate
    };
  });

  res.json(enrichedResult);
});

// 4. Get Core Statistics
app.get("/api/stats", async (req, res) => {
  await ensureDatabaseIsFresh();
  const activeOnly = members.filter(m => m.id_vybuttya === 0 && !isMergedProfileServer(m, members));
  
  const stats: DashboardStats = {
    totalMembers: members.length,
    activeMembers: activeOnly.length,
    dismissedMembers: members.length - activeOnly.length,
    malesCount: activeOnly.filter(m => (m.gender || m.stat) === "брат").length,
    femalesCount: activeOnly.filter(m => (m.gender || m.stat) === "сестра").length,
    maritalStats: {},
    socialStats: {},
    educationStats: {},
    areaStats: {},
    groupsCount: {},
    caregiversCount: {}
  };

  activeOnly.forEach(m => {
    // Marital Status
    const m_stat = m.s_simeyniy_ukr || "Не вказано";
    stats.maritalStats[m_stat] = (stats.maritalStats[m_stat] || 0) + 1;

    // Social Status
    const s_stat = m.s_socialniy_ukr || "Не вказано";
    stats.socialStats[s_stat] = (stats.socialStats[s_stat] || 0) + 1;

    // Education
    const edu = m.s_osvita_ukr || "Не вказано";
    stats.educationStats[edu] = (stats.educationStats[edu] || 0) + 1;

    // Structural Area (rayon2)
    const area = m.rayon2_ukr || "Не вказано";
    stats.areaStats[area] = (stats.areaStats[area] || 0) + 1;

    // Sections (n_dilyci / groups)
    const grp = m.n_dilyci || "Загальна";
    stats.groupsCount[grp] = (stats.groupsCount[grp] || 0) + 1;

    // Pastoral caregiver (presviter)
    const cg = m.presviter || "Опікун не вказаний";
    stats.caregiversCount[cg] = (stats.caregiversCount[cg] || 0) + 1;
  });

  res.json(stats);
});

// 5. Get Extended Member Detail
app.get("/api/members/:id", async (req, res) => {
  await ensureDatabaseIsFresh();
  const id = Number(req.params.id);
  const foundMember = members.find(m => m.id === id);
  if (!foundMember) {
    return res.status(404).json({ error: "Member not found" });
  }
  const member = { ...foundMember } as any;

  // A. Determine spouse
  let spouse: Spouse | null = null;
  let marriageRec = marriages.find(m => Number(m.id_cholovik) === id || Number(m.id_drujina) === id);
  if (marriageRec) {
    const isCholovik = Number(marriageRec.id_cholovik) === id;
    const spId = isCholovik ? Number(marriageRec.id_drujina) : Number(marriageRec.id_cholovik);
    if (spId > 0) {
      const spName = members.find(m => m.id === spId)?.pib || `Член ID ${spId}`;
      spouse = { id: spId, pib: spName };
      member.pib_partnera = spName;
    }
    member.d_shlyubu = toISODateFormat(formatExcelDate(marriageRec.d_begin));
  }

  // B. Get Children
  let myChildren: Child[] = [];
  let childrenList = [];
  // Match either parent id
  childrenList = children.filter(c => Number(c.id_cholovik) === id || Number(c.id_drujina) === id);
  
  if (marriageRec && childrenList.length === 0) {
    // also try by family record id
    childrenList = children.filter(c => Number(c.id_simya) === Number(marriageRec.id) || Number(c.simya_id) === Number(marriageRec.id));
  }

  myChildren = childrenList.map(c => ({
    id: Number(c.dity_id || c.id),
    name: String(c.n_dity || "").trim() + " " + String(c.f_dity || "").trim(),
    birthDate: formatExcelDate(c.d_nar),
    birthDateExcel: Number(c.d_nar || 0),
    age: Number(c.dity_vik_rokiv1 || 0),
    familyId: Number(c.id_simya || c.simya_id),
    fatherId: Number(c.id_cholovik || 0),
    motherId: Number(c.id_drujina || 0)
  }));

  // C. Get Ministry history logs
  const memberMinistries = ministries
    .filter(m => Number(m.id_anketa) === id)
    .map(m => {
      const minId = Number(m.id_slujinnya);
      const minName = MINISTRY_MAP[minId] || `Служіння #${minId}`;
      const startDate = formatExcelDate(m.d_begin);
      const endDate = formatExcelDate(m.d_end);
      const isActive = !endDate;
      return {
        id: Number(m.id),
        memberId: id,
        ministryId: minId,
        ministryName: minName,
        startDate,
        startDateExcel: Number(m.d_begin || 0),
        endDate,
        endDateExcel: Number(m.d_end || 0),
        isActive
      };
    });

  // D. Get discipline censure logs
  const memberDisciplines = disciplines
    .filter(d => Number(d.id_anketa) === id)
    .map(d => {
      const discId = Number(d.id_styagnen);
      const discName = DISCIPLINE_MAP[discId] || `Дисципліна #${discId}`;
      const startDate = formatExcelDate(d.d_begin);
      const endDate = formatExcelDate(d.d_end);
      const removalDate = formatExcelDate(d.d_znyato);
      const isActive = !removalDate && !endDate;

      return {
        id: Number(d.id),
        memberId: id,
        disciplineId: discId,
        disciplineName: discName,
        reason: String(d.styagnen_prychyna || "").trim(),
        startDate,
        startDateExcel: Number(d.d_begin || 0),
        endDate,
        endDateExcel: Number(d.d_end || 0),
        removalDate,
        removalDateExcel: Number(d.d_znyato || 0),
        isActive
      };
    });

  const response: MemberDetailExtended = {
    member,
    spouse,
    children: myChildren,
    ministries: memberMinistries,
    disciplines: memberDisciplines
  };

  res.json(response);
});

// Helper function to convert ISO "YYYY-MM-DD" to UA "DD.MM.YYYY"
function toUADateFormat(dateStr: string): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  if (trimmed.includes(".")) return trimmed; // Already UA format
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    if (parts.length === 3) {
      const [yyyy, mm, dd] = parts;
      return `${dd}.${mm}.${yyyy}`;
    }
  }
  return trimmed;
}

// Helper function to convert UA "DD.MM.YYYY" to ISO "YYYY-MM-DD"
function toISODateFormat(dateStr: string): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  if (trimmed.includes("-")) return trimmed; // Already ISO format
  if (trimmed.includes(".")) {
    const parts = trimmed.split(".");
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return trimmed;
}

// Helper to get abbreviated marital status
function getAbbreviatedMaritalStatus(simeyniyStr: string): string {
  if (!simeyniyStr) return "неодруж.";
  const s = simeyniyStr.toLowerCase();
  if (s.includes("неодр")) return "неодруж.";
  if (s.includes("одруж") || s.includes("заміж") || s.includes("одр")) return "одр.";
  if (s.includes("розлуч") || s.includes("розл")) return "розлуч.";
  if (s.includes("вдов")) return "вдов.";
  return "неодруж.";
}

// Helper to update in-memory marriages list
function updateInMemoryMarriage(member: Member) {
  const isMarried = member.id_simeyniy === 2 || String(member.s_simeyniy_ukr).toLowerCase().includes("одр") || String(member.s_simeyniy_ukr).toLowerCase().includes("заміж");
  
  let partnerId = 0;
  if (member.pib_partnera) {
    const matchedPartner = members.find(m => 
      m.id !== member.id && (
        m.pib.toLowerCase().includes(member.pib_partnera!.toLowerCase()) ||
        member.pib_partnera!.toLowerCase().includes(m.pib.toLowerCase())
      )
    );
    if (matchedPartner) partnerId = matchedPartner.id;
  }

  // Remove old marriage entries for this member
  marriages = marriages.filter(m => Number(m.id_cholovik) !== member.id && Number(m.id_drujina) !== member.id);

  if (isMarried && partnerId > 0) {
    const gender = String(member.gender || member.stat || "брат").trim().toLowerCase();
    const isWife = gender.includes("сестр") || gender.includes("сес") || member.pib.toLowerCase().endsWith("на") || member.pib.toLowerCase().endsWith("ва");
    const husbandId = isWife ? partnerId : member.id;
    const wifeId = isWife ? member.id : partnerId;

    marriages.push({
      id: marriages.length + 2000,
      id_cholovik: husbandId,
      id_drujina: wifeId,
      d_begin: dateToExcelSerialNumber(toISODateFormat(member.d_shlyubu || "")),
      d_end: ""
    });
    console.log(`[Relation Healing] Created/updated in-memory marriage: Husband ${husbandId} <-> Wife ${wifeId}`);
  }
}

// Helper function to sync updated member details back to Firebase Realtime Database
async function syncMemberToFirebase(id: number, member: Member) {
  const patchUrl = `${FIREBASE_URL}/members/${id}.json?auth=${FIREBASE_SECRET}`;
  
  // Format standard status
  const statusStr = member.id_vybuttya > 0 ? "вибув" : "наявний";
  
  // Convert ministries comma separated string into standard list for legacy checkboxes/hidden input compatibility
  const slujList = (member.s_slujinnya_spysok || "").split(/[,;]+/).map(s => s.trim()).filter(Boolean);

  // Find spouse ID for marriage history
  let spouseId = 0;
  if (member.pib_partnera) {
    const matchedSpouse = members.find(m => 
      m.id !== member.id && (
        m.pib.toLowerCase().includes(member.pib_partnera!.toLowerCase()) ||
        member.pib_partnera!.toLowerCase().includes(m.pib.toLowerCase())
      )
    );
    if (matchedSpouse) spouseId = matchedSpouse.id;
  }

  const shlyubHistory: any[] = [];
  const sSimeyniy = String(member.s_simeyniy_ukr || "").toLowerCase();
  if (member.id_simeyniy === 2 || sSimeyniy.includes("одр") || sSimeyniy.includes("заміж")) {
    shlyubHistory.push({
      status: "одр.",
      d_shlyubu_begin: toUADateFormat(member.d_shlyubu || ""),
      d_shlyubu_end: "",
      podruzhzhya_id: spouseId || "",
      podrujya_id: spouseId || ""
    });
  } else if (member.id_simeyniy === 4 || sSimeyniy.includes("вдов")) {
    shlyubHistory.push({
      status: "вдов.",
      d_shlyubu_begin: toUADateFormat(member.d_shlyubu || ""),
      d_shlyubu_end: "",
      podruzhzhya_id: spouseId || "",
      podrujya_id: spouseId || ""
    });
  } else if (member.id_simeyniy === 3 || sSimeyniy.includes("розл")) {
    shlyubHistory.push({
      status: "розлуч.",
      d_shlyubu_begin: toUADateFormat(member.d_shlyubu || ""),
      d_shlyubu_end: "",
      podruzhzhya_id: spouseId || "",
      podrujya_id: spouseId || ""
    });
  } else {
    shlyubHistory.push({
      status: "неодруж.",
      d_shlyubu_begin: "",
      d_shlyubu_end: "",
      podruzhzhya_id: "",
      podrujya_id: ""
    });
  }

  const updates: any = {
    "01_PIB": member.pib,
    "pib": null, // Delete legacy
    "gender": member.gender || member.stat,
    "stat": null, // Delete legacy
    "02_OSOBYSTE/1_d_narodjennya": toUADateFormat(member.d_narodjennya || ""),
    "02_OSOBYSTE/3_d_nar": toUADateFormat(member.d_narodjennya || ""),
    "02_OSOBYSTE/2_tel": member.tel_mob || "",
    "02_OSOBYSTE/phone": member.tel_mob || "",
    "02_OSOBYSTE/tel": member.tel_mob || "",
    "02_OSOBYSTE/gender": member.gender || member.stat || "н/д",
    "02_OSOBYSTE/2_stat": null, // Delete legacy
    "02_OSOBYSTE/7_osvita": member.s_osvita_ukr || "н/д",
    "02_OSOBYSTE/8_profesiya": member.s_profesiya_ukr || "н/д",
    "02_OSOBYSTE/6_socialniy": member.s_socialniy_ukr || "н/д",
    "02_OSOBYSTE/13_status": null, // Delete legacy
    "02_OSOBYSTE/s_simeyniy_ukr": member.s_simeyniy_ukr || "неодружений",
    "02_OSOBYSTE/4_shlyub_history": shlyubHistory,
    
    "04_STRUCTURA/1_rayon": member.rayon2_ukr || "",
    "04_STRUCTURA/opika": member.presviter || "",
    "04_STRUCTURA/4_opika": null, // Delete legacy
    "04_STRUCTURA/grupa": member.n_dilyci || "",
    "04_STRUCTURA/2_grupa": null, // Delete legacy
    "04_STRUCTURA/5_d_vodnogo": toUADateFormat(member.d_vodnogo || ""),
    "04_STRUCTURA/6_d_vstupu": toUADateFormat(member.d_vstupu || ""),
    "04_STRUCTURA/vidviduvanist": member.vidviduvanist || "",
    "04_STRUCTURA/8_vidviduvanist": null, // Delete legacy
    "04_STRUCTURA/prysutnist": member.prysutnist || "",
    "04_STRUCTURA/9_prysutnist": null, // Delete legacy
    "04_STRUCTURA/7_d_kontaktiv": toUADateFormat(member.d_kontaktiv || ""),
    "04_STRUCTURA/status": statusStr,
    "04_STRUCTURA/id_dilnytsia": member.id_dilnytsia !== undefined ? member.id_dilnytsia : (member.id_dilnicya || ""),
    "04_STRUCTURA/id_dilnicya": null, // Delete legacy

    "02_OSOBYSTE/address": member.address || "",
    "02_OSOBYSTE/nas_punkt": member.nas_punkt || "",
    "02_OSOBYSTE/vulitsya": member.vulitsya || "",
    "02_OSOBYSTE/budynok": member.budynok || "",
    "02_OSOBYSTE/korpus": member.korpus || "",
    "02_OSOBYSTE/kvartyra": member.kvartyra || "",

    "03_ADRESA/1_misto": member.nas_punkt || "",
    "03_ADRESA/1_nas_punkt": member.nas_punkt || "",
    "03_ADRESA/2_vulycja": member.vulitsya || "",
    "03_ADRESA/2_vulitsya": member.vulitsya || "",
    "03_ADRESA/3_budynok": member.budynok || "",
    "03_ADRESA/3_budinok": member.budynok || "",
    "03_ADRESA/4_korpus": member.korpus || "",
    "03_ADRESA/5_kvartyra": member.kvartyra || "",
    "03_ADRESA/4_kvartira": member.kvartyra || "",

    "04_STRUCTURA/insha_gromada": member.insha_gromada || "",
    "04_STRUCTURA/7_zvidky_primitka": member.insha_gromada || "",
    "04_STRUCTURA/d_kontaktiv": toUADateFormat(member.d_kontaktiv || ""),
    "d_kontaktiv": toUADateFormat(member.d_kontaktiv || ""),
    "ISTORIJA/d_kontaktiv": toUADateFormat(member.d_kontaktiv || ""),
    "04_STRUCTURA/3_san": member.di_admin || "",
    "04_STRUCTURA/hsd": !!member.hsd,
    "04_STRUCTURA/discipline": member.discipline || "",
    "04_STRUCTURA/discipline_reason": member.discipline_reason || "",
    "04_STRUCTURA/discipline_date_start": toUADateFormat(member.discipline_date_start || ""),
    "04_STRUCTURA/discipline_date_end": toUADateFormat(member.discipline_date_end || ""),
    
    "ISTORIJA/slujinnya": slujList,
    "ISTORIJA/1_slujinnya": null, // Delete legacy
    "04_STRUCTURA/slujinnya": slujList,
    "slujinnya": slujList,
    
    "06_VYBUTTYA/2_prichina": member.s_vybuv_ukr || "",
    "06_VYBUTTYA/1_d_vybuttya": toUADateFormat(member.d_vybuttya || ""),
    "06_VYBUTTYA/1_d_vybyttya": toUADateFormat(member.d_vybuttya || ""),
    "06_VYBUTTYA/3_primitka": member.vybutty_prymitka || "",
    "06_VYBUTTYA/vybuv_prymitka": member.vybutty_prymitka || "",

    "hvoryi": member.hvoryi || "",
    "insha_gromada": member.insha_gromada || "",
    "prymitka": member.prymitka || null,
    "primitka": member.prymitka || null,
    "efile": member.efile !== undefined ? member.efile : ""
  };

  try {
    const res = await fetch(patchUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    if (res.ok) {
      console.log(`[Firebase Sync] Successfully synced member ${id} on Firebase.`);
    } else {
      console.error(`[Firebase Sync] Failed to sync member ${id}: HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.error(`[Firebase Sync] Error syncing member ${id}: ${err.message}`);
  }
}

// 6. Write/Edit Member Card detail
app.post("/api/members/:id", async (req, res) => {
  const id = Number(req.params.id);
  const updatedData = req.body as Partial<Member>;
  if (updatedData.pib !== undefined) {
    updatedData.pib = cleanPibOfParens(updatedData.pib);
  }
  const memberIndex = members.findIndex(m => m.id === id);

  if (memberIndex === -1) {
    return res.status(404).json({ error: "Member not found" });
  }

  const orig = members[memberIndex];
  const changes: string[] = [];

  // Capture changed fields for history audit log tracking
  const fieldsToCheck: (keyof Member)[] = [
    "pib", "tel_mob", "s_osvita_ukr", "s_socialniy_ukr", "s_simeyniy_ukr", 
    "s_profesiya_ukr", "s_slujinnya_spysok", "zaklad_osv", "d_narodjennya", "presviter", 
    "rayon2_ukr", "n_dilyci", "vidviduvanist", "prysutnist", "id_vybuttya", "di_admin",
    "address", "nas_punkt", "vulitsya", "budynok", "korpus", "kvartyra", "insha_gromada", "hvoryi", "prymitka"
  ];

  fieldsToCheck.forEach(key => {
    if (updatedData[key] !== undefined && updatedData[key] !== orig[key]) {
      changes.push(`<b>${key}</b>: від "${orig[key] || "порожньо"}" до "${updatedData[key] || "порожньо"}"`);
    }
  });

  // Apply updates on server state
  const mergedMember = { ...orig, ...updatedData };
  
  // Validation for di_admin (Request 5)
  if (mergedMember.di_admin && !directories_di_admin.includes(mergedMember.di_admin)) {
      mergedMember.di_admin = "";
  }
  
  // Conditionally process vybuttya note parameters ("відп.", "емігр.", "вилуч.") (user request 06)
  if (updatedData.id_vybuttya !== undefined) {
    const statusId = Number(updatedData.id_vybuttya);
    const matchedStatus = s_vybuv.find(v => Number(v.ID) === statusId);
    mergedMember.s_vybuv_ukr = matchedStatus ? matchedStatus.Value : (statusId === 0 ? "" : orig.s_vybuv_ukr);
    
    // Auto sync excel dates if selected recently
    if (statusId > 0 && !mergedMember.d_vybuttya) {
      const today = new Date().toISOString().split("T")[0];
      mergedMember.d_vybuttya = today;
      mergedMember.d_vybuttya_excel = dateToExcelSerialNumber(today);
    } else if (statusId === 0) {
      mergedMember.s_vybuv_ukr = "";
      mergedMember.d_vybuttya = "";
      mergedMember.d_vybuttya_excel = 0;
      mergedMember.vybutty_prymitka = "";
    }

    if (mergedMember.s_vybuv_ukr) {
      const vLower = mergedMember.s_vybuv_ukr.toLowerCase();
      if (vLower === "пом." || vLower.includes("пом") || vLower.includes("смерт")) {
        mergedMember.vybutty_prymitka = "";
      }
    }
  }

  // Re-sync excel epoch numbers if strings changed and they are parsed
  if (updatedData.d_narodjennya) {
    mergedMember.d_narodjennya_excel = dateToExcelSerialNumber(updatedData.d_narodjennya);
    
    // recalculate age
    try {
      const birth = new Date(updatedData.d_narodjennya);
      const ageDiff = Date.now() - birth.getTime();
      const ageDate = new Date(ageDiff);
      mergedMember.vik_rokiv1 = Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch (_) {}
  }
  if (updatedData.d_pokayannya) {
    mergedMember.d_pokayannya_excel = dateToExcelSerialNumber(updatedData.d_pokayannya);
  }
  if (updatedData.d_vodnogo) {
    mergedMember.d_vodnogo_excel = dateToExcelSerialNumber(updatedData.d_vodnogo);
  }
  if (updatedData.d_vstupu) {
    mergedMember.d_vstupu_excel = dateToExcelSerialNumber(updatedData.d_vstupu);
  }

  members[memberIndex] = mergedMember as Member;
  updateInMemoryMarriage(mergedMember as Member);

  // Sync update back to Firebase Realtime Database and await it to prevent client race conditions
  try {
    await syncMemberToFirebase(id, mergedMember as Member);
  } catch (err) {
    console.error(`[Firebase Sync Post-update] Error syncing member ${id}:`, err);
  }

  // Insert change audit log (user request 05 - History Audit/Journal tracking)
  const fieldLabels: Record<string, string> = {
    pib: "ПІБ",
    tel_mob: "Моб. телефон",
    s_osvita_ukr: "Освіта",
    s_socialniy_ukr: "Соціальний стан",
    s_simeyniy_ukr: "Сімейний стан",
    s_profesiya_ukr: "Професія",
    s_slujinnya_spysok: "Служіння",
    zaklad_osv: "Заклад освіти",
    d_narodjennya: "Дата народження",
    presviter: "Опіка",
    rayon2_ukr: "Район",
    n_dilyci: "Група",
    vidviduvanist: "Відвідуваність",
    prysutnist: "Присутність",
    id_vybuttya: "Статус вибуття",
    di_admin: "ЗАВДАННЯ ДЛЯ АДМІН.",
    address: "Адреса",
    nas_punkt: "Населений пункт",
    vulitsya: "Вулиця",
    budynok: "Будинок",
    korpus: "Корпус",
    kvartyra: "Квартира",
    insha_gromada: "Інша громада",
    hvoryi: "Хворий/Потребує уваги",
    prymitka: "Примітка",
    primitka: "Примітка"
  };

  const userPibHeader = req.headers['x-user-pib'] ? decodeURIComponent(req.headers['x-user-pib'] as string) : "Адміністратор";

  fieldsToCheck.forEach(key => {
    if (updatedData[key] !== undefined && String(updatedData[key]).trim() !== String(orig[key] || '').trim()) {
      const label = fieldLabels[key] || String(key);
      const oldVal = orig[key] || "порожньо";
      const newVal = updatedData[key] || "порожньо";
      
      const changeLogId = "chg_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
      const logItem: AuditLogItem = {
        id: changeLogId,
        timestamp: new Date().toISOString(),
        memberId: id,
        memberName: orig.pib,
        action: "update",
        userPib: userPibHeader,
        field: label,
        oldValue: String(oldVal),
        newValue: String(newVal),
        details: `Оновлено поле "${label}" від "${oldVal}" до "${newVal}"`
      };
      
      auditLogs.push(logItem);
      saveAuditLogToFirebase(logItem);
    }
  });

  saveDatabaseToCache();
  res.json({ success: true, member: mergedMember });
});

// 7. Add general audit logs / Custom event
app.post("/api/audit", (req, res) => {
  const { memberId, memberName, action, details, userPib, field, oldValue, newValue } = req.body;
  const newLog: AuditLogItem = {
    id: "user_" + Date.now(),
    timestamp: new Date().toISOString(),
    memberId: Number(memberId || 0),
    memberName: String(memberName || "Користувач").trim(),
    action: String(action || "audit"),
    details: String(details || "").trim(),
    userPib: userPib ? String(userPib).trim() : undefined,
    field: field ? String(field).trim() : undefined,
    oldValue: oldValue !== undefined ? String(oldValue) : undefined,
    newValue: newValue !== undefined ? String(newValue) : undefined
  };
  auditLogs.push(newLog);
  saveDatabaseToCache();
  saveAuditLogToFirebase(newLog);
  res.json({ success: true, log: newLog });
});

// 8. Get history changelogs List (Audit logs + Ministry Timeline events merged)
app.get("/api/audit-logs", (req, res) => {
  const filtered = auditLogs.filter(log => {
    const user = (log.userPib || log.memberName || "").toLowerCase();
    return !user.includes("адміністр") && !user.includes("адмін");
  });
  const sortedLogs = [...filtered].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json(sortedLogs);
});

app.delete("/api/audit-logs/:id", async (req, res) => {
  const logId = req.params.id;
  try {
    auditLogs = auditLogs.filter(log => log.id !== logId);
    saveDatabaseToCache();
    const url = `${FIREBASE_URL}/audit_logs/${logId}.json?auth=${FIREBASE_SECRET}`;
    await fetch(url, { method: "DELETE" });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[Delete Audit Log] Failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/settings/admin-logs", (req, res) => {
  res.json({ ignoreAdminLogs });
});

app.post("/api/settings/admin-logs", (req, res) => {
  const { ignore } = req.body;
  ignoreAdminLogs = !!ignore;
  saveDatabaseToCache();
  res.json({ success: true, ignoreAdminLogs });
});

app.post("/api/settings/admin-logs/clear-firebase", async (req, res) => {
  try {
    const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
    const auditRes = await fetch(`${FIREBASE_URL}/audit_logs.json?auth=${DB_SECRET}`);
    if (!auditRes.ok) {
      return res.status(500).json({ error: "Failed to fetch audit logs from Firebase" });
    }
    const data = await auditRes.json();
    if (!data) {
      return res.json({ success: true, deletedCount: 0 });
    }
    
    let deletedCount = 0;
    for (const key of Object.keys(data)) {
      const log = data[key];
      if (log) {
        const user = (log.userPib || log.memberName || "").toLowerCase();
        if (user.includes("адміністр") || user.includes("адмін")) {
          const deleteUrl = `${FIREBASE_URL}/audit_logs/${key}.json?auth=${DB_SECRET}`;
          await fetch(deleteUrl, { method: "DELETE" });
          deletedCount++;
        }
      }
    }
    
    auditLogs = auditLogs.filter(log => {
      const user = (log.userPib || log.memberName || "").toLowerCase();
      return !(user.includes("адміністр") || user.includes("адмін"));
    });
    saveDatabaseToCache();
    
    res.json({ success: true, deletedCount });
  } catch (err: any) {
    console.error("[Clear Admin Logs] Failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 9. Add a Member child
app.post("/api/members/:id/children", async (req, res) => {
  const parentId = Number(req.params.id);
  const { name, birthDate, age, relationType } = req.body; // relationType: 'father' | 'mother'
  const parent = members.find(m => m.id === parentId);
  if (!parent) return res.status(404).json({ error: "Parent not found" });

  const childId = children.length + 1000;
  
  // Find married spouse if available to link child bidirectionally on database
  const marriage = marriages.find(m => Number(m.id_cholovik) === parentId || Number(m.id_drujina) === parentId);
  const spouseId = marriage ? (Number(marriage.id_cholovik) === parentId ? Number(marriage.id_drujina) : Number(marriage.id_cholovik)) : 0;

  const fatherId = relationType === "father" ? parentId : (spouseId || 0);
  const motherId = relationType === "mother" ? parentId : (spouseId || 0);

  // Create child structure
  const newChildExcelRow = {
    dity_id: childId,
    id_simya: 1, // default group
    n_dity: name.split(" ")[0] || name,
    f_dity: name.split(" ").slice(1).join(" ") || parent.pib.split(" ")[0],
    d_nar: dateToExcelSerialNumber(birthDate),
    id_cholovik: fatherId,
    id_drujina: motherId,
    dity_vik_rokiv1: Number(age || 0)
  };

  children.push(newChildExcelRow);

  auditLogs.push({
    id: "child_" + Date.now(),
    timestamp: new Date().toISOString(),
    memberId: parentId,
    memberName: parent.pib,
    action: "add_child",
    details: `Додано дитину/нащадка: <b>${name}</b>, вік: ${age}`
  });

  saveDatabaseToCache();

  // Write/Sync child details to Firebase Realtime Database for both father and mother
  try {
    const parentChildrenRows = children.filter(c => Number(c.id_cholovik) === parentId || Number(c.id_drujina) === parentId);
    const fbChildren = parentChildrenRows.map(c => ({
      name: String(c.n_dity || "").trim() + (c.f_dity ? " " + String(c.f_dity).trim() : ""),
      birthday: formatExcelDate(c.d_nar) || ""
    }));

    // Update parent card children list (02_OSOBYSTE/9_dity)
    const patchUrlParent = `${FIREBASE_URL}/members/${parentId}/02_OSOBYSTE.json?auth=${FIREBASE_SECRET}`;
    await fetch(patchUrlParent, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "9_dity": fbChildren })
    });
    console.log(`[Firebase Children Sync] Updated child lists for parent ${parentId} on Firebase.`);

    // Update spouse card children list if marries
    if (spouseId > 0) {
      const patchUrlSpouse = `${FIREBASE_URL}/members/${spouseId}/02_OSOBYSTE.json?auth=${FIREBASE_SECRET}`;
      await fetch(patchUrlSpouse, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "9_dity": fbChildren })
      });
      console.log(`[Firebase Children Sync] Updated child lists for spouse ${spouseId} on Firebase.`);
    }
  } catch (err: any) {
    console.error(`[Firebase Children Sync] Error updating Firebase records: ${err.message}`);
  }

  res.json({ success: true, childId });
});

// 10. Add a Member Ministry record
app.post("/api/members/:id/ministries", async (req, res) => {
  const memberId = Number(req.params.id);
  const { ministryId, startDate } = req.body;
  const memberIndex = members.findIndex(m => m.id === memberId);
  if (memberIndex === -1) return res.status(404).json({ error: "Member not found" });
  const member = members[memberIndex];

  const newId = ministries.length + 1;
  const newMinRow = {
    id: newId,
    id_anketa: memberId,
    id_slujinnya: Number(ministryId),
    d_begin: dateToExcelSerialNumber(startDate),
    d_end: ""
  };
  ministries.push(newMinRow);

  // Recalculate member's active ministries list
  const activeMins = ministries
    .filter(m => Number(m.id_anketa) === memberId && !m.d_end)
    .map(m => MINISTRY_MAP[Number(m.id_slujinnya)] || "")
    .filter(Boolean);
  member.s_slujinnya_spysok = activeMins.join(", ");

  const minLabel = MINISTRY_MAP[Number(ministryId)] || `Служіння #${ministryId}`;
  auditLogs.push({
    id: "min_" + Date.now(),
    timestamp: new Date().toISOString(),
    memberId,
    memberName: member.pib,
    action: "add_ministry",
    details: `Призначено служіння: <b>${minLabel}</b> починаючи з ${startDate}`
  });

  // Await firebase sync to guarantee client consistency
  try {
    await syncMemberToFirebase(memberId, member);
  } catch (err) {
    console.error(`Error syncing member ministries:`, err);
  }

  saveDatabaseToCache();
  res.json({ success: true, id: newId });
});

// 11. End an active ministry record
app.post("/api/members/:id/ministries/:recId/end", async (req, res) => {
  const memberId = Number(req.params.id);
  const recId = Number(req.params.recId);
  const { endDate } = req.body;
  const memberIndex = members.findIndex(m => m.id === memberId);
  if (memberIndex === -1) return res.status(404).json({ error: "Member not found" });
  const member = members[memberIndex];

  const idx = ministries.findIndex(m => Number(m.id) === recId && Number(m.id_anketa) === memberId);
  if (idx !== -1) {
    ministries[idx].d_end = dateToExcelSerialNumber(endDate);
    const minId = ministries[idx].id_slujinnya;
    const minLabel = MINISTRY_MAP[minId] || `Служіння #${minId}`;
    
    // Recalculate member's active ministries list
    const activeMins = ministries
      .filter(m => Number(m.id_anketa) === memberId && !m.d_end)
      .map(m => MINISTRY_MAP[Number(m.id_slujinnya)] || "")
      .filter(Boolean);
    member.s_slujinnya_spysok = activeMins.join(", ");

    auditLogs.push({
      id: "min_end_" + Date.now(),
      timestamp: new Date().toISOString(),
      memberId,
      memberName: member.pib,
      action: "end_ministry",
      details: `Завершено служіння: <b>${minLabel}</b> на дату ${endDate}`
    });
    
    // Await firebase sync to guarantee client consistency
    try {
      await syncMemberToFirebase(memberId, member);
    } catch (err) {
      console.error(`Error syncing member end-ministry:`, err);
    }

    saveDatabaseToCache();
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Ministry record not found" });
});

// 12. Add discipline censure
app.post("/api/members/:id/disciplines", (req, res) => {
  const memberId = Number(req.params.id);
  const { disciplineId, reason, startDate } = req.body;
  const member = members.find(m => m.id === memberId);
  if (!member) return res.status(404).json({ error: "Member not found" });

  const newId = disciplines.length + 1;
  const newRow = {
    id: newId,
    id_anketa: memberId,
    id_styagnen: Number(disciplineId),
    styagnen_prychyna: reason,
    d_begin: dateToExcelSerialNumber(startDate),
    d_end: "",
    d_znyato: ""
  };
  disciplines.push(newRow);
  saveDisciplineToFirebase(newRow);

  const discLabel = DISCIPLINE_MAP[Number(disciplineId)] || `Стягнення #${disciplineId}`;
  const logItem = {
    id: "disc_" + Date.now(),
    timestamp: new Date().toISOString(),
    memberId,
    memberName: member.pib,
    action: "discipline",
    details: `Накладено стягнення/дисципліну: <b>${discLabel}</b> з причини: "${reason}"`
  };
  auditLogs.push(logItem);
  saveAuditLogToFirebase(logItem);

  saveDatabaseToCache();
  res.json({ success: true, id: newId });
});

// 13. Remove discipline
app.post("/api/members/:id/disciplines/:recId/resolve", (req, res) => {
  const memberId = Number(req.params.id);
  const recId = Number(req.params.recId);
  const { resolveDate } = req.body;
  const member = members.find(m => m.id === memberId);
  if (!member) return res.status(404).json({ error: "Member not found" });

  const idx = disciplines.findIndex(d => Number(d.id) === recId && Number(d.id_anketa) === memberId);
  if (idx !== -1) {
    const excelDate = dateToExcelSerialNumber(resolveDate);
    disciplines[idx].d_znyato = excelDate;
    disciplines[idx].d_end = excelDate;
    saveDisciplineToFirebase(disciplines[idx]);
    
    const discId = disciplines[idx].id_styagnen;
    const discLabel = DISCIPLINE_MAP[discId] || `Стягнення #${discId}`;

    const logItem = {
      id: "disc_res_" + Date.now(),
      timestamp: new Date().toISOString(),
      memberId,
      memberName: member.pib,
      action: "discipline_resolved",
      details: `Знято стягнення: <b>${discLabel}</b> на дату ${resolveDate}`
    };
    auditLogs.push(logItem);
    saveAuditLogToFirebase(logItem);

    saveDatabaseToCache();
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Discipline record not found" });
});

// Helper for admin check
const isAdmin = (req: any) => {
  const userPib = req.headers['x-user-pib'] ? decodeURIComponent(req.headers['x-user-pib'] as string) : "";
  // Check for specific email, generic 'admin' role name, or known senior pastor names from the access list
  return userPib.includes("kostel.if.ua@gmail.com") || 
         userPib.toLowerCase().includes("адмін") || 
         userPib.includes("Черняк Вал.") ||
         userPib.includes("Черняк Вас.") ||
         userPib.includes("Скіцко І.");
};

// 14. Create a completely New Member Profile
app.post("/api/members", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
  const newMemberData = req.body as Partial<Member>;
  const nextId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;

  const birthDate = newMemberData.d_narodjennya || "";
  let calculatedAge = 0;
  if (birthDate) {
    try {
      const birth = new Date(birthDate);
      const ageDiff = Date.now() - birth.getTime();
      const ageDate = new Date(ageDiff);
      calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch (_) {}
  }

  const newMember: Member = {
    id: nextId,
    pib: cleanPibOfParens(String(newMemberData.pib || "")).trim(),
    gender: String(newMemberData.gender || newMemberData.stat || "брат").trim(),
    
    s_simeyniy_ukr: String(newMemberData.s_simeyniy_ukr || "неодружений").trim(),
    id_simeyniy: Number(newMemberData.id_simeyniy || 1),
    s_socialniy_ukr: String(newMemberData.s_socialniy_ukr || "н/д").trim(),
    id_socialniy: Number(newMemberData.id_socialniy || 6),
    s_osvita_ukr: String(newMemberData.s_osvita_ukr || "н/д").trim(),
    id_osvita: Number(newMemberData.id_osvita || 4),
    s_profesiya_ukr: String(newMemberData.s_profesiya_ukr || "н/д").trim(),
    id_profesiya: Number(newMemberData.id_profesiya || 41),
    s_slujinnya_spysok: String(newMemberData.s_slujinnya_spysok || "").trim(),
    zaklad_osv: String(newMemberData.zaklad_osv || "").trim(),
    
    d_narodjennya: birthDate,
    d_narodjennya_excel: dateToExcelSerialNumber(birthDate),
    tel_mob: String(newMemberData.tel_mob || "").trim(),
    tel1: String(newMemberData.tel1 || "").trim(),
    skype: String(newMemberData.skype || "").trim(),
    vik_rokiv1: calculatedAge,

    d_pokayannya: newMemberData.d_pokayannya || "",
    d_pokayannya_excel: dateToExcelSerialNumber(newMemberData.d_pokayannya || ""),
    d_vodnogo: newMemberData.d_vodnogo || "",
    d_vodnogo_excel: dateToExcelSerialNumber(newMemberData.d_vodnogo || ""),
    hsd: !!newMemberData.hsd,
    d_vstupu: newMemberData.d_vstupu || "",
    d_vstupu_excel: dateToExcelSerialNumber(newMemberData.d_vstupu || ""),

    vidviduvanist: String(newMemberData.vidviduvanist || "").trim(),
    prysutnist: String(newMemberData.prysutnist || "").trim(),
    di_admin: String(newMemberData.di_admin || "").trim(),
    d_kontaktiv: String(newMemberData.d_kontaktiv || "").trim(),

    presviter: String(newMemberData.presviter || "").trim(),
    rayon2_ukr: String(newMemberData.rayon2_ukr || "").trim(),
    id_rayon2: newMemberData.id_rayon2 ? String(newMemberData.id_rayon2) : "",
    id_dilnytsia: newMemberData.id_dilnytsia !== undefined ? String(newMemberData.id_dilnytsia) : (newMemberData.id_dilnicya ? String(newMemberData.id_dilnicya) : ""),
    n_dilyci: String(newMemberData.n_dilyci || "").trim(),
    vidpov_grupy: String(newMemberData.vidpov_grupy || "").trim(),

    id_vybuttya: 0,
    s_vybuv_ukr: "",
    d_vybuttya: "",
    d_vybuttya_excel: 0,
    vybutty_prymitka: "",

    hvoryi: String(newMemberData.hvoryi || "").trim(),
    insha_gromada: String(newMemberData.insha_gromada || "").trim(),
    prymitka: String(newMemberData.prymitka || (newMemberData as any).primitka || "").trim(),
    efile: newMemberData.efile !== undefined ? newMemberData.efile : true,
    address: String(newMemberData.address || "").trim(),
    nas_punkt: String(newMemberData.nas_punkt || "").trim(),
    vulitsya: String(newMemberData.vulitsya || "").trim(),
    budynok: String(newMemberData.budynok || "").trim(),
    korpus: String(newMemberData.korpus || "").trim(),
    kvartyra: String(newMemberData.kvartyra || "").trim(),
    pib_partnera: String(newMemberData.pib_partnera || "").trim(),
    d_shlyubu: String(newMemberData.d_shlyubu || "").trim()
  };

  members.push(newMember);
  updateInMemoryMarriage(newMember);

  // Sync new member card to Firebase and await it to prevent client race conditions
  try {
    await syncMemberToFirebase(nextId, newMember);
  } catch (err) {
    console.error(`[Firebase Member Sync] Error creating member ${nextId}:`, err);
  }

  const userPib = req.headers['x-user-pib'] ? decodeURIComponent(req.headers['x-user-pib'] as string) : "Адміністратор";
  const logId = "add_mem_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  const logItem: AuditLogItem = {
    id: logId,
    timestamp: new Date().toISOString(),
    memberId: nextId,
    memberName: newMember.pib,
    action: "create",
    userPib: userPib,
    field: "Створення профайлу",
    oldValue: "-",
    newValue: `Додано новий профайл члена церкви: ${newMember.pib} (${newMember.gender})`,
    details: `Додано новий профайл члена церкви: <b>${newMember.pib}</b> (${newMember.gender}).`
  };
  auditLogs.push(logItem);
  saveAuditLogToFirebase(logItem);

  saveDatabaseToCache();
  res.json({ success: true, memberId: nextId, member: newMember });
});

// Seed Database State
loadDatabase();

let cachedCustomColorsMap: any = null;

async function fetchCustomColorsFromFirebase() {
  const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${FIREBASE_URL}/custom_colors_map.json?auth=${DB_SECRET}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cachedCustomColorsMap = data || {};
    console.log("[Firebase Custom Colors] Loaded custom colors from Firebase RTDB.");
  } catch (err: any) {
    console.error("[Firebase Custom Colors] Failed to load custom colors from Firebase:", err.message);
    if (cachedCustomColorsMap === null) cachedCustomColorsMap = {};
  }
}

async function saveCustomColorsToFirebase(colorsMap: any) {
  const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${FIREBASE_URL}/custom_colors_map.json?auth=${DB_SECRET}`;
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(colorsMap)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cachedCustomColorsMap = colorsMap;
    console.log("[Firebase Custom Colors] Colors successfully saved to Firebase RTDB.");
  } catch (err: any) {
    console.error("[Firebase Custom Colors] Failed to save custom colors to Firebase:", err.message);
    throw err;
  }
}

async function syncAccessDostupToFirebase() {
  const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${FIREBASE_URL}/access_dostup.json?auth=${DB_SECRET}`;
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(access_dostup)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log("[Firebase Access Sync] Access list successfully saved to Firebase RTDB.");
  } catch (err: any) {
    console.error("[Firebase Access Sync] Failed to save access list to Firebase:", err.message);
  }
}

async function syncAccessDostupFromFirebase() {
  const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${FIREBASE_URL}/access_dostup.json?auth=${DB_SECRET}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    if (Array.isArray(data)) {
      if (data.length === 0 || data.some(item => !item || item.role !== undefined || !item.user)) {
        console.warn("[Firebase Access Sync] Detected corrupted or empty access list on Firebase. Resetting to DEFAULT_DOSTUP and saving back...");
        access_dostup = [...DEFAULT_DOSTUP];
        await syncAccessDostupToFirebase();
      } else {
        access_dostup = data;
        console.log("[Firebase Access Sync] Access list loaded from Firebase RTDB:", access_dostup.length, "users.");
      }
    } else {
      console.log("[Firebase Access Sync] No access list found on Firebase, using current state.");
      access_dostup = [...DEFAULT_DOSTUP];
      await syncAccessDostupToFirebase();
    }
  } catch (err: any) {
    console.error("[Firebase Access Sync] Failed to load access list from Firebase:", err.message);
  }
}

async function syncPermissionLevelsToFirebase() {
  const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${FIREBASE_URL}/permission_levels.json?auth=${DB_SECRET}`;
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(permission_levels)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log("[Firebase Permissions Sync] Permission levels successfully saved to Firebase RTDB.");
  } catch (err: any) {
    console.error("[Firebase Permissions Sync] Failed to save permission levels to Firebase:", err.message);
  }
}

async function syncPermissionLevelsFromFirebase() {
  const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${FIREBASE_URL}/permission_levels.json?auth=${DB_SECRET}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    if (Array.isArray(data)) {
      permission_levels = data;
      console.log("[Firebase Permissions Sync] Permission levels loaded from Firebase RTDB:", permission_levels.length, "roles.");
    }
  } catch (err: any) {
    console.error("[Firebase Permissions Sync] Failed to load permission levels from Firebase:", err.message);
  }
}

async function syncDirectoriesToFirebase() {
  const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${FIREBASE_URL}/directories.json?auth=${DB_SECRET}`;
  try {
    const payload: any = {
      opika: directories_opika,
      slujinnya: directories_slujinnya,
      vidviduvanist: directories_vidviduvanist,
      prysutnist: directories_prysutnist,
      di_admin: directories_di_admin,
      rayon: directories_rayon2, // saved as rayon key on Firebase now
      rayon_bindings: directories_rayon_bindings,
      opika_bindings: directories_opika_bindings,
      custom: directories_custom,
      custom_lists: Object.keys(directories_custom)
    };
    // Expose custom lists as top-level keys
    Object.keys(directories_custom).forEach(key => {
      payload[key] = directories_custom[key];
    });

    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log("[Firebase Directories Sync] Directories successfully saved to Firebase RTDB.");

    // Sync dystsyplina / Дисципліна directly to /dictionaries/dystsyplina.json
    const dystsyplinaList = directories_custom["dystsyplina"] || directories_custom["Дисципліна"] || [];
    if (dystsyplinaList.length > 0) {
      const dictUrl = `${FIREBASE_URL}/dictionaries/dystsyplina.json?auth=${DB_SECRET}`;
      await fetch(dictUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dystsyplinaList)
      }).catch(e => console.error("Failed to PUT dictionaries/dystsyplina.json:", e));
    }
  } catch (err: any) {
    console.error("[Firebase Directories Sync] Failed to save directories to Firebase:", err.message);
  }
}

async function writeBindingsToFirebase() {
  const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${FIREBASE_URL}/directories.json?auth=${DB_SECRET}`;
  try {
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rayon_bindings: directories_rayon_bindings,
        opika_bindings: directories_opika_bindings
      })
    });
    console.log("[Bindings Sync] Successfully saved default bindings back to Firebase!");
  } catch (err: any) {
    console.error("[Bindings Sync] Failed to auto-save default bindings:", err.message);
  }
}

function initializeDefaultBindingsIfNeeded(membersList: any[]) {
  if (!Array.isArray(membersList) || membersList.length === 0) return;

  const findId = (surnamePart: string) => {
    const match = membersList.find(m => {
      const p = (m.pib || "").toLowerCase();
      return p.includes(surnamePart.toLowerCase());
    });
    return match ? match.id : null;
  };

  let dirtied = false;

  // If rayon_bindings is empty, set default leaders
  if (!directories_rayon_bindings || directories_rayon_bindings.length === 0) {
    console.log("[Bindings Init] Initializing default district leaders (rayon_bindings)...");
    const aeroportId = findId("Бевзюк В") || findId("Бевзюк");
    const kaskadId = findId("Скіцко І") || findId("Скіцко");
    const vasylId = membersList.find(m => (m.pib || "").includes("Черняк Вас"))?.id || findId("Черняк Вас");
    const valeriyId = membersList.find(m => (m.pib || "").includes("Черняк Вал"))?.id || findId("Черняк Вал");

    directories_rayon_bindings = [
      { name: "АЕРОПОРТ", presbyterId: aeroportId },
      { name: "КАСКАД", presbyterId: kaskadId },
      { name: "ОБ'ЇЗНА", presbyterId: vasylId },
      { name: "ЦЕНТР", presbyterId: valeriyId }
    ];
    dirtied = true;
  }

  // If opika_bindings is empty, map default guardians to rayon / districts
  if (!directories_opika_bindings || directories_opika_bindings.length === 0) {
    console.log("[Bindings Init] Initializing default guardians (opika_bindings)...");
    const initialOpikaData = [
      { rayon: "АЕРОПОРТ", guardians: ["Бевзюк В.", "Галюк Б.", "Самелюк О.", "Черняк Вік.", "Шпарман Ю."] },
      { rayon: "КАСКАД", guardians: ["Ільницький О.", "Луцак М.", "Марунчак В.", "Скіцко І."] },
      { rayon: "ОБ'ЇЗНА", guardians: ["Бурчак Ю.", "Дмитраш М.", "Решетило Р.", "Стефурак Д.", "Черняк Вас."] },
      { rayon: "ЦЕНТР", guardians: ["Євстратов О.", "Мельничук В.", "Несен Ю.", "Скриник М.", "Стасінчук В.", "Стафіїв М.", "Факас О.", "Черняк Вал.", "Шегда П."] }
    ];

    const bindings: any[] = [];
    initialOpikaData.forEach(item => {
      item.guardians.forEach(g => {
        bindings.push({
          name: g,
          rayon: item.rayon
        });
      });
    });
    directories_opika_bindings = bindings;
    dirtied = true;
  }

  if (dirtied) {
    writeBindingsToFirebase().catch(err => console.error(err));
  }
}

async function syncDirectoriesFromFirebase() {
  const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${FIREBASE_URL}/directories.json?auth=${DB_SECRET}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    if (data && (data.opika || data.slujinnya || data.vidviduvanist || data.prysutnist || data.di_admin || data.rayon || data.rayon2 || data.custom || data.custom_lists)) {
      if (Array.isArray(data.opika)) directories_opika = data.opika;
      if (Array.isArray(data.rayon_bindings)) directories_rayon_bindings = data.rayon_bindings;
      if (Array.isArray(data.opika_bindings)) directories_opika_bindings = data.opika_bindings;
      
      if (data.custom) {
        directories_custom = data.custom;
      } else if (Array.isArray(data.custom_lists)) {
        directories_custom = {};
        data.custom_lists.forEach((listName: string) => {
          if (Array.isArray(data[listName])) {
            directories_custom[listName] = data[listName];
          }
        });
      }

      const disciplineList = directories_custom["Дисципліна"] || directories_custom["dystsyplina"];
      if (disciplineList) {
        directories_custom["Дисципліна"] = disciplineList;
        directories_custom["dystsyplina"] = disciplineList;
      }

      if (directories_custom["vibuv"]) {
        directories_custom["vybuv"] = directories_custom["vibuv"];
        delete directories_custom["vibuv"];
      }

      // Shift/Prepend "" empty option into slujinnya lookup array if needed
      if (Array.isArray(data.slujinnya)) {
        let slList = data.slujinnya;
        if (slList.length === 0 || slList[0] !== "") {
          slList = ["", ...slList.filter(Boolean)];
        }
        directories_slujinnya = slList;
      }
      
      if (Array.isArray(data.vidviduvanist)) {
        directories_vidviduvanist = data.vidviduvanist.filter((x: string) => ["Постійно", "Періодично", "Рідко", "Ніколи"].includes(x));
        if (directories_vidviduvanist.length === 0) directories_vidviduvanist = [...DEFAULT_VIDVIDUVANIST_PARAMS];
      }
      if (Array.isArray(data.prysutnist)) directories_prysutnist = data.prysutnist;
      if (Array.isArray(data.di_admin)) directories_di_admin = data.di_admin;
      
      let needsSaving = false;
      const rawRayons = Array.isArray(data.rayon) ? data.rayon : (Array.isArray(data.rayon2) ? data.rayon2 : []);
      
      if (rawRayons.length > 0) {
        directories_rayon2 = rawRayons
          .map((r: string) => String(r || "").replace(/\s*-\s*SOS/gi, "").trim())
          .filter((r: string, idx: number, arr: string[]) => r && arr.indexOf(r) === idx);
        
        // If the Firebase version had "- SOS" items, or used the legacy 'rayon2' key, write the cleaned version back as 'rayon'
        if (rawRayons.some((r: string) => String(r || "").toUpperCase().includes("SOS")) || data.rayon2) {
          console.log("[Firebase Directories Sync] Legacy structure or 'SOS' elements found in Firebase list, writing clean version...");
          needsSaving = true;
        }
      } else {
        console.warn("[Firebase Directories Sync] rayon list is missing in Firebase, seeding it now...");
        needsSaving = true;
      }

      // If slujinnya did not have the empty "" element at index 0 initially in Firebase, force save back to Firebase RTDB
      if (Array.isArray(data.slujinnya) && (data.slujinnya.length === 0 || data.slujinnya[0] !== "")) {
        needsSaving = true;
      }

      console.log("[Firebase Directories Sync] Directories loaded from Firebase RTDB.");
      if (needsSaving) {
        await syncDirectoriesToFirebase();
      }
    } else {
      console.warn("[Firebase Directories Sync] No directories found in Firebase RTDB, pushing local defaults...");
      await syncDirectoriesToFirebase();
    }

    // Rename legacy vibuv to vybuv inside the /dictionaries root on Firebase
    try {
      const vibuvUrl = `${FIREBASE_URL}/dictionaries/vibuv.json?auth=${DB_SECRET}`;
      const resVibuv = await fetch(vibuvUrl);
      if (resVibuv.ok) {
        const vibuvData = await resVibuv.json();
        if (vibuvData) {
          console.log("[Firebase Dictionaries Sync] Found 'vibuv' in Firebase. Renaming to 'vybuv'...");
          const vybuvUrl = `${FIREBASE_URL}/dictionaries/vybuv.json?auth=${DB_SECRET}`;
          await fetch(vybuvUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(vibuvData)
          });
          // Note: we can delete the old vibuv key on Firebase
          await fetch(vibuvUrl, { method: "DELETE" });
          console.log("[Firebase Dictionaries Sync] Successfully renamed 'vibuv' to 'vybuv' in Firebase.");
        }
      }
    } catch (err: any) {
      console.error("[Firebase Dictionaries Sync] Failed to check or rename 'vibuv' in Firebase:", err.message);
    }

    // Load s_vybuv from /dictionaries/vybuv.json if present
    try {
      const vybuvUrl = `${FIREBASE_URL}/dictionaries/vybuv.json?auth=${DB_SECRET}`;
      const resVybuv = await fetch(vybuvUrl);
      if (resVybuv.ok) {
        const vybuvData = await resVybuv.json();
        if (Array.isArray(vybuvData)) {
          console.log("[Firebase Dictionaries Sync] Loading 'vybuv' from Firebase dictionaries into local s_vybuv lookups...");
          s_vybuv = vybuvData.map((item: any, idx: number) => {
            if (item === null || item === undefined) {
              return { ID: idx, Value: "н/д" };
            }
            if (typeof item === 'string') {
              return { ID: idx, Value: item };
            }
            if (typeof item === 'object') {
              return { ID: item.ID !== undefined ? item.ID : idx, Value: item.Value || item.name || "" };
            }
            return { ID: idx, Value: String(item) };
          });
        }
      }
    } catch (err: any) {
      console.error("[Firebase Dictionaries Sync] Failed to load s_vybuv lookups from Firebase:", err.message);
    }

    // Fetch dystsyplina from /dictionaries/dystsyplina.json and sync to local custom list
    try {
      const dystsyplinaUrl = `${FIREBASE_URL}/dictionaries/dystsyplina.json?auth=${DB_SECRET}`;
      const resDystsyplina = await fetch(dystsyplinaUrl);
      if (resDystsyplina.ok) {
        const dystsyplinaData = await resDystsyplina.json();
        if (Array.isArray(dystsyplinaData)) {
          directories_custom["dystsyplina"] = dystsyplinaData;
          directories_custom["Дисципліна"] = dystsyplinaData;
        }
      }
    } catch (err: any) {
      console.error("[Firebase Dictionaries Sync] Failed to load dystsyplina from /dictionaries/dystsyplina.json:", err.message);
    }
  } catch (err: any) {
    console.error("[Firebase Directories Sync] Failed to load directories from Firebase:", err.message);
  }
}

function cleanPibOfParens(pib: string): string {
  if (!pib) return "";
  return pib.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatAddress(addrObj: any): string {
  if (!addrObj) return "";
  
  let city = addrObj["1_nas_punkt"] !== undefined ? String(addrObj["1_nas_punkt"]) : (addrObj["1_misto"] !== undefined ? String(addrObj["1_misto"]) : "");
  let street = addrObj["2_vulycja"] !== undefined ? String(addrObj["2_vulycja"]) : (addrObj["2_vulitsya"] !== undefined ? String(addrObj["2_vulitsya"]) : "");
  let house = addrObj["3_budynok"] !== undefined ? String(addrObj["3_budynok"]) : (addrObj["3_budinok"] !== undefined ? String(addrObj["3_budinok"]) : "");
  let korpus = addrObj["4_korpus"] !== undefined ? String(addrObj["4_korpus"]) : "";
  let flat = addrObj["5_kvartyra"] !== undefined ? String(addrObj["5_kvartyra"]) : (addrObj["4_kvartira"] !== undefined ? String(addrObj["4_kvartira"]) : "");

  // Clean fields of any leading/trailing spaces and commas
  const cleanField = (val: string) => {
    return val.trim().replace(/^,+/, "").replace(/,+$/, "").trim();
  };

  city = cleanField(city);
  street = cleanField(street);
  house = cleanField(house);
  korpus = cleanField(korpus);
  flat = cleanField(flat);
  
  let cityPart = "";
  if (city) {
    const cityLower = city.toLowerCase();
    const isIF = cityLower.includes("івано-франківськ") || 
                 cityLower.includes("івано франківськ") || 
                 cityLower.includes("ів.-франк") || 
                 cityLower.includes("іва.-фран") ||
                 cityLower === "іванофранківськ" ||
                 cityLower === "іф" ||
                 cityLower === "і.ф.";
    
    if (!isIF) {
      // Check if it already has a standard prefix (м., с., смт., с-ще., т.)
      const hasPrefix = /^(м\.|с\.|с-ще\.|смт\.|т\.)/i.test(city) || 
                        cityLower.startsWith("м ") || 
                        cityLower.startsWith("с ") || 
                        cityLower.startsWith("смт ") || 
                        cityLower.startsWith("с-ще ") || 
                        cityLower.startsWith("село ") || 
                        cityLower.startsWith("місто ");
                        
      if (!hasPrefix) {
        // Classify and prepend the right prefix
        const regionalCities = [
          "калуш", "коломия", "долина", "яремче", "надвірна", "болєхів", "болехів",
          "рогатин", "снятин", "городенка", "косів", "тлумач", "тисмениця", "галич", "бурштин"
        ];
        const regionalSmt = [
          "богородчани", "отинія", "брошнів", "верховина", "войнилів", "делятин", 
          "заболотів", "ланчин", "перегінське", "рожнятів", "солотвин", "чернелиця", 
          "більшівці", "єзупіль", "кути", "печеніжин", "верховина"
        ];
        
        const cleanName = city.replace(/^[,\s\.\-]+/, "").trim().toLowerCase();
        
        if (regionalCities.some(rc => cleanName.includes(rc))) {
          cityPart = "м. " + city;
        } else if (regionalSmt.some(rs => cleanName.includes(rs))) {
          cityPart = "смт. " + city;
        } else {
          cityPart = "с. " + city;
        }
      } else {
        cityPart = city;
      }
    }
  }
  
  let streetPart = "";
  if (street) {
    const streetLower = street.toLowerCase();
    const hasStreetPrefix = streetLower.startsWith("вул.") || 
                            streetLower.startsWith("вулиця") || 
                            streetLower.startsWith("пл.") || 
                            streetLower.startsWith("площа") || 
                            streetLower.startsWith("пров.") || 
                            streetLower.startsWith("провілок") || 
                            streetLower.startsWith("бул.") || 
                            streetLower.startsWith("бульвар") || 
                            streetLower.startsWith("просп.") || 
                            streetLower.startsWith("проспект") || 
                            streetLower.startsWith("тракт") || 
                            streetLower.startsWith("шосе");
    if (!hasStreetPrefix) {
      streetPart = "вул. " + street;
    } else {
      streetPart = street;
    }
  }
  
  let addressMain = streetPart;
  if (house) {
    if (addressMain) {
      addressMain += ", " + house;
    } else {
      addressMain = house;
    }
  }
  
  if (korpus) {
    if (addressMain) {
      addressMain += " / " + korpus;
    } else {
      addressMain = korpus;
    }
  }
  
  if (flat) {
    if (addressMain) {
      addressMain += " / " + flat;
    } else {
      addressMain = flat;
    }
  }
  
  let fullAddress = "";
  if (cityPart && addressMain) {
    fullAddress = cityPart + ", " + addressMain;
  } else if (cityPart) {
    fullAddress = cityPart;
  } else if (addressMain) {
    fullAddress = addressMain;
  }

  // De-duplicate commas and format spaces properly
  fullAddress = fullAddress
    .replace(/,(\s*,)+/g, ",")       // Remove comma lists like ", , " or ",,"
    .replace(/,+/g, ",")             // Merge multiple consecutive commas
    .replace(/\s*,\s*/g, ", ")       // Ensure exactly one space after each comma and no space before
    .trim();
  
  return fullAddress;
}

async function syncDatabaseWithFirebase() {
  console.log("[Firebase Startup Sync] Loading database from Firebase RTDB...");
  
  // Load specialized lookup directories from Firebase RTDB
  await syncDirectoriesFromFirebase();

  // Load access control lists from Firebase RTDB
  await syncAccessDostupFromFirebase();
  await syncPermissionLevelsFromFirebase().catch(() => {});
  
  // Load custom colors configuration from Firebase RTDB
  await fetchCustomColorsFromFirebase().catch(() => {});

  const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";

  // Load audit logs from Firebase RTDB
  try {
    const auditRes = await fetch(`${FIREBASE_URL}/audit_logs.json?auth=${DB_SECRET}`);
    if (auditRes.ok) {
      const auditData = await auditRes.json();
      if (auditData) {
        auditLogs = Object.values(auditData) as AuditLogItem[];
        console.log(`[Firebase Startup Sync] Successfully loaded ${auditLogs.length} audit logs from Firebase.`);
      } else {
        auditLogs = [];
      }
    }
  } catch (err: any) {
    console.error(`[Firebase Startup Sync] Failed to load audit logs from Firebase: ${err.message}`);
  }

  // Load disciplines from Firebase RTDB
  try {
    const discRes = await fetch(`${FIREBASE_URL}/disciplines.json?auth=${DB_SECRET}`);
    if (discRes.ok) {
      const discData = await discRes.json();
      if (discData) {
        if (Array.isArray(discData)) {
          disciplines = discData.filter(Boolean);
        } else {
          disciplines = Object.values(discData).filter(Boolean);
        }
        console.log(`[Firebase Startup Sync] Successfully loaded ${disciplines.length} disciplines from Firebase.`);
      } else {
        // If empty on Firebase, initialize it from our local disciplines array if we have one
        if (disciplines.length > 0) {
          console.log(`[Firebase Startup Sync] Seeding Firebase RTDB with ${disciplines.length} local disciplines...`);
          const discUploadUrl = `${FIREBASE_URL}/disciplines.json?auth=${DB_SECRET}`;
          const uploadObj: Record<string, any> = {};
          disciplines.forEach(d => {
            if (d && d.id) {
              uploadObj[d.id] = d;
            }
          });
          await fetch(discUploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(uploadObj)
          });
        }
      }
    }
  } catch (err: any) {
    console.error(`[Firebase Startup Sync] Failed to load disciplines from Firebase: ${err.message}`);
  }

  const url = `${FIREBASE_URL}/members.json?auth=${DB_SECRET}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firebase returning HTTP ${res.status}`);
    const data: any = await res.json();
    if (!data) {
      console.warn("[Firebase Startup Sync] Received empty database from Firebase RTDB.");
      return;
    }

    console.log(`[Firebase Startup Sync] Data retrieved: ${Object.keys(data).length} objects found.`);
    
    // Scan and migrate legacy statuses to "наявний"
    const statusMigrationUpdates: any = {};
    const dilyciaCleanupUpdates: any = {};
    const pibCleanupUpdates: any = {};
    
    Object.keys(data).forEach((stringId) => {
      const parent = data[stringId];
      if (!parent) return;
      
      // Clean up second surname in parentheses
      const rawPib1 = parent["01_PIB"] ? String(parent["01_PIB"]).trim() : "";
      const rawPib2 = parent["pib"] ? String(parent["pib"]).trim() : "";
      const cleanPib1 = cleanPibOfParens(rawPib1);
      const cleanPib2 = cleanPibOfParens(rawPib2);
      
      if (rawPib1 && rawPib1 !== cleanPib1) {
        pibCleanupUpdates[`${stringId}/01_PIB`] = cleanPib1;
        parent["01_PIB"] = cleanPib1;
      }
      if (rawPib2 && rawPib2 !== cleanPib2) {
        pibCleanupUpdates[`${stringId}/pib`] = cleanPib2;
        parent["pib"] = cleanPib2;
      }

      const особисте = parent["02_OSOBYSTE"] || {};
      const вибуття = parent["06_VYBUTTYA"] || {};
      const структура = parent["04_STRUCTURA"] || {};
      
      const currentStatus = структура["status"] || особисте["13_status"] || "наявний";
      if (currentStatus === "активний" || особисте["13_status"] === "активний") {
        statusMigrationUpdates[`${stringId}/04_STRUCTURA/status`] = "наявний";
        структура["status"] = "наявний";
        if (особисте["13_status"] !== undefined) {
          statusMigrationUpdates[`${stringId}/02_OSOBYSTE/13_status`] = null;
          delete особисте["13_status"];
        }
      }

      const hasLeftStatus = currentStatus === "вибув";
      const hasVybuttyaReason = !!вибуття["2_prichina"];
      const hasVybuttyaDate = !!(вибуття["1_d_vybuttya"] || вибуття["1_d_vybyttya"]);
      const id_vybuttya = (hasLeftStatus || hasVybuttyaReason || hasVybuttyaDate) ? 1 : 0;

      // Active / existing ("наявних") members only
      if (id_vybuttya === 0) {
        if (структура["grupa"] && структура["grupa"] !== "") {
          dilyciaCleanupUpdates[`${stringId}/04_STRUCTURA/grupa`] = "";
          структура["grupa"] = "";
        }
        if (структура["2_grupa"] && структура["2_grupa"] !== "") {
          dilyciaCleanupUpdates[`${stringId}/04_STRUCTURA/2_grupa`] = null;
          delete структура["2_grupa"];
        }
        if (структура["id_dilnytsia"] && структура["id_dilnytsia"] !== "") {
          dilyciaCleanupUpdates[`${stringId}/04_STRUCTURA/id_dilnytsia`] = "";
          структура["id_dilnytsia"] = "";
        }
        if (структура["id_dilnicya"] && структура["id_dilnicya"] !== "") {
          dilyciaCleanupUpdates[`${stringId}/04_STRUCTURA/id_dilnicya`] = null;
          delete структура["id_dilnicya"];
        }
        if (parent["id_dilnicya"] && parent["id_dilnicya"] !== "") {
          dilyciaCleanupUpdates[`${stringId}/id_dilnicya`] = null;
          delete parent["id_dilnicya"];
        }
        if (parent["n_dilyci"] && parent["n_dilyci"] !== "") {
          dilyciaCleanupUpdates[`${stringId}/n_dilyci`] = null;
          delete parent["n_dilyci"];
        }
      }
    });

    if (Object.keys(statusMigrationUpdates).length > 0) {
      console.log(`[Firebase Status Migration] Found ${Object.keys(statusMigrationUpdates).length} records with legacy 'активний' status. Performing atomic migration to 'наявний' status...`);
      try {
        const migRes = await fetch(`${FIREBASE_URL}/members.json?auth=${DB_SECRET}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(statusMigrationUpdates)
        });
        if (migRes.ok) {
          console.log(`[Firebase Status Migration] Atomic migration succeeded for ${Object.keys(statusMigrationUpdates).length} records!`);
        } else {
          console.error(`[Firebase Status Migration] Failed with status: ${migRes.status}`);
        }
      } catch (migErr: any) {
        console.error(`[Firebase Status Migration] Failed with error:`, migErr.message);
      }
    }

    if (Object.keys(dilyciaCleanupUpdates).length > 0) {
      console.log(`[Firebase Dilycia Cleanup] Found dilycia records on active members. Performing atomic cleanup from database...`);
      try {
        const cleanRes = await fetch(`${FIREBASE_URL}/members.json?auth=${DB_SECRET}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dilyciaCleanupUpdates)
        });
        if (cleanRes.ok) {
          console.log(`[Firebase Dilycia Cleanup] Atomic cleanup of dilycia from active records succeeded!`);
        } else {
          console.error(`[Firebase Dilycia Cleanup] Cleanup failed with status: ${cleanRes.status}`);
        }
      } catch (cleanErr: any) {
        console.error(`[Firebase Dilycia Cleanup] Cleanup failed:`, cleanErr.message);
      }
    }

    if (Object.keys(pibCleanupUpdates).length > 0) {
      console.log(`[Firebase PIB Cleanup] Found ${Object.keys(pibCleanupUpdates).length} fields with parentheses in PIB. Performing atomic cleanup...`);
      try {
        const pibRes = await fetch(`${FIREBASE_URL}/members.json?auth=${DB_SECRET}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pibCleanupUpdates)
        });
        if (pibRes.ok) {
          console.log(`[Firebase PIB Cleanup] Atomic cleanup of parenthesized names succeeded!`);
        } else {
          console.error(`[Firebase PIB Cleanup] Cleanup failed with status: ${pibRes.status}`);
        }
      } catch (pibErr: any) {
        console.error(`[Firebase PIB Cleanup] Cleanup failed:`, pibErr.message);
      }
    }

    // Parse each record
    const parsedMembers: Member[] = [];
    Object.keys(data).forEach((stringId) => {
      const id = Number(stringId);
      const raw = data[stringId];
      if (raw && !isNaN(id)) {
        const особисте = raw["02_OSOBYSTE"] || {};
        const адреса = raw["03_ADRESA"] || {};
        const структура = raw["04_STRUCTURA"] || {};
        const вибуття = raw["06_VYBUTTYA"] || {};
        const історія_вилучень = raw["ISTORIYA_VYLUCHEN"] || [];

        let calculatedAge = undefined;
        const birthDate = особисте["1_d_narodjennya"] || особисте["3_d_nar"] || "";
        if (birthDate) {
          try {
            const birth = new Date(birthDate.replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1'));
            if (!isNaN(birth.getTime())) {
              const ageDiff = Date.now() - birth.getTime();
              const ageDate = new Date(ageDiff);
              calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
            }
          } catch (_) {}
        }

        const statusField = структура["status"] || особисте["13_status"] || "наявний";
        const hasLeftStatus = statusField === "вибув";
        const hasVybuttyaReason = !!вибуття["2_prichina"];
        const hasVybuttyaDate = !!(вибуття["1_d_vybuttya"] || вибуття["1_d_vybyttya"]);
        const id_vybuttya = (hasLeftStatus || hasVybuttyaReason || hasVybuttyaDate) ? 1 : 0;

        // Normalize gender/role stat classification to strictly "брат" or "сестра" to clean up typos (like "неокруж.")
        const pibName = String(raw["01_PIB"] || raw["pib"] || `Користувач №${id}`).trim();
        let rawStat = String(особисте["gender"] || особисте["2_stat"] || raw["gender"] || raw["stat"] || "").trim().toLowerCase();
        let normStat = "брат";
        if (rawStat.includes("сестр") || rawStat.includes("сес")) {
          normStat = "сестра";
        } else if (rawStat.includes("брат") || rawStat.includes("бр")) {
          normStat = "брат";
        } else {
          // Fallback parsing from Ukrainian feminine patronymics / names
          const pibL = pibName.toLowerCase();
          if (pibL.endsWith("івна") || pibL.endsWith("евна") || pibL.endsWith("ична") || pibL.endsWith("на") || pibL.endsWith("ва") || pibL.endsWith("ка") || pibL.endsWith("а")) {
            normStat = "сестра";
          } else {
            normStat = "брат";
          }
        }

        // Construct robust marital status checking last history entry or direct s_simeyniy_ukr
        let simeyniyVal = String(особисте["s_simeyniy_ukr"] || "").trim();
        if (!simeyniyVal) {
          const shlyubArr = особисте["4_shlyub_history"];
          if (Array.isArray(shlyubArr) && shlyubArr.length > 0) {
            const sh = shlyubArr[shlyubArr.length - 1];
            if (sh && sh["status"]) {
              simeyniyVal = String(sh["status"]).trim();
            }
          }
        }
        if (!simeyniyVal) simeyniyVal = "неодружений";

        // Parse ministries (slujinnya) list from Firebase paths
        let ministriesStr = "";
        const rawHistory =
          (raw["ISTORIJA"] && raw["ISTORIJA"]["1_slujinnya"]) ||
          (структура && структура["slujinnya"]) ||
          raw["slujinnya"];

        if (Array.isArray(rawHistory)) {
          ministriesStr = rawHistory.filter(Boolean).map((h: any) => typeof h === "string" ? h.trim() : (h.podiya || h.id_slujinnya || "")).filter(Boolean).join(", ");
        } else if (typeof rawHistory === "string" && rawHistory.trim()) {
          try {
            const parsed = JSON.parse(rawHistory);
            if (Array.isArray(parsed)) {
              ministriesStr = parsed.filter(Boolean).map((h: any) => typeof h === "string" ? h.trim() : "").filter(Boolean).join(", ");
            } else {
              ministriesStr = rawHistory.trim();
            }
          } catch (e) {
            ministriesStr = rawHistory.trim();
          }
        }

        let professionStr = String(особисте["8_profesiya"] || особисте["s_profesiya_ukr"] || "").trim();
        const lowerProf = professionStr.toLowerCase();
        const hasMinistriesKeywords = lowerProf.includes("молитовне") || 
                                     lowerProf.includes("милосердя") || 
                                     lowerProf.includes("соціальне") || 
                                     lowerProf.includes("sun shine") || 
                                     lowerProf.includes("медіа") ||
                                     lowerProf.includes("спів") ||
                                     lowerProf.includes("недільн");
        if (!professionStr || professionStr === "н/д" || hasMinistriesKeywords) {
          const profId = Number(особисте["id_profesiya"] || 41);
          const profItem = s_profesiya.find((p: any) => Number(p.ID) === profId);
          professionStr = profItem ? String(profItem.Value || "н/д") : "н/д";
        }

        const mapped: Member = {
          id: id,
          pib: pibName,
          gender: normStat,

          s_simeyniy_ukr: simeyniyVal,
          id_simeyniy: Number(особисте["id_simeyniy"] || 5),
          s_socialniy_ukr: String(особисте["6_socialniy"] || особисте["s_socialniy_ukr"] || "н/д").trim(),
          id_socialniy: Number(особисте["id_socialniy"] || 6),
          s_osvita_ukr: String(особисте["7_osvita"] || особисте["s_osvita_ukr"] || "н/д").trim(),
          id_osvita: Number(особисте["id_osvita"] || 4),
          s_profesiya_ukr: professionStr,
          id_profesiya: Number(особисте["id_profesiya"] || 41),
          s_slujinnya_spysok: ministriesStr,
          zaklad_osv: String(особисте["zaklad_osv"] || "").trim(),

          d_narodjennya: toISODateFormat(birthDate),
          d_narodjennya_excel: dateToExcelSerialNumber(birthDate),
          tel_mob: String(особисте["2_tel"] || "").trim(),
          tel1: String(особисте["tel1"] || "").trim(),
          skype: String(особисте["skype"] || "").trim(),
          vik_rokiv1: calculatedAge,

          d_pokayannya: toISODateFormat(структура["d_pokayannya"] || ""),
          d_pokayannya_excel: dateToExcelSerialNumber(структура["d_pokayannya"] || ""),
          d_vodnogo: toISODateFormat(структура["5_d_vodnogo"] || структура["d_vodnogo"] || ""),
          d_vodnogo_excel: dateToExcelSerialNumber(структура["5_d_vodnogo"] || структура["d_vodnogo"] || ""),
          hsd: !!структура["hsd"],
          d_vstupu: toISODateFormat(структура["6_d_vstupu"] || структура["d_vstupu"] || ""),
          d_vstupu_excel: dateToExcelSerialNumber(структура["6_d_vstupu"] || структура["d_vstupu"] || ""),

          vidviduvanist: String(структура["vidviduvanist"] || структура["8_vidviduvanist"] || "").trim(),
          prysutnist: String(структура["prysutnist"] || структура["9_prysutnist"] || "").trim(),
          di_admin: String(структура["3_san"] || raw["di_admin"] || "").trim(),
          d_kontaktiv: toISODateFormat(String(
            raw["d_kontaktiv"] || 
            (raw["ISTORIJA"] && raw["ISTORIJA"]["d_kontaktiv"]) || 
            (raw["ISTORIJA"] && raw["ISTORIJA"]["7_d_kontaktiv"]) || 
            структура["7_d_kontaktiv"] || 
            структура["d_kontaktiv"] || 
            ""
          ).trim()),

          presviter: String(структура["opika"] || структура["4_opika"] || "").trim(),
          rayon2_ukr: String(структура["1_rayon"] || "").trim(),
          id_rayon2: структура["id_rayon2"] ? String(структура["id_rayon2"]) : "",
          id_dilnytsia: (структура["id_dilnytsia"] !== undefined ? String(структура["id_dilnytsia"]) : (структура["id_dilnicya"] !== undefined ? String(структура["id_dilnicya"]) : "")),
          n_dilyci: String(структура["grupa"] || структура["2_grupa"] || "").trim(),
          vidpov_grupy: String(структура["vidpov_grupy"] || "").trim(),

          id_vybuttya: id_vybuttya,
          s_vybuv_ukr: String(вибуття["2_prichina"] || "").trim(),
          d_vybuttya: toISODateFormat(вибуття["1_d_vybuttya"] || вибуття["1_d_vybyttya"] || ""),
          d_vybuttya_excel: dateToExcelSerialNumber(вибуття["1_d_vybuttya"] || вибуття["1_d_vybyttya"] || ""),
          vybutty_prymitka: String(вибуття["vybuv_prymitka"] || вибуття["3_primitka"] || "").trim(),

          nas_punkt: String(адреса["1_nas_punkt"] || адреса["1_misto"] || особисте["nas_punkt"] || "").trim(),
          vulitsya: String(адреса["2_vulycja"] || адреса["2_vulitsya"] || особисте["vulitsya"] || "").trim(),
          budynok: String(адреса["3_budynok"] || адреса["3_budinok"] || особисте["budynok"] || "").trim(),
          korpus: String(адреса["4_korpus"] || особисте["korpus"] || "").trim(),
          kvartyra: String(адреса["5_kvartyra"] || адреса["4_kvartira"] || особисте["kvartyra"] || "").trim(),

          hvoryi: String(raw["hvoryi"] || "").trim(),
          insha_gromada: String(структура["7_zvidky_primitka"] || структура["insha_gromada"] || raw["insha_gromada"] || "").trim(),
          prymitka: String(raw["prymitka"] || raw["primitka"] || "").trim(),
          discipline: String(структура["discipline"] || "").trim(),
          discipline_reason: String(структура["discipline_reason"] || "").trim(),
          discipline_date_start: toISODateFormat(String(структура["discipline_date_start"] || "").trim()),
          discipline_date_end: toISODateFormat(String(структура["discipline_date_end"] || "").trim()),
          efile: raw["efile"],
          address: formatAddress(адреса)
        };
        parsedMembers.push(mapped);
      }
    });

    if (parsedMembers.length > 0) {
      members = parsedMembers;
      console.log(`[Firebase Startup Sync] Successfully loaded ${members.length} members directly from Firebase Realtime Database.`);
      
      // Dynamic Relation Reconciliation & Healing from live Firebase questionnaires
      console.log("[Firebase Relationship Reconciliation] Rebuilding marriages and children tables from live JSON arrays...");
      Object.keys(data).forEach((stringId) => {
        const id = Number(stringId);
        const raw = data[stringId];
        if (raw && !isNaN(id)) {
          const особисте = raw["02_OSOBYSTE"] || {};
          
          // 1. Reconcile spouses from 4_shlyub_history
          const shlyubArr = особисте["4_shlyub_history"];
          if (Array.isArray(shlyubArr) && shlyubArr.length > 0) {
            const sh = shlyubArr[shlyubArr.length - 1];
            const spouseId = Number(sh["podruzhzhya_id"] || sh["podrujya_id"]);
            if (spouseId > 0) {
              const gender = String(особисте["2_stat"] || raw["stat"] || "").trim().toLowerCase();
              const isWife = gender.includes("сестр") || gender.includes("сес") || (raw["01_PIB"] || raw["pib"] || "").toLowerCase().endsWith("на") || (raw["01_PIB"] || raw["pib"] || "").toLowerCase().endsWith("ва");
              const husbandId = isWife ? spouseId : id;
              const wifeId = isWife ? id : spouseId;
              
              const existingMarriage = marriages.find(m => 
                Number(m.id_cholovik) === husbandId && Number(m.id_drujina) === wifeId
              );
              if (!existingMarriage) {
                console.log(`[Firebase Relation Healing] Restoring marriage: Husband ${husbandId} <-> Wife ${wifeId}`);
                marriages.push({
                  id: marriages.length + 2000,
                  id_cholovik: husbandId,
                  id_drujina: wifeId,
                  d_begin: dateToExcelSerialNumber(sh["d_shlyubu_begin"]),
                  d_end: ""
                });
              }
            }
          }

          // 2. Reconcile children lists from 9_dity
          const fbDity = особисте["9_dity"];
          if (Array.isArray(fbDity) && fbDity.length > 0) {
            const shlyubArr = особисте["4_shlyub_history"];
            const hasSh = Array.isArray(shlyubArr) && shlyubArr.length > 0;
            const spouseId = hasSh ? Number(shlyubArr[shlyubArr.length - 1]["podruzhzhya_id"] || shlyubArr[shlyubArr.length - 1]["podrujya_id"]) : 0;
            const gender = String(особисте["2_stat"] || raw["stat"] || "").trim().toLowerCase();
            const isWife = gender.includes("сестр") || gender.includes("сес") || (raw["01_PIB"] || raw["pib"] || "").toLowerCase().endsWith("на") || (raw["01_PIB"] || raw["pib"] || "").toLowerCase().endsWith("ва");
            const fatherId = isWife ? (spouseId || 0) : id;
            const motherId = isWife ? id : (spouseId || 0);

            fbDity.forEach(ch => {
              if (ch && ch.name) {
                const name = String(ch.name).trim();
                const bday = String(ch.birthday || "").trim();
                const firstName = name.split(" ")[0] || name;
                const lastName = name.split(" ").slice(1).join(" ") || "";
                
                // Match by checking name + either parent
                let existingChild = children.find(c => {
                  const matchName = String(c.n_dity || "").trim().toLowerCase();
                  const matchFather = Number(c.id_cholovik) === fatherId && fatherId > 0;
                  const matchMother = Number(c.id_drujina) === motherId && motherId > 0;
                  return matchName.includes(firstName.toLowerCase()) && (matchFather || matchMother);
                });

                if (existingChild) {
                  // Link both parents if links are missing
                  if (fatherId > 0 && !existingChild.id_cholovik) {
                    existingChild.id_cholovik = fatherId;
                  }
                  if (motherId > 0 && !existingChild.id_drujina) {
                    existingChild.id_drujina = motherId;
                  }
                } else {
                  console.log(`[Firebase Relation Healing] Restoring child entry: "${name}" (Father: ${fatherId}, Mother: ${motherId})`);
                  children.push({
                    dity_id: children.length + 3000,
                    id_simya: 1,
                    n_dity: firstName,
                    f_dity: lastName,
                    d_nar: dateToExcelSerialNumber(bday),
                    id_cholovik: fatherId,
                    id_drujina: motherId,
                    dity_vik_rokiv1: Number(ch.age || 0)
                  });
                }
              }
            });
          }
        }
      });

      initializeDefaultBindingsIfNeeded(members);

      saveDatabaseToCache();
      lastDatabaseSyncTime = Date.now();
      console.log(`[Cache Sync] Database timestamp updated to: ${new Date(lastDatabaseSyncTime).toISOString()}`);
    }
  } catch (err: any) {
    console.error(`[Firebase Startup Sync] Failed to sync with Firebase: ${err.message}. Using cache fallback.`);
    throw err;
  }
}

async function ensureDatabaseIsFresh() {
  const now = Date.now();
  if (now - lastDatabaseSyncTime > DB_SYNC_TTL_MS) {
    console.log(`[Cache Sync] Database state is older than ${DB_SYNC_TTL_MS}ms (last sync: ${new Date(lastDatabaseSyncTime).toISOString()}), pulling fresh state from Firebase RTDB...`);
    try {
      await syncDatabaseWithFirebase();
    } catch (err: any) {
      console.error("[Cache Sync] Background automatic sync failed:", err.message);
    }
  }
}

// --- Vite Middleware Config ---

async function startServer() {
  // Sync the database state with Firebase RTDB on startup in background
  await ensureInitialSync();

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Church Database FullStack Server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
} else {
  // On Vercel, we do NOT trigger sync on module load.
  // The first incoming HTTP request will trigger and await ensureInitialSync() via the middleware.
  // This guarantees reliable execution in the request execution sandbox.
  console.log("[Vercel Module Load] Server initialized. Sync will trigger on first request.");
}

export default app;
