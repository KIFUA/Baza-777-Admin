import React, { useState, useEffect, useRef } from 'react';
import { Member } from './types';
import StatsDashboard from './components/StatsDashboard';
import PastoralCareManager from './components/PastoralCareManager';
import HistoryJournal from './components/HistoryJournal';
import MemberProfile from './components/MemberProfile';
import MemberForm from './components/MemberForm';
import SpreadsheetView from './components/SpreadsheetView';
import DirectoriesManager from './components/DirectoriesManager';
import { NotificationSettings } from './components/NotificationSettings';
import ReportGenerator from './components/ReportGenerator';
import LoginPage from './components/LoginPage';
import { 
  Users, UserCheck, Heart, Shield, History, BarChart3, Search, 
  MapPin, Phone, UserPlus, Filter, RotateCcw, ChevronLeft, ChevronRight, BookOpen,
  Table2, X
} from 'lucide-react';

export default function App() {
  // System State
  const [members, setMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [lookups, setLookups] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [spreadsheetLoading, setSpreadsheetLoading] = useState(true);
  
  const [currentSessionUser, setCurrentSessionUser] = useState<any>(() => {
    try {
      const cached = localStorage.getItem("baza_current_session_user") || sessionStorage.getItem("baza_current_session_user");
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return !!(localStorage.getItem("baza_current_session_user") || sessionStorage.getItem("baza_current_session_user"));
    } catch (_) {
      return false;
    }
  });

  const handleUpdateSessionUser = (user: any, remember: boolean = true) => {
    setCurrentSessionUser(user);
    if (user) {
      if (remember) {
        localStorage.setItem("baza_current_session_user", JSON.stringify(user));
        sessionStorage.removeItem("baza_current_session_user");
      } else {
        sessionStorage.setItem("baza_current_session_user", JSON.stringify(user));
        localStorage.removeItem("baza_current_session_user");
      }
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem("baza_current_session_user");
      sessionStorage.removeItem("baza_current_session_user");
      setIsAuthenticated(false);
    }
  };

  const getPermission = (elementName: string): { view: boolean, edit: boolean } => {
    const level = currentSessionUser?.level || 'І-й';
    
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
    
    let mappedName = elementName;
    const cleanFieldName = elementName.toLowerCase().trim();
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
      const isPublic = ['поле пошук'].includes(targetNorm);
      const isGlobalViewer = (currentSessionUser?.level === 'ІІІ-й' || currentSessionUser?.level === '3') && currentSessionUser?.rayon === 'ВСІ РАЙОНИ';
      const isVisible = isPublic || (levelNum > 1) || isGlobalViewer;
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
      edit: findAccessValue(row.access, levelNum, 'edit')
    };
  };

  // High level UI Modes: 'spreadsheet' (СПИСОК) or 'questionnaire' (АНКЕТИ) or 'generator' (ГЕНЕРАТОР) or 'settings' (НАЛАШТУВАННЯ) or 'journal' (ЖУРНАЛ)
  const [mainMode, setMainMode] = useState<'spreadsheet' | 'questionnaire' | 'generator' | 'settings' | 'stats' | 'journal'>('spreadsheet');
  const [activeTab, setActiveTab] = useState<'members' | 'pastoral' | 'history' | 'stats'>('members');

  // Directory Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // default to 'active' for church management!
  const [caregiverFilter, setCaregiverFilter] = useState('');

  // Active Selected Context
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [lastOpenedMemberId, setLastOpenedMemberId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedMemberId !== null) {
      setLastOpenedMemberId(selectedMemberId);
    }
  }, [selectedMemberId]);

  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = () => {
      setIsAdmin(localStorage.getItem("user_tg_id") === "969538290");
    };
    checkAdmin();
    const interval = setInterval(checkAdmin, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let modeToElement: Record<string, string> = {
      'spreadsheet': 'СПИСОК',
      'questionnaire': 'АНКЕТИ',
      'stats': 'СТАТИСТИКА',
      'settings': 'НАЛАШТУВАННЯ',
      'journal': 'ЖУРНАЛ'
    };
    const currentElemName = modeToElement[mainMode];
    if (currentElemName && !getPermission(currentElemName).view) {
      if (getPermission('СПИСОК').view) {
        setMainMode('spreadsheet');
      } else if (getPermission('АНКЕТИ').view) {
        setMainMode('questionnaire');
      }
    }
  }, [currentSessionUser, lookups, mainMode]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchMembers = async () => {
    if (members.length === 0) {
      setLoading(true);
    }
    try {
      // Build search query url params
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (genderFilter) params.append('gender', genderFilter);
      
      const getLevelNum = (lvl: string): number => {
        if (!lvl) return 1;
        const s = lvl.toUpperCase();
        if (s.includes('IV') || s.includes('ІV') || s.includes('4')) return 4;
        if (s.includes('III') || s.includes('ІІІ') || s.includes('3')) return 3;
        if (s.includes('II') || s.includes('ІІ') || s.includes('2')) return 2;
        return 1;
      };
      const levelNum = getLevelNum(currentSessionUser?.level || 'І-й');

      const assignedRayon = currentSessionUser?.rayon;
      const isSpecificRayon = assignedRayon && assignedRayon !== 'ВСІ' && assignedRayon !== 'ВСЕ' && assignedRayon !== 'ВСІ РАЙОНИ' && assignedRayon !== '';
      const shouldRestrictRayon = levelNum <= 3 && isSpecificRayon;

      // Force rayon segment constraint if restricted session is active
      const targetRayon = shouldRestrictRayon ? assignedRayon : areaFilter;
      if (targetRayon) params.append('area', targetRayon);

      if (groupFilter) params.append('group', groupFilter);
      if (statusFilter) params.append('status', statusFilter);

      // Force caregiver segment constraint if user is an opikun
      const getMatchedCaregiverName = (userObj: any, opikaList: string[]): string | null => {
        if (!userObj || !userObj.user || !opikaList || opikaList.length === 0) return null;
        const userName = userObj.user;
        
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

        return opikaList.find((c: string) => isMatchingCaregiverName(c, userName)) || null;
      };

      const matchedCaretaker = getMatchedCaregiverName(currentSessionUser, lookups?.directories?.opika || []);
      const targetCaretaker = (levelNum <= 2 && matchedCaretaker) ? matchedCaretaker : caregiverFilter;
      if (targetCaretaker) params.append('caretaker', targetCaretaker);

      const resp = await fetch(`/api/members?${params.toString()}`);
      if (resp.ok) {
        const json = await resp.json();
        setMembers(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMembers = async () => {
    if (allMembers.length === 0) {
      setSpreadsheetLoading(true);
    }
    try {
      const getLevelNum = (lvl: string): number => {
        if (!lvl) return 1;
        const s = lvl.toUpperCase();
        if (s.includes('IV') || s.includes('ІV') || s.includes('4')) return 4;
        if (s.includes('III') || s.includes('ІІІ') || s.includes('3')) return 3;
        if (s.includes('II') || s.includes('ІІ') || s.includes('2')) return 2;
        return 1;
      };
      const levelNum = getLevelNum(currentSessionUser?.level || 'І-й');

      const assignedRayon = currentSessionUser?.rayon;
      const isGlobalViewer = (currentSessionUser?.level === 'ІІІ-й' || currentSessionUser?.level === '3') && assignedRayon === 'ВСІ РАЙОНИ';
      const isSpecificRayon = assignedRayon && assignedRayon !== 'ВСІ' && assignedRayon !== 'ВСЕ' && assignedRayon !== '' && !isGlobalViewer;
      const shouldRestrictRayon = levelNum <= 3 && isSpecificRayon;

      const url = shouldRestrictRayon
        ? `/api/members?status=&area=${encodeURIComponent(assignedRayon)}`
        : '/api/members?status=';

      const resp = await fetch(url); // empty status returns all records
      if (resp.ok) {
        const json = await resp.json();
        setAllMembers(json);
      }
    } catch (err) {
      console.error("Error loading spreadsheet members:", err);
    } finally {
      setSpreadsheetLoading(false);
    }
  };

  const fetchLookupsAndStats = async () => {
    try {
      const lookResp = await fetch('/api/lookups');
      if (lookResp.ok) {
        const lookJson = await lookResp.json();
        setLookups(lookJson);
        (window as any).__bazaLookupsData = lookJson;
      }
      
      const statsResp = await fetch('/api/stats');
      if (statsResp.ok) {
        const statsJson = await statsResp.json();
        setStats(statsJson);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const preloadRawFirebase = async () => {
    try {
      const res = await fetch('/api/firebase/members.json');
      if (res.ok) {
        const data = await res.json();
        (window as any).__bazaRawFirebaseData = data;
        console.log("Preloaded/Refreshed raw firebase database successfully");
      }
    } catch (err) {
      console.error("Failed to preload raw firebase database:", err);
    }
  };

  useEffect(() => {
    fetchMembers();
    setCurrentPage(1); // reset to page 1 on filter changes
  }, [searchQuery, genderFilter, areaFilter, groupFilter, statusFilter, caregiverFilter, currentSessionUser]);

  const syncCallbackRef = useRef<any>(null);
  syncCallbackRef.current = async () => {
    try {
      await fetch('/api/members/invalidate-cache', { method: 'POST' });
    } catch (e) {
      console.error("Failed to notify invalidate-cache:", e);
    }
    await fetchAllMembers();
    await fetchMembers();
    await fetchLookupsAndStats();
    await preloadRawFirebase();
  };

  useEffect(() => {
    fetchLookupsAndStats();
    preloadRawFirebase();

    (window as any).__bazaNotifyDatabaseChanged = async () => {
      console.log("[Parent Sync Event] Database changed. Reloading all states...");
      if (syncCallbackRef.current) {
        await syncCallbackRef.current();
      }
    };

    (window as any).__bazaSelectedMemberChanged = (id: number | null) => {
      setSelectedMemberId(id);
    };

    return () => {
      delete (window as any).__bazaNotifyDatabaseChanged;
      delete (window as any).__bazaSelectedMemberChanged;
    };
  }, []);

  useEffect(() => {
    fetchAllMembers();
  }, [currentSessionUser]);



  const getLevelNum = (lvl: string): number => {
    if (!lvl) return 1;
    const s = lvl.toUpperCase();
    if (s.includes('IV') || s.includes('ІV') || s.includes('4')) return 4;
    if (s.includes('III') || s.includes('ІІІ') || s.includes('3')) return 3;
    if (s.includes('II') || s.includes('ІІ') || s.includes('2')) return 2;
    return 1;
  };

  const levelNum = getLevelNum(currentSessionUser?.level || 'І-й');
  const assignedRayon = currentSessionUser?.rayon;
  const isGlobalViewer = levelNum === 3 && assignedRayon === 'ВСІ РАЙОНИ';
  
  const isCurrentUserAdmin = currentSessionUser?.level === 'IV-й' || (currentSessionUser?.rayon === 'ЦЕНТР' && currentSessionUser?.user?.includes('Черняк Вал.')) || isAdmin;
  const isReadOnly = (currentSessionUser?.rayon === 'ЦЕНТР' && !isCurrentUserAdmin) || isGlobalViewer;

  const handleSpreadsheetUpdate = async (id: number, updatedFields: Partial<Member>) => {
    if (isReadOnly) {
      alert("У вас лише права перегляду.");
      return false;
    }
    
    // Allow Level III and Level IV to make changes, other levels can only update remarks if permitted
    const isRemarkUpdate = updatedFields.prymitka !== undefined && Object.keys(updatedFields).length === 1;
    if (!isCurrentUserAdmin && levelNum !== 3 && !isRemarkUpdate) {
      alert("Тимчасово вносити зміни не можна");
      return false;
    }
    try {
      const resp = await fetch(`/api/members/${id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Pib': encodeURIComponent(currentSessionUser?.user || 'Адміністратор')
        },
        body: JSON.stringify(updatedFields)
      });
      if (resp.ok) {
        // Optimistically update both sets of data in react state
        setAllMembers(prev => prev.map(m => m.id === id ? { ...m, ...updatedFields } : m));
        setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updatedFields } : m));
        await fetchLookupsAndStats();
        await preloadRawFirebase();
        return true;
      }
    } catch (err) {
      console.error("Error saving inline spreadsheet update:", err);
    }
    alert("Помилка під час швидкого збереження.");
    return false;
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setGenderFilter('');
    setAreaFilter('');
    setGroupFilter('');
    setStatusFilter('active');
    setCaregiverFilter('');
  };

  // Create or Update form save callback
  const handleSaveMember = async (data: Partial<Member>) => {
    if (isReadOnly) {
      alert("У вас лише права перегляду.");
      return;
    }
    if (!isCurrentUserAdmin && levelNum !== 3) {
      alert("Тимчасово вносити зміни не можна");
      return;
    }
    try {
      const url = editingMember ? `/api/members/${editingMember.id}` : '/api/members';
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Pib': encodeURIComponent(currentSessionUser?.user || 'Адміністратор')
        },
        body: JSON.stringify(data)
      });

      if (resp.ok) {
        const resJson = await resp.json();
        setShowForm(false);
        setEditingMember(null);
        
        // Refresh
        await fetchMembers();
        await fetchAllMembers();
        await fetchLookupsAndStats();
        
        if (!editingMember && resJson.memberId) {
          // If created new, navigate to details immediately
          setSelectedMemberId(resJson.memberId);
        } else if (editingMember) {
          // Keep active view open
          setSelectedMemberId(editingMember.id);
        }
      } else {
        alert("Помилка під час збереження профайлу.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Navigate to spouse or related member from links
  const handleNavigateToMember = (id: number) => {
    setSelectedMemberId(id);
    setShowForm(false);
    setEditingMember(null);
  };

  // Determine Unique Lists for Filter dropdowns dynamically from lookups or master records
  const getUniqueAreas = () => {
    if (lookups?.selo) {
      // Can extract distinct area labels or custom ones
    }
    const set = new Set(members.map(m => m.rayon2_ukr).filter(Boolean));
    return Array.from(set).sort();
  };

  const getUniqueGroups = () => {
    const set = new Set(members.map(m => m.n_dilyci).filter(Boolean));
    return Array.from(set).sort();
  };

  const getUniqueCaregivers = () => {
    const set = new Set(members.map(m => m.presviter).filter(Boolean));
    return Array.from(set).sort();
  };

  // Calculate Paginated slice of members
  const totalRecords = members.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMembers = members.slice(startIndex, startIndex + pageSize);

  const activeStatsCount = members.filter(m => m.id_vybuttya === 0).length;

  if (!isAuthenticated && lookups) {
      return (
          <LoginPage 
            onLogin={(user, remember) => {
                handleUpdateSessionUser(user, remember);
            }} 
            accessList={lookups.access || []}
            rayonList={lookups.directories?.rayon || lookups.directories?.rayon2 || []}
            opikaBindings={lookups.directories?.opika_bindings || []}
          />
      );
  }

  return (
    <div className="h-screen flex flex-col font-sans select-none antialiased overflow-hidden" style={{ backgroundColor: '#264653' }}>
      
      <div className="w-full max-w-[1100px] mx-auto flex flex-col h-full min-h-0 px-4">
        {/* SLIM TOP BAR (MIMICKING PHOTO 1) */}
        <div 
          style={{ fontSize: '16px' }}
          className="text-white py-1.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 border-b border-[#203a45] shrink-0 scale-interface-down-33"
        >
          <div className="flex gap-3 sm:gap-4 items-center justify-between sm:justify-start w-full sm:w-auto min-w-0">
            <div 
              style={{ fontWeight: 'normal', fontStyle: 'italic', fontSize: '12px' }}
              className="text-[11px] sm:text-xs font-bold text-slate-300 leading-tight shrink-0"
            >
              СЬОГОДНІ: {new Date().toLocaleDateString('uk-UA')}<br/>
              ОНОВЛЕНО: {new Date().toLocaleTimeString('uk-UA')}
            </div>
            
            {getPermission('ВСЬОГО ЧЛЕНІВ ЦЕРКВИ').view && (
              <div 
                style={{ height: '30px' }}
                className="bg-[#1a3843] border border-[#142d36] rounded px-3 py-0.5 sm:rounded-md sm:px-4 sm:py-1.5 flex text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#cfdfe2] items-center whitespace-nowrap shrink-0 min-w-fit"
              >
                <span 
                  style={{ fontSize: '12px', lineHeight: '18px' }}
                  className="hidden sm:inline mr-2"
                >
                  ВСЬОГО ЧЛЕНІВ ЦЕРКВИ
                </span>
                <span className="sm:hidden mr-1">ВСЬОГО</span>
                <span 
                  style={{ fontSize: '13px', fontWeight: 'bold', color: '#00cb4c' }}
                  className="font-black text-[10px] sm:text-sm text-white"
                >
                  {members.length}
                </span>
              </div>
            )}

            <nav className="flex space-x-1 sm:space-x-2 shrink-0 ml-2">
              <button
                style={{
                  fontSize: '12px',
                  height: '30px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => { 
                  handleUpdateSessionUser(null);
                  localStorage.removeItem("user_tg_id");
                }}
                className="px-2 sm:px-5 text-[10px] sm:text-xs font-bold transition-all rounded-md tracking-wider uppercase bg-[#8b3a3a] text-white hover:bg-[#a64d4d]"
              >
                ВИХІД
              </button>
              {getPermission('СПИСОК').view && (
                <button
                  style={{
                    fontSize: '12px',
                    height: '30px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => { 
                    setMainMode('spreadsheet'); 
                    setSelectedMemberId(null); 
                    setShowForm(false); 
                    // Instant load using cache, reload synced changes in background in parallel
                    Promise.all([
                      fetchAllMembers(),
                      fetchMembers(),
                      fetchLookupsAndStats()
                    ]).catch(err => console.error("Error updating tab data:", err));
                  }}
                  className={`px-2 sm:px-5 text-[10px] sm:text-xs font-bold transition-all rounded-md tracking-wider uppercase ${mainMode === 'spreadsheet' ? "bg-[#387d7a] text-white shadow-sm" : "bg-[#1a3843] text-slate-300 hover:bg-[#254b52]"}`}
                >
                  СПИСОК
                </button>
              )}
              {getPermission('АНКЕТИ').view && (
                <button
                  style={{
                    fontSize: '12px',
                    height: '30px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Перейти до анкет"
                  onClick={() => { 
                    setMainMode('questionnaire'); 
                    setSelectedMemberId(null); 
                    setShowForm(false); 
                    Promise.all([
                      fetchAllMembers(),
                      fetchMembers(),
                      fetchLookupsAndStats()
                    ]).catch(err => console.error("Error updating tab data:", err));
                  }}
                  className={`px-2 sm:px-5 text-[10px] sm:text-xs font-bold transition-all rounded-md tracking-wider uppercase ${mainMode === 'questionnaire' ? "bg-[#387d7a] text-white shadow-sm" : "bg-[#1a3843] text-slate-300 hover:bg-[#254b52]"}`}
                >
                  АНКЕТИ
                </button>
              )}
              {getPermission('АНКЕТИ').view && (
                <button
                  style={{
                    fontSize: '12px',
                    height: '30px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Журнал змін бази даних"
                  onClick={() => { 
                    setMainMode('journal'); 
                    setSelectedMemberId(null); 
                    setShowForm(false); 
                  }}
                  className={`px-2 sm:px-5 text-[10px] sm:text-xs font-bold transition-all rounded-md tracking-wider uppercase ${mainMode === 'journal' ? "bg-[#387d7a] text-white shadow-sm" : "bg-[#1a3843] text-slate-300 hover:bg-[#254b52]"}`}
                >
                  ЖУРНАЛ
                </button>
              )}
              {getPermission('СТАТИСТИКА').view && (
                <button
                  style={{
                    fontSize: '12px',
                    height: '30px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Аналітична статистика реєстру та зрізи за районами"
                  onClick={() => {
                    setMainMode('stats');
                    setSelectedMemberId(null);
                    setShowForm(false);
                    Promise.all([
                      fetchAllMembers(),
                      fetchMembers(),
                      fetchLookupsAndStats()
                    ]).catch(err => console.error("Error updating tab data:", err));
                  }}
                  className={`px-2 sm:px-5 text-[10px] sm:text-xs font-bold transition-all rounded-md tracking-wider uppercase ${mainMode === 'stats' ? "bg-[#387d7a] text-white shadow-sm" : "bg-[#1a3843] text-slate-300 hover:bg-[#254b52]"}`}
                >
                  СТАТИСТИКА
                </button>
              )}
              {getPermission('НАЛАШТУВАННЯ').view && (
                <button
                  style={{
                    fontSize: '12px',
                    height: '30px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Налаштування довідників та кольорів"
                  onClick={() => {
                    setMainMode('settings');
                    setSelectedMemberId(null);
                    setShowForm(false);
                  }}
                  className={`px-2 sm:px-5 text-[10px] sm:text-xs font-bold transition-all rounded-md tracking-wider uppercase ${mainMode === 'settings' ? "bg-[#387d7a] text-white shadow-sm" : "bg-[#1a3843] text-slate-300 hover:bg-[#254b52]"}`}
                >
                  НАЛАШТУВАННЯ
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* 2. MAIN HUB CANVAS CONTENT */}
        <main className="flex-1 min-h-0 w-full pb-2 flex flex-col overflow-y-auto">
        
        {/* Detail Visualizer or Edit forms overlay views */}
        {(selectedMemberId !== null && mainMode !== 'questionnaire') ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedMemberId(null)}
              className="group flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest pl-1 py-1"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Вернутись до списку</span>
            </button>
            <div className="bg-white rounded-2xl border border-slate-100 p-1.5 shadow-sm">
              <MemberProfile
                memberId={selectedMemberId}
                onClose={() => setSelectedMemberId(null)}
                onEdit={(m) => { setEditingMember(m); setShowForm(true); setSelectedMemberId(null); }}
                onNavigateToMember={handleNavigateToMember}
                lookups={lookups}
                onUpdateMember={handleSpreadsheetUpdate}
                isRestricted={isReadOnly}
              />
            </div>
          </div>
        ) : showForm ? (
          <div className="space-y-4">
            <button
              onClick={() => { setShowForm(false); setEditingMember(null); }}
              className="flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest pl-1 py-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>До списку членів</span>
            </button>
            <div className="bg-[#121212] text-slate-100 rounded-2xl border border-[#333333] p-6 shadow-sm">
              <MemberForm
                member={editingMember}
                lookups={lookups}
                onSave={handleSaveMember}
                onCancel={() => { setShowForm(false); setEditingMember(null); }}
                isRestricted={isReadOnly}
              />
            </div>
          </div>
        ) : (
          /* General Hub selectors switcher */
          <div className="flex-1 flex flex-col min-h-0">
            {mainMode === 'spreadsheet' ? (
              spreadsheetLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"></div>
                  <span className="text-xs text-slate-400 font-bold tracking-widest uppercase animate-pulse">Зчитування даних таблиці...</span>
                </div>
              ) : (
                <SpreadsheetView
                  members={allMembers}
                  lookups={lookups}
                  userLevel={currentSessionUser?.level}
                  selectedMemberId={lastOpenedMemberId}
                  onOpenProfile={async (id) => {
                    setSelectedMemberId(id);
                    setMainMode('questionnaire');
                  }}
                  onUpdateMember={handleSpreadsheetUpdate}
                  onOpenGenerator={() => {
                    setMainMode('generator');
                    setSelectedMemberId(null);
                    setShowForm(false);
                    Promise.all([
                      fetchAllMembers(),
                      fetchMembers(),
                      fetchLookupsAndStats()
                    ]).catch(err => console.error("Error updating tab data:", err));
                  }}
                  isUserAdmin={isCurrentUserAdmin}
                />
              )
            ) : mainMode === 'questionnaire' ? (
              /* Questionnaire Legacy Embedded View */
              <div className="flex-1 flex flex-col min-h-[450px] bg-[#333333] overflow-hidden -mx-2 -mb-2 rounded-t-lg border-t border-[#1a3843]">
                {(currentSessionUser?.level === 'IV-й' || currentSessionUser?.level === 'ІІІ-й') && (
                  <div className="bg-[#1e1e1e] px-4 py-2 flex items-center justify-between border-b border-[#2b2b2b]">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Анкети</span>
                    <div className="flex items-center space-x-2">
                      {selectedMemberId && (
                        <button
                          onClick={async () => {
                            try {
                              const resp = await fetch(`/api/members/${selectedMemberId}`);
                              if (resp.ok) {
                                const fullMember = await resp.json();
                                setEditingMember(fullMember);
                                setShowForm(true);
                              } else {
                                alert("Не вдалося завантажити дані члена");
                              }
                            } catch (err) {
                              console.error("Error loading member details:", err);
                              alert("Помилка при завантаженні даних");
                            }
                          }}
                          className="px-3 py-1 sm:px-5 sm:py-1.5 text-[10px] sm:text-xs font-bold transition-all rounded-md tracking-wider uppercase bg-amber-600 text-white shadow-sm hover:bg-amber-700"
                        >
                          Редагувати
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingMember(null);
                          setShowForm(true);
                        }}
                        className="px-3 py-1 sm:px-5 sm:py-1.5 text-[10px] sm:text-xs font-bold transition-all rounded-md tracking-wider uppercase bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                      >
                        + Додати члена
                      </button>
                    </div>
                  </div>
                )}
                {false ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-zinc-500 text-[11px] font-normal tracking-wide">
                      Ці записи тільки для адміністратора
                    </p>
                  </div>
                ) : (
                  <iframe 
                    src={`/index_legacy.html?merge=before${selectedMemberId ? `&id=${selectedMemberId}` : ''}`} 
                    className="w-full h-full border-0 flex-1" 
                    title="Legacy Questionnaire"
                  ></iframe>
                )}
              </div>
            ) : mainMode === 'generator' ? (
              <ReportGenerator
                members={allMembers}
                lookups={lookups}
              />
            ) : mainMode === 'stats' ? (
              <div className="flex-1 overflow-y-auto min-h-0 pb-2">
                <StatsDashboard
                  stats={stats}
                  members={allMembers}
                  lookups={lookups}
                />
              </div>
            ) : mainMode === 'settings' ? (
              <div className="flex-1 overflow-y-auto min-h-0 pb-2">
                <DirectoriesManager
                  lookups={lookups}
                  onRefreshLookups={fetchLookupsAndStats}
                  currentSessionUser={currentSessionUser}
                  onSetSessionUser={handleUpdateSessionUser}
                  members={allMembers}
                  onUpdateMember={handleSpreadsheetUpdate}
                />
              </div>
            ) : mainMode === 'journal' ? (
              <div className="flex-1 overflow-y-auto min-h-0 pb-2 bg-[#0e2128] p-4 sm:p-6 rounded-2xl border border-[#1f424f] shadow-lg">
                <HistoryJournal
                  onSelectMember={(id) => {
                    setSelectedMemberId(id);
                    setMainMode('questionnaire');
                  }}
                  isAdmin={isCurrentUserAdmin}
                />
              </div>
            ) : null}
          </div>
        )}

      </main>



      </div>
    </div>
  );
}
