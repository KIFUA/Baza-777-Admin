import React, { useState, useMemo, useEffect } from 'react';
import { Member } from '../types';
import { 
  Search, Edit2, Check, X, FileText, CheckCircle, AlertTriangle, 
  HelpCircle, Sparkles, Filter 
} from 'lucide-react';

interface SpreadsheetViewProps {
  members: Member[];
  lookups: any;
  userLevel?: string;
  selectedMemberId?: number | null;
  onOpenProfile: (id: number) => void;
  onUpdateMember: (id: number, updatedFields: Partial<Member>) => Promise<boolean>;
  onOpenGenerator: () => void;
}

export default function SpreadsheetView({ 
  members, 
  lookups, 
  userLevel, 
  selectedMemberId, 
  onOpenProfile, 
  onUpdateMember, 
  onOpenGenerator 
}: SpreadsheetViewProps) {
  const getPermission = (fieldName: string): { view: boolean, edit: boolean } => {
    const level = userLevel || 'І-й';
    
    const getLevelNum = (lvl: string): number => {
      if (!lvl) return 1;
      const s = lvl.toUpperCase();
      if (s.includes('IV') || s.includes('ІV') || s.includes('4')) return 4;
      if (s.includes('III') || s.includes('ІІІ') || s.includes('3')) return 3;
      if (s.includes('II') || s.includes('ІІ') || s.includes('2')) return 2;
      return 1;
    };

    const levelNum = getLevelNum(level);

    const roleMapping: Record<string, string> = {
      'дати контактів з пресв.': 'Дата контакт.',
      'примітки і пояснення': 'Примітки',
      'завдання для адмін.': 'Завд. для адм.',
      'опіка': 'Опіка',
      'служіння': 'Служіння',
      'відвідування': 'Відвідув.',
      'прич. відсутності': 'Прич. відсутн.',
      'вік': 'Вік',
      'адреса': 'Адрес',
      'телефон': 'Телефон',
      'дата народж.': 'Дата народж.',
      'ос-та': 'Освіта',
      'хр. с.д.': 'Хр. С.Д.',
      'сім. стан': 'Сім. стан',
      'соц. стан': 'Соц. стан',
      'в.х.': 'В.Х.',
      'в_церкві_з': 'В церкві з',
      'років в ц.': 'К-ть рок. в Ц.',
      'район': 'РАЙОН',
      'піб': 'ПІБ',
      'всего членів церкви': 'ВСЬОГО ЧЛЕНІВ ЦЕРКВИ',
      'всього членів церкви': 'ВСЬОГО ЧЛЕНІВ ЦЕРКВИ',
      'список': 'Кнопка СПИСОК',
      'анкети': 'Кнопка АНКЕТИ',
      'статистика': 'Кнопка СТАТИСТИКА',
      'налаштування': 'Кнопка НАЛАШТУВАННЯ',
      'pole statusів': 'Поле статусів',
      'поле статусів': 'Поле статусів',
      'поле районів': 'Поле районів',
      'поле опіка': 'Поле опіка',
      'поле пошук': 'Поле пошук',
      'кнопка власні списки': 'Кнопка ВЛАСНІ СПИСКИ',
      'кнопка район у таблиці': 'Кнопка РАЙОН У ТАБЛИЦІ'
    };

    const normalizeStr = (s: string) => s.replace(/[^a-zA-Zа-яА-ЯёЁіІїЇєЄґҐ0-9]/g, '').toLowerCase().trim();
    
    let mappedName = fieldName;
    const cleanFieldName = fieldName.toLowerCase().trim();
    if (roleMapping[cleanFieldName]) {
      mappedName = roleMapping[cleanFieldName];
    }
    
    const targetNorm = normalizeStr(mappedName);

    if (levelNum <= 2) {
      const normOpika = normalizeStr('Опіка');
      const normPoleOpika = normalizeStr('Поле опіка');
      if (targetNorm === normOpika || targetNorm === normPoleOpika) {
        return { view: false, edit: false };
      }
    }
    
    const list = lookups?.permission_levels || (window as any).__bazaDefaultPermissionLevels || [];
    const row = list.find((item: any) => {
      const dbRole = normalizeStr(item.role || "");
      return dbRole === targetNorm || 
             dbRole === 'кнопка' + targetNorm || 
             dbRole === 'поле' + targetNorm;
    });

    if (!row) {
      const isPublic = ['№', 'піб', 'в_церкві_з', 'років в ц.', 'rayon2_ukr', 'поле пошук'].includes(targetNorm);
      const isVisible = isPublic || (levelNum > 1);
      const isEditable = isVisible && (levelNum === 4);
      return { view: isVisible, edit: isEditable };
    }

    const findAccessValue = (access: Record<string, boolean>, lvlNum: number, action: 'view' | 'edit'): boolean => {
      const keys = Object.keys(access || {});
      for (const k of keys) {
        const rawKey = k.toLowerCase().trim();
        let keyLvl = 1;
        if (rawKey.includes('iv') || rawKey.includes('іv')) keyLvl = 4;
        else if (rawKey.includes('iii') || rawKey.includes('ііі')) keyLvl = 3;
        else if (rawKey.includes('ii') || rawKey.includes('іі')) keyLvl = 2;
        else keyLvl = 1;

        const isEdit = rawKey.includes('змін') || rawKey.includes('прав') || rawKey.includes('edit');
        const isView = rawKey.includes('бач') || rawKey.includes('view');

        if (keyLvl === lvlNum) {
          if (action === 'view' && isView) return !!access[k];
          if (action === 'edit' && isEdit) return !!access[k];
        }
      }
      return false;
    };

    return {
      view: findAccessValue(row.access, levelNum, 'view'),
      edit: levelNum === 4 ? findAccessValue(row.access, levelNum, 'edit') : false
    };
  };

  const getLevelNum = (lvl: string): number => {
    if (!lvl) return 1;
    const s = lvl.toUpperCase();
    if (s.includes('IV') || s.includes('ІV') || s.includes('4')) return 4;
    if (s.includes('III') || s.includes('ІІІ') || s.includes('3')) return 3;
    if (s.includes('II') || s.includes('ІІ') || s.includes('2')) return 2;
    return 1;
  };

  const levelNum = getLevelNum(userLevel || 'І-й');

  let sessionUserRayon = '';
  try {
    const cached = localStorage.getItem("baza_current_session_user");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.rayon) {
        sessionUserRayon = parsed.rayon;
      }
    }
  } catch (_) {}

  const hasSpecificRayonLock = levelNum <= 3 && !!sessionUserRayon && sessionUserRayon !== 'ВСІ' && sessionUserRayon !== '';

  const [filterType, setFilterType] = useState<'active' | 'dismissed' | 'all'>('active');
  const [selectedRayonFilter, setSelectedRayonFilter] = useState<string>('');
  const [selectedOpikaFilter, setSelectedOpikaFilter] = useState<string>('');
  const [selectedSlujinnyaFilter, setSelectedSlujinnyaFilter] = useState<string>('');
  const [selectedVidviduvanistFilter, setSelectedVidviduvanistFilter] = useState<string>('');
  const [selectedPrysutnistFilter, setSelectedPrysutnistFilter] = useState<string>('');
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<'slujinnya' | 'vidviduvanist' | 'prysutnist' | null>(null);

  const lastTapRef = React.useRef<{ [key: number]: number }>({});

  useEffect(() => {
    if (selectedMemberId !== undefined && selectedMemberId !== null) {
      const timer = setTimeout(() => {
        const parent = document.querySelector('.spreadsheet-scroll-container');
        const row = document.getElementById(`member-row-${selectedMemberId}`);
        if (parent && row) {
          const thead = parent.querySelector('thead');
          const offset = thead ? thead.clientHeight : 22;
          parent.scrollTop = row.offsetTop - offset;
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [selectedMemberId]);
  const [showRayonWarning, setShowRayonWarning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRayonColumn, setShowRayonColumn] = useState(false);
  
  // Responsive screen size tracking
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDates, setEditingDates] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  // Dropdown cell editing state
  const [editingCell, setEditingCell] = useState<{ id: number; field: 'di_admin' | 's_slujinnya_spysok' | 'vidviduvanist' | 'prysutnist' | 'presviter' | 'rayon2_ukr' } | null>(null);

  // Active contact tooltip state for single-click display
  const [activeContactTooltipId, setActiveContactTooltipId] = useState<number | null>(null);

  // Active remark tooltip state for mouse hover or touch single-tap (Request 2)
  const [activeRemarkTooltipId, setActiveRemarkTooltipId] = useState<number | null>(null);

  // Editing state for the primitka (remarks/comments) cell
  const [editingRemarkId, setEditingRemarkId] = useState<number | null>(null);
  const [editingRemarkValue, setEditingRemarkValue] = useState<string>('');

  // Close tooltip on global click
  useEffect(() => {
    if (activeContactTooltipId === null) return;
    const handleGlobalClick = () => {
      setActiveContactTooltipId(null);
    };
    // Use timeout to avoid handling the current click that opened the tooltip
    const timer = setTimeout(() => {
      document.addEventListener('click', handleGlobalClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [activeContactTooltipId]);

  // Auto-close contact tooltip after 3 seconds of no mouse activity
  useEffect(() => {
    if (activeContactTooltipId === null) return;

    let timeoutId: any = setTimeout(() => {
      setActiveContactTooltipId(null);
    }, 3000);

    let enabled = false;
    const enableTimer = setTimeout(() => {
      enabled = true;
    }, 150);

    const handleMouseActivity = () => {
      if (!enabled) return;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    window.addEventListener('mousemove', handleMouseActivity);
    window.addEventListener('mousedown', handleMouseActivity);
    window.addEventListener('click', handleMouseActivity);
    window.addEventListener('wheel', handleMouseActivity);

    return () => {
      clearTimeout(enableTimer);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('mousemove', handleMouseActivity);
      window.removeEventListener('mousedown', handleMouseActivity);
      window.removeEventListener('click', handleMouseActivity);
      window.removeEventListener('wheel', handleMouseActivity);
    };
  }, [activeContactTooltipId]);

  // Close remark tooltip on global click
  useEffect(() => {
    if (activeRemarkTooltipId === null) return;
    const handleGlobalClick = () => {
      setActiveRemarkTooltipId(null);
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleGlobalClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [activeRemarkTooltipId]);

  // States for the contact dates multi-record modal
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactModalMember, setContactModalMember] = useState<Member | null>(null);
  const [modalDates, setModalDates] = useState<string[]>([]);
  const [newDateVal, setNewDateVal] = useState('');

  // Helper to parse contact dates safely
  const parseContactDates = (dKontaktiv?: string): string[] => {
    if (!dKontaktiv) return [];
    let tokens = dKontaktiv.split(/[\/,;\n]+/);
    let finalTokens: string[] = [];
    tokens.forEach(t => {
      const trimmed = t.trim();
      if (!trimmed) return;
      
      if (trimmed.includes(' ') && /\d{2}\.\d{2}\.\d{2}/.test(trimmed)) {
        const spaceParts = trimmed.split(/\s+/);
        spaceParts.forEach(sp => {
          const spt = sp.trim();
          if (spt) finalTokens.push(spt);
        });
      } else {
        finalTokens.push(trimmed);
      }
    });
    return finalTokens.filter(p => p && p !== '—' && p !== 'н/д');
  };

  // Helper to get latest contact date
  const getLatestContactDate = (dKontaktiv?: string): string => {
    if (!dKontaktiv) return '—';
    const trimmed = dKontaktiv.trim();
    if (!trimmed || trimmed === '—' || trimmed === 'н/д') return '—';

    let latestDate: Date | null = null;

    // 1. Check DD.MM.YYYY patterns
    const dmYRegex = /(\d{1,2})\.(\d{1,2})\.(\d{4})/g;
    let match;
    while ((match = dmYRegex.exec(trimmed)) !== null) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        if (!latestDate || parsedDate > latestDate) {
          latestDate = parsedDate;
        }
      }
    }

    // 2. Check YYYY-MM-DD patterns
    const yMdRegex = /(\d{4})-(\d{1,2})-(\d{1,2})/g;
    while ((match = yMdRegex.exec(trimmed)) !== null) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        if (!latestDate || parsedDate > latestDate) {
          latestDate = parsedDate;
        }
      }
    }

    // 3. Check DD.MM.YY patterns
    const dmY2Regex = /(\b\d{1,2})\.(\d{1,2})\.(\d{2})\b/g;
    while ((match = dmY2Regex.exec(trimmed)) !== null) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const yy = parseInt(match[3], 10);
      const year = yy + (yy < 50 ? 2000 : 1900);
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        if (!latestDate || parsedDate > latestDate) {
          latestDate = parsedDate;
        }
      }
    }

    if (latestDate) {
      const dd = String(latestDate.getDate()).padStart(2, '0');
      const mm = String(latestDate.getMonth() + 1).padStart(2, '0');
      const yyyy = latestDate.getFullYear();
      return `${dd}.${mm}.${yyyy}`;
    }

    const parts = trimmed.split(/[\s,;]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }

    return trimmed;
  };

  const handleOpenContactModal = (m: Member) => {
    setContactModalMember(m);
    const parsed = parseContactDates(m.d_kontaktiv);
    setModalDates(parsed);
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    setNewDateVal(`${dd}.${mm}.${yyyy}`);
    setIsContactModalOpen(true);
  };

  const handleAddNewDate = () => {
    const trimmed = newDateVal.trim();
    if (!trimmed) return;
    setModalDates(prev => [...prev, trimmed]);
    setNewDateVal('');
  };

  const handleSaveContactModal = async () => {
    if (!contactModalMember) return;
    const joined = modalDates
      .map(d => d.trim())
      .filter(Boolean)
      .join(' / ');
      
    const ok = await onUpdateMember(contactModalMember.id, { d_kontaktiv: joined });
    if (ok) {
      setIsContactModalOpen(false);
      setContactModalMember(null);
    }
  };

  const caregivers = useMemo(() => {
    return (lookups?.directories?.opika as string[]) || [
      "Бевзюк В.", "Бурчак Ю.", "Галюк Б.", "Дмитраш М.", "Євстратов О.", 
      "Ільницький О.", "Луцак М.", "Марунчак В.", "Мельничук В.", "Несен Ю.", 
      "Прохніцький Б.", "Решетило Р.", "Самелюк О.", "Скіцко І.", "Скриник М.", 
      "Стасінчук В.", "Стафіїв М.", "Стефурак Д.", "Факас О.", "Черняк Вал.", 
      "Черняк Вікт.", "Шпарман Ю.", "Черняк Вас."
    ];
  }, [lookups]);

  const fallbackMinistries = useMemo(() => [
    "Загальне служіння / Інше", "Старший пресвітер (пастор)", "Пресвітер (пастор)",
    "Диякон", "Хор / Співак", "Вчитель недільної школи", "Сестринське служіння",
    "Молодіжне служіння", "Опікунське служіння", "Бібліотекар", "Режисер / Драмгурт",
    "Господарське служіння", "Діловодство / Канцелярія", "Місіонерське служіння",
    "Музичне служіння / Інструменталіст", "Молитовна група", "Братська рада",
    "Скарбник / Касир", "Рада церкви", "Координатор служінь", "Християнська освіта",
    "Милосердя / Відвідування хворих", "Будівельний комітет", "Робота з аудіо-відео",
    "Група порядку / Упорядник", "Організатор заходів", "Звукооператор / Технік",
    "Інтернет-служіння", "Група прославлення", "Кухонне служіння", "Таборове служіння",
    "Проповідник", "Дитяче служіння", "Душпастирське консультування", "Регент хору / Диригент"
  ], []);

  const ministryOptions = useMemo(() => {
    const list = (lookups?.directories?.slujinnya as string[]) || fallbackMinistries;
    return list.filter(Boolean);
  }, [lookups, fallbackMinistries]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [customColorsMap, setCustomColorsMap] = useState<any>({});

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const res = await fetch('/api/custom-colors');
        if (res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length > 0) {
            setCustomColorsMap(data);
            localStorage.setItem('custom_colors_map', JSON.stringify(data));
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch colors from server in SpreadsheetView:", err);
      }
      try {
        const saved = localStorage.getItem('custom_colors_map');
        if (saved) setCustomColorsMap(JSON.parse(saved));
      } catch (_) {}
    };
    fetchColors();
  }, []);

  useEffect(() => {
    const checkAdmin = () => {
      setIsAdmin(localStorage.getItem("user_tg_id") === "969538290");
    };
    checkAdmin();
    const interval = setInterval(checkAdmin, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to calculate years in church
  const getYearsInChurch = (vstDate?: string) => {
    if (!vstDate) return 'н/д';
    try {
      const parts = vstDate.split('-');
      if (parts.length > 0) {
        const year = parseInt(parts[0], 10);
        if (!isNaN(year) && year > 1900) {
          return (new Date().getFullYear() - year).toString();
        }
      }
      const dotParts = vstDate.split('.');
      if (dotParts.length === 3) {
        const year = parseInt(dotParts[2], 10);
        if (!isNaN(year) && year > 1900) {
          return (new Date().getFullYear() - year).toString();
        }
      }
    } catch (e) {}
    return '—';
  };

  // Dynamically computed list of unique Rayons
  const rayonList = useMemo(() => {
    const list = (lookups?.directories?.rayon2 as string[]) || [];
    if (list.length > 0) return list.filter(Boolean);
    const unique = Array.from(new Set(members.map(m => m.rayon2_ukr).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b, 'uk-UA'));
  }, [lookups, members]);

  // Dynamically computed dependent list of unique caregivers (opikuvan) inside selected Rayon
  const opikaList = useMemo(() => {
    // Obtain the base caregivers (opika)
    const baseList = (lookups?.directories?.opika as string[]) || Array.from(new Set(members.map(m => m.presviter).filter(Boolean)));
    const allPresviters = Array.from(new Set(baseList)).filter(Boolean);

    // If no rayon is selected, show all caretakers
    if (!selectedRayonFilter) {
      return (allPresviters as string[]).sort((a, b) => a.localeCompare(b, 'uk-UA'));
    }

    const targetRayonNorm = selectedRayonFilter.trim().toUpperCase();

    // Leaders map representing direct district leaders:
    const leaderMap: Record<string, string> = {
      "БЕВЗЮК В": "АЕРОПОРТ",
      "СКІЦКО І": "КАСКАД",
      "ЧЕРНЯК ВАС": "ОБ'ЇЗНА",
      "ЧЕРНЯК ВАЛ": "ЦЕНТР"
    };

    const opikaBindings = lookups?.directories?.opika_bindings || [];

    return (allPresviters as string[]).filter(p => {
      const pStr = String(p || "");
      const pNorm = pStr.trim().toUpperCase().replace(/\./g, '').trim();
      
      // 1. Leader match
      if (leaderMap[pNorm]) {
        return leaderMap[pNorm] === targetRayonNorm;
      }

      // 1.5 Explicit bindings match
      if (opikaBindings.length > 0) {
        let hasAnyBindingForP = false;
        let isBoundToTargetRayon = false;

        for (const b of opikaBindings) {
          if (!b.name || !b.rayon) continue;
          const bNameNorm = b.name.trim().toLowerCase().replace(/[^a-zа-яёієїґ0-9]/g, '');
          const pNameNorm = pStr.trim().toLowerCase().replace(/[^a-zа-яёієїґ0-9]/g, '');
          if (bNameNorm === pNameNorm || bNameNorm.includes(pNameNorm) || pNameNorm.includes(bNameNorm)) {
            hasAnyBindingForP = true;
            if (b.rayon.trim().toUpperCase() === targetRayonNorm) {
              isBoundToTargetRayon = true;
            }
          }
        }

        if (hasAnyBindingForP) {
          return isBoundToTargetRayon;
        }
      }

      // 2. Member match to locate caretaker's district
      const foundMember = members.find(m => {
        if (m.id_vybuttya > 0) return false; // active members only
        if (!m.pib) return false;
        
        const mPibClean = m.pib.trim().toLowerCase();
        const pClean = pStr.trim().toLowerCase();
        
        if (mPibClean === pClean) return true;
        
        const mParts = mPibClean.split(/\s+/).filter(Boolean);
        const pParts = pClean.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
        
        if (mParts.length === 0 || pParts.length === 0) return false;
        
        if (mParts[0] !== pParts[0]) return false;
        if (pParts.length === 1) return true;
        
        const mFirst = mParts[1] || "";
        const pFirst = pParts[1] || "";
        if (mFirst && pFirst) {
          if (mFirst.startsWith(pFirst) || pFirst.startsWith(mFirst)) {
            return true;
          }
        }
        return false;
      });

      if (foundMember) {
        const memRayon = String(foundMember.rayon2_ukr || "").trim().toUpperCase();
        return memRayon === targetRayonNorm;
      }

      return false;
    }).sort((a, b) => a.localeCompare(b, 'uk-UA'));
  }, [lookups, members, selectedRayonFilter]);

  // Adjust selected caretaker filter if it's no longer present in the updated options
  useEffect(() => {
    if (selectedRayonFilter && selectedOpikaFilter) {
      if (!opikaList.includes(selectedOpikaFilter)) {
        setSelectedOpikaFilter('');
      }
    }
  }, [selectedRayonFilter, selectedOpikaFilter, opikaList]);

  // Pre-load default caretaker filter for matched level II (or below) caregiver user on mount
  useEffect(() => {
    try {
      const getLevelNum = (lvl: string): number => {
        if (!lvl) return 1;
        const s = lvl.toUpperCase();
        if (s.includes('IV') || s.includes('ІV') || s.includes('4')) return 4;
        if (s.includes('III') || s.includes('ІІІ') || s.includes('3')) return 3;
        if (s.includes('II') || s.includes('ІІ') || s.includes('2')) return 2;
        return 1;
      };
      const levelNum = getLevelNum(userLevel || 'І-й');

      const cached = localStorage.getItem("baza_current_session_user");
      if (!cached) return;
      const sessionUser = JSON.parse(cached);
      if (!sessionUser) return;

      // Active district lock for Level 3 and lower
      if (levelNum <= 3 && sessionUser.rayon && sessionUser.rayon !== "ВСІ" && sessionUser.rayon !== "") {
        setSelectedRayonFilter(sessionUser.rayon);
      }

      if (levelNum > 2) return;
      if (!sessionUser.user) return;
      
      const oList = lookups?.directories?.opika || [];
      const userName = sessionUser.user;

      const isMatchingCaregiverName = (caregiverName: string, usrName: string): boolean => {
        if (!caregiverName || !usrName) return false;
        const cn = caregiverName.toLowerCase().replace(/[^a-zа-яёієїґ0-9]/g, '').trim();
        const un = usrName.toLowerCase().replace(/[^a-zа-яёієїґ0-9]/g, '').trim();
        
        if (cn === un) return true;
        if (cn.includes(un) || un.includes(cn)) return true;
        
        const userWords = usrName.toLowerCase().match(/[a-zа-яёієїґ]+/g) || [];
        const caregiverWords = caregiverName.toLowerCase().match(/[a-zа-яёієїґ]+/g) || [];
        
        if (userWords.length > 0 && caregiverWords.length > 0) {
          if (userWords[0] === caregiverWords[0]) {
            if (userWords[1] && caregiverWords[1]) {
              if (userWords[1][0] === caregiverWords[1][0] || caregiverWords[1][0] === userWords[1][0]) {
                return true;
              }
            } else {
              return true;
            }
          }
        }
        return false;
      };

      const matched = oList.find((c: string) => isMatchingCaregiverName(c, userName));
      if (matched) {
        setSelectedOpikaFilter(matched);
        
        // Auto-select correct Rayon if bound
        const opikaBindings = lookups?.directories?.opika_bindings || [];
        const matchedBinding = opikaBindings.find((b: any) => b.name === matched);
        if (matchedBinding && matchedBinding.rayon) {
          setSelectedRayonFilter(matchedBinding.rayon);
        } else if (sessionUser.rayon && sessionUser.rayon !== "ВСІ" && sessionUser.rayon !== "") {
          setSelectedRayonFilter(sessionUser.rayon);
        }
      }
    } catch (_) {}
  }, [userLevel, lookups]);

  // Filter members list locally + sort alphabetically by PIB
  const filteredMembers = useMemo(() => {
    const getLevelNum = (lvl: string): number => {
      if (!lvl) return 1;
      const s = lvl.toUpperCase();
      if (s.includes('IV') || s.includes('ІV') || s.includes('4')) return 4;
      if (s.includes('III') || s.includes('ІІІ') || s.includes('3')) return 3;
      if (s.includes('II') || s.includes('ІІ') || s.includes('2')) return 2;
      return 1;
    };
    const levelNum = getLevelNum(userLevel || 'І-й');
    
    let matchedCaretakerName: string | null = null;
    try {
      const cached = localStorage.getItem("baza_current_session_user");
      if (cached) {
        const sessionUser = JSON.parse(cached);
        if (sessionUser && sessionUser.user) {
          const opikaList = lookups?.directories?.opika || [];
          const userName = sessionUser.user;
          
          const isMatchingCaregiverName = (caregiverName: string, usrName: string): boolean => {
            if (!caregiverName || !usrName) return false;
            const cn = caregiverName.toLowerCase().replace(/[^a-zа-яёієїґ0-9]/g, '').trim();
            const un = usrName.toLowerCase().replace(/[^a-zа-яёієїґ0-9]/g, '').trim();
            
            if (cn === un) return true;
            if (cn.includes(un) || un.includes(cn)) return true;
            
            const userWords = usrName.toLowerCase().match(/[a-zа-яёієїґ]+/g) || [];
            const caregiverWords = caregiverName.toLowerCase().match(/[a-zа-яёієїґ]+/g) || [];
            
            if (userWords.length > 0 && caregiverWords.length > 0) {
              if (userWords[0] === caregiverWords[0]) {
                if (userWords[1] && caregiverWords[1]) {
                  if (userWords[1][0] === caregiverWords[1][0] || caregiverWords[1][0] === userWords[1][0]) {
                    return true;
                  }
                } else {
                  return true;
                }
              }
            }
            return false;
          };

          matchedCaretakerName = opikaList.find((c: string) => isMatchingCaregiverName(c, userName)) || null;
        }
      }
    } catch (_) {}

    const effectiveOpikaFilter = (levelNum <= 2 && matchedCaretakerName) ? matchedCaretakerName : selectedOpikaFilter;

    const list = members.filter(m => {
      // 1. Status Filter (active / dismissed / all)
      if (filterType === 'active' && m.id_vybuttya > 0) return false;
      if (filterType === 'dismissed' && m.id_vybuttya === 0) return false;

      // 2. Rayon Filter
      if (selectedRayonFilter && m.rayon2_ukr !== selectedRayonFilter) return false;

      // 3. Opika Filter
      if (effectiveOpikaFilter && m.presviter !== effectiveOpikaFilter) return false;

      // 4. Search query filter (pib, address, phone, presviter)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const pibMatch = m.pib?.toLowerCase().includes(q);
        const phoneMatch = m.tel_mob?.toLowerCase().includes(q);
        const presvMatch = m.presviter?.toLowerCase().includes(q);
        const rayonMatch = m.rayon2_ukr?.toLowerCase().includes(q);
        const primitkaMatch = m.primitka?.toLowerCase().includes(q);
        const addressMatch = m.address?.toLowerCase().includes(q);
        
        return pibMatch || phoneMatch || presvMatch || rayonMatch || primitkaMatch || addressMatch;
      }

      // 5. Ministry Filter (col: СЛУЖІННЯ)
      if (selectedSlujinnyaFilter) {
        const val = m.s_slujinnya_spysok || '';
        const selectedList = val.split(/[,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
        if (!selectedList.includes(selectedSlujinnyaFilter.toUpperCase())) {
          return false;
        }
      }

      // 6. Attendance Filter (col: ВІДВІДУВАННЯ)
      if (selectedVidviduvanistFilter) {
        const val = m.vidviduvanist || '';
        if (val.trim().toUpperCase() !== selectedVidviduvanistFilter.trim().toUpperCase()) {
          return false;
        }
      }

      // 7. Absence Reason Filter (col: ПРИЧ. ВІДСУТНОСТІ)
      if (selectedPrysutnistFilter) {
        const val = m.prysutnist || '';
        if (val.trim().toUpperCase() !== selectedPrysutnistFilter.trim().toUpperCase()) {
          return false;
        }
      }

      return true;
    });

    // Sort alphabetically by full name (pib)
    return [...list].sort((a, b) => (a.pib || '').localeCompare(b.pib || '', 'uk-UA'));
  }, [members, filterType, selectedRayonFilter, selectedOpikaFilter, searchQuery, selectedSlujinnyaFilter, selectedVidviduvanistFilter, selectedPrysutnistFilter]);

  // Calculate dynamic ПІБ column width based on the longest record, optimized for mobile screens
  const pibColumnWidth = useMemo(() => {
    const isMobile = windowWidth < 640;
    if (!filteredMembers || filteredMembers.length === 0) return isMobile ? 95 : 180;
    
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        let maxWidth = 0;
        filteredMembers.forEach(m => {
          const parts = (m.pib || "").trim().split(/\s+/);
          if (parts.length <= 1) {
            ctx.font = isMobile ? "800 11px Inter, sans-serif" : "800 13.5px Inter, sans-serif";
            const w1 = ctx.measureText(m.pib || "").width;
            if (w1 > maxWidth) maxWidth = w1;
          } else {
            const lastName = parts[0];
            const givenName = parts.slice(1).join(" ");
            
            ctx.font = isMobile ? "800 11px Inter, sans-serif" : "800 13.5px Inter, sans-serif";
            const w1 = ctx.measureText(lastName).width;
            
            ctx.font = isMobile ? "600 9px Inter, sans-serif" : "600 10.5px Inter, sans-serif";
            const w2 = ctx.measureText(givenName).width;
            
            const cellMax = Math.max(w1, w2);
            if (cellMax > maxWidth) {
              maxWidth = cellMax;
            }
          }
        });
        // Scale/button/padding spacing buffer
        const finalWidth = maxWidth + (isMobile ? 20 : 36);
        const minWidth = isMobile ? 70 : 130;
        const calculatedWidth = Math.max(minWidth, Math.ceil(finalWidth));
        return isMobile ? Math.min(160, calculatedWidth) : Math.min(350, calculatedWidth);
      }
    } catch (e) {}

    let maxCharLen = 0;
    filteredMembers.forEach(m => {
      const parts = (m.pib || "").trim().split(/\s+/);
      const lastName = parts[0] || "";
      const givenName = parts.slice(1).join(" ") || "";
      const len = Math.max(lastName.length, givenName.length * 0.85);
      if (len > maxCharLen) maxCharLen = len;
    });
    const finalFallbackWidth = maxCharLen * (isMobile ? 6.5 : 8.5) + (isMobile ? 20 : 48);
    const minFallbackWidth = isMobile ? 85 : 155;
    const calculatedFallback = Math.max(minFallbackWidth, finalFallbackWidth);
    return isMobile ? Math.min(160, calculatedFallback) : Math.min(350, calculatedFallback);
  }, [filteredMembers, windowWidth]);

  const isMobile = windowWidth < 640;
  const indexColWidth = isMobile ? 22 : 40;

  const rayonColWidth = useMemo(() => {
    let maxCharLen = 0;
    filteredMembers.forEach(m => {
      const len = (m.rayon2_ukr || m.rayon || "").trim().length;
      if (len > maxCharLen) maxCharLen = len;
    });
    if (lookups?.directories?.rayon) {
      lookups.directories.rayon.forEach((r: any) => {
        const val = typeof r === 'string' ? r : (r?.name || "");
        const len = val.trim().length;
        if (len > maxCharLen) maxCharLen = len;
      });
    }
    const finalWidth = maxCharLen * (isMobile ? 5.5 : 6.8) + (isMobile ? 12 : 20);
    const minWidth = isMobile ? 50 : 80;
    const calculatedWidth = Math.max(minWidth, Math.ceil(finalWidth));
    return isMobile ? Math.min(110, calculatedWidth) : Math.min(180, calculatedWidth);
  }, [filteredMembers, lookups?.directories?.rayon, isMobile]);

  const pibLeftSticky = showRayonColumn ? (indexColWidth + rayonColWidth) : indexColWidth;

  const getCustomColor = (category: 'opika' | 'slujinnya' | 'vidviduvanist' | 'prysutnist', value: string) => {
    try {
      if (customColorsMap && customColorsMap[category] && customColorsMap[category][value]) {
        const hex = customColorsMap[category][value];
        if (hex && hex.startsWith('#') && hex.length === 7) {
          const r = parseInt(hex.substring(1, 3), 16);
          const g = parseInt(hex.substring(3, 5), 16);
          const b = parseInt(hex.substring(5, 7), 16);
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const text = luma > 150 ? '#0f172a' : '#ffffff';
          const r_b = Math.max(0, r - 30);
          const g_b = Math.max(0, g - 30);
          const b_b = Math.max(0, b - 30);
          const border = `#${r_b.toString(16).padStart(2, '0')}${g_b.toString(16).padStart(2, '0')}${b_b.toString(16).padStart(2, '0')}`;
          return { bg: hex, text, border };
        }
      }
    } catch (_) {}
    return null;
  };

  // Style lookups matching Google Sheets exactly
  const getOpikaStyle = (val: string) => {
    const norm = val.trim();
    const custom = getCustomColor('opika', norm);
    if (custom) return custom;
    if (norm === "Бевзюк В.") {
      return { bg: "#F7CB4D", text: "#2c2205", border: "#deae21" };
    }
    const creamShepherds = [
      "Галюк Б.", "Євстратов О.", "Луцак М.", "Мельничук В.", "Прохніцький Б.", 
      "Самелюк О.", "Скриник М.", "Стафіїв М.", "Факас О.", "Черняк Вікт.", "Шпарман Ю."
    ];
    if (creamShepherds.includes(norm)) {
      return { bg: "#FEF8E3", text: "#4a3c10", border: "#ebdcb1" };
    }
    return { bg: "#FFFFFF", text: "#334155", border: "#e2e8f0" };
  };

  const getSlujStyle = (val: string) => {
    const norm = val.trim();
    const custom = getCustomColor('slujinnya', norm);
    if (custom) return custom;
    if (norm === "SUN SHINE") {
      return { bg: "#8989EB", text: "#FFFFFF", border: "#7373e6" };
    }
    const lavenderList = [
      "АДМІНІСТРАТИВНЕ", "ГОСТИННОСТІ", "ДИЗАЙНЕРСЬКЕ", "ДИЯКОН", "Лідер ДГ", 
      "Молитовне", "СОЦІАЛЬНЕ", "ПЕРЕКЛАДЧІ", "Підтр. мал. церков", "Проповідники", 
      "Служіння Г/Н"
    ];
    if (lavenderList.includes(norm)) {
      return { bg: "#E8E7FC", text: "#2d1663", border: "#caccfa" };
    }
    return { bg: "#FFFFFF", text: "#0d341d", border: "#cbd5e1" };
  };

  const getVidvidStyle = (val: string) => {
    const norm = val.trim();
    const custom = getCustomColor('vidviduvanist', norm);
    if (custom) return custom;
    if (norm === "Постійно") return { bg: "#BDBDBD", text: "#111827", border: "#a6a6a6" };
    if (norm === "Рідко") return { bg: "#F3F3F3", text: "#374151", border: "#e5e5e5" };
    if (norm === "Періодично") return { bg: "#FFFFFF", text: "#1e3a1e", border: "#8fba94" };
    if (norm === "Ніколи") return { bg: "#FFFFFF", text: "#991b1b", border: "#dc2626" };
    return { bg: "#F9FAFB", text: "#4B5563", border: "#e5e7eb" };
  };

  const getPrysutStyle = (val: string) => {
    const norm = val.trim();
    const custom = getCustomColor('prysutnist', norm);
    if (custom) return custom;
    if (norm === "За кордоном") return { bg: "#26A69A", text: "#FFFFFF", border: "#1f8c81" };
    if (norm === "Хворий") return { bg: "#DDF2F0", text: "#004D40", border: "#b2e3dd" };
    return { bg: "#FFFFFF", text: "#1F2937", border: "#CBD5E1" };
  };

  const getCellStyling = (field: string, val: string) => {
    if (!val) return null;
    const v = val.trim();
    if (field === 'presviter') return getOpikaStyle(v);
    if (field === 'vidviduvanist') return getVidvidStyle(v);
    if (field === 'prysutnist') return getPrysutStyle(v);
    return null;
  };

  const cleanAddress = (address: string | undefined | null): string => {
    if (!address) return '';
    let str = String(address).trim();
    if (str === '—' || str === '-') return '—';

    // Remove oblast (province) if present
    str = str.replace(/[А-Яа-яЄєІіЇїҐґ']+\s*(?:обл|область)[а-я]*\.?/gi, '');

    // Remove rayon (district) if present
    str = str.replace(/[А-Яа-яЄєІіЇїҐґ']+(?:ськ)?[ийаяеіуоїі]?(?:\s+|-\s*)?(?:р-н|р\.н\.|р\sн|район)[а-я]*\.?/gi, '');
    str = str.replace(/(?:р-н|р\.н\.|р\sн|район)\s+[А-Яа-яЄєІіЇїҐґ']+/gi, '');

    // Remove Ivano-Frankivsk in all case variations, including prefix "м. "
    str = str.replace(/(?:м\.\s*)?Івано-Франківськ[а-я']*/gi, '');

    // Clean up punctuation and spacing
    str = str.replace(/\s+/g, ' ');
    str = str.replace(/,(\s*,)+/g, ',');
    str = str.replace(/\s*,\s*,/g, ',');
    str = str.replace(/^\s*[,.]\s*/, '');
    str = str.replace(/\s*[,.]\s*$/, '');
    str = str.trim();

    if (!str || /^[,\s.-]+$/.test(str)) {
      return '—';
    }
    return str;
  };

  const formatAddress = (address: string | undefined | null) => {
    const cleaned = cleanAddress(address);
    if (cleaned === '—') return '—';

    // Check if it starts with a locality prefix: "с. ", "смт ", "с-ще ", "м. "
    const isLocality = /^(с\.|смт|с-ще|м\.)/i.test(cleaned);
    if (isLocality) {
      const commaIdx = cleaned.indexOf(',');
      if (commaIdx !== -1) {
        const part1 = cleaned.substring(0, commaIdx).trim();
        const part2 = cleaned.substring(commaIdx + 1).trim();
        return (
          <div className="flex flex-col text-left leading-tight py-0.5">
            <span className="font-semibold text-[#0d341d] text-[11px] block">{part1}</span>
            <span className="text-[11px] text-zinc-500 font-medium block mt-0.5">{part2}</span>
          </div>
        );
      }
    }

    return <span className="font-medium text-[#0d341d] text-[11px]">{cleaned}</span>;
  };

  const formatPhoneNumber = (tel: string | undefined | null) => {
    if (!tel) return '—';
    const parts = tel.split(/[/,;]/).map(p => p.trim()).filter(Boolean);
    if (parts.length <= 1) {
      return tel;
    }
    return (
      <div className="flex flex-col items-center justify-center leading-tight py-0.5">
        {parts.map((p, i) => (
          <span key={i} className="block whitespace-nowrap">{p}</span>
        ))}
      </div>
    );
  };


  // Dropdown inline cell renderer (Request 5 & 6)
  const renderDropdownCell = (
    m: Member, 
    field: 'di_admin' | 's_slujinnya_spysok' | 'vidviduvanist' | 'prysutnist' | 'presviter' | 'rayon2_ukr',
    options: string[],
    fallbackText = '—',
    colorClasses = 'text-slate-600',
    extraTdProps: React.HTMLAttributes<HTMLTableCellElement> = {}
  ) => {
    const isEditingCell = editingCell?.id === m.id && editingCell?.field === field;
    const value = m[field] || '';

    const tdStyle = extraTdProps.style;
    const tdClassName = extraTdProps.className || "py-0.5 px-1 border-r border-slate-300 text-center cursor-pointer hover:bg-slate-200/50 min-h-[22px] transition-colors";

    if (isEditingCell) {
      return (
        <td 
          style={tdStyle}
          className={`${extraTdProps.className || ""} py-0.5 px-0.5 border-r border-slate-300 bg-white`}
          onClick={(e) => e.stopPropagation()}
        >
          <select
            value={value}
            onChange={async (e) => {
              const val = e.target.value;
              await onUpdateMember(m.id, { [field]: val });
              setEditingCell(null);
            }}
            onBlur={() => setEditingCell(null)}
            autoFocus
            className="w-full bg-white border border-emerald-500 rounded px-1 py-0.5 text-[10px] font-bold focus:outline-none"
          >
            <option value="">—</option>
            {options.map((opt) => {
              const style = getCellStyling(field, opt);
              return (
                <option 
                   key={opt} 
                   value={opt}
                   style={style ? { backgroundColor: style.bg, color: style.text } : undefined}
                >
                  {opt}
                </option>
              );
            })}
          </select>
        </td>
      );
    }

    let displayText = value || fallbackText;
    let customStyle = getCellStyling(field, value);
    let spanClassName = customStyle 
      ? "inline-block text-[10px] font-extrabold px-1.5 py-0.5 rounded border text-center truncate max-w-full font-sans tracking-tight shadow-[0_1px_1px_rgba(0,0,0,0.02)]" 
      : `inline-block text-[10px] font-bold ${colorClasses}`;
    let spanStyle = customStyle ? { 
      backgroundColor: customStyle.bg, 
      color: customStyle.text, 
      borderColor: customStyle.border 
    } : undefined;

    if (field === 'prysutnist') {
      const vidvidVal = (m.vidviduvanist || '').trim();
      if (vidvidVal === 'Постійно') {
        displayText = '';
        spanClassName = '';
        spanStyle = undefined;
      } else if (!value) {
        displayText = 'н/д';
        spanClassName = "text-slate-400 font-bold text-[10px]";
        spanStyle = undefined;
      }
    } else if (field === 'vidviduvanist') {
      if (displayText.trim() === 'н/д') {
        spanClassName = "text-slate-400 font-bold text-[10px]";
        spanStyle = undefined;
      }
    }

    let mappedRole = '';
    if (field === 'di_admin') mappedRole = 'ЗАВДАННЯ ДЛЯ АДМІН.';
    else if (field === 'presviter') mappedRole = 'ОПІКА';
    else if (field === 's_slujinnya_spysok') mappedRole = 'СЛУЖІННЯ';
    else if (field === 'vidviduvanist') mappedRole = 'ВІДВІДУВАННЯ';
    else if (field === 'prysutnist') mappedRole = 'ПРИЧ. ВІДСУТНОСТІ';
    else if (field === 'rayon2_ukr') mappedRole = 'РАЙОН';

    return (
      <td 
        style={tdStyle}
        onClick={(e) => { 
          e.stopPropagation(); 
          if (mappedRole) {
            const perm = getPermission(mappedRole);
            if (!perm.edit) {
              alert("Тимчасово вносити зміни не можна");
              return;
            }
          }
          setEditingCell({ id: m.id, field }); 
        }}
        className={`${tdClassName} text-center cursor-pointer hover:bg-slate-200/50 min-h-[28px] transition-colors`}
        title="Клацніть для швидкої зміни значення"
      >
        <span 
          style={spanStyle}
          className={spanClassName}
        >
          {displayText}
        </span>
      </td>
    );
  };

  // Start inline editing of contact dates
  const handleStartEdit = (m: Member) => {
    setEditingId(m.id);
    setEditingDates(m.d_kontaktiv || '');
  };

  // Save inline edit
  const handleSaveEdit = async (id: number) => {
    setSavingId(id);
    const ok = await onUpdateMember(id, { d_kontaktiv: editingDates });
    if (ok) {
      setEditingId(null);
    }
    setSavingId(null);
  };

  // Helper to format any date to dd.mm.yyyy format
  const formatDateToUA = (dateStr?: string) => {
    if (!dateStr) return '—';
    const trimmed = dateStr.trim();
    if (!trimmed || trimmed === '—' || trimmed === 'н/д') return '—';

    // If it's already in DD.MM.YYYY format
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // A pattern for standard ISO dates: YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [_, yyyy, mm, dd] = isoMatch;
      return `${dd}.${mm}.${yyyy}`;
    }

    // A pattern for YYYY.MM.DD
    const dotMatch = trimmed.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
    if (dotMatch) {
      const [_, yyyy, mm, dd] = dotMatch;
      return `${dd}.${mm}.${yyyy}`;
    }

    // Try parsing with Javascript Date if it contains a year-like number
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      if (yyyy > 1900 && yyyy < 2100) {
        return `${dd}.${mm}.${yyyy}`;
      }
    }

    return trimmed;
  };

  // Helper to determine background color for contact dates
  const getContactDateBgClass = (dKontaktiv?: string): string => {
    if (!dKontaktiv) return 'bg-[#ffcfd3]';
    const trimmed = dKontaktiv.trim();
    if (!trimmed || trimmed === '—' || trimmed === 'н/д') return 'bg-[#ffcfd3]';

    let latestDate: Date | null = null;

    // 1. Check DD.MM.YYYY patterns
    const dmYRegex = /(\d{1,2})\.(\d{1,2})\.(\d{4})/g;
    let match;
    while ((match = dmYRegex.exec(trimmed)) !== null) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        if (!latestDate || parsedDate > latestDate) {
          latestDate = parsedDate;
        }
      }
    }

    // 2. Check YYYY-MM-DD patterns
    const yMdRegex = /(\d{4})-(\d{1,2})-(\d{1,2})/g;
    while ((match = yMdRegex.exec(trimmed)) !== null) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        if (!latestDate || parsedDate > latestDate) {
          latestDate = parsedDate;
        }
      }
    }

    // 3. Check DD.MM.YY patterns
    if (!latestDate) {
      const dmY2Regex = /(\b\d{1,2})\.(\d{1,2})\.(\d{2})\b/g;
      while ((match = dmY2Regex.exec(trimmed)) !== null) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const yy = parseInt(match[3], 10);
        const year = yy + (yy < 50 ? 2000 : 1900);
        const parsedDate = new Date(year, month, day);
        if (!isNaN(parsedDate.getTime())) {
          if (!latestDate || parsedDate > latestDate) {
            latestDate = parsedDate;
          }
        }
      }
    }

    if (!latestDate) {
      return 'bg-[#ffcfd3]';
    }

    const today = new Date();
    if (latestDate > today) {
      return 'bg-[#69DD90]';
    }

    const yearsDiff = today.getFullYear() - latestDate.getFullYear();
    const monthsDiff = today.getMonth() - latestDate.getMonth() + (yearsDiff * 12);

    if (monthsDiff < 3) {
      return 'bg-[#69DD90]';
    }
    if (monthsDiff === 3) {
      if (today.getDate() <= latestDate.getDate()) {
        return 'bg-[#69DD90]';
      }
    }

    return 'bg-[#ffcfd3]';
  };

  // Render water baptism check badge (leaving ONLY the formatted date based on Request 3)
  const renderWaterBaptism = (dateStr?: string) => {
    return formatDateToUA(dateStr);
  };

  return (
    <div id="spreadsheet_container" className="flex-1 flex flex-col bg-transparent overflow-hidden min-h-0">
      
      {/* Search & Mode filters rail */}
      <div className="px-1.5 py-1 sm:px-3 sm:py-1.5 bg-[#2a4d5c] border-b border-[#1b3642] flex flex-row flex-wrap items-center justify-start gap-1.5 sm:gap-2 shrink-0 shadow-sm scale-interface-down-33 font-semibold pb-1 pb-1">
        {getPermission('Поле статусів').view && (
          <div className="flex items-center shrink-0">
            <select
              id="filter_status_select"
              title="Статус членства"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'active' | 'dismissed' | 'all')}
              className="rounded border border-[#1b3642] px-1.5 sm:px-3 text-[10px] sm:text-[11px] font-bold uppercase h-[24px] sm:h-[32px] bg-[#1a3843] text-white focus:outline-none focus:border-[#387d7a] cursor-pointer shadow-sm"
            >
              <option value="active" className="bg-[#1a3843]">Наявні</option>
              <option value="dismissed" className="bg-[#1a3843]">Вибулі</option>
              <option value="all" className="bg-[#1a3843]">Всі</option>
            </select>
          </div>
        )}

        {/* District Select (РАЙОН) */}
        {getPermission('Поле районів').view && !hasSpecificRayonLock && (
          <div className="flex items-center shrink-0">
            <select
              id="filter_rayon_select"
              title="Виберіть район"
              value={selectedRayonFilter}
              onChange={(e) => {
                const r = e.target.value;
                setSelectedRayonFilter(r);
                setSelectedOpikaFilter(''); // Reset dependent opika filter
              }}
              className={`rounded border px-1.5 sm:px-3 text-[10px] sm:text-[11px] font-bold uppercase h-[24px] sm:h-[32px] focus:outline-none focus:border-[#387d7a] cursor-pointer shadow-sm ${
                selectedRayonFilter 
                  ? "bg-[#387d7a] border-[#387d7a] text-white font-semibold" 
                  : "bg-[#1a3843] border-[#1b3642] text-slate-300 hover:text-white"
              }`}
            >
              <option value="" className="bg-[#1a3843]">РАЙОН (ВСІ)</option>
              {rayonList.map((r, i) => (
                <option key={i} value={r} className="bg-[#1a3843]">{r}</option>
              ))}
            </select>
          </div>
        )}

        {/* Caretaker Select (ОПІКА) - Dependent list */}
        {(levelNum === 2 || levelNum === 3) && (
          <div id="selected_rayon_badge" className="flex items-center shrink-0 bg-[#14323d] border border-[#2b5869] text-[#7cebc2] font-bold px-2 sm:px-3 text-[10px] sm:text-[11px] uppercase h-[24px] sm:h-[32px] rounded shadow-sm">
            <span>Район: {selectedRayonFilter || 'ВСІ'}</span>
          </div>
        )}

        {getPermission('Поле опіка').view && (
          <div className="flex items-center shrink-0 relative">
            <select
              id="filter_opika_select"
              title={!selectedRayonFilter ? "Спочатку виберіть район" : undefined}
              value={selectedOpikaFilter}
              onChange={(e) => {
                if (!selectedRayonFilter) {
                  setShowRayonWarning(true);
                  setTimeout(() => setShowRayonWarning(false), 2500);
                  return;
                }
                setSelectedOpikaFilter(e.target.value);
              }}
              onMouseDown={(e) => {
                if (!selectedRayonFilter) {
                  e.preventDefault();
                  setShowRayonWarning(true);
                  setTimeout(() => setShowRayonWarning(false), 2500);
                }
              }}
              className={`rounded border px-1.5 sm:px-3 text-[10px] sm:text-[11px] font-bold uppercase h-[24px] sm:h-[32px] focus:outline-none focus:border-[#387d7a] cursor-pointer shadow-sm ${
                selectedOpikaFilter 
                  ? "bg-[#387d7a] border-[#387d7a] text-white font-semibold" 
                  : "bg-[#1a3843] border-[#1b3642] text-slate-300 hover:text-white"
              } ${!selectedRayonFilter ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              <option value="" className="bg-[#1a3843]">ОПІКА (ВСІ)</option>
              {selectedRayonFilter && opikaList.map((o, i) => (
                <option key={i} value={o} className="bg-[#1a3843]">{o}</option>
              ))}
            </select>

            {showRayonWarning && (
              <div 
                id="rayon_warning_tooltip"
                className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap z-[999] animate-bounce pr-1.5 flex items-center space-x-1"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>Спочатку виберіть район</span>
              </div>
            )}
          </div>
        )}

        {/* Filters (Фільтри) */}
        {getPermission('Поле пошук').view && (
          <div className="relative w-24 xs:w-28 sm:w-40 h-[24px] sm:h-[32px] flex items-center">
            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 sm:left-2.5 sm:h-4 sm:w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Пошук"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full rounded border border-[#1b3642] pl-5 pr-5 py-0 text-[10px] sm:pl-8 sm:pr-6 sm:text-[11px] focus:border-[#387d7a] focus:outline-none bg-[#1a3843] text-slate-200 placeholder-slate-400 font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>
        )}

        {getPermission('Кнопка ВЛАСНІ СПИСКИ').view && (
          <button
            title="Перейти до генератора списків"
            onClick={onOpenGenerator}
            className="justify-center px-1.5 py-1 sm:px-3 h-[24px] sm:h-[32px] text-[8px] xs:text-[9.5px] sm:text-[11px] font-bold text-white transition-all bg-[#387d7a] hover:bg-[#2b5f5d] border border-[#1b3642] rounded shadow-sm tracking-widest uppercase flex items-center whitespace-nowrap cursor-pointer shrink-0"
          >
            ВЛАСНІ СПИСКИ
          </button>
        )}

        {getPermission('Кнопка РАЙОН У ТАБЛИЦІ').view && (
          <button
            id="toggle_rayon_col_btn"
            type="button"
            onClick={() => setShowRayonColumn(!showRayonColumn)}
            className={`justify-center flex items-center space-x-1 px-1.5 py-1 sm:px-3 sm:py-1.5 h-[24px] sm:h-[32px] rounded border text-[8px] xs:text-[9.5px] sm:text-[11px] font-bold uppercase transition-all select-none cursor-pointer outline-none shrink-0 ${
              showRayonColumn
                ? "bg-[#387d7a] border-[#387d7a] text-white shadow-sm font-semibold"
                : "bg-[#1a3843] border-[#1b3642] text-slate-300 hover:text-white"
            }`}
          >
            <span className="hidden sm:inline">Район у таблиці 🧭</span>
            <span className="sm:hidden">Район 🧭</span>
            <span className="opacity-85 text-[8px] sm:text-[10px] ml-0.5">
              {showRayonColumn ? "(Так)" : "(Ні)"}
            </span>
          </button>
        )}

      </div>

      {/* Spreadsheet grid scroll core */}
      <div className="flex-1 overflow-auto spreadsheet-scroll-container bg-[#cde0cf] min-h-[220px] max-h-full w-full border border-[#8fba94] rounded-md shadow-inner">
        <table className={`${userLevel === 'І-й' ? 'w-fit' : 'w-full'} border-collapse border border-[#8fba94] text-[11px] bg-[#cde0cf] select-text`}>
          <thead className="sticky top-0 z-[100] shadow-[0_1px_2px_rgba(0,0,0,0.1)] outline outline-1 outline-[#8fba94]">
            <tr style={{ height: '22px' }} className="bg-[#b2cfb6] text-[#0d341d]">
              <th 
                style={{ width: `${indexColWidth}px`, minWidth: `${indexColWidth}px`, maxWidth: `${indexColWidth}px`, left: '0px' }}
                className="py-0 px-0.5 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] sticky z-[120] text-[5.5px] sm:text-[6.5px] uppercase leading-none"
              >
                №
              </th>
              {showRayonColumn && (
                <th 
                  style={{ width: `${rayonColWidth}px`, minWidth: `${rayonColWidth}px`, maxWidth: `${rayonColWidth}px`, left: `${indexColWidth}px`, height: '22px' }}
                  className="py-0 px-1 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] sticky z-[115] shadow-[1px_0_3px_rgba(0,0,0,0.05)] truncate text-[5.5px] sm:text-[6.5px] uppercase leading-none"
                >
                  РАЙОН
                </th>
              )}
              <th 
                style={{ 
                  width: `${pibColumnWidth}px`, 
                  minWidth: `${pibColumnWidth}px`, 
                  maxWidth: `${pibColumnWidth}px`,
                  left: `${pibLeftSticky}px` 
                }}
                className="py-0 px-1 sm:px-1.5 border border-[#8fba94] text-left font-bold bg-[#b2cfb6] sticky z-[110] shadow-[2px_0_5px_rgba(0,0,0,0.05)] truncate text-[5.5px] sm:text-[6.5px] uppercase leading-none"
              >
                ПІБ
              </th>
               {getPermission('ДАТИ КОНТАКТІВ З ПРЕСВ.').view && <th className="py-0 px-0.5 border border-[#8fba94] text-center text-[5.5px] sm:text-[6.5px] font-bold bg-[#b2cfb6] uppercase leading-none">ДАТИ КОНТАКТІВ З ПРЕСВ.</th>}
               {getPermission('ПРИМІТКИ І ПОЯСНЕННЯ').view && <th className="py-0 px-1 border border-[#8fba94] text-left font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none">ПРИМІТКИ І ПОЯСНЕННЯ</th>}
               {getPermission('ЗАВДАННЯ ДЛЯ АДМІН.').view && <th className="py-0 px-1 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none">ЗАВДАННЯ<br/>ДЛЯ АДМІН.</th>}
               {getPermission('ОПІКА').view && <th className="py-0 px-1 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none">ОПІКА</th>}
               {getPermission('СЛУЖІННЯ').view && (
                  <th className="py-1 px-1 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none relative min-w-[75px]">
                    <div className="flex items-center justify-center space-x-1">
                      <span className="font-bold">СЛУЖІННЯ</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterDropdown(activeFilterDropdown === 'slujinnya' ? null : 'slujinnya');
                        }}
                        className={`p-0.5 rounded transition-all focus:outline-none cursor-pointer ${selectedSlujinnyaFilter ? 'bg-emerald-700 text-white p-1' : 'text-slate-600 hover:text-slate-900'}`}
                        title="Фільтр служіння"
                      >
                        <Filter size={8} className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                      </button>
                    </div>

                    {activeFilterDropdown === 'slujinnya' && (
                      <>
                        <div className="fixed inset-0 z-[120]" onClick={() => setActiveFilterDropdown(null)} />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-[130] bg-[#e4efe5] border border-[#8fba94] rounded-md shadow-xl p-1.5 min-w-[140px] max-w-[200px] font-sans normal-case text-left">
                          <div className="max-h-56 overflow-y-auto space-y-0.5 text-[8.5px] sm:text-[10px] text-emerald-950 font-semibold select-none">
                            <div 
                              onClick={() => { setSelectedSlujinnyaFilter(''); setActiveFilterDropdown(null); }}
                              className={`px-2 py-1 rounded cursor-pointer ${!selectedSlujinnyaFilter ? 'bg-[#387d7a] text-white' : 'hover:bg-[#d5e6d8]'}`}
                            >
                              (ВСІ ЧЛЕНИ)
                            </div>
                            {ministryOptions.map((opt) => (
                              <div 
                                key={opt}
                                onClick={() => { setSelectedSlujinnyaFilter(opt); setActiveFilterDropdown(null); }}
                                className={`px-2 py-1 rounded cursor-pointer truncate ${selectedSlujinnyaFilter === opt ? 'bg-[#387d7a] text-white' : 'hover:bg-[#d5e6d8]'}`}
                                title={opt}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </th>
                )}
                {getPermission('ВІДВІДУВАННЯ').view && (
                  <th className="py-1 px-1 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none relative min-w-[75px]">
                    <div className="flex items-center justify-center space-x-1">
                      <span className="font-bold">ВІДВІДУВАННЯ</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterDropdown(activeFilterDropdown === 'vidviduvanist' ? null : 'vidviduvanist');
                        }}
                        className={`p-0.5 rounded transition-all focus:outline-none cursor-pointer ${selectedVidviduvanistFilter ? 'bg-emerald-700 text-white p-1' : 'text-slate-600 hover:text-slate-900'}`}
                        title="Фільтр відвідування"
                      >
                        <Filter size={8} className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                      </button>
                    </div>

                    {activeFilterDropdown === 'vidviduvanist' && (
                      <>
                        <div className="fixed inset-0 z-[120]" onClick={() => setActiveFilterDropdown(null)} />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-[130] bg-[#e4efe5] border border-[#8fba94] rounded-md shadow-xl p-1.5 min-w-[130px] max-w-[180px] font-sans normal-case text-left">
                          <div className="max-h-56 overflow-y-auto space-y-0.5 text-[8.5px] sm:text-[10px] text-emerald-950 font-semibold select-none">
                            <div 
                              onClick={() => { setSelectedVidviduvanistFilter(''); setActiveFilterDropdown(null); }}
                              className={`px-2 py-1 rounded cursor-pointer ${!selectedVidviduvanistFilter ? 'bg-[#387d7a] text-white' : 'hover:bg-[#d5e6d8]'}`}
                            >
                              (ВСІ ЧЛЕНИ)
                            </div>
                            {Array.isArray(lookups?.directories?.vidviduvanist) && 
                              lookups.directories.vidviduvanist.map((opt: string) => (
                                <div 
                                  key={opt}
                                  onClick={() => { setSelectedVidviduvanistFilter(opt); setActiveFilterDropdown(null); }}
                                  className={`px-2 py-1 rounded cursor-pointer truncate ${selectedVidviduvanistFilter === opt ? 'bg-[#387d7a] text-white' : 'hover:bg-[#d5e6d8]'}`}
                                  title={opt}
                                >
                                  {opt}
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      </>
                    )}
                  </th>
                )}
                {getPermission('ПРИЧ. ВІДСУТНОСТІ').view && (
                  <th className="py-1 px-1 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none relative min-w-[75px]" title="ПРИЧИНА ВІДСУТНОСТІ">
                    <div className="flex items-center justify-center space-x-1">
                      <span className="font-bold">ПРИЧ. ВІДСУТНОСТІ</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilterDropdown(activeFilterDropdown === 'prysutnist' ? null : 'prysutnist');
                        }}
                        className={`p-0.5 rounded transition-all focus:outline-none cursor-pointer ${selectedPrysutnistFilter ? 'bg-emerald-700 text-white p-1' : 'text-slate-600 hover:text-slate-900'}`}
                        title="Фільтр причини відсутності"
                      >
                        <Filter size={8} className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                      </button>
                    </div>

                    {activeFilterDropdown === 'prysutnist' && (
                      <>
                        <div className="fixed inset-0 z-[120]" onClick={() => setActiveFilterDropdown(null)} />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-[130] bg-[#e4efe5] border border-[#8fba94] rounded-md shadow-xl p-1.5 min-w-[130px] max-w-[180px] font-sans normal-case text-left">
                          <div className="max-h-56 overflow-y-auto space-y-0.5 text-[8.5px] sm:text-[10px] text-emerald-950 font-semibold select-none">
                            <div 
                              onClick={() => { setSelectedPrysutnistFilter(''); setActiveFilterDropdown(null); }}
                              className={`px-2 py-1 rounded cursor-pointer ${!selectedPrysutnistFilter ? 'bg-[#387d7a] text-white' : 'hover:bg-[#d5e6d8]'}`}
                            >
                              (ВСІ ЧЛЕНИ)
                            </div>
                            {Array.isArray(lookups?.directories?.prysutnist) && 
                              lookups.directories.prysutnist.map((opt: string) => (
                                <div 
                                  key={opt}
                                  onClick={() => { setSelectedPrysutnistFilter(opt); setActiveFilterDropdown(null); }}
                                  className={`px-2 py-1 rounded cursor-pointer truncate ${selectedPrysutnistFilter === opt ? 'bg-[#387d7a] text-white' : 'hover:bg-[#d5e6d8]'}`}
                                  title={opt}
                                >
                                  {opt}
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      </>
                    )}
                  </th>
                )}
               {getPermission('ВІК').view && <th className="py-0 px-0.5 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none">ВІК</th>}
               {getPermission('АДРЕСА').view && <th className="py-0 px-1 border border-[#8fba94] text-left font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none">АДРЕСА</th>}
               {getPermission('ТЕЛЕФОН').view && <th className="py-0 px-1 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none">ТЕЛЕФОН</th>}
               {getPermission('ДАТА НАРОДЖ.').view && <th className="py-0 px-0.5 border border-[#8fba94] text-center text-[5.5px] sm:text-[6.5px] font-bold bg-[#b2cfb6] uppercase leading-none">ДАТА НАРОДЖ.</th>}
               {getPermission('ОС-ТА').view && <th className="py-0 px-1 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none">ОС-ТА</th>}
               {getPermission('ХР. С.Д.').view && <th className="py-0 px-0.5 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none">ХР. С.Д.</th>}
               {getPermission('СІМ. СТАН').view && <th className="py-0 px-1 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none">СІМ. СТАН</th>}
               {getPermission('СОЦ. СТАН').view && <th className="py-0 px-0.5 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none">СОЦ.<br/>СТАН</th>}
               {getPermission('В.Х.').view && <th className="py-0 px-0.5 border border-[#8fba94] text-center text-[5.5px] sm:text-[6.5px] font-bold bg-[#b2cfb6] uppercase leading-none">В.Х.</th>}
               {getPermission('В_ЦЕРКВІ_З').view && <th className="py-0 px-0.5 border border-[#8fba94] text-center text-[5.5px] sm:text-[6.5px] font-bold bg-[#b2cfb6] w-[86px] min-w-[86px] max-w-[86px] leading-none uppercase">В_ЦЕРКВІ_З</th>}
               {getPermission('РОКІВ В Ц.').view && <th className="py-0 px-0.5 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] text-[5.5px] sm:text-[6.5px] uppercase leading-none w-10 min-w-[40px] max-w-[40px]">РОКІВ В Ц.</th>}
            </tr>
          </thead>
          <tbody className="font-medium text-[#113a21]">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((m, idx) => {
                const isEditing = editingId === m.id;
                const yearsInChurch = getYearsInChurch(m.d_vstupu);

                return (
                  <tr 
                    key={m.id} 
                    id={`member-row-${m.id}`}
                    className="border-b border-[#8fba94] even:bg-[#d5e6d8] odd:bg-[#e4efe5] hover:bg-[#a8c7ab] cursor-pointer group transition-colors"
                  >
                    {/* Sticky index cell */}
                    <td 
                      style={{ width: `${indexColWidth}px`, minWidth: `${indexColWidth}px`, maxWidth: `${indexColWidth}px`, left: '0px' }}
                      className="py-0.5 px-0.5 border border-[#8fba94] text-center bg-[#b2cfb6] group-hover:bg-[#a8c7ab] font-bold sticky z-20 shadow-[1px_0_2px_rgba(0,0,0,0.05)] text-slate-800 text-[10px]"
                    >
                      {idx + 1}
                    </td>

                    {/* Sticky РАЙОН cell if shown */}
                    {showRayonColumn && renderDropdownCell(
                      m,
                      'rayon2_ukr',
                      lookups?.directories?.rayon2 || [],
                      '—',
                      'text-[#0a2f16] font-extrabold text-[10px]',
                      {
                        style: { width: `${rayonColWidth}px`, minWidth: `${rayonColWidth}px`, maxWidth: `${rayonColWidth}px`, left: `${indexColWidth}px` },
                        className: "py-0.5 px-1 border border-[#8fba94] text-center bg-[#c3dfc7]/80 group-hover:bg-[#a8c7ab] sticky z-15 shadow-[1px_0_3px_rgba(0,0,0,0.05)] truncate text-[10px]"
                      }
                    )}

                    {/* Sticky ПІБ cell */}
                    <td 
                      style={{ 
                        width: `${pibColumnWidth}px`, 
                        minWidth: `${pibColumnWidth}px`, 
                        maxWidth: `${pibColumnWidth}px`,
                        left: `${pibLeftSticky}px`
                      }}
                      className={`py-0.5 px-1 sm:px-1.5 border border-[#8fba94] font-bold text-[#0d341d] group-odd:bg-[#e4efe5] group-even:bg-[#d5e6d8] group-hover:bg-[#a8c7ab] sticky z-[30] shadow-[2px_0_5px_rgba(0,0,0,0.05)] overflow-hidden ${getPermission('АНКЕТИ').view ? 'cursor-pointer select-none' : ''}`}
                      onClick={(e) => {
                        if (!getPermission('АНКЕТИ').view) return;
                        const now = Date.now();
                        const lastTap = lastTapRef.current[m.id] || 0;
                        if (now - lastTap < 350) {
                          e.stopPropagation();
                          onOpenProfile(m.id);
                        }
                        lastTapRef.current[m.id] = now;
                      }}
                    >
                      <div className="flex items-center justify-between space-x-1 relative h-full min-h-[24px]">
                        <div className="flex items-center space-x-1 truncate min-w-0 flex-1">
                          {m.id_vybuttya > 0 && (
                            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 shrink-0" title="Знято з обліку" />
                          )}
                          {(() => {
                            const parts = (m.pib || "").trim().split(/\s+/);
                            if (parts.length <= 1) {
                              return <span className="truncate text-xs sm:text-[13.5px] font-black text-[#052e16]">{m.pib}</span>;
                            }
                            const lastName = parts[0];
                            const givenName = parts.slice(1).join(" ");
                            return (
                              <div className="flex flex-col min-w-0 leading-tight">
                                <span className="text-xs sm:text-[13.5px] font-black text-[#052e16] truncate">{lastName}</span>
                                <span className="text-[10px] font-medium text-slate-600 truncate">{givenName}</span>
                              </div>
                            );
                          })()}
                        </div>
                        {getPermission('АНКЕТИ').view && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenProfile(m.id);
                            }}
                            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[#002f13] px-1 py-0.5 rounded-sm text-[8.5px] font-black uppercase tracking-wider items-center space-x-0.5 shadow-xs border border-[#00d65c]"
                            style={{ backgroundColor: '#00ff6e' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00e05f'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00ff6e'}
                            title="Перейти до анкет"
                          >
                            <FileText className="h-2 w-2 shrink-0 text-[#002f13]" />
                            <span>Анкета</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Custom Editable Contact Dates (Request 2 & 4) */}
                    {getPermission('ДАТИ КОНТАКТІВ З ПРЕСВ.').view && (() => {
                      const bgClass = getContactDateBgClass(m.d_kontaktiv);
                      const isSalat = bgClass === 'bg-[#69DD90]';
                      const textClass = isSalat ? 'text-[#06331a]' : 'text-rose-950';
                      const latestDateUA = getLatestContactDate(m.d_kontaktiv);
                      const allDates = parseContactDates(m.d_kontaktiv);
                      const isTooltipOpen = activeContactTooltipId === m.id;
                      return (
                      <td 
                          className={`py-0.5 px-0.5 border-r border-[#8fba94] text-center relative cursor-pointer select-none hover:brightness-95 transition-all ${bgClass}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveContactTooltipId(isTooltipOpen ? null : m.id);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (!getPermission('ДАТИ КОНТАКТІВ З ПРЕСВ.').edit) {
                              alert("Тимчасово вносити зміни не можна");
                              return;
                            }
                            handleOpenContactModal(m);
                          }}
                          title="Клацніть для перегляду всіх дат; Двічі клацніть для редагування"
                        >
                          <div className="flex items-center justify-between min-h-6">
                            <span className={`font-extrabold font-mono text-[10px] mx-auto ${textClass}`}>
                              {latestDateUA}
                            </span>
                          </div>

                          {isTooltipOpen && (
                            <div 
                              className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-max min-w-[85px] max-w-[125px] bg-[#232323] text-white border border-[#444444] rounded shadow-md p-1.5 z-[250] text-center font-sans animate-in fade-in duration-75"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#232323]" />
                              {allDates.length > 0 ? (
                                <div className="space-y-0.5 max-h-24 overflow-y-auto custom-scrollbar text-[11px] leading-tight font-medium">
                                  {allDates.map((dateStr, idx) => (
                                    <div key={idx} className="py-0.5 border-b border-[#444444]/40 last:border-0">
                                      {dateStr}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-zinc-400 italic py-0.5">Немає дат</p>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })()}

                    {/* Remarks with Popup Tooltip on Hover or Tap (Request 2) */}
                    {getPermission('ПРИМІТКИ І ПОЯСНЕННЯ').view ? (
                      editingRemarkId === m.id ? (
                        <td 
                          className="py-0.5 px-0.5 border-r border-[#8fba94] bg-white w-36 min-w-[144px] max-w-[144px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingRemarkValue}
                            onChange={(e) => setEditingRemarkValue(e.target.value)}
                            onBlur={async () => {
                              const originalVal = m.primitka || '';
                              if (editingRemarkValue !== originalVal) {
                                await onUpdateMember(m.id, { primitka: editingRemarkValue });
                              }
                              setEditingRemarkId(null);
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                const originalVal = m.primitka || '';
                                if (editingRemarkValue !== originalVal) {
                                  await onUpdateMember(m.id, { primitka: editingRemarkValue });
                                }
                                setEditingRemarkId(null);
                              } else if (e.key === 'Escape') {
                                setEditingRemarkId(null);
                              }
                            }}
                            autoFocus
                            className="w-full bg-slate-50 border border-emerald-500 rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                      ) : (
                        <td 
                          className="py-0.5 px-1 border-r border-[#8fba94] bg-[#fef9c3]/40 text-[#1e3e29] group-hover:bg-[#fef08a]/60 italic font-semibold text-[10px] relative cursor-pointer overflow-visible w-36 min-w-[144px] max-w-[144px]"
                          onMouseEnter={(e) => {
                            const div = e.currentTarget.querySelector(".remark-text-div") as HTMLDivElement;
                            if (div && div.scrollWidth > div.clientWidth) {
                              setActiveRemarkTooltipId(m.id);
                            }
                          }}
                          onMouseLeave={() => {
                            setActiveRemarkTooltipId(null);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const div = e.currentTarget.querySelector(".remark-text-div") as HTMLDivElement;
                            if (div && div.scrollWidth > div.clientWidth) {
                              setActiveRemarkTooltipId(activeRemarkTooltipId === m.id ? null : m.id);
                            }
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (!getPermission('ПРИМІТКИ І ПОЯСНЕННЯ').edit) {
                              alert("Тимчасово вносити зміни не можна");
                              return;
                            }
                            setEditingRemarkId(m.id);
                            setEditingRemarkValue(m.primitka || '');
                            setActiveRemarkTooltipId(null);
                          }}
                        >
                          <div className="remark-text-div truncate max-w-[128px]">
                            {m.primitka || '—'}
                          </div>
                          {activeRemarkTooltipId === m.id && m.primitka && (
                            <div 
                              className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-72 sm:w-96 bg-emerald-950 text-white border border-emerald-700 rounded-lg shadow-xl p-3 z-[300] text-left font-sans text-xs not-italic font-semibold whitespace-normal normal-case leading-relaxed animate-in fade-in zoom-in-95 duration-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-emerald-950" />
                              {m.primitka}
                            </div>
                          )}
                        </td>
                      )
                    ) : null}

                    {/* "Дії" (di_admin) Inline Dropdown (Request 5) */}
                    {getPermission('ЗАВДАННЯ ДЛЯ АДМІН.').view && renderDropdownCell(m, 'di_admin', lookups?.directories?.di_admin || [], '—', 'text-amber-800 bg-amber-50/50 rounded px-1')}

                    {/* Shepherd (Oversight/Opika) */}
                    {getPermission('ОПІКА').view && renderDropdownCell(m, 'presviter', caregivers, '—', 'text-slate-700 bg-emerald-50/40 rounded px-1')}

                    {/* "Служіння" Column (Ministry) with multiple choice popup */}
                    {getPermission('СЛУЖІННЯ').view && (
                      <td 
                        className="py-0.5 px-1 border-r border-[#8fba94] text-center w-48 min-w-[192px] max-w-[192px] relative cursor-pointer hover:bg-emerald-800/10 transition-colors select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!getPermission('СЛУЖІННЯ').edit) {
                            alert("Тимчасово вносити зміни не можна");
                            return;
                          }
                          setEditingCell({ id: m.id, field: 's_slujinnya_spysok' });
                        }}
                        title="Клацніть для швидкої зміни служінь"
                      >
                        {editingCell?.id === m.id && editingCell?.field === 's_slujinnya_spysok' && (
                          <>
                            {/* Invisible click backdrop to dismiss edit mode on outer-click */}
                            <div 
                              className="fixed inset-0 z-[240] cursor-default bg-transparent" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCell(null);
                              }}
                            />
                            <div 
                              className="absolute right-0 top-full mt-1 bg-white border-2 border-emerald-600 rounded-lg shadow-xl p-3 z-[250] w-64 text-slate-800"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                                <span className="text-[11px] font-extrabold text-emerald-800">Швидка зміна служінь</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setEditingCell(null); }}
                                  className="text-slate-450 hover:text-rose-600 font-black text-xs px-1 hover:bg-slate-100 rounded leading-none transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="max-h-52 overflow-y-auto text-left space-y-1.5 pr-1 font-sans">
                                {ministryOptions.map((opt) => {
                                  const selectedList = m.s_slujinnya_spysok 
                                    ? m.s_slujinnya_spysok.split(/[,;]+/).map(s => s.trim()).filter(Boolean) 
                                    : [];
                                  const isChecked = selectedList.includes(opt);
                                  const slStyle = getSlujStyle(opt);
                                  return (
                                    <label 
                                      key={opt} 
                                      className="flex items-center gap-2 py-1 px-1.5 cursor-pointer rounded hover:bg-slate-100/80 transition-colors select-none text-[10.5px] font-bold text-slate-700"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={async (e) => {
                                          let newList;
                                          if (e.target.checked) {
                                            newList = [...selectedList, opt];
                                          } else {
                                            newList = selectedList.filter(item => item !== opt);
                                          }
                                          const sortedNewList = ministryOptions.filter(o => newList.includes(o));
                                          const valString = sortedNewList.join(', ');
                                          await onUpdateMember(m.id, { s_slujinnya_spysok: valString });
                                        }}
                                        className="h-3 w-3 rounded border-slate-350 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                      />
                                      <span 
                                        style={{
                                          backgroundColor: slStyle.bg,
                                          color: slStyle.text,
                                          border: `1px solid ${slStyle.border}`,
                                          padding: '1px 4px',
                                          borderRadius: '3px'
                                        }}
                                        className={`text-[11px] sm:text-xs truncate max-w-[160px] ${isChecked ? 'font-black shadow-sm' : 'font-semibold opacity-85'}`}
                                        title={opt}
                                      >
                                        {opt}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Display of selected */}
                        {(() => {
                          const selectedList = m.s_slujinnya_spysok 
                            ? m.s_slujinnya_spysok.split(/[,;]+/).map(s => s.trim()).filter(Boolean) 
                            : [];
                          return selectedList.length > 0 ? (
                            <div className="grid grid-cols-2 gap-1 w-full p-0.5">
                              {selectedList.map(name => {
                                const style = getSlujStyle(name);
                                return (
                                  <span 
                                    key={name} 
                                    style={{
                                      backgroundColor: style.bg,
                                      color: style.text,
                                      borderColor: style.border
                                    }}
                                    className="border px-1 py-0.5 rounded text-[10px] truncate font-extrabold block text-center shadow-[0_1px_1px_rgba(0,0,0,0.02)]" 
                                    title={name}
                                  >
                                    {name}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-bold text-[10px]">немає</span>
                          );
                        })()}
                      </td>
                    )}

                    {/* "Відвідуваність" Inline Dropdown (Request 6) */}
                    {getPermission('ВІДВІДУВАННЯ').view && renderDropdownCell(m, 'vidviduvanist', lookups?.directories?.vidviduvanist || [], 'н/д', 'text-slate-700 bg-slate-100/70 rounded-full px-1.5 py-0.5')}

                    {/* "Прич. відсутності" Inline Dropdown */}
                    {getPermission('ПРИЧ. ВІДСУТНОСТІ').view && renderDropdownCell(m, 'prysutnist', lookups?.directories?.prysutnist || [], 'н/д', 'text-blue-700 bg-blue-50 rounded-full px-1.5 py-0.5')}

                    {/* Demographics */}
                    {getPermission('ВІК').view && (
                      <td className="py-0.5 px-1 border-r border-slate-300 text-center font-semibold text-[10px] font-mono">
                        {m.vik_rokiv1 ? `${m.vik_rokiv1}` : '—'}
                      </td>
                    )}

                    {/* Address (Request 1) */}
                    {getPermission('АДРЕСА').view && (
                      <td className="py-0.5 px-1.5 border-r border-slate-300 bg-[#edf7f0]/45 whitespace-nowrap text-[11px] align-middle" title={m.address}>
                        {formatAddress(m.address)}
                      </td>
                    )}

                    {getPermission('ТЕЛЕФОН').view && (
                      <td className="py-0.5 px-1 border-r border-slate-300 text-center font-mono font-bold text-[10px] text-slate-700">
                        {formatPhoneNumber(m.tel_mob)}
                      </td>
                    )}

                    {/* Dates birth & Edu */}
                    {getPermission('ДАТА НАРОДЖ.').view && (
                      <td className="py-0.5 px-0.5 border-r border-slate-300 text-center font-mono text-slate-600 text-[10px] truncate bg-slate-50/10">
                        {formatDateToUA(m.d_narodjennya)}
                      </td>
                    )}

                    {getPermission('ОС-ТА').view && (
                      <td className="py-0.5 px-1 border-r border-slate-300 text-center text-slate-600 text-[10px]">
                        {m.s_osvita_ukr || '—'}
                      </td>
                    )}

                    {/* Dynamic spiritual parameters */}
                    {getPermission('ХР. С.Д.').view && (
                      <td 
                        className="py-0.5 px-0.5 border-r border-[#8fba94] text-center cursor-pointer select-none hover:bg-slate-200/50 transition-colors text-slate-600 text-[10px]"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await onUpdateMember(m.id, { hsd: !m.hsd });
                        }}
                        title="Клацніть для швидкого перемикання статусу Хр. С.Д. (так/ні)"
                      >
                        {m.hsd ? "так" : "ні"}
                      </td>
                    )}

                    {getPermission('СІМ. СТАН').view && (
                      <td className="py-0.5 px-1 border-r border-slate-300 text-center text-slate-600 text-[10px] truncate">
                        {m.s_simeyniy_ukr ? (
                          /^неодружен(ий|а|і|о)?$/i.test(String(m.s_simeyniy_ukr).trim()) ? 'неодр.' : m.s_simeyniy_ukr
                        ) : '—'}
                      </td>
                    )}

                    {getPermission('СОЦ. СТАН').view && (
                      <td 
                        className="py-0.5 px-0.5 border-r border-slate-300 text-center text-slate-650 text-[10px] truncate"
                        title={m.s_socialniy_ukr || '—'}
                      >
                        {m.s_socialniy_ukr || '—'}
                      </td>
                    )}

                    {/* Baptisms dates & years inside church */}
                    {getPermission('В.Х.').view && (
                      <td className="py-0.5 px-0.5 border-r border-slate-300 text-center font-mono text-slate-600 text-[10px] truncate bg-slate-50/10">
                        {renderWaterBaptism(m.d_vodnogo)}
                      </td>
                    )}
                    {getPermission('В_ЦЕРКВІ_З').view && (
                      <td className="py-0.5 px-0.5 border-r border-slate-300 text-center font-mono text-slate-600 text-[10px] truncate bg-slate-50/10">
                        {formatDateToUA(m.d_vstupu)}
                      </td>
                    )}
                    {getPermission('РОКІВ В Ц.').view && (
                      <td className="py-0.5 px-0.5 border-r border-slate-300 text-center font-bold text-[10px] font-mono text-[#1e4620] bg-[#c3dfc7] group-hover:bg-[#9dbb9f] w-10 min-w-[40px] max-w-[40px]">
                        {yearsInChurch}
                      </td>
                    )}

                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={20} className="py-8 text-center text-slate-400 font-bold bg-white italic">
                  Жодних записів не знайдено відповідно до умов вашої фільтрації.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Contact Dates Modal */}
      {isContactModalOpen && contactModalMember && (
        <div className="fixed inset-0 bg-[#071318]/70 backdrop-blur-xs z-[300] flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl border border-[#b2dad3]/40 max-w-[325px] w-full overflow-hidden flex flex-col scale-in duration-150">
            {/* Header */}
            <div className="bg-[#113a31] px-4 py-2.5 text-white flex justify-between items-center shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#a9e2d7]">Контакти з пресвітерами</span>
              <button 
                onClick={() => {
                  setIsContactModalOpen(false);
                  setContactModalMember(null);
                }}
                className="text-white/60 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors"
                title="Закрити вікно"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Member name */}
            <div className="bg-[#f0f8f6] border-b border-[#ddeee9] px-4 py-2 shrink-0">
              <span className="text-[8px] uppercase tracking-wider text-[#2d6e60] font-bold block">Член церкви</span>
              <h3 className="text-xs font-bold text-[#0d2a24] tracking-tight truncate">{contactModalMember.pib}</h3>
            </div>

            {/* Existing Contact Dates */}
            <div className="px-4 py-2.5 flex-1 overflow-y-auto max-h-[145px] space-y-1.5 bg-white">
              <span className="text-[8.5px] uppercase tracking-wider text-slate-400 font-bold block">Усі збережені дати:</span>
              
              {modalDates.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-1">Записів про контакти ще немає.</p>
              ) : (
                <div className="space-y-1">
                  {modalDates.map((date, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5">
                      <div className="text-[9px] font-bold text-[#5fa396] font-mono w-4">#{idx + 1}</div>
                      <input
                        type="text"
                        value={date}
                        onChange={(e) => {
                          const updated = [...modalDates];
                          updated[idx] = e.target.value;
                          setModalDates(updated);
                        }}
                        className="flex-1 bg-white border border-[#d3eae5] hover:border-[#a8ddd1] rounded-md px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 focus:border-[#113a31] focus:ring-1 focus:ring-[#113a31]/10 focus:outline-none transition-all"
                        placeholder="ДД.ММ.РРРР"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = modalDates.filter((_, i) => i !== idx);
                          setModalDates(updated);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 rounded transition-colors font-bold text-[10px]"
                        title="Видалити"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* New Entry (at the bottom) */}
            <div className="border-t border-[#e8f5f2] px-4 py-2.5 bg-[#fafffe] shrink-0">
              <span className="text-[8.5px] uppercase tracking-wider text-[#1e584f] font-bold block mb-1">Створити новий запис:</span>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={newDateVal}
                  onChange={(e) => setNewDateVal(e.target.value)}
                  className="flex-1 bg-white border border-[#cedfdb] hover:border-[#a8ddd1] rounded-md px-2.5 py-1 text-[11px] font-mono font-bold text-slate-700 focus:border-[#113a31] focus:ring-1 focus:ring-[#113a31]/10 focus:outline-none transition-all placeholder:font-mono"
                  placeholder="ДД.ММ.РРРР"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewDate();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddNewDate}
                  className="px-2.5 bg-[#1e584f] hover:bg-[#113a31] text-white font-extrabold rounded-md shadow-xs hover:shadow-sm transition-colors text-xs h-[24px] flex items-center justify-center focus:outline-none cursor-pointer"
                  title="Додати новий запис"
                >
                  +
                </button>
              </div>
              <p className="text-[7.5px] text-slate-400 mt-1 leading-normal">Формат: <span className="font-mono text-[8px] bg-slate-100 px-1 py-0.5 rounded">ДД.ММ.РРРР</span>. Натисніть "+", потім "Зберегти".</p>
            </div>

            {/* Footer */}
            <div className="border-t border-[#e8f5f2] px-4 py-2 bg-[#f4faf8] flex justify-end space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsContactModalOpen(false);
                  setContactModalMember(null);
                }}
                className="px-2.5 py-1 text-[10px] font-bold text-[#1e584f] hover:text-[#113a31] bg-white border border-[#cedfdb] hover:bg-slate-50 rounded transition-all"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleSaveContactModal}
                className="px-3 py-1 text-[10px] font-extrabold text-white bg-[#1e584f] hover:bg-[#113a31] rounded shadow-xs hover:shadow-sm transition-all"
              >
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
