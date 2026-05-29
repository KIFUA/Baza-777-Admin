import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
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

const app = express();
const PORT = 3000;
const DB_CACHE_FILE = path.join(process.cwd(), "db_cache.json");
const tablyciDir = path.join(process.cwd(), "tablyci");

app.use(express.json());

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

function saveDatabaseToCache() {
  try {
    const db = {
      members, marriages, children, ministries, disciplines, auditLogs,
      s_osvita, s_socialniy, s_simeyniy, s_vybuv, s_profesiya, s_selo, s_vulicya
    };
    fs.writeFileSync(DB_CACHE_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err: any) {
    console.error(`Error saving cache file: ${err.message}`);
  }
}


// --- API REST ROUTES ---

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
    discipline_types: DISCIPLINE_MAP
  });
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
      m.s_profesiya_ukr.toLowerCase().includes(query)
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
  const genderStat = member.stat;
  let marriageRec = null;

  if (genderStat === "брат") {
    // Husband
    marriageRec = marriages.find(m => Number(m.id_cholovik) === id);
    if (marriageRec && Number(marriageRec.id_drujina) > 0) {
      const spId = Number(marriageRec.id_drujina);
      const spName = members.find(m => m.id === spId)?.pib || `Член ID ${spId}`;
      spouse = { id: spId, pib: spName };
    }
  } else if (genderStat === "сестра") {
    // Wife
    marriageRec = marriages.find(m => Number(m.id_drujina) === id);
    if (marriageRec && Number(marriageRec.id_cholovik) > 0) {
      const spId = Number(marriageRec.id_cholovik);
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
    "s_profesiya_ukr", "zaklad_osv", "d_narodjennya", "presviter", 
    "rayon2_ukr", "n_dilyci", "vidviduvanist", "prysutnist", "id_vybuttya"
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
app.post("/api/members/:id/children", (req, res) => {
  const parentId = Number(req.params.id);
  const { name, birthDate, age, relationType } = req.body; // relationType: 'father' | 'mother'
  const parent = members.find(m => m.id === parentId);
  if (!parent) return res.status(404).json({ error: "Parent not found" });

  const childId = children.length + 1000;
  
  // Create child structure
  const newChildExcelRow = {
    dity_id: childId,
    id_simya: 1, // default group
    n_dity: name.split(" ")[0] || name,
    f_dity: name.split(" ").slice(1).join(" ") || parent.pib.split(" ")[0],
    d_nar: dateToExcelSerialNumber(birthDate),
    id_cholovik: relationType === "father" ? parentId : 0,
    id_drujina: relationType === "mother" ? parentId : 0,
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


// --- Vite Middleware Config ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
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

startServer();
