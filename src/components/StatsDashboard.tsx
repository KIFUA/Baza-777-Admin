import React from 'react';
import { Member, DashboardStats } from '../types';
import { Users, UserCheck, UserMinus, ShieldAlert } from 'lucide-react';

interface StatsDashboardProps {
  stats: DashboardStats | null;
  members: Member[];
}

export default function StatsDashboard({ stats, members }: StatsDashboardProps) {
  if (!stats) {
    return (
      <div className="flex animate-pulse flex-col items-center justify-center py-20">
        <div className="h-8 w-64 rounded-md bg-slate-200"></div>
        <div className="mt-4 h-4 w-40 rounded-md bg-slate-200"></div>
      </div>
    );
  }

  // Get active members count
  const activeMembersCount = members.filter(m => m.id_vybuttya === 0).length;
  const totalCount = members.length;
  const leftCount = totalCount - activeMembersCount;

  // Let's build a clean, custom indicator card
  const cards = [
    {
      id: "stat_total",
      title: "Загальний реєстр",
      value: totalCount,
      sub: "Всі записи в системі",
      icon: Users,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      id: "stat_active",
      title: "Активні члени церкви",
      value: activeMembersCount,
      sub: `${Math.round((activeMembersCount / totalCount) * 100)}% від реєстру`,
      icon: UserCheck,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      id: "stat_left",
      title: "Зняті з обліку (вибули)",
      value: leftCount,
      sub: `${Math.round((leftCount / totalCount) * 100)}% померли/виїхали`,
      icon: UserMinus,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      id: "stat_discipline",
      title: "Під стягненням / Опіка",
      value: members.filter(m => m.id_vybuttya === 0 && m.hvoryi).length,
      sub: "Потребують посиленої уваги",
      icon: ShieldAlert,
      color: "text-rose-600 bg-rose-50 border-rose-100",
    }
  ];

  // Render a clean percentage bar
  const renderBar = (label: string, value: number, max: number, colorClass = "bg-blue-600") => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    const isNA = !label || label.toLowerCase() === "н/д" || label === "Не визначено" || label.trim() === "";
    const labelToDisplay = isNA ? "н/д" : label;
    return (
      <div key={label || "empty"} className="group flex flex-col space-y-1">
        <div className="flex items-center justify-between text-xs font-medium text-slate-700">
          <span className={`truncate ${isNA ? "text-slate-400 font-normal italic" : ""}`}>{labelToDisplay}</span>
          <span className="text-slate-500">{value} ({pct}%)</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div id="stats_dashboard" className="space-y-8 animate-fade-in">
      {/* Visual Header */}
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">Аналітична статистика реєстру</h2>
        <p className="text-sm text-slate-500">Авторизований зріз по структурі за активними членами громади</p>
      </div>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{c.title}</span>
              <div className="font-display text-3xl font-bold text-slate-900">{c.value}</div>
              <p className="text-xs text-slate-500">{c.sub}</p>
            </div>
            <div className={`rounded-xl border p-3 ${c.color}`}>
              <c.icon className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Grid of details charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Gender & Marital State */}
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="font-display font-semibold text-slate-800">Стать та Сімейний стан</h3>
            <p className="text-xs text-slate-400">Співвідношення статей та статус шлюбу церковних родин</p>
          </div>
          
          <div className="space-y-4">
            {/* Gender Ratio */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Статевий розподіл</span>
              <div className="flex h-5 w-full overflow-hidden rounded-lg bg-slate-100 font-mono text-[10px] font-bold text-white">
                <div 
                  className="flex items-center justify-center bg-sky-500 transition-all duration-300"
                  style={{ width: `${stats.malesCount + stats.femalesCount > 0 ? (stats.malesCount / (stats.malesCount + stats.femalesCount)) * 100 : 50}%` }}
                >
                  Бр ({stats.malesCount})
                </div>
                <div 
                  className="flex items-center justify-center bg-rose-400 transition-all duration-300"
                  style={{ width: `${stats.malesCount + stats.femalesCount > 0 ? (stats.femalesCount / (stats.malesCount + stats.femalesCount)) * 100 : 50}%` }}
                >
                  Сст ({stats.femalesCount})
                </div>
              </div>
            </div>

            {/* Marital status bar chart */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Сімейний Стан</span>
              {Object.entries(stats.maritalStats).map(([lbl, val]) => 
                renderBar(lbl, val, stats.activeMembers, "bg-indigo-500")
              )}
            </div>
          </div>
        </div>

        {/* Structural Area Parish Density */}
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="font-display font-semibold text-slate-800">Райони структури (rayon2)</h3>
            <p className="text-xs text-slate-400">Охоплення районів міста за кількістю членів громади</p>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
            {Object.entries(stats.areaStats)
              .sort((a, b) => b[1] - a[1])
              .map(([lbl, val]) => 
                renderBar(lbl === "" ? "н/д" : lbl, val, stats.activeMembers, "bg-emerald-500")
              )}
          </div>
        </div>

        {/* Education & Social Class Group */}
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="font-display font-semibold text-slate-800">Освіта та Соціальний статус</h3>
            <p className="text-xs text-slate-400">Розділ за рівнями навчання та соціальним класом</p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Рівень освіти</span>
              <div className="space-y-3">
                {Object.entries(stats.educationStats).map(([lbl, val]) => 
                  renderBar(lbl, val, stats.activeMembers, "bg-violet-500")
                )}
              </div>
            </div>
            
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Соціальна категорія</span>
              <div className="space-y-3">
                {Object.entries(stats.socialStats)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([lbl, val]) => 
                    renderBar(lbl, val, stats.activeMembers, "bg-amber-500")
                  )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
