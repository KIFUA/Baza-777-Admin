import React, { useState, useEffect } from 'react';
import { MemberDetailExtended, Member } from '../types';
import { 
  User, Phone, Mail, MapPin, Calendar, Heart, Baby, 
  Briefcase, AlertCircle, CheckCircle, ArrowRight, Plus, Archive, ExternalLink
} from 'lucide-react';

interface MemberProfileProps {
  memberId: number;
  onClose: () => void;
  onEdit: (member: Member) => void;
  onNavigateToMember: (id: number) => void;
  lookups: any;
  onUpdateMember?: (id: number, updatedFields: Partial<Member>) => Promise<boolean>;
}

export default function MemberProfile({ memberId, onClose, onEdit, onNavigateToMember, lookups, onUpdateMember }: MemberProfileProps) {
  const [data, setData] = useState<MemberDetailExtended | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'family' | 'history' | 'discipline'>('info');

  const [showMinistrySelect, setShowMinistrySelect] = useState(false);

  const caregivers = lookups?.directories?.opika || [
    "Бевзюк В.", "Бурчак Ю.", "Галюк Б.", "Дмитраш М.", "Євстратов О.", 
    "Ільницький О.", "Луцак М.", "Марунчак В.", "Мельничук В.", "Несен Ю.", 
    "Прохніцький Б.", "Решетило Р.", "Самелюк О.", "Скіцко І.", "Скриник М.", 
    "Стасінчук В.", "Стафіїв М.", "Стефурак Д.", "Факас О.", "Черняк Вал.", 
    "Черняк Вікт.", "Шпарман Ю.", "Черняк Вас."
  ];

  const rayonOptions = lookups?.directories?.rayon2 || [
    "ЦЕНТР", "АЕРОПОРТ", "КАСКАД", "ПОЗИТРОН", "БАМ", "МИКИТИНЦІ", "КРИХІВЦІ", "ХРИПЛИН", "УГОРНИКИ", "ВОВЧИНЕЦЬ", "ПАСІЧНА", "ДІБРОВА"
  ];

  const vidviduvanistOptions = [
    "Постійно", "Періодично", "Рідко", "Ніколи"
  ];

  const prysutnistOptions = lookups?.directories?.prysutnist || [
    "За кордоном", "ЗСУ", "Не ходить", "Немічний"
  ];

  const fallbackMinistries = [
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
  ];

  const ministryOptions = (lookups?.directories?.slujinnya || fallbackMinistries).filter(Boolean);

  // Input forms states for adding new timeline logs
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildBirth, setNewChildBirth] = useState('');
  const [newChildAge, setNewChildAge] = useState('');

  const [showAddMinistry, setShowAddMinistry] = useState(false);
  const [newMinId, setNewMinId] = useState('4');
  const [newMinStart, setNewMinStart] = useState('');

  const [showAddDisc, setShowAddDisc] = useState(false);
  const [newDiscId, setNewDiscId] = useState('0');
  const [newDiscReason, setNewDiscReason] = useState('');
  const [newDiscStart, setNewDiscStart] = useState('');

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/members/${memberId}`);
      if (resp.ok) {
        const json = await resp.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error loading member details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldUpdate = async (field: string, val: any) => {
    if (!data || !data.member) return;
    try {
      const resp = await fetch(`/api/members/${memberId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: val })
      });
      if (resp.ok) {
        if (onUpdateMember) {
          await onUpdateMember(memberId, { [field]: val });
        }
        await fetchDetails();
      }
    } catch (err) {
      console.error("Error updating member field in profile:", err);
    }
  };

  useEffect(() => {
    fetchDetails();
    setActiveTab('info');
  }, [memberId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
        <p className="text-xs font-semibold text-slate-500 animate-pulse">Завантаження архівної справи...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
        Не вдалося завантажити картку члена церкви.
      </div>
    );
  }

  const { member, spouse, children, ministries, disciplines } = data;

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName) return;
    try {
      const resp = await fetch(`/api/members/${memberId}/children`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChildName,
          birthDate: newChildBirth,
          age: Number(newChildAge),
          relationType: member.stat === 'брат' ? 'father' : 'mother'
        })
      });
      if (resp.ok) {
        setShowAddChild(false);
        setNewChildName('');
        setNewChildBirth('');
        setNewChildAge('');
        fetchDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMinistry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch(`/api/members/${memberId}/ministries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ministryId: Number(newMinId),
          startDate: newMinStart || new Date().toISOString().split('T')[0]
        })
      });
      if (resp.ok) {
        setShowAddMinistry(false);
        setNewMinStart('');
        fetchDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndMinistry = async (recId: number) => {
    const dStr = prompt("Введіть дату завершення служіння (РРРР-ММ-ДД):", new Date().toISOString().split('T')[0]);
    if (!dStr) return;
    try {
      const resp = await fetch(`/api/members/${memberId}/ministries/${recId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endDate: dStr })
      });
      if (resp.ok) {
        fetchDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDiscipline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscReason) return;
    try {
      const resp = await fetch(`/api/members/${memberId}/disciplines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disciplineId: Number(newDiscId),
          reason: newDiscReason,
          startDate: newDiscStart || new Date().toISOString().split('T')[0]
        })
      });
      if (resp.ok) {
        setShowAddDisc(false);
        setNewDiscReason('');
        setNewDiscStart('');
        fetchDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveDiscipline = async (recId: number) => {
    const dStr = prompt("Введіть дату зняття стягнення (РРРР-ММ-ДД):", new Date().toISOString().split('T')[0]);
    if (!dStr) return;
    try {
      const resp = await fetch(`/api/members/${memberId}/disciplines/${recId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolveDate: dStr })
      });
      if (resp.ok) {
        fetchDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalMin = ministries.length;
  const activeMin = ministries.filter(m => m.isActive).length;
  const activeDisc = disciplines.filter(d => d.isActive).length;

  return (
    <div id="member_extended_card" className="space-y-6">
      
      {/* 1. Master Portrait Area & Title Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        
        {/* Background ambient accent */}
        <div className={`absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl opacity-10 ${member.id_vybuttya > 0 ? "bg-amber-500" : (member.stat === "брат" ? "bg-blue-500" : "bg-rose-500")}`}></div>

        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex items-center space-x-4">
            
            {/* Visual gender initials badge */}
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-sm text-lg font-bold uppercase font-display border ${member.id_vybuttya > 0 ? "bg-slate-100 text-slate-500 border-slate-200" : (member.stat === "брат" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-rose-50 text-rose-500 border-rose-100")}`}>
              {member.pib.substring(0, 2)}
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h1 className="font-display text-xl font-bold text-slate-900 md:text-2xl">{member.pib}</h1>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${member.id_vybuttya > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {member.id_vybuttya > 0 ? member.s_vybuv_ukr || "Вибув" : "Активний"}
                </span>
              </div>
              
              {/* Core quick metadata subtitles */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                <span className="flex items-center space-x-1"><User className="h-3.5 w-3.5" /><span>{member.stat}</span></span>
                {member.d_narodjennya && (
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{member.d_narodjennya} ({member.vik_rokiv1 || '?'} років)</span>
                  </span>
                )}
                <span className="flex items-center space-x-1"><MapPin className="h-3.5 w-3.5" /><span>{member.rayon2_ukr || "Район не вказано"} | {member.n_dilyci || "Дільниця"}</span></span>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(member)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Редагувати анкету
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Закрити справу
            </button>
          </div>
        </div>

        {/* Vybuttya disclaimer widget if Member left (06_VYBUTTYA) */}
        {member.id_vybuttya > 0 && (
          <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/50 p-4 animate-fade-in flex items-start space-x-3">
            <Archive className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest">Знято з церковного обліку</h4>
              <p className="text-xs text-slate-600">
                <b>Статус:</b> {member.s_vybuv_ukr} ({member.d_vybuttya || "Дата не вказана"}).
              </p>
              {member.vybutty_prymitka && (
                <div className="text-xs text-slate-700 bg-amber-100/30 rounded-lg p-2.5 mt-2 border border-amber-200/50">
                  <b>Пояснення примітки:</b> <span className="italic">"{member.vybutty_prymitka}"</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grid structure: Left side navigation, Right side content tabs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        
        {/* Navigation panel */}
        <div className="space-y-1 rounded-xl border border-slate-100 bg-white p-3 shadow-sm lg:col-span-1 h-fit">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex w-full items-center space-x-3 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${activeTab === 'info' ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <User className="h-4 w-4" />
            <span>Загальні відомості</span>
          </button>
          <button
            onClick={() => setActiveTab('family')}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${activeTab === 'family' ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <div className="flex items-center space-x-3">
              <Heart className="h-4 w-4" />
              <span>Родина й Нащадки</span>
            </div>
            {children.length > 0 && (
              <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${activeTab === 'family' ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                {children.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${activeTab === 'history' ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <div className="flex items-center space-x-3">
              <Briefcase className="h-4 w-4" />
              <span>Служіння ({totalMin})</span>
            </div>
            {activeMin > 0 && (
              <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${activeTab === 'history' ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"}`}>
                + {activeMin}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('discipline')}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${activeTab === 'discipline' ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-4 w-4" />
              <span>Дисциплінарний Стан</span>
            </div>
            {activeDisc > 0 && (
              <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold bg-rose-500 text-white animate-bounce`}>
                !
              </span>
            )}
          </button>
        </div>

        {/* Content Panel */}
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-3">
          
          {/* TAB 1: General info details */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                
                {/* Spiritual history card */}
                <div className="rounded-xl bg-slate-50 p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/50 pb-2 flex items-center space-x-1.5">
                    <span>Духовна історія</span>
                  </h4>
                  <div className="space-y-3 font-medium text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Покаяння:</span>
                      <span>{member.d_pokayannya || "не вказано"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Водне хрещення:</span>
                      <span>{member.d_vodnogo || "не вказано"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Вступ у членство:</span>
                      <span>{member.d_vstupu || "не вказано"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Духовні дари (ХСД):</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${member.hsd ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-500"}`}>
                        {member.hsd ? "є духовні дари" : "ні"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Parish & Oversight (Opika) card */}
                <div className="rounded-xl bg-slate-50 p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200/50 pb-2 flex items-center space-x-1.5">
                    <span>Церковна Відповідальність й Опіка</span>
                  </h4>
                  <div className="space-y-3 font-medium text-xs text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Відповідальний Провідник:</span>
                      <select
                        value={member.presviter || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          await handleFieldUpdate('presviter', val);
                        }}
                        className="font-bold text-blue-800 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[180px] text-[11px]"
                      >
                        <option value="">-- не встановлено --</option>
                        {caregivers.map((c: string) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Сектор / Дільниця:</span>
                      <span>{member.n_dilyci || "Дільниця №1"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Староста / Керівник групи:</span>
                      <span>{member.vidpov_grupy || "не вказано"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Район громади:</span>
                      <select
                        value={member.rayon2_ukr || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          await handleFieldUpdate('rayon2_ukr', val);
                        }}
                        className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold uppercase text-[10px] border border-blue-200/50 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[180px]"
                      >
                        <option value="">Не вказано</option>
                        {rayonOptions.map((r: string) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    {/* СЛУЖІННЯ Block (Ministry) */}
                    <div className="border-t border-slate-250 pt-3 mt-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 font-bold text-[11px]">Духовне служіння:</span>
                        <button
                          type="button"
                          onClick={() => setShowMinistrySelect(!showMinistrySelect)}
                          className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-extrabold text-[10px] border border-emerald-200 hover:bg-emerald-100 transition-colors uppercase outline-none"
                        >
                          {showMinistrySelect ? "Закрити ✕" : "Змінити ✎"}
                        </button>
                      </div>

                      {!showMinistrySelect && (
                        <div className="mt-1.5 text-slate-800 font-semibold text-[11px] leading-relaxed">
                          {member.s_slujinnya_spysok ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.s_slujinnya_spysok.split(/[,;]+/).map(s => s.trim()).filter(Boolean).map(term => (
                                <span key={term} className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-100/80 rounded px-1.5 py-0.5 text-[9.5px] font-bold">
                                  {term}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Служінь не зафіксовано</span>
                          )}
                        </div>
                      )}

                      {showMinistrySelect && (
                        <div className="mt-2 border border-slate-200 rounded-lg bg-white p-2.5 max-h-40 overflow-y-auto space-y-1">
                          {ministryOptions.map((opt) => {
                            const selectedList = member.s_slujinnya_spysok 
                              ? member.s_slujinnya_spysok.split(/[,;]+/).map(s => s.trim()).filter(Boolean) 
                              : [];
                            const isChecked = selectedList.includes(opt);
                            return (
                              <label 
                                key={opt} 
                                className="flex items-center gap-2 py-0.5 px-1 cursor-pointer rounded hover:bg-slate-50 select-none text-[10.5px] font-semibold text-slate-700"
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
                                    await handleFieldUpdate('s_slujinnya_spysok', valString);
                                  }}
                                  className="h-3 w-3 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className={isChecked ? 'text-emerald-950 font-extrabold' : ''}>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Attendance parameters (Requests 8 & 9) */}
              <div className="rounded-xl border border-slate-100 p-5 bg-blue-50/10 space-y-3">
                <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider block">Оцінка відвідуваності та статусу відсутності членів</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col p-3 bg-white rounded-lg border border-slate-100 space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="h-3.5 w-3.5 rounded-full bg-blue-500 animate-pulse"></div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">Характеристика Відвідуваності</div>
                    </div>
                    <select
                      value={member.vidviduvanist || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        await handleFieldUpdate('vidviduvanist', val);
                      }}
                      className="font-bold text-xs text-slate-700 w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">-- не внесено --</option>
                      {vidviduvanistOptions.map((o: string) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col p-3 bg-white rounded-lg border border-slate-100 space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="h-3.5 w-3.5 rounded-full bg-emerald-500"></div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">Причина відсутності (перебування)</div>
                    </div>
                    <select
                      value={member.prysutnist || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        await handleFieldUpdate('prysutnist', val);
                      }}
                      className="font-bold text-xs text-slate-700 w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- не внесено --</option>
                      {prysutnistOptions.map((o: string) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Standard contact specifications */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2">Адреса та Контакти</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs text-slate-700">
                  <div className="space-y-1">
                    <div className="text-slate-400">Мобільний зв'язок:</div>
                    <div className="font-semibold flex items-center space-x-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /><span>{member.tel_mob || "не вказано"}</span></div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-400">Додатковий зв'язок:</div>
                    <div className="font-medium">{member.tel1 || "не має"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-400">Skype ID:</div>
                    <div className="font-mono">{member.skype || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Status information details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-50 pb-2">Освітньо-професійний зріз</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs text-slate-700">
                  <div className="space-y-1">
                    <div className="text-slate-400 font-medium">Освіта / Заклад:</div>
                    <div className="font-semibold">{member.s_osvita_ukr} {member.zaklad_osv ? `(${member.zaklad_osv})` : ''}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-400 font-medium">Професійна діяльність:</div>
                    <div className="font-semibold capitalize">{member.s_profesiya_ukr || "н/д або безробітний"}</div>
                  </div>
                </div>
              </div>

              {/* Notes boxes */}
              {(member.primitka || member.hvoryi || member.insha_gromada) && (
                <div className="space-y-3 border-t border-slate-50 pt-3 text-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Архіваріус примітки</span>
                  <div className="space-y-2 text-slate-600 font-medium">
                    {member.hvoryi && <p><b>Примітка по здоров'ю:</b> {member.hvoryi}</p>}
                    {member.insha_gromada && <p><b>Перехід з іншої громади:</b> {member.insha_gromada}</p>}
                    {member.primitka && <p className="bg-slate-50 rounded-lg p-3 italic"><b>Коментар:</b> "{member.primitka}"</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Family Relations & Spouse resolver (Request 1 & Children list) */}
          {activeTab === 'family' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Husband/Wife resolve sector (Request 1) */}
              <div className="rounded-xl border border-slate-100 p-5 bg-white shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-1.5">
                  <Heart className="h-4 w-4 text-rose-500" />
                  <span>Шлюбний Союз (Подружжя)</span>
                </h4>
                
                {spouse ? (
                  <div className="flex items-center justify-between rounded-lg bg-rose-50/20 border border-rose-100/50 p-4">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Законна друга половинка (ПІБ):</div>
                      <div className="font-display text-base font-bold text-slate-950 flex items-center space-x-1.5">
                        <span>{spouse.pib}</span>
                        <span className="text-[10px] font-semibold text-slate-400">(ID: {spouse.id})</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigateToMember(spouse.id)}
                      className="flex items-center space-x-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-rose-100 px-3 py-1.5 rounded-lg transition-transform"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>Відкрити справу</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-2">
                    Станом на зараз в системі немає зв'язаного шлюбного партнера у базі simya.xlsx для цього ID, або сімейний стан не одружений ({member.s_simeyniy_ukr}).
                  </div>
                )}
              </div>

              {/* Children descendants listing from z_simya_diti.xlsx */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                    <Baby className="h-4 w-4 text-blue-500" />
                    <span>Неповнолітні та дорослі діти ({children.length})</span>
                  </h4>
                  <button
                    onClick={() => setShowAddChild(!showAddChild)}
                    className="flex items-center space-x-1 text-xs font-bold text-blue-600 hover:opacity-80"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Додати дитину</span>
                  </button>
                </div>

                {showAddChild && (
                  <form onSubmit={handleAddChild} className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-3 animate-fade-in">
                    <h5 className="text-xs font-bold text-slate-600 uppercase">Новий запис дитини</h5>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <input
                        type="text"
                        placeholder="Ім'я дитини"
                        value={newChildName}
                        onChange={(e) => setNewChildName(e.target.value)}
                        className="rounded border border-slate-200 bg-white p-2 text-xs focus:outline-none"
                        required
                      />
                      <input
                        type="date"
                        value={newChildBirth}
                        onChange={(e) => setNewChildBirth(e.target.value)}
                        className="rounded border border-slate-200 bg-white p-2 text-xs focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Вік (років)"
                        value={newChildAge}
                        onChange={(e) => setNewChildAge(e.target.value)}
                        className="rounded border border-slate-200 bg-white p-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowAddChild(false)}
                        className="rounded px-3 py-1 text-[11px] hover:bg-slate-200"
                      >
                        Скасувати
                      </button>
                      <button
                        type="submit"
                        className="rounded bg-blue-600 px-3 py-1 text-[11px] text-white hover:bg-blue-700 font-bold"
                      >
                        Записати
                      </button>
                    </div>
                  </form>
                )}

                {children.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {children.map(c => (
                      <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-4 bg-slate-50/30">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-slate-800">{c.name}</div>
                          <div className="text-[10px] font-medium text-slate-500">
                            {c.birthDate ? `Нар. ${c.birthDate}` : 'Рік народження не вказано'}
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 font-mono text-slate-600">
                          {c.age ? `${c.age} р.` : 'н/д вік'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic py-4">
                    Діти не зв'язані у картотеці для цього сімейного ID.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: Ministries slujinnya timeline logs */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                  <Briefcase className="h-4 w-4" />
                  <span>Журнал духовних та церковних служінь</span>
                </h4>
                <button
                  onClick={() => setShowAddMinistry(!showAddMinistry)}
                  className="flex items-center space-x-1 text-xs font-bold text-blue-600 hover:opacity-80"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Призначити служіння</span>
                </button>
              </div>

              {showAddMinistry && (
                <form onSubmit={handleAddMinistry} className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-3 animate-fade-in">
                  <h5 className="text-xs font-bold text-slate-600 uppercase">Призначення нового служіння</h5>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <select
                      value={newMinId}
                      onChange={(e) => setNewMinId(e.target.value)}
                      className="rounded border border-slate-200 bg-white p-2 text-xs focus:outline-none"
                    >
                      {Object.entries(lookups?.ministry_types || {}).map(([id, val]: any) => (
                        <option key={id} value={id}>{val}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={newMinStart}
                      onChange={(e) => setNewMinStart(e.target.value)}
                      className="rounded border border-slate-200 bg-white p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMinistry(false)}
                      className="rounded px-3 py-1 text-[11px] hover:bg-slate-200"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-blue-600 px-3 py-1 text-[11px] text-white hover:bg-blue-700 font-bold"
                    >
                      Призначити
                    </button>
                  </div>
                </form>
              )}

              {ministries.length > 0 ? (
                <div className="flow-root">
                  <ul role="list" className="-mb-8">
                    {ministries.map((min, minIdx) => (
                      <li key={min.id}>
                        <div className="relative pb-8">
                          {minIdx !== ministries.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${min.isActive ? "bg-emerald-500" : "bg-slate-300"}`}>
                                <Briefcase className="h-4 w-4" />
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  {min.ministryName}
                                </p>
                                <span className="inline-flex items-center rounded-full mt-1 bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">
                                  ID служення: {min.ministryId}
                                </span>
                              </div>
                              <div className="whitespace-nowrap text-right text-xs text-slate-500 font-medium">
                                <div><b>{min.startDate || "Давня дата"}</b> — {min.endDate ? <span className="text-slate-400">{min.endDate}</span> : <span className="text-emerald-600 font-bold uppercase text-[9px]">Активно</span>}</div>
                                {min.isActive && (
                                  <button
                                    onClick={() => handleEndMinistry(min.id)}
                                    className="text-[10px] text-red-500 font-bold mt-1.5 hover:underline"
                                  >
                                    Завершити служіння
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-4">
                  У профайлі служителів немає записів історичних служінь.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Disciplines Timeline */}
          {activeTab === 'discipline' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  <span>Дисциплінарний Стан та Зауваження (05_ISTORIJA)</span>
                </h4>
                <button
                  onClick={() => setShowAddDisc(!showAddDisc)}
                  className="flex items-center space-x-1 text-xs font-bold text-rose-600 hover:opacity-80"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Додати стягнення</span>
                </button>
              </div>

              {showAddDisc && (
                <form onSubmit={handleAddDiscipline} className="rounded-lg border border-slate-100 bg-rose-50/20 p-4 space-y-3 animate-fade-in">
                  <h5 className="text-xs font-bold text-rose-600 uppercase">Новий запис дисциплінарного стягнення</h5>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <select
                      value={newDiscId}
                      onChange={(e) => setNewDiscId(e.target.value)}
                      className="rounded border border-slate-200 bg-white p-2 text-xs focus:outline-none"
                    >
                      {Object.entries(lookups?.discipline_types || {}).map(([id, val]: any) => (
                        <option key={id} value={id}>{val}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={newDiscStart}
                      onChange={(e) => setNewDiscStart(e.target.value)}
                      className="rounded border border-slate-200 bg-white p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Причина накладення стягнення"
                    value={newDiscReason}
                    onChange={(e) => setNewDiscReason(e.target.value)}
                    className="w-full rounded border border-slate-200 bg-white p-2 text-xs focus:outline-none"
                    required
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddDisc(false)}
                      className="rounded px-3 py-1 text-[11px] hover:bg-slate-200"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-rose-600 px-3 py-1 text-[11px] text-white hover:bg-rose-700 font-bold"
                    >
                      Накласти
                    </button>
                  </div>
                </form>
              )}

              {disciplines.length > 0 ? (
                <div className="space-y-4">
                  {disciplines.map(disc => (
                    <div key={disc.id} className={`rounded-xl border p-4 shadow-sm relative overflow-hidden ${disc.isActive ? "border-rose-100 bg-rose-50/10" : "border-slate-100 bg-slate-50/10"}`}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${disc.isActive ? "bg-rose-100 text-rose-800 animate-pulse" : "bg-slate-100 text-slate-600"}`}>
                              {disc.disciplineName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {disc.disciplineId}</span>
                          </div>
                          
                          {disc.reason && (
                            <div className="text-xs text-slate-700 font-medium">
                              <b>Причина:</b> <span className="italic">"{disc.reason}"</span>
                            </div>
                          )}

                          <div className="text-[10px] text-slate-500 font-medium flex gap-4">
                            <span><b>Накладено:</b> {disc.startDate || 'Давня дата'}</span>
                            {(disc.removalDate || disc.endDate) && <span className="text-emerald-600"><b>Знято:</b> {disc.removalDate || disc.endDate}</span>}
                          </div>
                        </div>

                        {disc.isActive && (
                          <button
                            onClick={() => handleResolveDiscipline(disc.id)}
                            className="bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-600 text-[10px] font-bold px-3 py-1 rounded-lg shadow-sm"
                          >
                            Зняти стягнення
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-4">
                  Дисциплінарних зауважень чи стягнень в картотеці немає. Справа чиста.
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
