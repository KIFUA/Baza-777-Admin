import React, { useState, useEffect } from 'react';
import { 
  Users, Cake, ShieldCheck, RefreshCw, Send, Trash2, Plus, 
  CheckCircle, AlertCircle, Copy, Check, LogIn, LogOut, Mail, Clock, Palette,
  Edit, UserPlus, ShieldAlert, Save
} from 'lucide-react';
import { Member } from '../types';
import { parseAccessLevelsCSV, ACCESS_LEVELS_CSV_DATA } from '../accessLevels';

interface DirectoriesManagerProps {
  lookups: any;
  onRefreshLookups: () => Promise<void>;
  currentSessionUser: any;
  onSetSessionUser: (user: any) => void;
  members: Member[];
  onUpdateMember: (id: number, updatedFields: Partial<Member>) => Promise<boolean>;
}

export default function DirectoriesManager({ 
  lookups, 
  onRefreshLookups, 
  currentSessionUser, 
  onSetSessionUser,
  members,
  onUpdateMember
}: DirectoriesManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'birthdays' | 'dicts' | 'access' | 'sync' | 'colors'>('birthdays');
  const [activeAccessSubTab, setActiveAccessSubTab] = useState<'sectors' | 'levels'>('sectors');
  const [parsedAccessLevels, setParsedAccessLevels] = useState<any[]>([]);

  const getFormattedPibForPresbyter = (m: any, allCandidates: any[]) => {
    const pibStr = String(m.pib || '').trim();
    const parts = pibStr.split(/\s+/);
    if (parts.length < 2) return pibStr;
    
    const lastName = parts[0];
    const firstName = parts[1];
    const patronymic = parts[2] || '';
    
    const isDuplicate = allCandidates.some(other => {
      if (other.id === m.id) return false;
      const otherParts = String(other.pib || '').trim().split(/\s+/);
      if (otherParts.length < 2) return false;
      return otherParts[0].toLowerCase() === lastName.toLowerCase() && 
             otherParts[1].toLowerCase() === firstName.toLowerCase();
    });
    
    if (isDuplicate && patronymic) {
      return `${lastName} ${firstName} ${patronymic.charAt(0)}.`;
    }
    return `${lastName} ${firstName}`;
  };

  useEffect(() => {
    if (lookups?.permission_levels && lookups.permission_levels.length > 0) {
      setParsedAccessLevels(lookups.permission_levels);
    } else {
      const data = parseAccessLevelsCSV(ACCESS_LEVELS_CSV_DATA);
      console.log("Parsed Access Levels Data:", data);
      setParsedAccessLevels(data);
    }
  }, [lookups]);

  const handleToggleAccessLevel = async (index: number, level: string) => {
    const updatedAccessLevels = parsedAccessLevels.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          access: {
            ...item.access,
            [level]: !item.access[level]
          }
        };
      }
      return item;
    });

    setParsedAccessLevels(updatedAccessLevels);

    try {
      await fetch('/api/directories/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access: updatedAccessLevels,
        }),
      });
      if (onRefreshLookups) onRefreshLookups();
    } catch (error) {
      console.error("Failed to save checkbox permissions list:", error);
    }
  };

  const handleUpdateRoleName = (index: number, newName: string) => {
    const updatedAccessLevels = parsedAccessLevels.map((item, idx) => {
      if (idx === index) {
        return { ...item, role: newName };
      }
      return item;
    });
    setParsedAccessLevels(updatedAccessLevels);
  };

  const handleDeleteRoleField = (index: number) => {
    const updatedAccessLevels = parsedAccessLevels.filter((_, idx) => idx !== index);
    setParsedAccessLevels(updatedAccessLevels);
  };

  const handleAddNewRoleField = () => {
    const defaultHeaders = [
      'І-бачить', 'І-змінювати', 
      'ІІ-бачить', 'ІІ-змінювати', 
      'ІІІ-бачить', 'ІІІ-змінювати', 
      'ІV-бачить', 'ІV-змінювати'
    ];
    
    const newField = {
      role: 'А__Нове поле',
      access: defaultHeaders.reduce((acc, h) => {
        acc[h] = false;
        return acc;
      }, {} as Record<string, boolean>),
      headers: defaultHeaders
    };
    
    setParsedAccessLevels([...parsedAccessLevels, newField]);
  };

  const [sectorsSaveLoading, setSectorsSaveLoading] = useState(false);
  const [levelsSaveLoading, setLevelsSaveLoading] = useState(false);

  const DEFAULT_DOSTUP = [
    { "rayon": "ЦЕНТР", "level": "IV-й", "user": "Адміністратор", "position": "Адміністратор", "password": "777", "telegramId": "240931069", "email": "240931069" }
  ];

  const handleSaveSectorsToFirebase = async () => {
    setSectorsSaveLoading(true);
    const accessList = lookups?.access || DEFAULT_DOSTUP;
    try {
      const resp = await fetch('/api/directories/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lookups?.directories,
          access: accessList
        })
      });
      if (resp.ok) {
        if (onRefreshLookups) await onRefreshLookups();
        alert("Карту секторів доступу успішно збережено в базі ФБ!");
      } else {
        alert("Помилка при збереженні Карти секторів доступу!");
      }
    } catch (e: any) {
      alert("Помилка: " + e.message);
    } finally {
      setSectorsSaveLoading(false);
    }
  };

  const handleSaveLevelsToFirebase = async () => {
    setLevelsSaveLoading(true);
    try {
      const resp = await fetch('/api/directories/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lookups?.directories,
          access: parsedAccessLevels
        })
      });
      if (resp.ok) {
        if (onRefreshLookups) await onRefreshLookups();
        alert("Карту рівнів доступу успішно збережено в базі ФБ!");
      } else {
        alert("Помилка при збереженні Карти рівнів доступу!");
      }
    } catch (e: any) {
      alert("Помилка: " + e.message);
    } finally {
      setLevelsSaveLoading(false);
    }
  };
  
  // Custom categories color state
  const [colorsMap, setColorsMap] = useState<Record<string, Record<string, string>>>({});
  const [selectedColorCat, setSelectedColorCat] = useState<'opika' | 'slujinnya' | 'vidviduvanist' | 'prysutnist'>('opika');
  const [colorsSaveStatus, setColorsSaveStatus] = useState(false);

  // Access tab editing states
  const [editingAccessUser, setEditingAccessUser] = useState<any>(null);
  const [showAccessForm, setShowAccessForm] = useState<boolean>(false);
  
  // Access form fields
  const [accessUser, setAccessUser] = useState('');
  const [accessLevel, setAccessLevel] = useState('І-й');
  const [accessPosition, setAccessPosition] = useState('');
  const [accessTelegramId, setAccessTelegramId] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [accessRayon, setAccessRayon] = useState('ВСІ');

  // Handle saving user
  const handleSaveAccessUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessUser.trim()) return;

    const accessList = lookups?.access || DEFAULT_DOSTUP;
    let updatedList = [...accessList];

    const newUserObj = {
      rayon: accessRayon,
      level: accessLevel,
      user: accessUser.trim(),
      position: accessPosition.trim() || 'Служитель',
      telegramId: accessTelegramId.trim(),
      password: accessPassword.trim(),
      email: accessTelegramId.trim()
    };

    if (editingAccessUser) {
      updatedList = updatedList.map(rec => 
        (rec.user === editingAccessUser.user && rec.rayon === editingAccessUser.rayon) ? newUserObj : rec
      );
    } else {
      if (updatedList.some(rec => rec.user === newUserObj.user)) {
        alert("Користувач із таким ім'ям вже існує!");
        return;
      }
      updatedList.push(newUserObj);
    }

    try {
      const resp = await fetch('/api/directories/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lookups?.directories,
          access: updatedList
        })
      });
      if (resp.ok) {
        await onRefreshLookups();
        setAccessUser('');
        setAccessLevel('І-й');
        setAccessPosition('');
        setAccessTelegramId('');
        setAccessPassword('');
        setEditingAccessUser(null);
        setShowAccessForm(false);
      } else {
        alert("Помилка збереження на сервері!");
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    }
  };

  // Handle deleting user
  const handleDeleteAccessUser = async (userToDelete: any) => {
    console.log("Delete user:", userToDelete);
    if (!confirm(`Ви дійсно бажаєте видалити права доступу для служителя ${userToDelete.user}?`)) return;
    
    const accessList = lookups?.access || DEFAULT_DOSTUP;
    // Ensure we are filtering correctly based on user and rayon
    const updatedList = accessList.filter(rec => !(rec.user === userToDelete.user && (rec.rayon || 'ЦЕНТР') === (userToDelete.rayon || 'ЦЕНТР')));

    try {
      const resp = await fetch('/api/directories/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lookups?.directories,
          access: updatedList
        })
      });
      if (resp.ok) {
        await onRefreshLookups();
      } else {
        alert("Помилка збереження на сервері!");
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    }
  };

  const handleEditAccessUserClick = (userRec: any) => {
    setEditingAccessUser(userRec);
    setAccessUser(userRec.user || '');
    setAccessLevel(userRec.level || (userRec.rayon === "ЦЕНТР" && (userRec.user || "").includes("Черняк Вал.") ? "IV-й" : 
                    (userRec.position || "").includes("Пресвітер") ? "ІІІ-й" : 
                    (userRec.position || "").includes("Диякон") ? "ІІ-й" : "І-й"));
    setAccessPosition(userRec.position || '');
    setAccessTelegramId(userRec.telegramId || userRec.email || '');
    setAccessPassword(userRec.password || '');
    setAccessRayon(userRec.rayon || 'ЦЕНТР');
    setShowAccessForm(true);
  };

  // Load custom colors from server/local on load
  useEffect(() => {
    const fetchColors = async () => {
      try {
        const res = await fetch('/api/custom-colors');
        if (res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length > 0) {
            setColorsMap(data);
            localStorage.setItem('custom_colors_map', JSON.stringify(data));
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load custom colors from server:", err);
      }
      try {
        const saved = localStorage.getItem('custom_colors_map');
        if (saved) {
          setColorsMap(JSON.parse(saved));
        }
      } catch (_) {}
    };
    fetchColors();
  }, []);

  const handleSaveColors = async () => {
    localStorage.setItem('custom_colors_map', JSON.stringify(colorsMap));
    
    try {
      const res = await fetch('/api/custom-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(colorsMap)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("Failed to save custom colors to server:", err);
    }

    setColorsSaveStatus(true);
    setTimeout(() => setColorsSaveStatus(false), 2000);
  };

  const handleSetColor = (category: string, value: string, color: string) => {
    setColorsMap(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [value]: color
      }
    }));
  };

  const handleResetColor = (category: string, value: string) => {
    setColorsMap(prev => {
      const next = { ...prev };
      if (next[category]) {
        const cat = { ...next[category] };
        delete cat[value];
        next[category] = cat;
      }
      return next;
    });
  };

  const getCategoryOptions = () => {
    if (selectedColorCat === 'opika') {
      return (lookups?.directories?.opika as string[]) || Array.from(new Set(members.map(m => m.presviter).filter(Boolean)));
    }
    if (selectedColorCat === 'slujinnya') {
      return (lookups?.directories?.slujinnya as string[]) || ["АДМІНІСТРАТИВНЕ", "ГОСТИННОСТІ", "ДИЗАЙНЕРСЬКЕ", "ДИЯКОН", "Лідер ДГ", "Молитовне", "СОЦІАЛЬНЕ", "ПЕРЕКЛАДЧІ", "Підтр. мал. церков", "Проповідники", "Служіння Г/Н", "SUN SHINE"];
    }
    if (selectedColorCat === 'vidviduvanist') {
      return ["Постійно", "Періодично", "Рідко", "Ніколи"];
    }
    if (selectedColorCat === 'prysutnist') {
      return (lookups?.directories?.prysutnist as string[]) || ["За кордоном", "Хворий"];
    }
    return [];
  };

  // Birthdays list state
  const [birthdayData, setBirthdayData] = useState<any>(null);
  const [bdayLoading, setBdayLoading] = useState(false);
  const [tgToken, setTgToken] = useState('');
  const [sendingStatus, setSendingStatus] = useState<{ success?: boolean; msg?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Dictionary editor state
  const [selectedDictKey, setSelectedDictKey] = useState<'opika' | 'slujinnya' | 'vidviduvanist' | 'prysutnist' | 'di_admin' | 'rayon'>('rayon');
  const [newDictValue, setNewDictValue] = useState('');
  const [dictItems, setDictItems] = useState<any[]>([]);
  const [saveStatus, setSaveStatus] = useState(false);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingItemVal, setEditingItemVal] = useState<string>('');
  
  const isAdmin = !currentSessionUser || currentSessionUser.level === 'IV-й' || (currentSessionUser.rayon === 'ЦЕНТР' && currentSessionUser.user?.includes('Черняк Вал.'));

  // Load birthdays
  const fetchBirthdays = async () => {
    setBdayLoading(true);
    try {
      const resp = await fetch('/api/birthdays');
      if (resp.ok) {
        const json = await resp.json();
        setBirthdayData(json);
      }
    } catch (_) {
    } finally {
      setBdayLoading(false);
    }
  };

  useEffect(() => {
    fetchBirthdays();
  }, [members]);

  // Load selected dictionary items from lookups
  useEffect(() => {
    setEditingItemIdx(null);
    setEditingItemVal('');
    if (lookups?.directories) {
      if (selectedDictKey === 'rayon') {
        const rayoni = lookups.directories.rayon || [];
        const bindings = lookups.directories.rayon_bindings || [];
        setDictItems(rayoni.map((r: any) => {
          const name = typeof r === 'string' ? r : (r?.name || "");
          const found = bindings.find((b: any) => (b.name || "").toLowerCase() === name.toLowerCase());
          return { name, presbyterId: found ? found.presbyterId : (r?.presbyterId || null) };
        }));
      } else if (selectedDictKey === 'opika') {
         const opikuni = lookups.directories.opika || [];
         const bindings = lookups.directories.opika_bindings || [];
         setDictItems(opikuni.map((o: any) => {
           const name = typeof o === 'string' ? o : (o?.name || "");
           const found = bindings.find((b: any) => (b.name || "").toLowerCase() === name.toLowerCase());
           return { name, rayon: found ? found.rayon : (o?.rayon || null) };
         }));
      } else {
        let list = lookups.directories[selectedDictKey] || [];
        if (selectedDictKey === 'vidviduvanist') {
          list = list.filter((item: string) => ["Постійно", "Періодично", "Рідко", "Ніколи"].includes(item));
          if (list.length === 0) list = ["Постійно", "Періодично", "Рідко", "Ніколи"];
        }
        setDictItems(list);
      }
    }
  }, [selectedDictKey, lookups]);

  // Handle Sync with Google Sheets
  const handleSyncWithSheets = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const resp = await fetch('/api/sync-sheets', { method: 'POST' });
      if (resp.ok) {
        const json = await resp.json();
        setSyncResult(json);
        await onRefreshLookups();
      } else {
        const err = await resp.json();
        setSyncResult({ error: err.error || 'Помилка синхронізації' });
      }
    } catch (err: any) {
      setSyncResult({ error: err.message || 'Помилка зв\'язку з сервером' });
    } finally {
      setSyncLoading(false);
    }
  };

  // Trigger Weekly Birthdays Send
  const handleSendBirthdays = async (type: 'telegram_me' | 'telegram_group' | 'email_text' | 'email_pdf') => {
    setSendingStatus({ msg: 'Надсилання розписку...' });
    try {
      const resp = await fetch('/api/birthdays/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          customToken: tgToken || undefined
        })
      });
      if (resp.ok) {
        const json = await resp.json();
        setSendingStatus({ success: true, msg: json.logs || json.message });
      } else {
        setSendingStatus({ success: false, msg: 'Помилка виконання на сервері' });
      }
    } catch (err: any) {
      setSendingStatus({ success: false, msg: err.message });
    }
    setTimeout(() => setSendingStatus(null), 8000);
  };

  // Copy birthday text list to clipboard
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save changes to directories lists back to server
  const handleSaveDictionary = async () => {
    if (!lookups?.directories) return;
    try {
      let finalVal: any = dictItems;
      let extraPayload: any = {};

      if (selectedDictKey === 'rayon') {
        const strList = dictItems.map((i: any) => typeof i === 'string' ? i : i.name);
        finalVal = strList;
        extraPayload = {
          rayon: strList,
          rayon_bindings: dictItems
        };
      } else if (selectedDictKey === 'opika') {
        const strList = dictItems.map((i: any) => typeof i === 'string' ? i : i.name);
        finalVal = strList;
        extraPayload = {
          opika: strList,
          opika_bindings: dictItems
        };
      }

      const payload = {
        ...lookups.directories,
        [selectedDictKey]: finalVal,
        ...extraPayload
      };
      
      const resp = await fetch('/api/directories/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        // Propagate renames for simple string lists
        if (selectedDictKey !== 'rayon' && selectedDictKey !== 'opika') {
          const oldList = lookups?.directories[selectedDictKey] || [];
          const newList = finalVal;
          if (oldList.length === newList.length) {
            const renames = [];
            for (let i = 0; i < oldList.length; i++) {
              if (oldList[i] !== newList[i]) {
                renames.push({ oldVal: oldList[i], newVal: newList[i] });
              }
            }
            
            if (renames.length > 0) {
              const fieldMap: Record<string, string> = {
                'prysutnist': 'prysutnist',
                'vidviduvanist': 'vidviduvanist',
                'slujinnya': 's_slujinnya_spysok'
              };
              const fieldName = fieldMap[selectedDictKey];
              if (fieldName) {
                for (const { oldVal, newVal } of renames) {
                  const affectedMembers = members.filter(m => (m as any)[fieldName] === oldVal);
                  for (const m of affectedMembers) {
                    await onUpdateMember(m.id, { [fieldName]: newVal } as any);
                  }
                }
              }
            }
          }
        }

        setSaveStatus(true);
        await onRefreshLookups();
        setTimeout(() => setSaveStatus(false), 2000);
      }
    } catch (_) {}
  };

  const handleAddDictItem = () => {
    const trimmed = newDictValue.trim();
    if (trimmed) {
      if (selectedDictKey === 'rayon') {
        const alreadyExists = dictItems.some(i => (typeof i === 'string' ? i : i.name).toLowerCase() === trimmed.toLowerCase());
        if (!alreadyExists) {
          setDictItems(prev => [...prev, { name: trimmed, presbyterId: null }]);
          setNewDictValue('');
        }
      } else if (selectedDictKey === 'opika') {
        const alreadyExists = dictItems.some(i => (typeof i === 'string' ? i : i.name).toLowerCase() === trimmed.toLowerCase());
        if (!alreadyExists) {
          setDictItems(prev => [...prev, { name: trimmed, rayon: null }]);
          setNewDictValue('');
        }
      } else {
        if (!dictItems.includes(trimmed)) {
          setDictItems(prev => [...prev, trimmed]);
          setNewDictValue('');
        }
      }
    }
  };

  const handleRemoveDictItem = (itemToDelete: any) => {
    setDictItems(prev => prev.filter(i => {
      const nameCurrent = typeof i === 'string' ? i : i.name;
      const nameDelete = typeof itemToDelete === 'string' ? itemToDelete : itemToDelete.name;
      return nameCurrent !== nameDelete;
    }));
  };

  const handleSaveItemEdit = (idx: number) => {
    const trimmed = editingItemVal.trim();
    if (!trimmed) return;

    setDictItems(prev => {
      const updated = [...prev];
      if (selectedDictKey === 'rayon') {
        updated[idx] = typeof updated[idx] === 'string'
          ? trimmed
          : { ...updated[idx], name: trimmed };
      } else if (selectedDictKey === 'opika') {
        updated[idx] = typeof updated[idx] === 'string'
          ? trimmed
          : { ...updated[idx], name: trimmed };
      } else {
        updated[idx] = trimmed;
      }
      return updated;
    });
    setEditingItemIdx(null);
    setEditingItemVal('');
  };

  // Switch session simulate login w/ password gate
  const handleSimulateLogin = (userRec: any) => {
    const requiredPassword = userRec.password || "";
    if (requiredPassword && requiredPassword !== "—" && requiredPassword !== "") {
      const enteredPassword = prompt(`Введіть ПАРОЛЬ для входу в сесію ${userRec.user}:`);
      if (enteredPassword === null) return; // cancelled
      if (enteredPassword !== requiredPassword) {
        alert("Помилка: невірний пароль!");
        return;
      }
    }
    onSetSessionUser(userRec);
  };

  const UKR_DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];

  return (
    <div id="dir_manager_tab" className="bg-[#12282e] rounded-2xl border border-[#224853] shadow-lg p-4 flex flex-col md:flex-row gap-4 min-h-[480px] animate-fade-in select-text text-slate-100">
      
      {/* Sidebar Sub Tab Controls */}
      <div className="w-full md:w-56 shrink-0 flex flex-col space-y-1 border-r border-[#224853]/50 pr-0 md:pr-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1">Навігація кабінету</h3>
        
        <button
          onClick={() => setActiveSubTab('birthdays')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all outline-none text-left ${activeSubTab === 'birthdays' ? "bg-[#387d7a] text-white shadow-sm scale-[1.01]" : "text-slate-300 hover:bg-[#1a3843] hover:text-white"}`}
        >
          <Cake className="h-4 w-4 text-amber-500 shrink-0" />
          <span>🎂 Іменинники тижня</span>
        </button>

        <button
          onClick={() => setActiveSubTab('dicts')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all outline-none text-left ${activeSubTab === 'dicts' ? "bg-[#387d7a] text-white shadow-sm scale-[1.01]" : "text-slate-300 hover:bg-[#1a3843] hover:text-white"}`}
        >
          <Users className="h-4 w-4 text-sky-400 shrink-0" />
          <span>📚 Списки</span>
        </button>

        <button
          onClick={() => setActiveSubTab('colors')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all outline-none text-left ${activeSubTab === 'colors' ? "bg-[#387d7a] text-white shadow-sm scale-[1.01]" : "text-slate-300 hover:bg-[#1a3843] hover:text-white"}`}
        >
          <Palette className="h-4 w-4 text-violet-400 shrink-0" />
          <span>🎨 Кольори</span>
        </button>

        <button
          onClick={() => setActiveSubTab('access')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all outline-none text-left ${activeSubTab === 'access' ? "bg-[#387d7a] text-white shadow-sm scale-[1.01]" : "text-slate-300 hover:bg-[#1a3843] hover:text-white"}`}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-450 shrink-0" />
          <span>🔑 Доступ</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sync')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all outline-none text-left ${activeSubTab === 'sync' ? "bg-[#387d7a] text-white shadow-sm scale-[1.01]" : "text-slate-300 hover:bg-[#1a3843] hover:text-white"}`}
        >
          <RefreshCw className="h-4 w-4 text-rose-455 shrink-0" />
          <span>🔄 Хмарна Синхронізація</span>
        </button>

        {currentSessionUser && (
          <div className="mt-auto pt-4 border-t border-[#224853]/50 flex flex-col space-y-2 px-2">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">🔐 Активна сесія:</span>
              <div className="text-[11px] font-bold text-slate-100 truncate">{currentSessionUser.user}</div>
              <div className="text-[10px] font-semibold text-slate-400">{currentSessionUser.position || "Співслужбовець"}</div>
              <div className="inline-block bg-[#1a3843] text-white rounded px-1 py-0.5 text-[8px] font-mono leading-none tracking-wider uppercase font-bold mt-1">
                {currentSessionUser.rayon}
              </div>
            </div>
            <button
              onClick={() => onSetSessionUser(null)}
              className="flex items-center justify-center space-x-1 rounded-lg border border-[#224853] hover:border-rose-400 hover:bg-rose-950/40 text-[9px] font-bold text-slate-300 hover:text-rose-300 py-1 transition-colors uppercase tracking-wider bg-[#1a3843]/50"
            >
              <LogOut className="h-3 w-3" />
              <span>Скинути сесію</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Panel Content Workspace */}
      <div className="flex-1 min-w-0">
        
        {/* SUBTAB 1: BIRTHDAYS MANAGER */}
        {activeSubTab === 'birthdays' && (
          <div className="space-y-4 animate-fade-in text-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#224853]/55 pb-2.5">
              <div>
                <h2 className="font-display text-lg font-black text-white tracking-tight flex items-center gap-1.5">🎂 Іменинники поточного тижня</h2>
                <p className="text-[11px] text-slate-400">Автоматичний розрахунок за списком членів із виявленням ювілярів</p>
              </div>
              <span className="bg-[#1a3843] border border-[#224853] text-[#cfdfe2] rounded-lg px-2.5 py-1 text-[11px] font-bold inline-flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Тиждень: {birthdayData?.weekRangeText || 'н/д'}</span>
              </span>
            </div>

            {bdayLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-750 border-t-amber-500"></div>
                <span className="text-[10px] text-slate-450 font-bold uppercase tracking-widest leading-none">Розрахунок дат...</span>
              </div>
            ) : !birthdayData || birthdayData.list.length === 0 ? (
              <div className="rounded-xl border border-[#224853]/40 bg-[#13282e]/50 p-8 text-center text-slate-400">
                <AlertCircle className="h-8 w-8 text-slate-500 mx-auto mb-2 animate-pulse" />
                <div className="text-xs font-bold">На цьому тижні святкових дат немає</div>
                <p className="text-[10px] text-slate-450 mt-1 max-w-sm mx-auto">Система опрацьовує іменинників автоматично при додаванні або зміні дат народження в банку даних.</p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Visual Cards Summary Indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-[#224853]/40 bg-[#13282e] p-3 shadow-xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Усього іменинників</span>
                    <div className="font-display text-lg font-black text-sky-400">{birthdayData.list.length} осіб</div>
                  </div>
                  <div className="rounded-lg border border-[#224853]/40 bg-[#13282e] p-3 shadow-xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Ювілеї (кратні 10 рокам)</span>
                    <div className="font-display text-lg font-black text-amber-450">
                      🎖️ {birthdayData.list.filter((x: any) => x.isJubilee).length} ювілярів
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#224853]/40 bg-[#13282e] p-3 shadow-xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Середній вік</span>
                    <div className="font-display text-lg font-black text-emerald-400">
                      {Math.round(birthdayData.list.reduce((acc: number, cur: any) => acc + cur.age, 0) / birthdayData.list.length)} років
                    </div>
                  </div>
                </div>

                {/* Table list */}
                <div className="rounded-lg border border-[#224853]/55 overflow-x-auto bg-[#13282e]/40">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#13282e] border-b border-[#224853]/60 text-[10px] font-bold text-slate-305 uppercase tracking-wider">
                        <th className="p-2 px-2.5">Дата святкування / День</th>
                        <th className="p-2 px-2.5">Член церкви</th>
                        <th className="p-2 px-2.5">Вік / Статус</th>
                        <th className="p-2 px-2.5">Контакти</th>
                        <th className="p-2 px-2.5">Підзвітний сектор</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#224853]/30 text-xs">
                      {birthdayData.list.map((item: any) => {
                        const day = UKR_DAYS[item.dayOfWeekNum];
                        const dateFormatted = item.celebrationDate.split('-').reverse().slice(0,2).join('.');
                        return (
                          <tr key={item.id} className="hover:bg-[#1a3843]/35 transition-colors">
                            <td className="p-2 px-2.5">
                              <span className="font-bold text-slate-100 block text-xs">{day}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{dateFormatted} (н/д)</span>
                            </td>
                            <td className="p-2 px-2.5">
                              <div className="font-bold text-slate-100 flex items-center space-x-1.5 animate-none">
                                <span>{item.cleanName}</span>
                                {item.fullName !== item.cleanName && (
                                  <span className="text-[10px] text-slate-400 font-normal italic leading-none truncate max-w-[120px]">(дівоче: {item.fullName.split('(')[1]?.replace(')', '')})</span>
                                )}
                              </div>
                              <span className="text-[10px] font-medium text-slate-400">{item.gender || item.stat}</span>
                            </td>
                            <td className="p-2 px-2.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-slate-200">{item.age} років</span>
                                {item.isJubilee && (
                                  <span className="bg-amber-950/80 border border-amber-600 text-amber-300 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider animate-pulse flex items-center shrink-0">
                                    🎖️ Ювіляр
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 px-2.5 text-slate-300 font-mono">
                              {item.tel_mob || <span className="text-slate-500 italic">немає</span>}
                            </td>
                            <td className="p-2 px-2.5 font-medium">
                              <span className="bg-[#1a3843] text-slate-250 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold inline-block border border-[#224853] mr-1">
                                {item.rayon2_ukr || "Центр"}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">Оп: {item.presviter || "не вказано"}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Automation trigger interface panel */}
                <div id="trigger_newsletter_card" className="rounded-xl border border-[#224853]/55 bg-[#13282e]/40 p-4 space-y-3">
                  <div className="border-b border-[#224853]/50 pb-2">
                    <h3 className="font-bold text-white text-xs tracking-wide">📣 Канали оповіщення та розсилки</h3>
                    <p className="text-[10px] text-slate-400">Швидке надсилання сформованого звіту тижня за вказаними координатами</p>
                  </div>

                  {sendingStatus && (
                    <div className={`rounded-lg border p-2.5 flex items-start space-x-2 text-xs transition-all ${sendingStatus.success === undefined ? "bg-[#1a3843] border-blue-500/30 text-blue-300" : (sendingStatus.success ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-300" : "bg-rose-950/80 border-rose-500/30 text-rose-300")}`}>
                      {sendingStatus.success === undefined ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent shrink-0 mt-0.5"></div>
                      ) : (
                        sendingStatus.success ? <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      )}
                      <div className="leading-snug">
                        <span className="font-bold block">Статус доставки:</span>
                        <span className="font-mono text-[9px]">{sendingStatus.msg}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Channel 1: Telegram Bot Dispatch API */}
                    <div className="rounded-lg border border-[#224853]/45 bg-[#13282e] p-3 space-y-2.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-200 flex items-center space-x-1.5">
                          <span className="bg-[#1a3843] rounded-lg p-1 inline-block shrink-0 border border-[#224853]">
                            <Send className="h-3.5 w-3.5 text-sky-400" />
                          </span>
                          <span>Телеграм сповіщення</span>
                        </span>
                        <span className="text-[8px] bg-[#1a3843] text-slate-350 border border-[#224853]/60 font-bold px-1.5 py-0.5 rounded-full uppercase leading-none">Бот API</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">TELEGRAM BOT TOKEN (опціонально для перевірки)</label>
                        <input
                          type="password"
                          placeholder="Введіть токен бота (напр. 61234567:AAFe...)"
                          value={tgToken}
                          onChange={(e) => setTgToken(e.target.value)}
                          className="w-full rounded bg-[#13282e] border border-[#224853] text-white p-1.5 text-[11px] focus:ring-1 focus:ring-sky-500 focus:outline-none placeholder-slate-500"
                        />
                        <p className="text-[8px] text-slate-450 mt-0.5 leading-tight">Бот повинен бути доданий у чат-отримувач для здійснення реальних відправок.</p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-1.5 pt-1">
                        <button
                          onClick={() => handleSendBirthdays('telegram_me')}
                          className="flex-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-[#224853] text-white p-2 text-center text-[10px] font-bold tracking-tight shadow-md flex items-center justify-center space-x-1 transition-all outline-none"
                        >
                          <Send className="h-3 w-3 text-sky-400" />
                          <span>Надіслати мені</span>
                        </button>
                        <button
                          onClick={() => handleSendBirthdays('telegram_group')}
                          className="flex-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white p-2 text-center text-[10px] font-bold tracking-tight shadow-md flex items-center justify-center space-x-1 transition-all outline-none"
                        >
                          <Users className="h-3 w-3" />
                          <span>ЦЕРКОВНА РАДА</span>
                        </button>
                      </div>
                    </div>

                    {/* Channel 2: Email PDF/HTML Report Delivery */}
                    <div className="rounded-lg border border-[#224853]/45 bg-[#13282e] p-3 space-y-2.5 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-200 flex items-center space-x-1.5">
                            <span className="bg-[#1a3843] rounded-lg p-1 inline-block shrink-0 border border-[#224853]">
                              <Mail className="h-3.5 w-3.5 text-emerald-400" />
                            </span>
                            <span>Email Рассылка (Майже реальна)</span>
                          </span>
                          <span className="text-[8px] bg-[#1a3843] text-emerald-400 border border-[#224853]/60 font-bold px-1.5 py-0.5 rounded-full uppercase leading-none">PDF / Текст</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                          У повній відповідності з GAS-сценарієм, тригер надсилає листи на наступні адреси: <br />
                          <span className="font-mono text-[9px] text-slate-350 font-semibold block mt-0.5 truncate">kostel.if.ua@gmail.com, liliiachupryna@gmail.com, solbo1971@gmail.com</span>
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-1.5 pt-2">
                        <button
                          onClick={() => handleSendBirthdays('email_text')}
                          className="flex-1 rounded-lg border border-[#224853] hover:bg-[#1a3843] text-slate-200 p-1.5 text-[10px] font-bold transition-all flex items-center justify-center space-x-1"
                        >
                          <Mail className="h-3 w-3" />
                          <span>Надіслати Текст</span>
                        </button>
                        <button
                          onClick={() => handleSendBirthdays('email_pdf')}
                          className="flex-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white p-2 text-[10px] font-bold shadow-md transition-all flex items-center justify-center space-x-1"
                        >
                          <Send className="h-3 w-3" />
                          <span>Надіслати PDF звіт</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Clipboard Text generator */}
                  <div className="rounded-lg border border-[#224853]/45 bg-[#13282e] p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                      <span>📝 Попередній перегляд текстового звіту</span>
                      <button
                        onClick={() => {
                          let cleanText = `🎂 ІМЕНИННИКИ НА ТИЖДЕНЬ: ${birthdayData.weekRangeText} 🎂\n\n`;
                          birthdayData.list.forEach((item: any, idx: number) => {
                            const dayName = UKR_DAYS[item.dayOfWeekNum];
                            const dateFormatted = item.celebrationDate.split('-').reverse().join('.');
                            const jubileeText = item.isJubilee ? ` 🎖️ ЮВІЛЕЙ: ${item.age} років!` : ` (${item.age} років)`;
                            cleanText += `${idx + 1}. ${item.shortName} — ${dayName}, ${dateFormatted}${jubileeText}\n`;
                            if (item.tel_mob) cleanText += `   📞 Тел: ${item.tel_mob}\n`;
                            if (item.rayon2_ukr) cleanText += `   📍 Район: ${item.rayon2_ukr}\n`;
                            cleanText += `\n`;
                          });
                          handleCopyToClipboard(cleanText);
                        }}
                        className="text-white hover:text-sky-305 flex items-center space-x-1 outline-none font-bold text-[10px] bg-[#1a3843] border border-[#224853] hover:border-slate-550 rounded px-2 py-1 transition-all"
                      >
                        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copied ? 'Скопійовано!' : 'Скопіювати звіт'}</span>
                      </button>
                    </div>
                    <pre className="text-[9px] font-mono text-slate-400 bg-[#0f1f23]/60 rounded-lg p-2 max-h-[100px] overflow-y-auto overflow-x-hidden leading-relaxed break-all whitespace-pre-wrap border border-[#224853]/20">
                      {`🎂 ІМЕНИННИКИ НА ТИЖДЕНЬ: ${birthdayData.weekRangeText} 🎂\n\n` + 
                       birthdayData.list.map((item: any, idx: number) => {
                         const dayName = UKR_DAYS[item.dayOfWeekNum];
                         const dateFormatted = item.celebrationDate.split('-').reverse().join('.');
                         const jubileeText = item.isJubilee ? ` 🎖️ ЮВІЛЕЙ: ${item.age} років!` : ` (${item.age} років)`;
                         return `${idx + 1}. ${item.shortName} — ${dayName}, ${dateFormatted}${jubileeText}\n` + 
                                (item.tel_mob ? `   📞 Тел: ${item.tel_mob}\n` : '') + 
                                (item.rayon2_ukr ? `   📍 Район: ${item.rayon2_ukr}\n` : '');
                       }).join('\n')}
                    </pre>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: DICTIONARIES LIST CONTROL PANEL */}
        {activeSubTab === 'dicts' && (
          <div className="space-y-4 animate-fade-in text-slate-200">
            <div>
              <h2 className="font-display text-lg font-black text-white tracking-tight">📚 Редактор системних довідників параметрів</h2>
              <p className="text-[11px] text-slate-400">Дозволяє коригувати варіанти вибору dropdown-параметрів для полів анкет (опікуни, відвідуваність, причина відсутності)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Left Select list to toggle directories target */}
              <div className="md:col-span-1 space-y-1.5">
                <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest block px-1">Оберіть довідник:</span>
                <div className="flex flex-col space-y-1">
                  {[
                    { id: 'rayon', title: 'Райони структури' },
                    { id: 'opika', title: 'Опікуни' },
                    { id: 'slujinnya', title: 'Служіння' },
                    { id: 'vidviduvanist', title: 'Характеристики відвідування' },
                    { id: 'prysutnist', title: 'Причина відсутності' },
                    { id: 'di_admin', title: 'Завдання для адміна' }
                  ].map(x => (
                    <button
                      key={x.id}
                      onClick={() => setSelectedDictKey(x.id as any)}
                      className={`text-left p-2 text-[11px] font-bold rounded-lg transition-all outline-none ${selectedDictKey === x.id ? "bg-[#387d7a] text-white shadow-xs" : "hover:bg-[#1a3843] text-slate-300"}`}
                    >
                      {x.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right editable tag grid */}
              <div className="md:col-span-2 space-y-3">
                
                {/* Helpful explanatory note matching selected dictionary and church guidelines */}
                <div className="bg-[#13282e]/55 border border-[#224853]/60 rounded-lg p-2.5 text-[10px] text-slate-300 leading-relaxed font-medium">
                  {selectedDictKey === 'opika' && (
                    <span>
                      👥 <strong>Опікуни:</strong> Опікуни, які призначені пресвітерами з числа служителів нашої єдиної громади (ієрархія служителів: ст. пастор, пресвітери, диякони, відповідальні за служіння). Прив'язка опікуна до району.
                    </span>
                  )}
                  {selectedDictKey === 'di_admin' && (
                    <span>
                      ⚙️ <strong>Завдання для адміна:</strong> Дільничі або дияконські адміністративні одиниці (переведення на каскади та центри). Це завдання адміністративних переміщень членів церкви, які поки що виконує адміністратор.
                    </span>
                  )}
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
                      ❓ <strong>Причина відсутності:</strong> Довідник причин, через які опікувані члени могли пропустити богослужіння.
                    </span>
                  )}
                  {selectedDictKey === 'rayon' && (
                    <span>
                      🗺️ <strong>Райони структури:</strong> Окремі географічні або адміністративні райони та групи (наприклад, ЦЕНТР, КАСКАД, АЕРОПОРТ), що дозволяють групувати членів церкви для територіального опікунства та комунікації. Пресвітер за районом.
                    </span>
                  )}
                </div>

                {/* Items tag board */}
                <div className={`rounded-lg border border-[#224853]/55 p-3 bg-[#13282e]/40 space-y-2 ${
                  selectedDictKey === 'rayon' ? 'h-auto overflow-visible' : 'h-[280px] overflow-y-auto'
                }`}>
                  {/* ADD ITEM INPUT */}
                  {selectedDictKey && (
                    <div className="flex gap-2 p-2 bg-[#1a3843]/50 rounded-lg mb-2">
                      <input 
                        type="text" 
                        value={newDictValue} 
                        onChange={(e) => setNewDictValue(e.target.value)}
                        className="bg-[#12282e] border border-[#224853] text-xs text-white rounded p-1.5 flex-1 focus:outline-none focus:border-sky-500"
                        placeholder={
                          selectedDictKey === 'rayon' 
                            ? "Назва нового району..." 
                            : selectedDictKey === 'opika' 
                              ? "Ім'я нового опікуна..." 
                              : selectedDictKey === 'slujinnya'
                                ? "Назва нового служіння..."
                                : selectedDictKey === 'vidviduvanist'
                                  ? "Новий статус відвідування..."
                                  : selectedDictKey === 'prysutnist'
                                    ? "Нова причина відсутності..."
                                    : "Нове завдання для адміна..."
                        }
                      />
                      <button 
                        onClick={handleAddDictItem} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Додати
                      </button>
                    </div>
                  )}

                  {dictItems.length === 0 ? (
                    <div className="text-center text-slate-500 py-12 text-xs">Довідник пустий. Додайте перші значення.</div>
                  ) : (
                    <div>
                      {selectedDictKey === 'rayon' ? (
                        <div className="space-y-2.5">
                          {dictItems.map((item: any, idx: number) => {
                            const name = typeof item === 'string' ? item : item.name;
                            const presbyterIdVal = typeof item === 'string' ? '' : (item.presbyterId || '');
                            return (
                              <div key={idx} className="bg-[#1a3843] border border-[#224853] p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                {editingItemIdx === idx ? (
                                  <div className="flex items-center space-x-2 flex-1">
                                    <span className="text-xs shrink-0">📍</span>
                                    <input
                                      type="text"
                                      value={editingItemVal}
                                      onChange={(e) => setEditingItemVal(e.target.value)}
                                      className="bg-[#12282e] border border-sky-500 text-xs text-white rounded px-2 py-1 focus:outline-none font-bold w-full max-w-[200px]"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveItemEdit(idx);
                                        } else if (e.key === 'Escape') {
                                          setEditingItemIdx(null);
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => handleSaveItemEdit(idx)}
                                      className="text-emerald-400 hover:text-emerald-300 p-1 shrink-0"
                                      title="Зберегти"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingItemIdx(null)}
                                      className="text-slate-400 hover:text-slate-300 p-1 shrink-0"
                                      title="Скасувати"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-black text-slate-100 uppercase tracking-wide">📍 {name}</span>
                                    <button
                                      onClick={() => {
                                        setEditingItemIdx(idx);
                                        setEditingItemVal(name);
                                      }}
                                      className="text-slate-400 hover:text-teal-300 p-0.5 rounded transition-colors shrink-0"
                                      title="Редагувати назву"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 font-bold shrink-0">
                                    {presbyterIdVal && members.find(m => m.id === Number(presbyterIdVal))?.di_admin ? 
                                      (members.find(m => m.id === Number(presbyterIdVal))?.di_admin || 'Керівник') : 'Пресвітер'}:
                                  </span>
                                  <select
                                    value={presbyterIdVal}
                                    onChange={(e) => {
                                      const updated = [...dictItems];
                                      updated[idx] = { ...updated[idx], presbyterId: e.target.value ? Number(e.target.value) : null };
                                      setDictItems(updated);
                                    }}
                                    className="bg-[#12282e] border border-[#224853] text-[11.5px] font-bold text-teal-300 rounded-lg px-2 py-1 focus:outline-none"
                                  >
                                    <option value="">— Оберіть... —</option>
                                    {(() => {
                                      const candidates = members.filter(m => {
                                        const isActive = Number(m.id_vybuttya || 0) === 0;
                                        const isBrother = (m.gender || m.stat) === 'брат';
                                        const isPresbyter = (m.di_admin || "").toLowerCase().includes("пресвітер") || (m.di_admin || "").toLowerCase().includes("єпископ");
                                        return isActive && isBrother && isPresbyter;
                                      }).sort((a,b) => (a.pib || "").localeCompare(b.pib || ""));
                                      
                                      return candidates.map((m: any) => (
                                        <option key={m.id} value={m.id}>
                                          👨‍💼 {getFormattedPibForPresbyter(m, candidates)}
                                        </option>
                                      ));
                                    })()}
                                  </select>
                                  <button
                                    onClick={() => handleRemoveDictItem(item)}
                                    className="text-slate-400 hover:text-red-400 hover:bg-rose-950/45 p-1 rounded-lg transition-colors outline-none shrink-0"
                                    title="Видалити район"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : selectedDictKey === 'opika' ? (
                        <div className="space-y-2.5">
                          {dictItems.map((item: any, idx: number) => {
                            const name = typeof item === 'string' ? item : item.name;
                            const rayonVal = typeof item === 'string' ? '' : (item.rayon || '');
                            // Obtain current rayon list strings for linking
                            const rayonList = lookups?.directories?.rayon || [];
                            const rayonNamesList = rayonList.map((r: any) => typeof r === 'string' ? r : (r?.name || ""));
                            return (
                              <div key={idx} className="bg-[#1a3843] border border-[#224853] p-2.5 rounded-xl flex flex-row items-center justify-between gap-3 shadow-xs">
                                {editingItemIdx === idx ? (
                                  <div className="flex items-center space-x-2 flex-1 min-w-0 pr-2">
                                    <span className="text-xs shrink-0">👥</span>
                                    <input
                                      type="text"
                                      value={editingItemVal}
                                      onChange={(e) => setEditingItemVal(e.target.value)}
                                      className="bg-[#12282e] border border-sky-500 text-xs text-white rounded px-2 py-1 focus:outline-none font-bold w-full"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveItemEdit(idx);
                                        } else if (e.key === 'Escape') {
                                          setEditingItemIdx(null);
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => handleSaveItemEdit(idx)}
                                      className="text-emerald-400 hover:text-emerald-300 p-1 shrink-0"
                                      title="Зберегти"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingItemIdx(null)}
                                      className="text-slate-400 hover:text-slate-300 p-1 shrink-0"
                                      title="Скасувати"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2 min-w-0 pr-2">
                                    <span className="text-xs font-black text-slate-100 truncate whitespace-nowrap" title={name}>👥 {name}</span>
                                    <button
                                      onClick={() => {
                                        setEditingItemIdx(idx);
                                        setEditingItemVal(name);
                                      }}
                                      className="text-slate-400 hover:text-teal-300 p-0.5 rounded transition-colors shrink-0"
                                      title="Редагувати ім'я"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] text-slate-400 font-bold shrink-0">Район:</span>
                                  <select
                                    value={rayonVal}
                                    onChange={(e) => {
                                      const updated = [...dictItems];
                                      updated[idx] = { ...updated[idx], rayon: e.target.value || null };
                                      setDictItems(updated);
                                    }}
                                    className="bg-[#12282e] border border-[#224853] text-[11.5px] font-bold text-teal-300 rounded-lg px-2 py-1 focus:outline-none"
                                  >
                                    <option value="">— Оберіть... —</option>
                                    {rayonNamesList.map((rName: string) => (
                                      <option key={rName} value={rName}>📍 {rName}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleRemoveDictItem(item)}
                                    className="text-slate-400 hover:text-red-400 hover:bg-rose-950/45 p-1 rounded-lg transition-colors outline-none shrink-0"
                                    title="Видалити опікуна"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {dictItems.map((item, idx) => {
                            const name = typeof item === 'string' ? item : item.name;
                            if (editingItemIdx === idx) {
                              return (
                                <div key={idx} className="bg-[#1a3843] border border-sky-500 px-2 py-0.5 rounded-lg text-xs font-bold text-white inline-flex items-center space-x-1 shadow-xs">
                                  <input
                                    type="text"
                                    value={editingItemVal}
                                    onChange={(e) => setEditingItemVal(e.target.value)}
                                    className="bg-[#12282e] text-xs text-white rounded px-1.5 py-0.5 focus:outline-none w-28 font-bold"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveItemEdit(idx);
                                      } else if (e.key === 'Escape') {
                                        setEditingItemIdx(null);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveItemEdit(idx)}
                                    className="text-emerald-400 hover:text-emerald-300 p-0.5"
                                    title="Зберегти"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingItemIdx(null)}
                                    className="text-slate-400 hover:text-slate-300 p-0.5"
                                    title="Скасувати"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            }
                            return (
                              <span key={idx} className="bg-[#1a3843] border border-[#224853] pl-2.5 pr-1.5 py-0.5 rounded-lg text-xs font-bold text-slate-200 transition-all inline-flex items-center space-x-1.5 shadow-xs group cursor-default">
                                <span>{name}</span>
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => {
                                      setEditingItemIdx(idx);
                                      setEditingItemVal(name);
                                    }}
                                    className="text-slate-400 hover:text-teal-300 transition-colors p-0.5 outline-none"
                                    title="Редагувати"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveDictItem(item)}
                                    className="text-slate-400 hover:text-red-400 transition-colors p-0.5 outline-none"
                                    title="Видалити"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Save actions */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveDictionary}
                    className="bg-[#387d7a] hover:bg-[#32716e] border border-[#224853] text-white font-black text-xs px-4 py-2 rounded-lg shadow-md transition-colors outline-none flex items-center space-x-1.5"
                  >
                    <Check className="h-4 w-4" />
                    <span>Застосувати зміни списку</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* SUBTAB 3: ACCESSIBILITY MAPPING LIST & LOG ACTIONS */}
        {activeSubTab === 'access' && (() => {
          const isAdmin = !currentSessionUser || currentSessionUser.level === 'IV-й' || (currentSessionUser.rayon === 'ЦЕНТР' && currentSessionUser.user?.includes('Черняк Вал.'));
          return (
            <div className="space-y-4 animate-fade-in text-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-black text-white tracking-tight">🔑 ДОСТУП</h2>
                </div>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setActiveAccessSubTab('sectors')}
                    className={`text-xs font-bold px-3 py-1 rounded ${activeAccessSubTab === 'sectors' ? 'bg-sky-700 text-white' : 'bg-[#1a3843] text-slate-400'}`}
                  >
                    Карта секторів доступу
                  </button>
                  <button
                    onClick={() => setActiveAccessSubTab('levels')}
                    className={`text-xs font-bold px-3 py-1 rounded ${activeAccessSubTab === 'levels' ? 'bg-sky-700 text-white' : 'bg-[#1a3843] text-slate-400'}`}
                  >
                    Карта рівнів доступу
                  </button>
                </div>
                
                {isAdmin && (
                  <div className="flex items-center gap-2 flex-wrap sm:self-auto self-start">
                    {activeAccessSubTab === 'sectors' && (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveSectorsToFirebase}
                          disabled={sectorsSaveLoading}
                          className="bg-[#2a6d8c] hover:bg-[#20536c] text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow transition-all outline-none"
                        >
                          <Save className={`h-3.5 w-3.5 ${sectorsSaveLoading ? "animate-spin" : ""}`} />
                          <span>{sectorsSaveLoading ? "Збереження..." : "Зберегти в базі"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccessUser(null);
                            setAccessUser('');
                            setAccessLevel('І-й');
                            setAccessPosition('');
                            setAccessTelegramId('');
                            setAccessPassword('');
                            setAccessRayon('ВСІ');
                            setShowAccessForm(!showAccessForm);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow transition-all outline-none"
                        >
                          <UserPlus className="h-4 w-4" />
                          <span>{showAccessForm && !editingAccessUser ? "Сховати форму" : "Додати користувача"}</span>
                        </button>
                      </>
                    )}

                    {activeAccessSubTab === 'levels' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddNewRoleField}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow transition-all outline-none"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Додати поле</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveLevelsToFirebase}
                          disabled={levelsSaveLoading}
                          className="bg-[#2a6d8c] hover:bg-[#20536c] text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow transition-all outline-none"
                        >
                          <Save className={`h-3.5 w-3.5 ${levelsSaveLoading ? "animate-spin" : ""}`} />
                          <span>{levelsSaveLoading ? "Збереження..." : "Зберегти в базі"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {activeAccessSubTab === 'sectors' && (
                <>
                  {isAdmin && showAccessForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                      <div className="bg-[#13282e] border border-[#224853] rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 border-b border-[#224853]/45">
                          <div className="flex items-center space-x-2">
                            <ShieldAlert className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                            <span className="font-bold text-xs uppercase tracking-wider text-slate-250">
                              {editingAccessUser ? `Редагування користувача: ${editingAccessUser.user}` : "Створення нового користувача"}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setShowAccessForm(false);
                              setEditingAccessUser(null);
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                        <form onSubmit={handleSaveAccessUser} className="p-4 space-y-3 overflow-y-auto">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1">Служитель (ПІБ)</label>
                              <input
                                type="text"
                                required
                                placeholder="Напр. Черняк Вал."
                                value={accessUser}
                                onChange={e => setAccessUser(e.target.value)}
                                className="w-full bg-slate-900 border border-[#224853]/70 rounded px-2.5 py-1.5 text-white placeholder-slate-500 font-medium outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1">Рівень доступу</label>
                              <select
                                value={accessLevel}
                                onChange={e => setAccessLevel(e.target.value)}
                                className="w-full bg-slate-900 border border-[#224853]/70 rounded px-2.5 py-1.5 text-white font-medium outline-none focus:border-emerald-500"
                              >
                                <option value="І-й">І-й рівень (Служитель/Сектор)</option>
                                <option value="ІІ-й">ІІ-й рівень (Диякон)</option>
                                <option value="ІІІ-й">ІІІ-й рівень (Пресвітер)</option>
                                <option value="IV-й">IV-й рівень (Адміністратор)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1">Позиція за реєстром</label>
                              <input
                                type="text"
                                placeholder="Напр. Диякон, Пресвітер"
                                value={accessPosition}
                                onChange={e => setAccessPosition(e.target.value)}
                                className="w-full bg-slate-900 border border-[#224853]/70 rounded px-2.5 py-1.5 text-white placeholder-slate-500 font-medium outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1">Телеграм ID</label>
                              <input
                                type="text"
                                placeholder="Напр. 969538290"
                                value={accessTelegramId}
                                onChange={e => setAccessTelegramId(e.target.value)}
                                className="w-full bg-slate-900 border border-[#224853]/70 rounded px-2.5 py-1.5 text-white placeholder-slate-500 font-mono outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1">Пароль</label>
                              <input
                                type="text"
                                placeholder="Вкажіть пароль для входу"
                                value={accessPassword}
                                onChange={e => setAccessPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-[#224853]/70 rounded px-2.5 py-1.5 text-white placeholder-slate-500 font-mono outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1">Сектор / Район опіки</label>
                              <select
                                value={accessRayon}
                                onChange={e => setAccessRayon(e.target.value)}
                                className="w-full bg-slate-900 border border-[#224853]/70 rounded px-2.5 py-1.5 text-white font-medium outline-none focus:border-emerald-500"
                              >
                                <option value="ВСІ">ВСІ</option>
                                {(() => {
                                  // Gather structural areas and sort them in Ukrainian alphabetical order
                                  const raw = (lookups?.directories?.rayon2 || ["ЦЕНТР", "АЕРОПОРТ", "КАСКАД", "ОБ'ЇЗНА"]) as string[];
                                  const uniqueRayons = Array.from(new Set(
                                    raw.map(r => String(r || '').trim().toUpperCase()).filter(Boolean)
                                  )).sort((a, b) => a.localeCompare(b, 'uk'));
                                  
                                  return uniqueRayons.map((r: string) => (
                                    <option key={r} value={r}>{r}</option>
                                  ));
                                })()}
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2 pt-4">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAccessForm(false);
                                setEditingAccessUser(null);
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded font-bold transition-all outline-none"
                            >
                              Скасувати
                            </button>
                            <button
                              type="submit"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-1.5 rounded font-black transition-all outline-none shadow-md flex items-center space-x-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>{editingAccessUser ? "Зберегти" : "Створити"}</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* List map */}
                  {activeAccessSubTab === 'sectors' && (
                  <div className="rounded-lg border border-[#224853]/55 overflow-hidden bg-[#13282e]/40">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#13282e] border-b border-[#224853]/60 text-[10px] font-bold text-slate-350 uppercase tracking-wider">
                            <th className="p-2 px-3">РІВЕНЬ ДОСТУПУ</th>
                            <th className="p-2 px-3">Служитель</th>
                            <th className="p-2 px-3">Позиція за реєстром</th>
                            <th className="p-2 px-3">ТЕЛЕГРАМ ID</th>
                            <th className="p-2 px-3">ПАРОЛЬ</th>
                            <th className="p-2 px-3 text-right">Дія сесії / Керування</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#224853]/30 text-xs">
                          {(lookups?.access || DEFAULT_DOSTUP).filter((v,i,a)=>a.findIndex(t=>(t.user === v.user && t.rayon===v.rayon))===i).sort((a,b) => (a.user || "").localeCompare(b.user || "")).map((ac: any, idx: number) => {
                            const isActiveUser = currentSessionUser?.user === ac.user;
                            // Determine user's level
                            const level = ac.level || (ac.rayon === "ЦЕНТР" && (ac.user || "").includes("Черняк Вал.") ? "IV-й" : 
                                          (ac.position || "").includes("Пресвітер") ? "ІІІ-й" : 
                                          (ac.position || "").includes("Диякон") ? "ІІ-й" : "І-й");
                            const tgId = ac.telegramId || ac.email || "—";
                            const pwd = ac.password || "—";
                            
                            return (
                              <tr key={ac.user + "_" + idx} className={`hover:bg-[#1a3843]/30 transition-colors ${isActiveUser ? "bg-[#1a3843]/85" : ""}`}>
                                <td className="p-2 px-3">
                                  <span className="bg-slate-900 border border-[#224853] text-white rounded font-mono font-black text-[9px] px-2 py-0.5 uppercase tracking-wide inline-block leading-normal">
                                    {level}
                                  </span>
                                </td>
                                <td className="p-2 px-3 font-bold text-slate-100">{ac.user}</td>
                                <td className="p-2 px-3 font-semibold text-slate-400">{ac.position || "постійний служитель"}</td>
                                <td className="p-2 px-3 font-mono text-slate-400 text-[10px] truncate max-w-[150px]">
                                  {tgId}
                                </td>
                                <td className="p-2 px-3 font-mono text-emerald-400 text-[10px] font-bold">
                                  {pwd}
                                </td>
                                <td className="p-2 px-3 text-right">
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <>
                                        <button
                                          onClick={() => handleEditAccessUserClick(ac)}
                                          title="Редагувати користувача"
                                          className="p-1 text-slate-400 hover:text-sky-400 hover:bg-sky-950/40 rounded transition-all outline-none cursor-pointer"
                                        >
                                          <Edit className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteAccessUser(ac)}
                                          title="Видалити користувача"
                                          className="p-1 text-slate-400 hover:text-rose-450 hover:bg-rose-950/40 rounded transition-all outline-none cursor-pointer"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </>

                                    {isActiveUser ? (
                                      <button
                                        onClick={() => onSetSessionUser(null)}
                                        className="inline-flex items-center space-x-1 border border-emerald-500/35 bg-emerald-950/80 text-emerald-350 font-bold px-2 py-1 rounded-md text-[9px] uppercase tracking-wide outline-none animate-pulse"
                                      >
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        <span>Активно</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleSimulateLogin(ac)}
                                        className="inline-flex items-center space-x-1 bg-[#1a3843] border border-[#224853] hover:bg-sky-700 text-sky-400 hover:text-white font-bold px-2 py-1 rounded-md text-[9px] uppercase tracking-wide outline-none transition-all"
                                      >
                                        <LogIn className="h-3.5 w-3.5" />
                                        <span>Увійти</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                </>
              )}

              {activeAccessSubTab === 'levels' && (
                <div className="rounded-lg border border-[#224853]/55 overflow-hidden bg-[#13282e]/40">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#13282e] border-b border-[#224853]/60 text-[10px] font-bold text-slate-350 uppercase tracking-wider">
                          <th className="p-2 px-3" rowSpan={2}>ЕЛЕМЕНТИ ДОДАТКУ</th>
                          <th className="p-2 px-1 text-center border-l border-[#224853]/30" colSpan={2}>І-й рівень</th>
                          <th className="p-2 px-1 text-center border-l border-[#224853]/30" colSpan={2}>ІІ-й рівень</th>
                          <th className="p-2 px-1 text-center border-l border-[#224853]/30" colSpan={2}>ІІІ-й рівень</th>
                          <th className="p-2 px-1 text-center border-l border-[#224853]/30" colSpan={2}>ІV-й рівень</th>
                        </tr>
                        <tr className="bg-[#13282e]/80 border-b border-[#224853]/50 text-[9px] font-extrabold text-[#7fa3b0] uppercase tracking-wide">
                          <th className="p-1.5 px-1 text-center border-l border-[#224853]/30 text-sky-400">бачить</th>
                          <th className="p-1.5 px-1 text-center border-l border-[#224853]/20 text-emerald-450">змінює</th>
                          <th className="p-1.5 px-1 text-center border-l border-[#224853]/30 text-sky-400">бачить</th>
                          <th className="p-1.5 px-1 text-center border-l border-[#224853]/20 text-emerald-450">змінює</th>
                          <th className="p-1.5 px-1 text-center border-l border-[#224853]/30 text-sky-450">бачить</th>
                          <th className="p-1.5 px-1 text-center border-l border-[#224853]/20 text-emerald-450">змінює</th>
                          <th className="p-1.5 px-1 text-center border-l border-[#224853]/30 text-sky-450">бачить</th>
                          <th className="p-1.5 px-1 text-center border-l border-[#224853]/20 text-emerald-450">змінює</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#224853]/30 text-xs">
                        {parsedAccessLevels.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#1a3843]/30 transition-colors">
                            <td className="p-1 px-2 border-b border-[#224853]/20">
                              <div className="flex items-center space-x-1 min-w-[200px]">
                                <input
                                  type="text"
                                  value={item.role}
                                  onChange={(e) => handleUpdateRoleName(idx, e.target.value)}
                                  placeholder="Наприклад: Т__ПІБ чи А__Примітки"
                                  className="bg-slate-900 border border-[#224853] text-slate-100 px-2 py-1 text-xs rounded outline-none focus:border-sky-500 w-full font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRoleField(idx)}
                                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 p-1.5 rounded transition-colors shrink-0"
                                  title="Видалити поле"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                            {item.headers.map((h: string) => (
                              <td key={h} className="p-2 px-1 text-center border-l border-[#224853]/30">
                                <input
                                  type="checkbox"
                                  checked={item.access[h]}
                                  onChange={() => handleToggleAccessLevel(idx, h)}
                                  className="h-3.5 w-3.5 rounded-sm border-[#224853] bg-slate-900 checked:bg-emerald-600 outline-none cursor-pointer"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* SUBTAB 4: SYNC SYSTEM METRICS WITH GOOGLE SHEETS */}
        {activeSubTab === 'sync' && (
          <div className="space-y-4 animate-fade-in text-center max-w-lg mx-auto py-5 text-slate-100">
            <div className="bg-rose-950/80 border border-rose-500/30 text-rose-350 h-12 w-12 rounded-xl mx-auto flex items-center justify-center shadow-sm">
              <RefreshCw className={`h-6 w-6 ${syncLoading ? "animate-spin" : ""}`} />
            </div>
            
            <div className="space-y-1">
              <h2 className="font-display text-lg font-black text-white tracking-tight">Повна Синхронізація з Хмарним Реєстром</h2>
              <p className="text-[11px] text-slate-400 leading-normal">
                Натискання кнопки нижче підключає наш додаток до оригінальної Google-Таблиці та оновлює списки довідників (аркуш <b>ДОВІДНИКИ</b>), 
                опікунів відповідальних та імпортує актуальні елементи в базу даних. Карта прав доступу (ДОСТУП) тепер зберігається та редагується безпечно прямо у базі даних Firebase.
              </p>
            </div>

            <div className="rounded-lg border border-[#224853]/60 bg-[#13282e]/60 p-3 text-[10px] font-mono text-slate-400 text-left space-y-0.5 leading-normal max-w-md mx-auto">
              <span className="font-bold text-slate-200 block text-[11px]">Фонова конфігурація злиття:</span>
              <span>• ТАБЛИЦЯ: 1s_Wio5niYvq2HRoBYwH3bS9NEcbtsJsWXv5P7u5Zhw8</span>
              <span>• РЕЖИМ ПАРСИНГА: Quote-Aware Stream parsing (CSV UTF-8)</span>
              <span>• ПЕРЕВІРКА: Системні блоги, Ювіляри & Душпастирський аудит</span>
            </div>

            {syncResult && (
              <div className={`rounded-lg border p-3 text-xs font-semibold text-left max-w-md mx-auto leading-relaxed ${syncResult.error ? "bg-rose-950/80 border-rose-500/30 text-rose-300" : "bg-emerald-950/80 border-emerald-500/30 text-emerald-300"}`}>
                {syncResult.error ? (
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-rose-450 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Помилка імпорту:</span>
                      <span className="font-medium text-[11px] text-rose-300">{syncResult.error}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-emerald-450 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black block text-emerald-250">Імпорт виконано успішно!</span>
                      <div className="text-[11px] text-emerald-350 font-mono mt-1 space-y-0.5 leading-snug font-medium">
                        <div>• Опікунів імпортовано: <span className="font-bold text-white">{syncResult.directories?.opika}</span></div>
                        <div>• Служінь імпортовано: <span className="font-bold text-white">{syncResult.directories?.slujinnya}</span></div>
                        <div>• Статусів відсутності: <span className="font-bold text-white">{syncResult.directories?.prysutnist}</span></div>
                        <div>• Карта прав доступу (користувачів): <span className="font-bold text-white">{syncResult.access}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleSyncWithSheets}
                disabled={syncLoading}
                className={`bg-[#387d7a] hover:bg-[#32716e] border border-[#224853] text-white font-extrabold text-xs px-5 py-2.5 rounded-lg shadow-md transition-all outline-none inline-flex items-center space-x-1.5 uppercase tracking-wide ${syncLoading ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {syncLoading ? (
                  <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0"></div>
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>{syncLoading ? 'Йде завантаження...' : 'Розпочати хмарну синхронізацію'}</span>
              </button>
            </div>
          </div>
        )}

        {/* SUBTAB 5: COLOR MATRIX CONFIGURATION */}
        {activeSubTab === 'colors' && (
          <div className="space-y-4 animate-fade-in text-slate-200">
            <div>
              <h2 className="font-display text-lg font-black text-white tracking-tight">🎨 Ручне визначення кольорів записів</h2>
              <p className="text-[11px] text-slate-400">Дозволяє змінити візуальну колірну схему плашок та статусів у головній таблиці для обраного реєстру</p>
            </div>

            <div className="flex flex-wrap gap-1.5 border-b border-[#224853]/60 pb-2.5">
              {[
                { id: 'opika', label: 'ОПІКА' },
                { id: 'slujinnya', label: 'СЛУЖІННЯ' },
                { id: 'vidviduvanist', label: 'ВІДВІДУВАННЯ' },
                { id: 'prysutnist', label: 'ПРИЧИНА ВІДСУТНОСТІ' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedColorCat(cat.id as any)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all border outline-none cursor-pointer ${selectedColorCat === cat.id ? "bg-[#387d7a] border-[#387d7a] text-white shadow-xs" : "bg-[#13282e] border-[#224853] text-slate-350 hover:bg-[#1a3843]"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-[#224853]/55 bg-[#13282e]/50 p-3 space-y-2.5 max-h-[300px] overflow-y-auto">
              {getCategoryOptions().length === 0 ? (
                <div className="text-center text-slate-500 py-10 text-xs font-semibold">Не знайдено елементів довідника для фарбування</div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {getCategoryOptions().map((opt: string) => {
                    const currentColor = colorsMap[selectedColorCat]?.[opt] || "#FFFFFF";
                    return (
                      <div key={opt} className="flex flex-col sm:flex-row sm:items-center justify-start p-2.5 bg-[#13282e]/85 border border-[#224853]/40 rounded-lg shadow-xs gap-y-2 gap-x-4">
                        <div className="flex items-center space-x-2.5 min-w-0 w-full sm:w-56 shrink-0">
                          <span 
                            className="w-4 h-4 rounded-full border border-slate-700 shrink-0 shadow-xs"
                            style={{ backgroundColor: currentColor }}
                          />
                          <span className="text-xs font-bold text-slate-100 truncate" title={opt}>{opt}</span>
                        </div>
                        <div className="flex items-center justify-start space-x-2 shrink-0 pt-0 sm:pt-0">
                          {/* Beautiful Preset colors clickable */}
                          <div className="flex items-center space-x-1">
                            {["#FEF8E3", "#DDF2F0", "#E8E7FC", "#FEE2E2", "#E0F2FE", "#FFFFFF"].map(p => (
                              <button
                                key={p}
                                type="button"
                                title={`Обрати колір ${p}`}
                                onClick={() => handleSetColor(selectedColorCat, opt, p)}
                                className={`w-4 h-4 rounded-full border border-slate-800 hover:scale-110 transition-all shadow-xs cursor-pointer ${currentColor.toUpperCase() === p.toUpperCase() ? "ring-1 ring-[#387d7a] ring-offset-1 ring-offset-slate-900 scale-105" : ""}`}
                                style={{ backgroundColor: p }}
                              />
                            ))}
                          </div>
                          
                          <div className="flex items-center space-x-1.5 pl-1.5 border-l border-[#224853]/40">
                            {/* Color Input */}
                            <input 
                              type="color"
                              title="Обрати довільний колір"
                              value={currentColor.startsWith('#') && currentColor.length === 7 ? currentColor : "#FFFFFF"}
                              onChange={(e) => handleSetColor(selectedColorCat, opt, e.target.value)}
                              className="w-7 h-6 p-0 border border-slate-700 rounded cursor-pointer shrink-0 opacity-100 bg-transparent"
                            />

                            {/* Reset Button */}
                            {colorsMap[selectedColorCat]?.[opt] && (
                              <button
                                onClick={() => handleResetColor(selectedColorCat, opt)}
                                className="text-[9px] text-rose-450 hover:text-rose-400 font-extrabold hover:underline px-0.5 shrink-0 cursor-pointer"
                                title="Скинути до початкового"
                              >
                                Скинути
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {colorsSaveStatus && (
              <div className="rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 text-xs font-bold inline-flex items-center space-x-1.5 animate-bounce">
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Зміни кольорів застосовано успішно!</span>
              </div>
            )}

            <div className="flex justify-end pt-1.5 border-t border-[#224853]/55">
              <button
                onClick={handleSaveColors}
                className="bg-[#387d7a] hover:bg-[#32716e] border border-[#224853] text-white font-black text-xs px-4 py-2 rounded-lg shadow-md transition-all outline-none flex items-center space-x-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Зберегти налаштування кольорів</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

const DEFAULT_DOSTUP = [
  {"rayon": "ЦЕНТР", "level": "IV-й", "user": "Черняк Вал.", "position": "Пресвітер (Старший)", "telegramId": "969538290", "password": "123", "email": "969538290"},
  {"rayon": "ПОЗИТРОН", "level": "IV-й", "user": "Черняк Вал.", "position": "Пресвітер", "telegramId": "969538290", "password": "123", "email": "969538290"},
  {"rayon": "АЕРОПОРТ", "level": "ІІІ-й", "user": "Патлатай В.", "position": "Пресвітер", "telegramId": "593850384", "password": "111", "email": "593850384"},
  {"rayon": "КАСКАД", "level": "ІІ-й", "user": "Черняк Вікт.", "position": "Диякон", "telegramId": "482057395", "password": "222", "email": "482057395"},
  {"rayon": "БАМ", "level": "ІІ-й", "user": "Бурчак Ю.", "position": "Диякон", "telegramId": "239502930", "password": "333", "email": "239502930"},
  {"rayon": "МИКИТИНЦІ", "level": "ІІ-й", "user": "Галюк Б.", "position": "Диякон", "telegramId": "748302049", "password": "444", "email": "748302049"},
  {"rayon": "КРИХІВЦІ", "level": "І-й", "user": "Марунчак В.", "position": "Відповідальний за опіку", "telegramId": "920485058", "password": "555", "email": "920485058"},
  {"rayon": "ХРИПЛИН", "level": "ІІІ-й", "user": "Черняк Вас.", "position": "Пресвітер", "telegramId": "194850204", "password": "666", "email": "194850204"},
  {"rayon": "УГОРНИКИ", "level": "ІІ-й", "user": "Несен Ю.", "position": "Диякон", "telegramId": "384950204", "password": "777", "email": "384950204"}
];
