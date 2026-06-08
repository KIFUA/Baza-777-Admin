import express from "express";
import path from "path";
import fs from "fs";
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

// In-memory Database State
let members: Member[] = [];
let marriages: any[] = [];
let children: any[] = [];
let ministries: any[] = [];
let disciplines: any[] = [];
let auditLogs: AuditLogItem[] = [];

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
  "Постійно", "Періодично", "Рідко", "Ніколи", "Хворий", "Проблемний", "Замітка", "еміграція", "вивести з списку ЦЕРКВИ"
];

const DEFAULT_PRYSUTNIST_PARAMS = [
  "За кордоном", "ЗСУ", "Не ходить", "Немічний", "відпустити в іншу громаду", "вилучити", "замітка"
];

const DEFAULT_DI_ADMIN = [
  "перевести на КАСКАД", "перевести на АЕРОПОРТ", "перевести на ЦЕНТР", "перевести на ОБ'ЇЗНУ"
];

// Google Sheets Tab: ДОСТУП - Default Fallback Constants
const DEFAULT_DOSTUP = [
  { "rayon": "ЦЕНТР", "user": "Босик Л.", "position": "", "email": "" },
  { "rayon": "ЦЕНТР", "user": "Євстратов О.", "position": "ВІдповідальний", "email": "" },
  { "rayon": "ЦЕНТР", "user": "Мельничук В.", "position": "Диякон", "email": "" },
  { "rayon": "ЦЕНТР", "user": "Несен Ю.", "position": "ВІдповідальний", "email": "" },
  { "rayon": "ЦЕНТР", "user": "Прохніцький Б.", "position": "ВІдповідальний", "email": "" },
  { "rayon": "ЦЕНТР", "user": "Скриник М.", "position": "ВІдповідальний", "email": "" },
  { "rayon": "ЦЕНТР", "user": "Стасінчук В.", "position": "Диякон", "email": "" },
  { "rayon": "ЦЕНТР", "user": "Стафіїв М.", "position": "Диякон", "email": "" },
  { "rayon": "ЦЕНТР", "user": "Факас О.", "position": "ВІдповідальний", "email": "" },
  { "rayon": "ЦЕНТР", "user": "Черняк Вал.", "position": "Пресвітер", "email": "vacherniak@gmail.com" },
  { "rayon": "ЦЕНТР", "user": "Шегда П.", "position": "Диякон", "email": "" },
  { "rayon": "ОБ'ЇЗНА", "user": "Бурчак Ю.", "position": "Диякон", "email": "gvi.dim.777@gmail.com" },
  { "rayon": "ОБ'ЇЗНА", "user": "Дмитраш М.", "position": "Диякон", "email": "" },
  { "rayon": "ОБ'ЇЗНА", "user": "Решетило Р.", "position": "Диякон", "email": "" },
  { "rayon": "ОБ'ЇЗНА", "user": "Стефурак Д.", "position": "Диякон", "email": "" },
  { "rayon": "ОБ'ЇЗНА", "user": "Черняк Вас.", "position": "Пресвітер", "email": "cherniakvasylcherniak@gmail.com" },
  { "rayon": "КАСКАД", "user": "Ільницький О.", "position": "Диякон", "email": "" },
  { "rayon": "КАСКАД", "user": "Луцак М.", "position": "Диякон", "email": "" },
  { "rayon": "КАСКАД", "user": "Марунчак В.", "position": "Диякон", "email": "" },
  { "rayon": "КАСКАД", "user": "Скіцко І.", "position": "Пресвітер", "email": "ivanskitsko@ukr.net" },
  { "rayon": "АЕРОПОРТ", "user": "Бевзюк В.", "position": "Пресвітер", "email": "vbevzyk@gmail.com" },
  { "rayon": "АЕРОПОРТ", "user": "Галюк Б.", "position": "Диякон", "email": "+380967303099, Alla1967" },
  { "rayon": "АЕРОПОРТ", "user": "Григорів Г.", "position": "тестувальник", "email": "grigorivgalina@gmail.com" },
  { "rayon": "АЕРОПОРТ", "user": "Самелюк О.", "position": "Диякон", "email": "solbo1971@gmail.com" },
  { "rayon": "АЕРОПОРТ", "user": "Черняк Вікт.", "position": "Диякон", "email": "" },
  { "rayon": "АЕРОПОРТ", "user": "Шпарман Ю.", "position": "ВІдповідальний", "email": "" }
];

// Active State Tables (loaded from Cache or Google sheets, falling back to constants)
let directories_opika: string[] = [...DEFAULT_OPIKA];
let directories_slujinnya: string[] = [...DEFAULT_SLUJINNYA];
let directories_vidviduvanist: string[] = [...DEFAULT_VIDVIDUVANIST_PARAMS];
let directories_prysutnist: string[] = [...DEFAULT_PRYSUTNIST_PARAMS];
let directories_di_admin: string[] = [...DEFAULT_DI_ADMIN];
let access_dostup: any[] = [...DEFAULT_DOSTUP];

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
    members.forEach(member => {
      const row = anketaMap.get(member.id);
      if (row) {
        const rawPrimitka = String(row.primitka || "").trim();
        if (rawPrimitka) {
          // If member has left and does not have a departure explanation, heal it!
          if (member.id_vybuttya > 0 && !member.vybutty_prymitka) {
            member.vybutty_prymitka = rawPrimitka;
            healedCount++;
          }
          // Also set general note if it is currently empty
          if (!member.primitka) {
            member.primitka = rawPrimitka;
            healedCount++;
          }
        }
      }
    });
    console.log(`Successfully healed and restored ${healedCount} notes/comments from anketa.xlsx.`);
  } catch (err: any) {
    console.error(`Error during database healing with anketa.xlsx: ${err.message}`);
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
      s_osvita = db.s_osvita || [];
      s_socialniy = db.s_socialniy || [];
      s_simeyniy = db.s_simeyniy || [];
      s_vybuv = db.s_vybuv || [];
      s_profesiya = db.s_profesiya || [];
      s_selo = db.s_selo || [];
      s_vulicya = db.s_vulicya || [];
      directories_opika = db.directories_opika || [...DEFAULT_OPIKA];
      directories_slujinnya = db.directories_slujinnya || [...DEFAULT_SLUJINNYA];
      directories_vidviduvanist = db.directories_vidviduvanist || [...DEFAULT_VIDVIDUVANIST_PARAMS];
      directories_prysutnist = db.directories_prysutnist || [...DEFAULT_PRYSUTNIST_PARAMS];
      directories_di_admin = db.directories_di_admin || [...DEFAULT_DI_ADMIN];
      access_dostup = db.access_dostup || [...DEFAULT_DOSTUP];
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
          stat: String(row.stat || "н/д").trim(),
          
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

function saveDatabaseToCache() {
  try {
    const db = {
      members, marriages, children, ministries, disciplines, auditLogs,
      s_osvita, s_socialniy, s_simeyniy, s_vybuv, s_profesiya, s_selo, s_vulicya,
      directories_opika,
      directories_slujinnya,
      directories_vidviduvanist,
      directories_prysutnist,
      directories_di_admin,
      access_dostup
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
      // Trigger background sync to also keep modern view state updated
      setTimeout(() => {
        syncDatabaseWithFirebase().catch(err => console.error("Mutation background sync error:", err));
      }, 500);
    }
  } catch (error: any) {
    console.error(`[Firebase Proxy] Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// 1. Get List of directories for diagnostic or verification
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", numMembers: members.length });
});

// 2. Lookup Tables Catalog Access
app.get("/api/lookups", (req, res) => {
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
      di_admin: directories_di_admin
    },
    access: access_dostup
  });
});

// Parse Google Sheet CSV (Simple quote-aware parser)
function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  return lines.map(line => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(v => {
      if (v.startsWith('"') && v.endsWith('"')) {
        return v.substring(1, v.length - 1).trim();
      }
      return v;
    });
  }).filter(line => line.length > 0 && line.some(col => col !== ""));
}

// 2.1 Sync Directories & Access Lists with Google Sheets
app.post("/api/sync-sheets", async (req, res) => {
  try {
    const GOOGLE_SHEET_ID = "1s_Wio5niYvq2HRoBYwH3bS9NEcbtsJsWXv5P7u5Zhw8";
    
    // Fetch ДОВІДНИКИ
    const dirUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("ДОВІДНИКИ")}`;
    const dirResp = await fetch(dirUrl);
    if (!dirResp.ok) throw new Error("Could not fetch ДОВІДНИКИ sheet");
    const dirCsvText = await dirResp.text();
    const dirRows = parseCSV(dirCsvText);
    
    const freshOpika: string[] = [];
    const freshSlujinnya: string[] = [];
    const freshVidviduvanist: string[] = [];
    const freshPrysutnist: string[] = [];
    const freshDiAdmin: string[] = [];
    
    // Skip row 0 (headers)
    for (let r = 1; r < dirRows.length; r++) {
      const cols = dirRows[r];
      if (cols[0]) freshOpika.push(cols[0]);
      if (cols[2]) freshSlujinnya.push(cols[2]);
      if (cols[4]) freshVidviduvanist.push(cols[4]);
      if (cols[6]) freshPrysutnist.push(cols[6]);
      if (cols[8]) freshDiAdmin.push(cols[8]);
    }
    
    if (freshOpika.length > 0) directories_opika = freshOpika;
    if (freshSlujinnya.length > 0) directories_slujinnya = freshSlujinnya;
    if (freshVidviduvanist.length > 0) directories_vidviduvanist = freshVidviduvanist;
    if (freshPrysutnist.length > 0) directories_prysutnist = freshPrysutnist;
    if (freshDiAdmin.length > 0) directories_di_admin = freshDiAdmin;

    // Fetch ДОСТУП
    const accUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent("ДОСТУП")}`;
    const accResp = await fetch(accUrl);
    if (!accResp.ok) throw new Error("Could not fetch ДОСТУП sheet");
    const accCsvText = await accResp.text();
    const accRows = parseCSV(accCsvText);
    
    const freshDostup: any[] = [];
    // Skip row 0 (headers: РАЙОН, Користувач, Позиція, E-mail)
    for (let r = 1; r < accRows.length; r++) {
      const cols = accRows[r];
      if (cols[1]) { // user name must exist
        freshDostup.push({
          rayon: cols[0] || "",
          user: cols[1],
          position: cols[2] || "",
          email: cols[3] || ""
        });
      }
    }
    
    if (freshDostup.length > 0) access_dostup = freshDostup;
    
    // Write synchronized directories and access control lists to Firebase Realtime Database
    await syncDirectoriesToFirebase();

    auditLogs.push({
      id: "sync_" + Date.now(),
      timestamp: new Date().toISOString(),
      memberId: 0,
      memberName: "Адмін",
      action: "sync",
      details: "<b>Синхронізація з Sheets</b>: завантажено актуальні списки опікунів, служінь, параметрів та рівнів доступу і перенесено в базу Firebase."
    });
    
    saveDatabaseToCache();
    
    res.json({
      success: true,
      directories: {
        opika: directories_opika.length,
        slujinnya: directories_slujinnya.length,
        vidviduvanist: directories_vidviduvanist.length,
        prysutnist: directories_prysutnist.length,
        di_admin: directories_di_admin.length
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
    const parts = rawBirth.split("-");
    if (parts.length !== 3) return;

    const birthYear = parseInt(parts[0], 10);
    const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed
    const birthDay = parseInt(parts[2], 10);

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
        stat: m.stat,
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
app.get("/api/birthdays", (req, res) => {
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
    // Deliver via Telegram Bot API using provided or default IDs
    // Target Chat: 1919236304 (Me) or -1001914940560 (Group)
    const token = customToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = customChatId || (type === "telegram_me" ? "1919236304" : "-1001914940560");

    if (!token) {
      telegramLogs = `[Симуляція] Telegram бот токен НЕ налаштований. Список було б надіслано в чат ID: ${chatId}.`;
    } else {
      try {
        const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
        const response = await fetch(tgUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: msg,
            parse_mode: "Markdown"
          })
        });
        const rJson = await response.json() as any;
        if (rJson.ok) {
          telegramLogs = `Успішно надіслано в Telegram чат ID: ${chatId}.`;
        } else {
          telegramLogs = `Помилка Telegram API: ${rJson.description} (Код: ${rJson.error_code})`;
        }
      } catch (tgErr: any) {
        telegramLogs = `Помилка зв'язку з Telegram: ${tgErr.message}`;
      }
    }
  } else if (type === "email_text" || type === "email_pdf") {
    // Deliver via church office email
    const destinations = ["kostel.if.ua@gmail.com", "liliiachupryna@gmail.com", "solbo1971@gmail.com"];
    emailLogs = `[Імітація Email] Направлено звіт ${type === "email_pdf" ? "з PDF вкладенням" : "як текст"} на поштові скриньки: ${destinations.join(", ")}.`;
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
app.post("/api/directories/save", (req, res) => {
  const { opika, slujinnya, vidviduvanist, prysutnist, di_admin, access } = req.body;
  
  if (Array.isArray(opika)) directories_opika = opika;
  if (Array.isArray(slujinnya)) directories_slujinnya = slujinnya;
  if (Array.isArray(vidviduvanist)) directories_vidviduvanist = vidviduvanist;
  if (Array.isArray(prysutnist)) directories_prysutnist = prysutnist;
  if (Array.isArray(di_admin)) directories_di_admin = di_admin;
  if (Array.isArray(access)) access_dostup = access;

  auditLogs.push({
    id: "dir_" + Date.now(),
    timestamp: new Date().toISOString(),
    memberId: 0,
    memberName: "Адмін",
    action: "directories_update",
    details: "<b>Оновлення довідників</b>: вручну внесені та збережені зміни в налаштування списків."
  });

  saveDatabaseToCache();
  syncDirectoriesToFirebase().catch(e => console.error("Firebase manual directories save error:", e));
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

// 3. Get Members (summary list with options to search, filter by tag, caretakers, etc)
app.get("/api/members", (req, res) => {
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
    result = result.filter(m => m.stat === gender);
  }

  // Filter Area
  if (area) {
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

  res.json(result);
});

// 4. Get Core Statistics
app.get("/api/stats", (req, res) => {
  const activeOnly = members.filter(m => m.id_vybuttya === 0 && !isMergedProfileServer(m, members));
  
  const stats: DashboardStats = {
    totalMembers: members.length,
    activeMembers: activeOnly.length,
    dismissedMembers: members.length - activeOnly.length,
    malesCount: activeOnly.filter(m => m.stat === "брат").length,
    femalesCount: activeOnly.filter(m => m.stat === "сестра").length,
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
app.get("/api/members/:id", (req, res) => {
  const id = Number(req.params.id);
  const member = members.find(m => m.id === id);
  if (!member) {
    return res.status(404).json({ error: "Member not found" });
  }

  // A. Determine spouse
  let spouse: Spouse | null = null;
  let marriageRec = marriages.find(m => Number(m.id_cholovik) === id || Number(m.id_drujina) === id);
  if (marriageRec) {
    const isCholovik = Number(marriageRec.id_cholovik) === id;
    const spId = isCholovik ? Number(marriageRec.id_drujina) : Number(marriageRec.id_cholovik);
    if (spId > 0) {
      const spName = members.find(m => m.id === spId)?.pib || `Член ID ${spId}`;
      spouse = { id: spId, pib: spName };
    }
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

// Helper function to sync updated member details back to Firebase Realtime Database
async function syncMemberToFirebase(id: number, member: Member) {
  const patchUrl = `${FIREBASE_URL}/members/${id}.json?auth=${FIREBASE_SECRET}`;
  
  // Format standard status
  const statusStr = member.id_vybuttya > 0 ? "вибув" : "активний";
  
  // Convert ministries comma separated string into standard list for legacy checkboxes/hidden input compatibility
  const slujList = (member.s_slujinnya_spysok || "").split(/[,;]+/).map(s => s.trim()).filter(Boolean);

  const updates: any = {
    "01_PIB": member.pib,
    "pib": member.pib,
    "stat": member.stat,
    "02_OSOBYSTE/1_d_narodjennya": member.d_narodjennya || "",
    "02_OSOBYSTE/3_d_nar": member.d_narodjennya || "",
    "02_OSOBYSTE/2_tel": member.tel_mob || "",
    "02_OSOBYSTE/phone": member.tel_mob || "",
    "02_OSOBYSTE/tel": member.tel_mob || "",
    "02_OSOBYSTE/2_stat": member.stat || "н/д",
    "02_OSOBYSTE/7_osvita": member.s_osvita_ukr || "н/д",
    "02_OSOBYSTE/8_profesiya": member.s_profesiya_ukr || "н/д",
    "02_OSOBYSTE/6_socialniy": member.s_socialniy_ukr || "н/д",
    "02_OSOBYSTE/13_status": statusStr,
    "02_OSOBYSTE/s_simeyniy_ukr": member.s_simeyniy_ukr || "неодружений",
    
    "04_STRUCTURA/1_rayon": member.rayon2_ukr || "",
    "04_STRUCTURA/4_opika": member.presviter || "",
    "04_STRUCTURA/2_grupa": member.n_dilyci || "",
    "04_STRUCTURA/5_d_vodnogo": member.d_vodnogo || "",
    "04_STRUCTURA/6_d_vstupu": member.d_vstupu || "",
    "04_STRUCTURA/8_vidviduvanist": member.vidviduvanist || "",
    "04_STRUCTURA/9_prysutnist": member.prysutnist || "",
    "04_STRUCTURA/3_san": member.di_admin || "",
    
    "05_ISTORIJA/1_slujinnya": slujList,
    "04_STRUCTURA/slujinnya": slujList,
    "slujinnya": slujList,
    
    "06_VYBUTTYA/2_prichina": member.s_vybuv_ukr || "",
    "06_VYBUTTYA/1_d_vybuttya": member.d_vybuttya || "",
    "06_VYBUTTYA/1_d_vybyttya": member.d_vybuttya || "",
    "06_VYBUTTYA/3_primitka": member.vybutty_prymitka || "",
    "06_VYBUTTYA/vybuv_prymitka": member.vybutty_prymitka || ""
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
app.post("/api/members/:id", (req, res) => {
  const id = Number(req.params.id);
  const updatedData = req.body as Partial<Member>;
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
    "rayon2_ukr", "n_dilyci", "vidviduvanist", "prysutnist", "id_vybuttya", "di_admin"
  ];

  fieldsToCheck.forEach(key => {
    if (updatedData[key] !== undefined && updatedData[key] !== orig[key]) {
      changes.push(`<b>${key}</b>: від "${orig[key] || "порожньо"}" до "${updatedData[key] || "порожньо"}"`);
    }
  });

  // Apply updates on server state
  const mergedMember = { ...orig, ...updatedData };
  
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

  // Sync update back to Firebase Realtime Database asynchronously
  syncMemberToFirebase(id, mergedMember as Member).catch(err => {
    console.error(`[Firebase Sync Post-update] Error syncing member ${id}:`, err);
  });

  // Insert change audit log (user request 05 - History Audit/Journal tracking)
  if (changes.length > 0) {
    const changeLogId = "chg_" + Date.now();
    auditLogs.push({
      id: changeLogId,
      timestamp: new Date().toISOString(),
      memberId: id,
      memberName: orig.pib,
      action: "update",
      details: `Редагування профілю. Зміни: ${changes.join(", ")}`
    });
  }

  saveDatabaseToCache();
  res.json({ success: true, member: mergedMember });
});

// 7. Add general audit logs / Custom event
app.post("/api/audit", (req, res) => {
  const { memberId, memberName, action, details } = req.body;
  const newLog: AuditLogItem = {
    id: "user_" + Date.now(),
    timestamp: new Date().toISOString(),
    memberId: Number(memberId || 0),
    memberName: String(memberName || "Користувач").trim(),
    action: String(action || "audit"),
    details: String(details || "").trim()
  };
  auditLogs.push(newLog);
  saveDatabaseToCache();
  res.json({ success: true, log: newLog });
});

// 8. Get history changelogs List (Audit logs + Ministry Timeline events merged)
app.get("/api/audit-logs", (req, res) => {
  // Sort descending by timestamp
  const sortedLogs = [...auditLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json(sortedLogs);
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
app.post("/api/members/:id/ministries", (req, res) => {
  const memberId = Number(req.params.id);
  const { ministryId, startDate } = req.body;
  const member = members.find(m => m.id === memberId);
  if (!member) return res.status(404).json({ error: "Member not found" });

  const newId = ministries.length + 1;
  const newMinRow = {
    id: newId,
    id_anketa: memberId,
    id_slujinnya: Number(ministryId),
    d_begin: dateToExcelSerialNumber(startDate),
    d_end: ""
  };
  ministries.push(newMinRow);

  const minLabel = MINISTRY_MAP[Number(ministryId)] || `Служіння #${ministryId}`;
  auditLogs.push({
    id: "min_" + Date.now(),
    timestamp: new Date().toISOString(),
    memberId,
    memberName: member.pib,
    action: "add_ministry",
    details: `Призначено служіння: <b>${minLabel}</b> починаючи з ${startDate}`
  });

  saveDatabaseToCache();
  res.json({ success: true, id: newId });
});

// 11. End an active ministry record
app.post("/api/members/:id/ministries/:recId/end", (req, res) => {
  const memberId = Number(req.params.id);
  const recId = Number(req.params.recId);
  const { endDate } = req.body;
  const member = members.find(m => m.id === memberId);
  if (!member) return res.status(404).json({ error: "Member not found" });

  const idx = ministries.findIndex(m => Number(m.id) === recId && Number(m.id_anketa) === memberId);
  if (idx !== -1) {
    ministries[idx].d_end = dateToExcelSerialNumber(endDate);
    const minId = ministries[idx].id_slujinnya;
    const minLabel = MINISTRY_MAP[minId] || `Служіння #${minId}`;
    
    auditLogs.push({
      id: "min_end_" + Date.now(),
      timestamp: new Date().toISOString(),
      memberId,
      memberName: member.pib,
      action: "end_ministry",
      details: `Завершено служіння: <b>${minLabel}</b> на дату ${endDate}`
    });
    
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

  const discLabel = DISCIPLINE_MAP[Number(disciplineId)] || `Стягнення #${disciplineId}`;
  auditLogs.push({
    id: "disc_" + Date.now(),
    timestamp: new Date().toISOString(),
    memberId,
    memberName: member.pib,
    action: "discipline",
    details: `Накладено стягнення/дисципліну: <b>${discLabel}</b> з причини: "${reason}"`
  });

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
    
    const discId = disciplines[idx].id_styagnen;
    const discLabel = DISCIPLINE_MAP[discId] || `Стягнення #${discId}`;

    auditLogs.push({
      id: "disc_res_" + Date.now(),
      timestamp: new Date().toISOString(),
      memberId,
      memberName: member.pib,
      action: "discipline_resolved",
      details: `Знято стягнення: <b>${discLabel}</b> на дату ${resolveDate}`
    });

    saveDatabaseToCache();
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Discipline record not found" });
});

// 14. Create a completely New Member Profile
app.post("/api/members", (req, res) => {
  const newMemberData = req.body as Partial<Member>;
  const nextId = Math.max(...members.map(m => m.id)) + 1;

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
    pib: String(newMemberData.pib || "").trim(),
    stat: String(newMemberData.stat || "брат").trim(),
    
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

    presviter: String(newMemberData.presviter || "").trim(),
    rayon2_ukr: String(newMemberData.rayon2_ukr || "").trim(),
    id_rayon2: newMemberData.id_rayon2 ? String(newMemberData.id_rayon2) : "",
    id_dilnicya: newMemberData.id_dilnicya ? String(newMemberData.id_dilnicya) : "",
    n_dilyci: String(newMemberData.n_dilyci || "").trim(),
    vidpov_grupy: String(newMemberData.vidpov_grupy || "").trim(),

    id_vybuttya: 0,
    s_vybuv_ukr: "",
    d_vybuttya: "",
    d_vybuttya_excel: 0,
    vybutty_prymitka: "",

    hvoryi: "",
    insha_gromada: "",
    primitka: "",
    efile: true
  };

  members.push(newMember);

  // Sync new member card to Firebase asynchronously
  syncMemberToFirebase(nextId, newMember).catch(err => {
    console.error(`[Firebase Member Sync] Error creating member ${nextId}:`, err);
  });

  auditLogs.push({
    id: "add_mem_" + Date.now(),
    timestamp: new Date().toISOString(),
    memberId: nextId,
    memberName: newMember.pib,
    action: "create",
    details: `Додано новий профайл члена церкви: <b>${newMember.pib}</b> (${newMember.stat}).`
  });

  saveDatabaseToCache();
  res.json({ success: true, memberId: nextId, member: newMember });
});

// Seed Database State
loadDatabase();

async function syncDirectoriesToFirebase() {
  const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${FIREBASE_URL}/directories.json?auth=${DB_SECRET}`;
  try {
    const payload = {
      opika: directories_opika,
      slujinnya: directories_slujinnya,
      vidviduvanist: directories_vidviduvanist,
      prysutnist: directories_prysutnist,
      di_admin: directories_di_admin
    };
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log("[Firebase Directories Sync] Directories successfully saved to Firebase RTDB.");
  } catch (err: any) {
    console.error("[Firebase Directories Sync] Failed to save directories to Firebase:", err.message);
  }
}

async function syncDirectoriesFromFirebase() {
  const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
  const url = `${FIREBASE_URL}/directories.json?auth=${DB_SECRET}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    if (data && (data.opika || data.slujinnya || data.vidviduvanist || data.prysutnist || data.di_admin)) {
      if (Array.isArray(data.opika)) directories_opika = data.opika;
      if (Array.isArray(data.slujinnya)) directories_slujinnya = data.slujinnya;
      if (Array.isArray(data.vidviduvanist)) directories_vidviduvanist = data.vidviduvanist;
      if (Array.isArray(data.prysutnist)) directories_prysutnist = data.prysutnist;
      if (Array.isArray(data.di_admin)) directories_di_admin = data.di_admin;
      console.log("[Firebase Directories Sync] Directories loaded from Firebase RTDB.");
    } else {
      console.warn("[Firebase Directories Sync] No directories found in Firebase RTDB, pushing local defaults to Firebase RTDB...");
      await syncDirectoriesToFirebase();
    }
  } catch (err: any) {
    console.error("[Firebase Directories Sync] Failed to load directories from Firebase:", err.message);
  }
}

async function syncDatabaseWithFirebase() {
  console.log("[Firebase Startup Sync] Loading database from Firebase RTDB...");
  
  // Load specialized lookup directories from Firebase RTDB
  await syncDirectoriesFromFirebase();

  const DB_SECRET = process.env.FIREBASE_SECRET || "CXo9DIfFBm1Y4JlKACL7PFPLUFKYjpNgUXyzSRwf";
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
        const історія_вилучень = raw["07_ISTORIYA"] || [];

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

        const hasLeftStatus = особисте["13_status"] === "вибув";
        const hasVybuttyaReason = !!вибуття["2_prichina"];
        const hasVybuttyaDate = !!(вибуття["1_d_vybuttya"] || вибуття["1_d_vybyttya"]);
        const id_vybuttya = (hasLeftStatus || hasVybuttyaReason || hasVybuttyaDate) ? 1 : 0;

        // Normalize gender/role stat classification to strictly "брат" or "сестра" to clean up typos (like "неокруж.")
        const pibName = String(raw["01_PIB"] || raw["pib"] || `Користувач №${id}`).trim();
        let rawStat = String(особисте["2_stat"] || raw["stat"] || "").trim().toLowerCase();
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
          (raw["05_ISTORIJA"] && raw["05_ISTORIJA"]["1_slujinnya"]) ||
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
          stat: normStat,

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

          d_narodjennya: birthDate,
          d_narodjennya_excel: dateToExcelSerialNumber(birthDate),
          tel_mob: String(особисте["2_tel"] || "").trim(),
          tel1: String(особисте["tel1"] || "").trim(),
          skype: String(особисте["skype"] || "").trim(),
          vik_rokiv1: calculatedAge,

          d_pokayannya: структура["d_pokayannya"] || "",
          d_pokayannya_excel: dateToExcelSerialNumber(структура["d_pokayannya"] || ""),
          d_vodnogo: структура["5_d_vodnogo"] || структура["d_vodnogo"] || "",
          d_vodnogo_excel: dateToExcelSerialNumber(структура["5_d_vodnogo"] || структура["d_vodnogo"] || ""),
          hsd: !!структура["hsd"],
          d_vstupu: структура["6_d_vstupu"] || структура["d_vstupu"] || "",
          d_vstupu_excel: dateToExcelSerialNumber(структура["6_d_vstupu"] || структура["d_vstupu"] || ""),

          vidviduvanist: String(структура["8_vidviduvanist"] || "").trim(),
          prysutnist: String(структура["9_prysutnist"] || "").trim(),
          di_admin: String(структура["3_san"] || raw["di_admin"] || "").trim(),

          presviter: String(структура["4_opika"] || "").trim(),
          rayon2_ukr: String(структура["1_rayon"] || "").trim(),
          id_rayon2: структура["id_rayon2"] ? String(структура["id_rayon2"]) : "",
          id_dilnicya: структура["id_dilnicya"] ? String(структура["id_dilnicya"]) : "",
          n_dilyci: String(структура["2_grupa"] || "").trim(),
          vidpov_grupy: String(структура["vidpov_grupy"] || "").trim(),

          id_vybuttya: id_vybuttya,
          s_vybuv_ukr: String(вибуття["2_prichina"] || "").trim(),
          d_vybuttya: вибуття["1_d_vybuttya"] || вибуття["1_d_vybyttya"] || "",
          d_vybuttya_excel: dateToExcelSerialNumber(вибуття["1_d_vybuttya"] || вибуття["1_d_vybyttya"] || ""),
          vybutty_prymitka: String(вибуття["vybuv_prymitka"] || вибуття["3_primitka"] || "").trim(),

          hvoryi: String(raw["hvoryi"] || "").trim(),
          insha_gromada: String(raw["insha_gromada"] || "").trim(),
          primitka: String(raw["primitka"] || "").trim(),
          efile: raw["efile"]
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

      saveDatabaseToCache();
    }
  } catch (err: any) {
    console.error(`[Firebase Startup Sync] Failed to sync with Firebase: ${err.message}. Using cache fallback.`);
  }
}

// --- Vite Middleware Config ---

async function startServer() {
  // Sync the database state with Firebase RTDB on startup in background
  await syncDatabaseWithFirebase();

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
  // On Vercel, start state synchronization on module load asynchronously
  syncDatabaseWithFirebase().catch(e => console.error("Vercel initial Firebase sync error:", e));
}

export default app;
