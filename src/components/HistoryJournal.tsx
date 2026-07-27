import React, { useState, useEffect } from 'react';
import { AuditLogItem } from '../types';
import { History, Search, FileText, UserPlus, ShieldAlert, BadgeInfo, CheckCircle, Trash2, LogIn, MapPin, Filter } from 'lucide-react';

interface HistoryJournalProps {
  onSelectMember: (id: number) => void;
  isAdmin?: boolean;
}

export default function HistoryJournal({ onSelectMember, isAdmin = false }: HistoryJournalProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [rayonFilter, setRayonFilter] = useState('');
  const [viewTab, setViewTab] = useState<'all' | 'changes' | 'logins'>('all');

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("Ви впевнені, що хочете видалити цей запис з журналу?")) {
      return;
    }
    try {
      const resp = await fetch(`/api/audit-logs/${logId}`, {
        method: 'DELETE'
      });
      if (resp.ok) {
        setLogs(prev => prev.filter(l => l.id !== logId));
      } else {
        alert("Помилка при видаленні запису.");
      }
    } catch (err) {
      console.error(err);
      alert("Помилка зв'язку з сервером.");
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/audit-logs');
      if (resp.ok) {
        const json = await resp.json();
        setLogs(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getLogIcon = (action: string) => {
    switch (action) {
      case 'login_session':
        return <LogIn className="h-4 w-4 text-teal-400 bg-teal-950 border border-teal-800 p-1 rounded-lg box-content" />;
      case 'create':
        return <UserPlus className="h-4 w-4 text-emerald-500 bg-emerald-50 border border-emerald-100 p-1 rounded-lg box-content" />;
      case 'update':
        return <FileText className="h-4 w-4 text-blue-500 bg-blue-50 border border-blue-100 p-1 rounded-lg box-content" />;
      case 'discipline':
        return <ShieldAlert className="h-4 w-4 text-rose-500 bg-rose-50 border border-rose-100 p-1 rounded-lg box-content" />;
      case 'discipline_resolved':
        return <CheckCircle className="h-4 w-4 text-emerald-500 bg-emerald-50 border border-emerald-100 p-1 rounded-lg box-content" />;
      case 'add_ministry':
      case 'add_child':
        return <BadgeInfo className="h-4 w-4 text-indigo-500 bg-indigo-50 border border-indigo-100 p-1 rounded-lg box-content" />;
      default:
        return <History className="h-4 w-4 text-slate-500 bg-slate-50 border border-slate-100 p-1 rounded-lg box-content" />;
    }
  };

  const uniqueRayons = Array.from(new Set([
    "АЕРОПОРТ", "КАСКАД", "ОБ'ЇЗНА", "ЦЕНТР",
    ...logs.map(l => (l.rayon || '').trim().toUpperCase()).filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b, 'uk'));

  const filteredLogs = logs.filter(l => {
    const user = (l.userPib || l.memberName || '').toLowerCase();
    if (user.includes('адміністр') || user.includes('адмін')) return false;

    if (viewTab === 'changes' && l.action === 'login_session') return false;
    if (viewTab === 'logins' && l.action !== 'login_session') return false;

    const q = searchQuery.toLowerCase().trim();
    const textMatch = !q || 
      l.memberName.toLowerCase().includes(q) || 
      l.details.toLowerCase().includes(q) ||
      (l.userPib && l.userPib.toLowerCase().includes(q)) ||
      (l.rayon && l.rayon.toLowerCase().includes(q)) ||
      (l.loginTime && l.loginTime.toLowerCase().includes(q)) ||
      (l.logoutTime && l.logoutTime.toLowerCase().includes(q));

    const actionMatch = actionFilter === '' || l.action === actionFilter;

    const rayonMatch = rayonFilter === '' || 
      (l.rayon && l.rayon.toUpperCase() === rayonFilter.toUpperCase()) ||
      (l.details && l.details.toUpperCase().includes(rayonFilter.toUpperCase()));

    return textMatch && actionMatch && rayonMatch;
  });

  const loginsCount = logs.filter(l => l.action === 'login_session').length;
  const changesCount = logs.filter(l => l.action !== 'login_session').length;

  return (
    <div id="history_journal" className="space-y-6 animate-fade-in text-slate-100">
      
      {/* Title section */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[#1f424f]">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">Історичний Журнал (ISTORIJA)</h2>
          <p className="text-sm text-slate-400">Повна хронологічна фіксація всіх канонічних змін та входів керівників районів</p>
        </div>
        <button
          onClick={fetchLogs}
          className="rounded-lg border border-[#2d5d70] bg-[#1a3843] hover:bg-[#224b5a] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-colors shadow-sm"
        >
          Оновити журнал
        </button>
      </div>

      {/* View Mode Toggle Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1f424f] pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setViewTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            viewTab === 'all'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-[#1a3843] text-slate-300 hover:bg-[#224b5a] hover:text-white border border-[#1f424f]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Всі записи ({logs.length})</span>
        </button>

        <button
          onClick={() => setViewTab('changes')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            viewTab === 'changes'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-[#1a3843] text-slate-300 hover:bg-[#224b5a] hover:text-white border border-[#1f424f]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>📋 Зміни в базі ({changesCount})</span>
        </button>

        <button
          onClick={() => setViewTab('logins')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            viewTab === 'logins'
              ? 'bg-teal-600 text-white shadow-md'
              : 'bg-[#1a3843] text-slate-300 hover:bg-[#224b5a] hover:text-white border border-[#1f424f]'
          }`}
        >
          <LogIn className="w-3.5 h-3.5 text-amber-300" />
          <span>🔐 Входи керівників районів ({loginsCount})</span>
        </button>
      </div>

      {/* Filter selectors toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#11252d] rounded-xl border border-[#1f424f] p-4 flex-wrap">
        
        {/* Search bar */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Пошук у журналі..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#1f424f] pl-9 pr-3 py-2 text-xs bg-[#1a3843] text-slate-200 focus:border-teal-500 focus:outline-none"
          />
        </div>

        {/* District Filter (Фільтр по районам) */}
        <div className="relative w-full sm:max-w-[200px] flex items-center">
          <MapPin className="absolute left-2.5 h-3.5 w-3.5 text-teal-400 pointer-events-none" />
          <select
            value={rayonFilter}
            onChange={(e) => setRayonFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#1f424f] text-xs font-semibold focus:border-teal-500 focus:outline-none bg-[#1a3843] text-slate-200"
          >
            <option value="" className="bg-[#11252d]">Фільтр по районам (Всі)</option>
            {uniqueRayons.map(r => (
              <option key={r} value={r} className="bg-[#11252d]">{r}</option>
            ))}
          </select>
        </div>

        {/* Action Type filter */}
        <div className="relative w-full sm:max-w-[200px] flex items-center">
          <Filter className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#1f424f] text-xs font-semibold focus:border-teal-500 focus:outline-none bg-[#1a3843] text-slate-200"
          >
            <option value="" className="bg-[#11252d]">Всі види дій</option>
            <option value="login_session" className="bg-[#11252d]">🔐 Входи керівників районів</option>
            <option value="create" className="bg-[#11252d]">Додавання профайлу</option>
            <option value="update" className="bg-[#11252d]">Редагування анкети</option>
            <option value="discipline" className="bg-[#11252d]">Зауваження/Дисципліна</option>
            <option value="discipline_resolved" className="bg-[#11252d]">Зняття зауважень</option>
            <option value="add_ministry" className="bg-[#11252d]">Призначення служінь</option>
          </select>
        </div>
        
        <span className="text-xs text-slate-400 font-medium sm:ml-auto">
          Знайдено: <b className="text-teal-400">{filteredLogs.length}</b>
        </span>
      </div>

      {/* Spreadsheet grid table of logs */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1f424f] border-t-teal-500"></div>
          <span className="text-slate-400 text-xs font-medium">Завантаження записів аудиту...</span>
        </div>
      ) : filteredLogs.length > 0 ? (
        viewTab === 'logins' ? (
          /* Dedicated Table for District Leaders Logins */
          <div className="overflow-hidden rounded-xl border border-[#1f424f] bg-[#11252d] shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#16303a] border-b border-[#1f424f] text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-3 pl-4 border-r border-[#1f424f] w-[150px]">Дата</th>
                  <th className="p-3 border-r border-[#1f424f] w-[180px]">Район</th>
                  <th className="p-3 border-r border-[#1f424f]">ПІБ керівника</th>
                  <th className="p-3 border-r border-[#1f424f] text-emerald-400 bg-emerald-950/20 w-[180px]">Час входу</th>
                  <th className="p-3 border-r border-[#1f424f] text-amber-300 bg-amber-950/20 w-[180px]">Час виходу</th>
                  {isAdmin && <th className="p-3 w-[60px] text-center">Дія</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f424f]/40 text-xs text-slate-300 font-medium">
                {filteredLogs.map(log => {
                  const dateStr = log.loginTime || new Date(log.timestamp).toLocaleString('uk-UA', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  });
                  const isOnline = log.logoutTime === 'В мережі' || !log.logoutTime;

                  return (
                    <tr key={log.id} className="hover:bg-[#16323c]/45 transition-colors">
                      <td className="p-3 pl-4 border-r border-[#1f424f]/40 font-mono text-[11px] text-slate-400">
                        {dateStr.split(',')[0] || dateStr}
                      </td>
                      <td className="p-3 border-r border-[#1f424f]/40">
                        <span className="px-2.5 py-1 rounded-md font-extrabold text-[11px] bg-teal-950 text-teal-300 border border-teal-500/40 tracking-wide uppercase">
                          {log.rayon || "ВСІ РАЙОНИ"}
                        </span>
                      </td>
                      <td className="p-3 border-r border-[#1f424f]/40 text-white font-bold text-sm">
                        {log.userPib || log.memberName}
                      </td>
                      <td className="p-3 border-r border-[#1f424f]/40 text-emerald-400 bg-emerald-950/20 font-bold font-mono">
                        {log.loginTime || dateStr}
                      </td>
                      <td className="p-3 border-r border-[#1f424f]/40 bg-amber-950/10 font-bold">
                        {isOnline ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-900/80 text-emerald-300 border border-emerald-400/50 inline-flex items-center gap-1.5 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> В МЕРЕЖІ
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">{log.logoutTime}</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-center bg-rose-950/10">
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 p-1.5 rounded transition-colors"
                            title="Видалити запис з журналу"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* General / All / Database changes table */
          <div className="overflow-hidden rounded-xl border border-[#1f424f] bg-[#11252d] shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#16303a] border-b border-[#1f424f] text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-3 pl-4 border-r border-[#1f424f] w-[160px]">Дата</th>
                  <th className="p-3 border-r border-[#1f424f] w-[180px]">Хто здійснив дію</th>
                  <th className="p-3 border-r border-[#1f424f] w-[200px]">Запис / Район</th>
                  <th className="p-3 border-r border-[#1f424f] w-[160px]">Тип / Поле</th>
                  <th className="p-3 border-r border-[#1f424f] text-rose-400 bg-rose-950/20 w-[180px]">Старе значення / Вхід</th>
                  <th className="p-3 border-r border-[#1f424f] text-emerald-400 bg-emerald-950/20">Нове значення / Вихід</th>
                  {isAdmin && <th className="p-3 w-[60px] text-center">Дія</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f424f]/40 text-xs text-slate-300 font-medium">
                {filteredLogs.map(log => {
                  const isLoginSession = log.action === 'login_session';
                  const dateStr = new Date(log.timestamp).toLocaleString('uk-UA', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  let fieldDisplay = log.field || "";
                  if (!fieldDisplay) {
                    if (isLoginSession) fieldDisplay = "Вхід керівника";
                    else if (log.action === "create") fieldDisplay = "Створення профайлу";
                    else if (log.action === "discipline") fieldDisplay = "Стягнення";
                    else if (log.action === "discipline_resolved") fieldDisplay = "Зняття стягнення";
                    else if (log.action === "add_ministry") fieldDisplay = "Служіння";
                    else if (log.action === "add_child") fieldDisplay = "Додано дитину";
                    else fieldDisplay = "Загальна зміна";
                  }

                  const oldVal = log.oldValue !== undefined ? log.oldValue : (log.loginTime || "-");
                  const newVal = log.newValue !== undefined ? log.newValue : log.details;

                  return (
                    <tr key={log.id} className={`hover:bg-[#16323c]/45 transition-colors ${isLoginSession ? 'bg-teal-950/20' : ''}`}>
                      {/* Timestamp */}
                      <td className="p-3 pl-4 border-r border-[#1f424f]/40 font-mono text-[11px] text-slate-400">
                        {dateStr}
                      </td>

                      {/* Actor (Who) */}
                      <td className="p-3 border-r border-[#1f424f]/40 text-slate-200 font-semibold truncate max-w-[180px]" title={log.userPib || log.memberName}>
                        {log.userPib || log.memberName || "Адміністратор"}
                      </td>

                      {/* Member Name / District */}
                      <td className="p-3 border-r border-[#1f424f]/40 text-white font-bold">
                        {isLoginSession ? (
                          <span className="px-2 py-0.5 rounded font-extrabold text-[11px] bg-teal-950 text-teal-300 border border-teal-500/40">
                            Район: {log.rayon || "ВСІ"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{log.memberName}</span>
                            {log.memberId > 0 && (
                              <button
                                onClick={() => onSelectMember(log.memberId)}
                                className="font-mono text-[9px] bg-[#1a3843] hover:bg-[#224b5a] text-teal-300 px-1 py-0.5 rounded transition-colors font-bold border border-[#2d5d70]"
                              >
                                ID {log.memberId}
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Field */}
                      <td className="p-3 border-r border-[#1f424f]/40">
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                          isLoginSession 
                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/40' 
                            : 'bg-[#1a3843] border-[#2d5d70] text-teal-300'
                        }`}>
                          {fieldDisplay}
                        </span>
                      </td>

                      {/* Old Value */}
                      <td className="p-3 border-r border-[#1f424f]/40 text-rose-400 bg-rose-950/20 break-words max-w-[180px] font-medium italic">
                        {oldVal}
                      </td>

                      {/* New Value */}
                      <td className="p-3 border-r border-[#1f424f]/40 text-emerald-400 bg-emerald-950/20 font-bold break-all">
                        {isLoginSession && (log.logoutTime === 'В мережі' || !log.logoutTime) ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-900/80 text-emerald-300 border border-emerald-400/50 inline-flex items-center gap-1 animate-pulse">
                            ● В мережі (Вхід: {log.loginTime})
                          </span>
                        ) : (
                          <span dangerouslySetInnerHTML={{ __html: newVal }} />
                        )}
                      </td>

                      {/* Delete Action (Admin only) */}
                      {isAdmin && (
                        <td className="p-3 text-center bg-rose-950/10">
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 p-1.5 rounded transition-colors"
                            title="Видалити запис з журналу"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-dashed border-[#1f424f] bg-[#11252d] py-12 text-center text-xs text-slate-400 italic">
          Записів журналу за обраними фільтрами не знайдено.
        </div>
      )}

    </div>
  );
}
