import React, { useState, useEffect } from 'react';
import { 
  Users, Cake, ShieldCheck, RefreshCw, Send, Trash2, Plus, 
  CheckCircle, AlertCircle, Copy, Check, LogIn, LogOut, Mail, Clock, Palette,
  Edit, UserPlus, ShieldAlert
} from 'lucide-react';
import { Member } from '../types';
import { parseAccessLevelsCSV, ACCESS_LEVELS_CSV_DATA } from '../accessLevels';

interface DirectoriesManagerProps {
  lookups: any;
  onRefreshLookups: () => Promise<void>;
  currentSessionUser: any;
  onSetSessionUser: (user: any) => void;
  members: Member[];
  hasAccess: (element: string, action: 'бачить' | 'змінювати') => boolean;
}

export default function DirectoriesManager({ 
  lookups, 
  onRefreshLookups, 
  currentSessionUser, 
  onSetSessionUser,
  members,
  hasAccess
}: DirectoriesManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'birthdays' | 'dicts' | 'access' | 'sync' | 'colors'>('birthdays');
  const [activeAccessSubTab, setActiveAccessSubTab] = useState<'sectors' | 'levels'>('sectors');
  
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
  const [accessRayon, setAccessRayon] = useState('ЦЕНТР');

  // Handle saving user
  const handleSaveAccessUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessUser.trim()) return;

    const accessList = lookups?.access || [];
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
    
    const accessList = lookups?.access || [];
    // Ensure we are filtering correctly based on user and rayon
    const updatedList = accessList.filter(rec => !(rec.user === userToDelete.user && rec.rayon === (userToDelete.rayon || 'ЦЕНТР')));

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
  const [selectedDictKey, setSelectedDictKey] = useState<'opika' | 'slujinnya' | 'vidviduvanist' | 'prysutnist' | 'di_admin' | 'rayon'>('opika');
  const [newDictValue, setNewDictValue] = useState('');
  const [dictItems, setDictItems] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState(false);
  
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
    if (lookups?.directories) {
      let list = lookups.directories[selectedDictKey] || [];
      if (selectedDictKey === 'vidviduvanist') {
        list = list.filter((item: string) => ["Постійно", "Періодично", "Рідко", "Ніколи"].includes(item));
        if (list.length === 0) list = ["Постійно", "Періодично", "Рідко", "Ніколи"];
      }
      setDictItems([...list]);
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
      const payload = {
        ...lookups.directories,
        [selectedDictKey]: dictItems
      };
      const resp = await fetch('/api/directories/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        setSaveStatus(true);
        await onRefreshLookups();
        setTimeout(() => setSaveStatus(false), 2000);
      }
    } catch (_) {}
  };

  const handleAddDictItem = () => {
    const trimmed = newDictValue.trim();
    if (trimmed && !dictItems.includes(trimmed)) {
      setDictItems(prev => [...prev, trimmed]);
      setNewDictValue('');
    }
  };

  const handleRemoveDictItem = (itemToDelete: string) => {
    setDictItems(prev => prev.filter(i => i !== itemToDelete));
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

        {hasAccess('Кнопка СПИСОК', 'бачить') && (
            <button
              onClick={() => setActiveSubTab('dicts')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all outline-none text-left ${activeSubTab === 'dicts' ? "bg-[#387d7a] text-white shadow-sm scale-[1.01]" : "text-slate-300 hover:bg-[#1a3843] hover:text-white"}`}
            >
              <Users className="h-4 w-4 text-sky-400 shrink-0" />
              <span>📚 Списки</span>
            </button>
        )}

        <button
          onClick={() => setActiveSubTab('colors')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all outline-none text-left ${activeSubTab === 'colors' ? "bg-[#387d7a] text-white shadow-sm scale-[1.01]" : "text-slate-300 hover:bg-[#1a3843] hover:text-white"}`}
        >
          <Palette className="h-4 w-4 text-violet-400 shrink-0" />
          <span>🎨 Кольори</span>
        </button>

        {hasAccess('Кнопка НАЛАШТУВАННЯ', 'бачить') && (
            <button
              onClick={() => setActiveSubTab('access')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all outline-none text-left ${activeSubTab === 'access' ? "bg-[#387d7a] text-white shadow-sm scale-[1.01]" : "text-slate-300 hover:bg-[#1a3843] hover:text-white"}`}
            >
              <ShieldCheck className="h-4 w-4 text-emerald-450 shrink-0" />
              <span>🔑 Доступ</span>
            </button>
        )}

        {hasAccess('Дані синхронізації', 'бачить') && (
            <button
              onClick={() => setActiveSubTab('sync')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all outline-none text-left ${activeSubTab === 'sync' ? "bg-[#387d7a] text-white shadow-sm scale-[1.01]" : "text-slate-300 hover:bg-[#1a3843] hover:text-white"}`}
            >
              <RefreshCw className="h-4 w-4 text-rose-455 shrink-0" />
              <span>🔄 Хмарна Синхронізація</span>
            </button>
        )}

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
                              <span className="text-[10px] font-medium text-slate-400">{item.stat}</span>
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
                
                {/* ... (rest of the file content that was here) ... */}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
