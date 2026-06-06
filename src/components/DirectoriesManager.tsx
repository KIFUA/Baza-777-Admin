import React, { useState, useEffect } from 'react';
import { 
  Users, Cake, ShieldCheck, RefreshCw, Send, Trash2, Plus, 
  CheckCircle, AlertCircle, Copy, Check, LogIn, LogOut, Mail, Clock
} from 'lucide-react';
import { Member } from '../types';

interface DirectoriesManagerProps {
  lookups: any;
  onRefreshLookups: () => Promise<void>;
  currentSessionUser: any;
  onSetSessionUser: (user: any) => void;
  members: Member[];
}

export default function DirectoriesManager({ 
  lookups, 
  onRefreshLookups, 
  currentSessionUser, 
  onSetSessionUser,
  members
}: DirectoriesManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'birthdays' | 'dicts' | 'access' | 'sync'>('birthdays');
  
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
  const [selectedDictKey, setSelectedDictKey] = useState<'opika' | 'slujinnya' | 'vidviduvanist' | 'prysutnist' | 'di_admin'>('opika');
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
      const list = lookups.directories[selectedDictKey] || [];
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

  // Switch session simulate login
  const handleSimulateLogin = (userRec: any) => {
    onSetSessionUser(userRec);
  };

  const UKR_DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];

  return (
    <div id="dir_manager_tab" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row gap-6 min-h-[550px] animate-fade-in select-text">
      
      {/* Sidebar Sub Tab Controls */}
      <div className="w-full md:w-64 shrink-0 flex flex-col space-y-1.5 border-r border-slate-100 pr-0 md:pr-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Навігація кабінету</h3>
        
        <button
          onClick={() => setActiveSubTab('birthdays')}
          className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all outline-none text-left ${activeSubTab === 'birthdays' ? "bg-amber-50 text-amber-800 scale-[1.02]" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <Cake className="h-4.5 w-4.5 text-amber-600 shrink-0" />
          <span>🎂 Іменинники тижня</span>
        </button>

        <button
          onClick={() => setActiveSubTab('dicts')}
          className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all outline-none text-left ${activeSubTab === 'dicts' ? "bg-blue-50 text-blue-800 scale-[1.02]" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <Users className="h-4.5 w-4.5 text-blue-600 shrink-0" />
          <span>📚 Налаштування списків</span>
        </button>

        <button
          onClick={() => setActiveSubTab('access')}
          className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all outline-none text-left ${activeSubTab === 'access' ? "bg-emerald-50 text-emerald-800 scale-[1.02]" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
          <span>🔑 Доступ за секторами</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sync')}
          className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all outline-none text-left ${activeSubTab === 'sync' ? "bg-rose-50 text-rose-800 scale-[1.02]" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <RefreshCw className="h-4.5 w-4.5 text-rose-600 shrink-0" />
          <span>🔄 Хмарна Синхронізація</span>
        </button>

        {currentSessionUser && (
          <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col space-y-3 px-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">🔐 Активна сесія:</span>
              <div className="text-xs font-bold text-slate-800 truncate">{currentSessionUser.user}</div>
              <div className="text-[11px] font-medium text-slate-500">{currentSessionUser.position || "Співслужбовець"}</div>
              <div className="inline-block bg-slate-900 text-white rounded px-1.5 py-0.5 text-[9px] font-mono leading-none tracking-wider uppercase font-bold mt-1">
                {currentSessionUser.rayon}
              </div>
            </div>
            <button
              onClick={() => onSetSessionUser(null)}
              className="flex items-center justify-center space-x-1.5 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-[10px] font-bold text-slate-600 hover:text-rose-700 py-1.5 transition-colors uppercase tracking-wider"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Скинути сесію</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Panel Content Workspace */}
      <div className="flex-1 min-w-0">
        
        {/* SUBTAB 1: BIRTHDAYS MANAGER */}
        {activeSubTab === 'birthdays' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">🎂 Іменинники поточного тижня</h2>
                <p className="text-xs text-slate-500">Автоматичний розрахунок за списком членів із виявленням ювілярів</p>
              </div>
              <span className="bg-amber-100/70 border border-amber-200 text-amber-800 rounded-xl px-3 py-1 text-xs font-bold inline-flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Тиждень: {birthdayData?.weekRangeText || 'н/д'}</span>
              </span>
            </div>

            {bdayLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-100 border-t-amber-600"></div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none">Розрахунок дат...</span>
              </div>
            ) : !birthdayData || birthdayData.list.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-10 text-center text-slate-500">
                <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3 animate-pulse" />
                <div className="text-sm font-bold">На цьому тижні святкових дат немає</div>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Система опрацьовує іменинників автоматично при додаванні або зміні дат народження в банку даних.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Visual Cards Summary Indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Усього іменинників</span>
                    <div className="font-display text-2xl font-black text-blue-700">{birthdayData.list.length} осіб</div>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Ювілеї (кратні 10 рокам)</span>
                    <div className="font-display text-2xl font-black text-amber-700">
                      🎖️ {birthdayData.list.filter((x: any) => x.isJubilee).length} ювілярів
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Середній вік</span>
                    <div className="font-display text-2xl font-black text-emerald-700">
                      {Math.round(birthdayData.list.reduce((acc: number, cur: any) => acc + cur.age, 0) / birthdayData.list.length)} років
                    </div>
                  </div>
                </div>

                {/* Table list */}
                <div className="rounded-xl border border-slate-100 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="p-3">Дата святкування / День</th>
                        <th className="p-3">Член церкви</th>
                        <th className="p-3">Вік / Статус</th>
                        <th className="p-3">Контакти</th>
                        <th className="p-3">Підзвітний сектор</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {birthdayData.list.map((item: any) => {
                        const day = UKR_DAYS[item.dayOfWeekNum];
                        const dateFormatted = item.celebrationDate.split('-').reverse().slice(0,2).join('.');
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-slate-800 block text-xs">{day}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{dateFormatted} (н/д)</span>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                                <span>{item.cleanName}</span>
                                {item.fullName !== item.cleanName && (
                                  <span className="text-[10px] text-slate-400 font-normal italic leading-none truncate max-w-[120px]">(дівоче: {item.fullName.split('(')[1]?.replace(')', '')})</span>
                                )}
                              </div>
                              <span className="text-[10px] font-medium text-slate-500">{item.stat}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-slate-700">{item.age} років</span>
                                {item.isJubilee && (
                                  <span className="bg-amber-100 border border-amber-200 text-amber-800 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider animate-pulse flex items-center shrink-0">
                                    🎖️ Ювіляр
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-slate-600 font-mono">
                              {item.tel_mob || <span className="text-slate-300">немає</span>}
                            </td>
                            <td className="p-3 font-medium">
                              <span className="bg-slate-100/80 text-slate-700 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold inline-block mr-1">
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
                <div id="trigger_newsletter_card" className="rounded-2xl border border-slate-100 bg-slate-50/40 p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-sm">📣 Канали оповіщення та розсилки</h3>
                    <p className="text-[11px] text-slate-400">Швидке надсилання сформованого звіту тижня за вказаними координатами</p>
                  </div>

                  {sendingStatus && (
                    <div className={`rounded-xl border p-3 flex items-start space-x-2 text-xs transition-all ${sendingStatus.success === undefined ? "bg-blue-50 border-blue-100 text-blue-700" : (sendingStatus.success ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800")}`}>
                      {sendingStatus.success === undefined ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent shrink-0 mt-0.5"></div>
                      ) : (
                        sendingStatus.success ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      )}
                      <div className="leading-snug">
                        <span className="font-bold block">Статус доставки:</span>
                        <span className="font-mono text-[10px]">{sendingStatus.msg}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Channel 1: Telegram Bot Dispatch API */}
                    <div className="rounded-xl border border-slate-150 bg-white p-4 space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                          <span className="bg-sky-100 text-sky-800 rounded-lg p-1.5 inline-block shrink-0">
                            <Send className="h-4 w-4 text-sky-600" />
                          </span>
                          <span>Телеграм сповіщення</span>
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-full uppercase leading-none">Бот API</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">TELEGRAM BOT TOKEN (опціонально для перевірки)</label>
                        <input
                          type="password"
                          placeholder="Введіть токен бота (напр. 61234567:AAFe...)"
                          value={tgToken}
                          onChange={(e) => setTgToken(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-sky-200 focus:outline-none"
                        />
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Бот повинен бути доданий у чат-отримувач для здійснення реальних відправок.</p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-1.5">
                        <button
                          onClick={() => handleSendBirthdays('telegram_me')}
                          className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white p-2.5 text-center text-xs font-bold tracking-tight shadow-md flex items-center justify-center space-x-1.5 transition-all outline-none"
                        >
                          <Send className="h-3.5 w-3.5 text-sky-400" />
                          <span>Надіслати мені (№1919236304)</span>
                        </button>
                        <button
                          onClick={() => handleSendBirthdays('telegram_group')}
                          className="flex-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-white p-2.5 text-center text-xs font-bold tracking-tight shadow-md flex items-center justify-center space-x-1.5 transition-all outline-none"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>ЦЕРКОВНА РАДА</span>
                        </button>
                      </div>
                    </div>

                    {/* Channel 2: Email PDF/HTML Report Delivery */}
                    <div className="rounded-xl border border-slate-150 bg-white p-4 space-y-3.5 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                            <span className="bg-emerald-100 text-emerald-800 rounded-lg p-1.5 inline-block shrink-0">
                              <Mail className="h-4 w-4 text-emerald-600" />
                            </span>
                            <span>Email Рассылка (Майже реальна)</span>
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-600 font-bold px-1.5 py-0.5 rounded-full uppercase leading-none">PDF / Текст</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                          У повній відповідності з GAS-сценарієм, цей тригер надсилає листи на наступні адреси: <br />
                          <span className="font-mono text-[10px] text-slate-500 font-semibold block mt-1">kostel.if.ua@gmail.com, liliiachupryna@gmail.com, solbo1971@gmail.com</span>
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-4">
                        <button
                          onClick={() => handleSendBirthdays('email_text')}
                          className="flex-1 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 p-2 text-xs font-bold transition-all flex items-center justify-center space-x-1"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>Надіслати Текст</span>
                        </button>
                        <button
                          onClick={() => handleSendBirthdays('email_pdf')}
                          className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 text-xs font-bold shadow-md transition-all flex items-center justify-center space-x-1"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Надіслати PDF звіт</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Clipboard Text generator */}
                  <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
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
                        className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 outline-none font-bold text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 rounded px-2.5 py-1.5 transition-all text-xs"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copied ? 'Скопійовано!' : 'Скопіювати звіт'}</span>
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-slate-500 bg-slate-50/50 rounded-xl p-3 max-h-[140px] overflow-y-auto overflow-x-hidden leading-relaxed break-all whitespace-pre-wrap">
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
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">📚 Редактор системних довідників параметрів</h2>
              <p className="text-xs text-slate-500">Дозволяє коригувати варіанти вибору dropdown-параметрів для полів анкет (опікуни, відвідуваність, присутність)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Select list to toggle directories target */}
              <div className="md:col-span-1 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-1">Оберіть довідник:</span>
                <div className="flex flex-col space-y-1">
                  {[
                    { id: 'opika', title: 'Опікуни (розподіл служителів класу А)' },
                    { id: 'slujinnya', title: 'Християнські служіння (Служіння)' },
                    { id: 'vidviduvanist', title: 'Характеристики відвідування' },
                    { id: 'prysutnist', title: 'Характеристики присутності' },
                    { id: 'di_admin', title: 'Дії адміністратора (переміщення)' }
                  ].map(x => (
                    <button
                      key={x.id}
                      onClick={() => setSelectedDictKey(x.id as any)}
                      className={`text-left p-2.5 text-xs font-bold rounded-lg transition-all outline-none ${selectedDictKey === x.id ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-50 text-slate-700"}`}
                    >
                      {x.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right editable tag grid */}
              <div className="md:col-span-2 space-y-4">
                
                {/* Helpful explanatory note matching selected dictionary and church guidelines */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 text-[11px] text-slate-700 leading-relaxed font-normal">
                  {selectedDictKey === 'opika' && (
                    <span>
                      👥 <strong>Розподіл опікунів:</strong> Опікуни, які призначені пресвітерами з числа служителів нашої єдиної громади (ієрархія служителів: ст. пастор, пресвітери, диякони, відповідальні за служіння).
                    </span>
                  )}
                  {selectedDictKey === 'di_admin' && (
                    <span>
                      ⚙️ <strong>Дії адміністратора (di_admin):</strong> Дільничі або дияконські адміністративні одиниці (переведення на каскади та центри). Це завдання адміністративних переміщень членів церкви, які поки що виконує адміністратор.
                    </span>
                  )}
                  {selectedDictKey === 'slujinnya' && (
                    <span>
                      ⛪ <strong>Служіння:</strong> Спеціалізовані християнські служіння та місії, в які залучені діючі члени нашої єдиної церковної громади.
                    </span>
                  )}
                  {selectedDictKey === 'vidviduvanist' && (
                    <span>
                      📊 <strong>Характеристики відвідування:</strong> Показники та оцінки регулярності відвідування зібрань та заходів членами громади.
                    </span>
                  )}
                  {selectedDictKey === 'prysutnist' && (
                    <span>
                      📌 <strong>Характеристики присутності:</strong> Загальний статус перебування та залученості члена церкви в повсякденне життя громади.
                    </span>
                  )}
                </div>

                {/* Form to add item inline */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Додати новий елемент довідника..."
                    value={newDictValue}
                    onChange={(e) => setNewDictValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDictItem()}
                    className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
                  />
                  <button
                    onClick={handleAddDictItem}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 font-extrabold text-white px-3.5 py-2 transition-colors flex items-center space-x-1 outline-none text-xs shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Додати</span>
                  </button>
                </div>

                {saveStatus && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 px-3 py-2 text-xs font-bold inline-flex items-center space-x-1.5 animate-bounce">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>Успішно збережено в системну базу!</span>
                  </div>
                )}

                {/* Items tag board */}
                <div className="rounded-xl border border-slate-100 h-[280px] overflow-y-auto p-4 bg-slate-50/20 space-y-2">
                  {dictItems.length === 0 ? (
                    <div className="text-center text-slate-400 py-16 text-xs">Довідник пустий. Додайте перші значення.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {dictItems.map((item) => (
                        <span key={item} className="bg-white border border-slate-250 hover:border-red-200 hover:bg-red-50/50 pl-3 pr-2 py-1 rounded-xl text-xs font-bold text-slate-700 hover:text-red-700 transition-all inline-flex items-center space-x-2 shadow-xs group cursor-default">
                          <span>{item}</span>
                          <button
                            onClick={() => handleRemoveDictItem(item)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-0.5 outline-none"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save actions */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveDictionary}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors outline-none flex items-center space-x-1.5"
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
        {activeSubTab === 'access' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">🔑 Карта секторів доступу (ДОСТУП)</h2>
              <p className="text-xs text-slate-500 font-medium">Закріплені служителі (пресвітери та диякони) по опікунських районах церкви для делегування</p>
            </div>

            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 shrink-0 flex items-start space-x-2.5 text-xs text-amber-950">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span className="font-bold">Душпастирська субординація та захист:</span>
                <p className="mt-0.5 opacity-90 font-medium">
                  Ви можете «активувати сесію» конкретного пресвітера або диякона. 
                  При її активації церковний реєстр увійде у режим фільтрації і буде відображати <b>виключно</b> тих членів церкви, 
                  які закріплені за вказаним районом опіки (наприклад, <b>«ОБ'ЇЗНА»</b> чи <b>«АЕРОПОРТ»</b>). Це дозволяє служителям бачити та опікувати свій район.
                </p>
              </div>
            </div>

            {/* List map */}
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-3 pl-4">Опікунська зона</th>
                      <th className="p-3">Служитель</th>
                      <th className="p-3">Позиція за реєстром</th>
                      <th className="p-3">Суміжна інформація / Email</th>
                      <th className="p-3 text-right pr-4">Дія сесії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {(lookups?.access || DEFAULT_DOSTUP).map((ac: any, idx: number) => {
                      const isActiveUser = currentSessionUser?.user === ac.user;
                      return (
                        <tr key={ac.user + "_" + idx} className={`hover:bg-slate-50/50 transition-colors ${isActiveUser ? "bg-emerald-50/30" : ""}`}>
                          <td className="p-3 pl-4">
                            <span className="bg-slate-900 text-white rounded font-mono font-black text-[9px] px-2 py-0.5 uppercase tracking-wide inline-block leading-normal">
                              {ac.rayon}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-800">{ac.user}</td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-600">{ac.position || "постійний служитель"}</span>
                          </td>
                          <td className="p-3 font-mono text-slate-500 text-[11px] truncate max-w-[180px]">
                            {ac.email || <span className="text-slate-300 italic font-sans text-xs">не вказано</span>}
                          </td>
                          <td className="p-3 text-right pr-4">
                            {isActiveUser ? (
                              <button
                                onClick={() => onSetSessionUser(null)}
                                className="inline-flex items-center space-x-1 border border-emerald-250 bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wide outline-none"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Активно</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSimulateLogin(ac)}
                                className="inline-flex items-center space-x-1 bg-blue-50 border border-blue-150 hover:bg-blue-600 text-blue-700 hover:text-white font-bold px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wide outline-none transition-all"
                              >
                                <LogIn className="h-3.5 w-3.5" />
                                <span>Увійти</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* SUBTAB 4: SYNC SYSTEM METRICS WITH GOOGLE SHEETS */}
        {activeSubTab === 'sync' && (
          <div className="space-y-6 animate-fade-in text-center max-w-xl mx-auto py-8">
            <div className="bg-rose-100 text-rose-800 h-16 w-16 rounded-2xl mx-auto flex items-center justify-center shadow-sm">
              <RefreshCw className={`h-8 w-8 ${syncLoading ? "animate-spin" : ""}`} />
            </div>
            
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-slate-900 tracking-tight">Повна Синхронізація з Хмарним Реєстром</h2>
              <p className="text-xs text-slate-500 leading-normal">
                Натискання кнопки нижче підключає наш додаток до оригінальної Google-Таблиці та оновлює списки довідників (аркуш <b>ДОВІДНИКИ</b>), 
                опікунів відповідальних, завантажує карту прав доступу (аркуш <b>ДОСТУП</b>) та імпортує актуальні елементи в базу даних.
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-[11px] font-mono text-slate-500 text-left space-y-1 leading-normal max-w-md mx-auto">
              <span className="font-bold text-slate-700 block text-xs">Фонова конфігурація злиття:</span>
              <span>• ТАБЛИЦЯ: 1s_Wio5niYvq2HRoBYwH3bS9NEcbtsJsWXv5P7u5Zhw8</span>
              <span>• РЕЖИМ ПАРСИНГА: Quote-Aware Stream parsing (CSV UTF-8)</span>
              <span>• ПЕРЕВІРКА: Системні блоги, Ювіляри & Душпастирський аудит</span>
            </div>

            {syncResult && (
              <div className={`rounded-xl border p-4 text-xs font-semibold text-left max-w-md mx-auto leading-relaxed ${syncResult.error ? "bg-rose-50 border-rose-100 text-rose-800" : "bg-emerald-50 border-emerald-100 text-emerald-800"}`}>
                {syncResult.error ? (
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Помилка імпорту:</span>
                      <span className="font-medium text-[11px] text-rose-700">{syncResult.error}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold block text-emerald-900">Імпорт виконано успішно!</span>
                      <div className="text-[11px] text-emerald-700 font-mono mt-1 space-y-0.5 leading-snug font-medium">
                        <div>• Опікунів імпортовано: <span className="font-bold text-slate-900">{syncResult.directories?.opika}</span></div>
                        <div>• Служінь імпортовано: <span className="font-bold text-slate-900">{syncResult.directories?.slujinnya}</span></div>
                        <div>• Статусів відсутності: <span className="font-bold text-slate-900">{syncResult.directories?.prysutnist}</span></div>
                        <div>• Карта прав доступу (користувачів): <span className="font-bold text-slate-900">{syncResult.access}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={handleSyncWithSheets}
                disabled={syncLoading}
                className={`bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-8 py-3.5 rounded-xl shadow-lg transition-all outline-none inline-flex items-center space-x-2 uppercase tracking-wider ${syncLoading ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {syncLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0"></div>
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span>{syncLoading ? 'Йде завантаження...' : 'Розпочати хмарну синхронізацію'}</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

const DEFAULT_DOSTUP = [
  {"rayon": "ЦЕНТР", "user": "Черняк Вал.", "position": "Пресвітер (Старший)", "email": "kostel.if.ua@gmail.com"},
  {"rayon": "ПОЗИТРОН", "user": "Черняк Вал.", "position": "Пресвітер ", "email": "kostel.if.ua@gmail.com"},
  {"rayon": "АЕРОПОРТ", "user": "Патлатай В.", "position": "Пресвітер", "email": "solbo1971@gmail.com"},
  {"rayon": "КАСКАД", "user": "Черняк Вікт.", "position": "Диякон", "email": "liliiachupryna@gmail.com"},
  {"rayon": "БАМ", "user": "Бурчак Ю.", "position": "Диякон", "email": ""},
  {"rayon": "МИКИТИНЦІ", "user": "Галюк Б.", "position": "Диякон", "email": ""},
  {"rayon": "КРИХІВЦІ", "user": "Марунчак В.", "position": "Відповідальний за опіку", "email": ""},
  {"rayon": "ХРИПЛИН", "user": "Черняк Вас.", "position": "Пресвітер", "email": ""},
  {"rayon": "УГОРНИКИ", "user": "Несен Ю.", "position": "Диякон", "email": ""}
];
