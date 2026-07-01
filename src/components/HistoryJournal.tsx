import React, { useState, useEffect } from 'react';
import { AuditLogItem } from '../types';
import { History, Search, FileText, UserPlus, ShieldAlert, BadgeInfo, CheckCircle } from 'lucide-react';

interface HistoryJournalProps {
  onSelectMember: (id: number) => void;
}

export default function HistoryJournal({ onSelectMember }: HistoryJournalProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');

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

  const filteredLogs = logs.filter(l => {
    const textMatch = l.memberName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      l.details.toLowerCase().includes(searchQuery.toLowerCase());
    const actionMatch = actionFilter === '' || l.action === actionFilter;
    return textMatch && actionMatch;
  });

  return (
    <div id="history_journal" className="space-y-6 animate-fade-in text-slate-100">
      
      {/* Title section */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[#1f424f]">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">Історичний Журнал (ISTORIJA)</h2>
          <p className="text-sm text-slate-400">Повна хронологічна фіксація всіх канонічних та адміністративних змін у базі даних</p>
        </div>
        <button
          onClick={fetchLogs}
          className="rounded-lg border border-[#2d5d70] bg-[#1a3843] hover:bg-[#224b5a] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-colors shadow-sm"
        >
          Оновити журнал
        </button>
      </div>

      {/* Filter selectors toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#11252d] rounded-xl border border-[#1f424f] p-4">
        
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

        {/* Action Type filter */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full sm:max-w-[180px] rounded-lg border border-[#1f424f] p-2 text-xs focus:border-teal-500 focus:outline-none bg-[#1a3843] text-slate-200"
        >
          <option value="" className="bg-[#11252d]">Всі види змін</option>
          <option value="create" className="bg-[#11252d]">Додавання профайлу</option>
          <option value="update" className="bg-[#11252d]">Редагування анкети</option>
          <option value="discipline" className="bg-[#11252d]">Зауваження/Дисципліна</option>
          <option value="discipline_resolved" className="bg-[#11252d]">Зняття зауважень</option>
          <option value="add_ministry" className="bg-[#11252d]">Призначення служінь</option>
        </select>
        
        <span className="text-xs text-slate-400 font-medium ml-auto">
          Знайдено змін: <b className="text-teal-400">{filteredLogs.length}</b>
        </span>
      </div>

      {/* Spreadsheet grid table of change logs */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1f424f] border-t-teal-500"></div>
          <span className="text-slate-400 text-xs font-medium">Завантаження записів аудиту...</span>
        </div>
      ) : filteredLogs.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-[#1f424f] bg-[#11252d] shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#16303a] border-b border-[#1f424f] text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                <th className="p-3 pl-4 border-r border-[#1f424f] w-[170px]">Дата зміни</th>
                <th className="p-3 border-r border-[#1f424f] w-[180px]">Хто здійснив дію (ПІБ)</th>
                <th className="p-3 border-r border-[#1f424f] w-[220px]">Член церкви</th>
                <th className="p-3 border-r border-[#1f424f] w-[160px]">Змінене поле</th>
                <th className="p-3 border-r border-[#1f424f] text-rose-400 bg-rose-950/20 w-[180px]">Старе значення</th>
                <th className="p-3 text-emerald-400 bg-emerald-950/20">Нове значення (зелений, жирний)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f424f]/40 text-xs text-slate-300 font-medium">
              {filteredLogs.map(log => {
                const dateStr = new Date(log.timestamp).toLocaleString('uk-UA', {
                  year: 'numeric',
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                // Humanize the changed field name / action
                let fieldDisplay = log.field || "";
                if (!fieldDisplay) {
                  if (log.action === "create") fieldDisplay = "Створення профайлу";
                  else if (log.action === "discipline") fieldDisplay = "Стягнення";
                  else if (log.action === "discipline_resolved") fieldDisplay = "Зняття стягнення";
                  else if (log.action === "add_ministry") fieldDisplay = "Служіння";
                  else if (log.action === "add_child") fieldDisplay = "Додано дитину";
                  else fieldDisplay = "Загальна зміна";
                }

                // Old value
                const oldVal = log.oldValue !== undefined ? log.oldValue : "-";

                // New value (fallback to details if newValue is not defined)
                const newVal = log.newValue !== undefined ? log.newValue : log.details;

                return (
                  <tr key={log.id} className="hover:bg-[#16323c]/45 transition-colors">
                    {/* Timestamp */}
                    <td className="p-3 pl-4 border-r border-[#1f424f]/40 font-mono text-[11px] text-slate-400">
                      {dateStr}
                    </td>

                    {/* Actor (Who) */}
                    <td className="p-3 border-r border-[#1f424f]/40 text-slate-200 font-semibold truncate max-w-[180px]" title={log.userPib || "Адміністратор"}>
                      {log.userPib || "Адміністратор"}
                    </td>

                    {/* Member Name */}
                    <td className="p-3 border-r border-[#1f424f]/40 text-white font-bold">
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
                    </td>

                    {/* Field */}
                    <td className="p-3 border-r border-[#1f424f]/40">
                      <span className="bg-[#1a3843] border border-[#2d5d70] text-teal-300 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
                        {fieldDisplay}
                      </span>
                    </td>

                    {/* Old Value (Red) */}
                    <td className="p-3 border-r border-[#1f424f]/40 text-rose-400 bg-rose-950/20 break-words max-w-[180px] font-medium italic">
                      {oldVal}
                    </td>

                    {/* New Value (Green, Bold) */}
                    <td className="p-3 text-emerald-400 bg-emerald-950/20 font-bold break-all" dangerouslySetInnerHTML={{ __html: newVal }} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#1f424f] bg-[#11252d] py-12 text-center text-xs text-slate-400 italic">
          Записів змін за вашими критеріями фільтрації не знайдено.
        </div>
      )}

    </div>
  );
}
