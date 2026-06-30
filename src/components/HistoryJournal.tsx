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
    <div id="history_journal" className="space-y-6 animate-fade-in">
      
      {/* Title section */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-slate-100">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">Історичний Журнал (ISTORIJA)</h2>
          <p className="text-sm text-slate-500">Повна хронологічна фіксація всіх канонічних та адміністративних змін у базі даних</p>
        </div>
        <button
          onClick={fetchLogs}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          Оновити журнал
        </button>
      </div>

      {/* Filter selectors toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white rounded-xl border border-slate-100 p-4">
        
        {/* Search bar */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Пошук у журналі..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Action Type filter */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full sm:max-w-[180px] rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-none bg-white"
        >
          <option value="">Всі види змін</option>
          <option value="create">Додавання профайлу</option>
          <option value="update">Редагування анкети</option>
          <option value="discipline">Зауваження/Дисципліна</option>
          <option value="discipline_resolved">Зняття зауважень</option>
          <option value="add_ministry">Призначення служінь</option>
        </select>
        
        <span className="text-xs text-slate-400 font-medium ml-auto">
          Знайдено змін: <b>{filteredLogs.length}</b>
        </span>
      </div>

      {/* Feed cards list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"></div>
          <span className="text-slate-400 text-xs font-medium">Завантаження записів аудиту...</span>
        </div>
      ) : filteredLogs.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-100">
          {filteredLogs.map(log => {
            const dateStr = new Date(log.timestamp).toLocaleString('uk-UA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });

            return (
              <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors flex items-start gap-3.5">
                
                {/* Audit Action Icon */}
                <div className="shrink-0 mt-0.5">
                  {getLogIcon(log.action)}
                </div>

                <div className="flex-1 min-w-0 space-y-1 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <div className="font-bold text-slate-900 text-sm">
                      {log.memberName}
                      {log.memberId > 0 && (
                        <button
                          onClick={() => onSelectMember(log.memberId)}
                          className="ml-2 font-mono text-[10px] text-blue-600 hover:underline outline-none font-bold"
                        >
                          [Карта ID {log.memberId}]
                        </button>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 font-medium">
                      {dateStr}
                    </span>
                  </div>
                  
                  {/* Detailed Description */}
                  <div 
                    className="text-slate-600 leading-relaxed font-medium break-all prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: log.details }}
                  />
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-xs text-slate-400 italic">
          Записів змін за вашими kryteriayamy фільтрації не знайдено.
        </div>
      )}

    </div>
  );
}
