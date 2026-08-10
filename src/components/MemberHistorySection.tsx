import React, { useState } from 'react';
import { Member, MemberHistoryItem } from '../types';
import { getSynthesizedHistoryLogs } from '../lib/historyUtils';
import { Clock, Plus, Trash2, Calendar, CheckCircle2, UserCheck, LogOut, HeartHandshake, Sparkles, X } from 'lucide-react';
import { normalizeToDateStr } from '../lib/dateUtils';

interface MemberHistorySectionProps {
  member: Member;
  canEdit?: boolean;
  onUpdateHistory: (updatedLogs: MemberHistoryItem[]) => Promise<void> | void;
}

export default function MemberHistorySection({ member, canEdit = true, onUpdateHistory }: MemberHistorySectionProps) {
  const logs = getSynthesizedHistoryLogs(member);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newType, setNewType] = useState<'vstup' | 'vybuttya' | 'ponovlennya' | 'peremishchennya' | 'other'>('vstup');
  const [newTitle, setNewTitle] = useState('Прийняття в члени церкви');
  const [newDetails, setNewDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert("Вкажіть назву події");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDate = normalizeToDateStr(newDate);
      const newItem: MemberHistoryItem = {
        id: 'hist_' + Date.now(),
        date: formattedDate,
        type: newType,
        title: newTitle.trim(),
        details: newDetails.trim(),
        createdAt: new Date().toISOString()
      };

      const currentLogs = Array.isArray(member.history_logs) ? [...member.history_logs] : logs;
      const updated = [newItem, ...currentLogs];

      await onUpdateHistory(updated);
      setShowAddModal(false);
      setNewDetails('');
    } catch (err: any) {
      alert("Помилка при збереженні запису історії: " + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("Ви дійсно бажаєте вилучити цей запис з історії?")) return;
    try {
      const currentLogs = Array.isArray(member.history_logs) ? [...member.history_logs] : logs;
      const updated = currentLogs.filter(item => item.id !== logId);
      await onUpdateHistory(updated);
    } catch (err: any) {
      alert("Помилка при вилученні: " + (err?.message || err));
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'vstup':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          label: 'Прийняття / Вступ'
        };
      case 'vybuttya':
        return {
          icon: <LogOut className="h-4 w-4 text-amber-600" />,
          bg: 'bg-amber-50 border-amber-200 text-amber-900',
          label: 'Вибуття'
        };
      case 'ponovlennya':
        return {
          icon: <UserCheck className="h-4 w-4 text-blue-600" />,
          bg: 'bg-blue-50 border-blue-200 text-blue-900',
          label: 'Поновлення'
        };
      case 'peremishchennya':
        return {
          icon: <HeartHandshake className="h-4 w-4 text-indigo-600" />,
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-900',
          label: 'Переміщення'
        };
      default:
        return {
          icon: <Sparkles className="h-4 w-4 text-purple-600" />,
          bg: 'bg-slate-50 border-slate-200 text-slate-800',
          label: 'Запис'
        };
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            ІСТОРІЯ ЧЛЕНСТВА ТА ЗМІН (Прийняття, Вибуття, Поновлення, Переміщення)
          </h3>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Додати запис історії</span>
          </button>
        )}
      </div>

      {showAddModal && (
        <form onSubmit={handleAddLog} className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3 animate-fade-in shadow-inner">
          <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
            <h4 className="text-xs font-bold text-blue-900 uppercase">Новий запис у хронологію членства</h4>
            <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">Дата події</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded border border-slate-200 bg-white p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">Тип події</label>
              <select
                value={newType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setNewType(val);
                  if (val === 'vstup') setNewTitle('Прийняття в члени церкви');
                  else if (val === 'vybuttya') setNewTitle('Вибуття з церкви');
                  else if (val === 'ponovlennya') setNewTitle('Поновлення у наявних членах церкви');
                  else if (val === 'peremishchennya') setNewTitle('Переміщення з іншої громади');
                }}
                className="w-full rounded border border-slate-200 bg-white p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
              >
                <option value="vstup">Прийняття в члени (Вступ)</option>
                <option value="vybuttya">Вибуття з церкви</option>
                <option value="ponovlennya">Поновлення у наявних</option>
                <option value="peremishchennya">Переміщення (З іншої громади)</option>
                <option value="other">Інший запис історії</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-1">
              <label className="text-[11px] font-bold text-slate-600 block">Назва / Опис події</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="напр. Прийняття в члени церкви (від Музики)"
                className="w-full rounded border border-slate-200 bg-white p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">Деталі / Примітка / Звідки повернено</label>
            <input
              type="text"
              value={newDetails}
              onChange={(e) => setNewDetails(e.target.value)}
              placeholder="додаткова інформація, звідки повернено, за чиїм рішенням тощо..."
              className="w-full rounded border border-slate-200 bg-white p-1.5 text-xs font-medium focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="rounded px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Збереження...' : 'Зберегти запис'}
            </button>
          </div>
        </form>
      )}

      {logs.length > 0 ? (
        <div className="relative border-l-2 border-slate-200 ml-3 pl-4 space-y-4 my-2">
          {logs.map((item) => {
            const badge = getEventBadge(item.type);
            return (
              <div key={item.id} className="relative group">
                <span className="absolute -left-[23px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-slate-400 group-hover:border-blue-600 transition-colors" />
                <div className={`rounded-lg border p-3 ${badge.bg} transition-all`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center space-x-2">
                      {badge.icon}
                      <span className="text-xs font-bold">{item.title}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center space-x-1 rounded bg-white/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200 shadow-2xs">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>{item.date || 'Дата не вказана'}</span>
                      </span>
                      {canEdit && !item.id.startsWith('auto_') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(item.id)}
                          className="text-red-400 hover:text-red-600 p-0.5 rounded hover:bg-white/50"
                          title="Вилучити запис"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {item.details && (
                    <p className="text-xs text-slate-600 mt-1 pl-6 italic">
                      "{item.details}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-lg">
          Історія членських статусів ще не заповнена. Додайте перший запис через кнопку вище.
        </div>
      )}
    </div>
  );
}
