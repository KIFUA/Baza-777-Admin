import React, { useState, useMemo, useEffect } from 'react';
import { Member } from '../types';
import { 
  Search, Edit2, Check, X, FileText, CheckCircle, AlertTriangle, 
  HelpCircle, Sparkles, Filter 
} from 'lucide-react';

interface SpreadsheetViewProps {
  members: Member[];
  lookups: any;
  onOpenProfile: (id: number) => void;
  onUpdateMember: (id: number, updatedFields: Partial<Member>) => Promise<boolean>;
}

export default function SpreadsheetView({ members, lookups, onOpenProfile, onUpdateMember }: SpreadsheetViewProps) {
  const [filterType, setFilterType] = useState<'active' | 'dismissed' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDates, setEditingDates] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  // Dropdown cell editing state
  const [editingCell, setEditingCell] = useState<{ id: number; field: 'di_admin' | 's_profesiya_ukr' | 'vidviduvanist' | 'prysutnist' } | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = () => {
      setIsAdmin(localStorage.getItem("user_tg_id") === "969538290");
    };
    checkAdmin();
    const interval = setInterval(checkAdmin, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to calculate years in church
  const getYearsInChurch = (vstDate?: string) => {
    if (!vstDate) return 'н/д';
    try {
      const parts = vstDate.split('-');
      if (parts.length > 0) {
        const year = parseInt(parts[0], 10);
        if (!isNaN(year) && year > 1900) {
          return (new Date().getFullYear() - year).toString();
        }
      }
      const dotParts = vstDate.split('.');
      if (dotParts.length === 3) {
        const year = parseInt(dotParts[2], 10);
        if (!isNaN(year) && year > 1900) {
          return (new Date().getFullYear() - year).toString();
        }
      }
    } catch (e) {}
    return '—';
  };

  // Filter members list locally + sort alphabetically by PIB
  const filteredMembers = useMemo(() => {
    const list = members.filter(m => {
      // 1. Status Filter (active / dismissed / all)
      if (filterType === 'active' && m.id_vybuttya > 0) return false;
      if (filterType === 'dismissed' && m.id_vybuttya === 0) return false;

      // 2. Search query filter (pib, address, phone, presviter)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const pibMatch = m.pib?.toLowerCase().includes(q);
        const phoneMatch = m.tel_mob?.toLowerCase().includes(q);
        const presvMatch = m.presviter?.toLowerCase().includes(q);
        const rayonMatch = m.rayon2_ukr?.toLowerCase().includes(q);
        const primitkaMatch = m.primitka?.toLowerCase().includes(q);
        
        return pibMatch || phoneMatch || presvMatch || rayonMatch || primitkaMatch;
      }

      return true;
    });

    // Sort alphabetically by full name (pib)
    return [...list].sort((a, b) => (a.pib || '').localeCompare(b.pib || '', 'uk-UA'));
  }, [members, filterType, searchQuery]);

  // Dropdown inline cell renderer (Request 5 & 6)
  const renderDropdownCell = (
    m: Member, 
    field: 'di_admin' | 's_profesiya_ukr' | 'vidviduvanist' | 'prysutnist',
    options: string[],
    fallbackText = '—',
    colorClasses = 'text-slate-600'
  ) => {
    const isEditingCell = editingCell?.id === m.id && editingCell?.field === field;
    const value = m[field] || '';

    if (isEditingCell) {
      return (
        <td className="py-1 px-1 border-r border-slate-300 bg-white" onClick={(e) => e.stopPropagation()}>
          <select
            value={value}
            onChange={async (e) => {
              const val = e.target.value;
              await onUpdateMember(m.id, { [field]: val });
              setEditingCell(null);
            }}
            onBlur={() => setEditingCell(null)}
            autoFocus
            className="w-full bg-white border border-emerald-500 rounded px-1 py-0.5 text-[10px] font-bold focus:outline-none"
          >
            <option value="">—</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </td>
      );
    }

    return (
      <td 
        onClick={(e) => { e.stopPropagation(); setEditingCell({ id: m.id, field }); }}
        className="py-1 px-1.5 border-r border-slate-300 text-center cursor-pointer hover:bg-slate-200/50 min-h-[28px] transition-colors"
        title="Клацніть для швидкої зміни значення"
      >
        <span className={`inline-block text-[10px] font-bold ${colorClasses}`}>
          {value || fallbackText}
        </span>
      </td>
    );
  };

  // Start inline editing of contact dates
  const handleStartEdit = (m: Member) => {
    setEditingId(m.id);
    setEditingDates(m.d_kontaktiv || '');
  };

  // Save inline edit
  const handleSaveEdit = async (id: number) => {
    setSavingId(id);
    const ok = await onUpdateMember(id, { d_kontaktiv: editingDates });
    if (ok) {
      setEditingId(null);
    }
    setSavingId(null);
  };

  // Helper to format any date to dd.mm.yyyy format
  const formatDateToUA = (dateStr?: string) => {
    if (!dateStr) return '—';
    const trimmed = dateStr.trim();
    if (!trimmed || trimmed === '—' || trimmed === 'н/д') return '—';

    // If it's already in DD.MM.YYYY format
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // A pattern for standard ISO dates: YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [_, yyyy, mm, dd] = isoMatch;
      return `${dd}.${mm}.${yyyy}`;
    }

    // A pattern for YYYY.MM.DD
    const dotMatch = trimmed.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
    if (dotMatch) {
      const [_, yyyy, mm, dd] = dotMatch;
      return `${dd}.${mm}.${yyyy}`;
    }

    // Try parsing with Javascript Date if it contains a year-like number
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      if (yyyy > 1900 && yyyy < 2100) {
        return `${dd}.${mm}.${yyyy}`;
      }
    }

    return trimmed;
  };

  // Render water baptism check badge (leaving ONLY the formatted date based on Request 3)
  const renderWaterBaptism = (dateStr?: string) => {
    return formatDateToUA(dateStr);
  };

  return (
    <div id="spreadsheet_container" className="flex-1 flex flex-col bg-transparent overflow-hidden min-h-0">
      
      {/* Search & Mode filters rail */}
      <div className="px-4 py-2 bg-[#2a4d5c] border-b border-[#1b3642] flex flex-col sm:flex-row sm:items-center sm:justify-start gap-4 shrink-0 shadow-sm">
        
        {/* Status filtering widgets (Наявні / Вибулі / Всі) */}
        {isAdmin && (
          <div className="flex items-center space-x-2 shrink-0">
            <div className="inline-flex rounded-md bg-[#1a3843] p-1 border border-[#1b3642] w-[216px] justify-between">
              <button
                id="filter_active_btn"
                onClick={() => setFilterType('active')}
                className={`px-3 py-0.5 rounded text-[9px] font-normal uppercase transition-all ${filterType === 'active' ? "bg-[#387d7a] text-white shadow-sm font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                Наявні
              </button>
              <button
                id="filter_dismissed_btn"
                onClick={() => setFilterType('dismissed')}
                className={`px-3 py-0.5 rounded text-[9px] font-normal uppercase transition-all ${filterType === 'dismissed' ? "bg-amber-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                Вибулі
              </button>
              <button
                id="filter_all_btn"
                onClick={() => setFilterType('all')}
                className={`px-3 py-0.5 rounded text-[9px] font-normal uppercase transition-all ${filterType === 'all' ? "bg-[#387d7a] text-white shadow-sm font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                Всі
              </button>
            </div>
          </div>
        )}

        {/* Local Search query box */}
        <div className={`relative w-full sm:w-80 ${!isAdmin ? 'sm:ml-[232px]' : ''} transition-all`}>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Швидкий фільтр за ПІБ, опікою чи телефоном..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-[#1b3642] pl-9 pr-4 py-1.5 text-[11px] focus:border-[#387d7a] focus:outline-none bg-[#1a3843] text-slate-200 placeholder-slate-400 font-medium"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

      </div>

      {/* Spreadsheet grid scroll core */}
      <div className="flex-1 overflow-auto bg-[#cde0cf] max-h-[580px] h-[580px] w-full border border-[#8fba94] rounded-md shadow-inner">
        <table className="w-full border-collapse border border-[#8fba94] text-[11px] bg-[#cde0cf] select-text">
          <thead className="sticky top-0 z-[100] shadow-[0_1px_2px_rgba(0,0,0,0.1)] outline outline-1 outline-[#8fba94]">
            <tr className="bg-[#b2cfb6] text-[#0d341d]">
              <th className="py-2 px-1 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] sticky left-0 z-[120] w-10 min-w-[40px]">№</th>
              <th className="py-2 px-3 border border-[#8fba94] text-left font-bold w-52 min-w-[208px] bg-[#b2cfb6] sticky left-10 z-[110] shadow-[2px_0_5px_rgba(0,0,0,0.05)] truncate">ПІБ</th>
              <th className="py-1 px-1 border border-[#8fba94] text-center text-[10px] font-bold text-[#1e4620] bg-[#c3dfc7] w-[86px] min-w-[86px] max-w-[86px] leading-tight">Дати контактів з пресв.</th>
              <th className="py-2 px-3 border border-[#8fba94] text-left font-bold w-48 min-w-[192px] truncate bg-[#b2cfb6]">ПРИМІТКИ і ПОЯСНЕННЯ</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold w-28 min-w-[112px] bg-[#b2cfb6]">Дії</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold w-20 min-w-[80px] bg-[#b2cfb6]">Опіка</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold w-28 min-w-[112px] bg-[#b2cfb6]">Служіння</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold w-20 min-w-[80px] bg-[#b2cfb6]">Відвідування</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold w-20 min-w-[80px] bg-[#b2cfb6]">Присутність</th>
              <th className="py-2 px-1 border border-[#8fba94] text-center font-bold w-12 min-w-[48px] bg-[#b2cfb6]">Вік</th>
              <th className="py-2 px-2 border border-[#8fba94] text-left font-bold min-w-40 bg-[#b2cfb6]">Адрес</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold min-w-28 bg-[#b2cfb6]">Телефон</th>
              <th className="py-2 px-1 border border-[#8fba94] text-center text-[10px] font-bold bg-[#b2cfb6] w-[86px] min-w-[86px] max-w-[86px] leading-tight">Дата народж.</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold bg-[#b2cfb6]">Ос-та</th>
              <th className="py-2 px-1 border border-[#8fba94] text-center font-bold bg-[#b2cfb6]">Хр. С.Д.</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold bg-[#b2cfb6]">Сім. Стан</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold bg-[#b2cfb6]">Соц. Стан</th>
              <th className="py-2 px-1 border border-[#8fba94] text-center text-[10px] font-bold bg-[#b2cfb6] w-[86px] min-w-[86px] max-w-[86px] leading-tight">В.Х.</th>
              <th className="py-2 px-1 border border-[#8fba94] text-center text-[10px] font-bold bg-[#b2cfb6] w-[86px] min-w-[86px] max-w-[86px] leading-tight">В_церкві_з</th>
              <th className="py-2 px-1 border border-[#8fba94] text-center font-bold bg-[#b2cfb6]">Років в ц.</th>
            </tr>
          </thead>
          <tbody className="font-medium text-[#113a21]">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((m, idx) => {
                const isEditing = editingId === m.id;
                const yearsInChurch = getYearsInChurch(m.d_vstupu);

                return (
                  <tr 
                    key={m.id} 
                    className="border-b border-[#8fba94] even:bg-[#d5e6d8] odd:bg-[#e4efe5] hover:bg-[#a8c7ab] cursor-pointer group transition-colors"
                    onDoubleClick={() => onOpenProfile(m.id)}
                  >
                    {/* Sticky index cell */}
                    <td className="py-1.5 px-2 border border-[#8fba94] text-center bg-[#b2cfb6] group-hover:bg-[#a8c7ab] font-bold sticky left-0 z-20 shadow-[1px_0_2px_rgba(0,0,0,0.05)] text-slate-800">
                      {idx + 1}
                    </td>

                    {/* Sticky ПІБ cell */}
                    <td className="py-1.5 px-3 border border-[#8fba94] font-bold text-[#0d341d] group-odd:bg-[#e4efe5] group-even:bg-[#d5e6d8] group-hover:bg-[#a8c7ab] sticky left-10 z-[30] shadow-[2px_0_5px_rgba(0,0,0,0.05)] max-w-xs truncate">
                      <div className="flex items-center justify-between space-x-1">
                        <div className="flex items-center space-x-1 truncate">
                          {m.id_vybuttya > 0 && (
                            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 shrink-0" title="Знято з обліку" />
                          )}
                          <span className="truncate text-xs font-extrabold">{m.pib}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProfile(m.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 ml-2 px-1.5 py-0.5 text-[9px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded flex items-center space-x-0.5 transition-all text-center h-5 shrink-0 scale-75 origin-center"
                          title="Двічі клацніть або натисніть сюди, щоб редагувати анкету цієї особи у вікні"
                        >
                          <span className="tracking-tighter">Анкета ↗</span>
                        </button>
                      </div>
                    </td>

                    {/* Custom Editable Contact Dates (Request 2 & 4) */}
                    <td className={`py-1 px-1 border-r border-[#8fba94] text-center w-[86px] min-w-[86px] max-w-[86px] relative group/cell ${!m.d_kontaktiv ? 'bg-[#ffcfd3]' : 'bg-emerald-50/40'}`}>
                      {isEditing ? (
                        <div className="flex items-center space-x-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingDates}
                            onChange={(e) => setEditingDates(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(m.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="w-full bg-white border border-emerald-500 rounded px-1 py-0.5 text-[9px] font-bold font-mono focus:outline-none"
                            placeholder="ДД.ММ.РРРР"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div 
                          className="flex items-center justify-between min-h-6"
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(m); }}
                          title="Швидке редагування дати контакту"
                        >
                          <span className="font-bold text-emerald-800 font-mono tracking-tighter text-[9px] mx-auto">
                             {formatDateToUA(m.d_kontaktiv)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Remarks */}
                    <td className="py-1.5 px-3 border-r border-[#8fba94] bg-[#fef9c3]/40 text-[#1e3e29] group-hover:bg-[#fef08a]/60 truncate max-w-sm italic font-medium">
                      {m.primitka || '—'}
                    </td>

                    {/* "Дії" (di_admin) Inline Dropdown (Request 5) */}
                    {renderDropdownCell(m, 'di_admin', lookups?.directories?.di_admin || [], '—', 'text-amber-800 bg-amber-50/50 rounded px-1')}

                    {/* Shepherd (Oversight/Opika) */}
                    <td className="py-1.5 px-2 border-r border-slate-300 text-center font-bold text-slate-800">
                      {m.presviter || '—'}
                    </td>

                    {/* "Служіння" Inline Dropdown (Request 6) */}
                    {renderDropdownCell(m, 's_profesiya_ukr', lookups?.directories?.slujinnya || [], 'немає', 'text-emerald-800 bg-emerald-50/55 rounded px-1')}

                    {/* "Відвідуваність" Inline Dropdown (Request 6) */}
                    {renderDropdownCell(m, 'vidviduvanist', lookups?.directories?.vidviduvanist || [], 'н/д', 'text-slate-700 bg-slate-100/70 rounded-full px-1.5 py-0.5')}

                    {/* "Присутність" Inline Dropdown (Request 6) */}
                    {renderDropdownCell(m, 'prysutnist', lookups?.directories?.prysutnist || [], 'н/д', 'text-blue-700 bg-blue-50 rounded-full px-1.5 py-0.5')}

                    {/* Demographics */}
                    <td className="py-1.5 px-1 border-r border-slate-300 text-center font-semibold font-mono">
                      {m.vik_rokiv1 ? `${m.vik_rokiv1}` : '—'}
                    </td>

                    {/* Address & Tel */}
                    <td className="py-1.5 px-2 border-r border-slate-300 text-slate-600 truncate max-w-xs">
                      {m.rayon2_ukr ? `${m.rayon2_ukr} | ${m.n_dilyci || 'Дільниця'}` : '—'}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-300 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                      {m.tel_mob || '—'}
                    </td>

                    {/* Dates birth & Edu */}
                    <td className="py-1 px-1 border-r border-slate-300 text-center font-mono text-slate-600 w-[86px] min-w-[86px] max-w-[86px] text-[10px] truncate bg-slate-50/10">
                      {formatDateToUA(m.d_narodjennya)}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-300 text-center text-slate-600">
                      {m.s_osvita_ukr || '—'}
                    </td>

                    {/* Dynamic spiritual parameters */}
                    <td className="py-1.5 px-1 border-r border-[#8fba94] text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${m.hsd ? "text-emerald-700 bg-emerald-50" : "text-slate-300"}`}>
                        {m.hsd ? "так" : "ні"}
                      </span>
                    </td>
                    <td className="py-1.5 px-1.5 border-r border-slate-300 text-center text-slate-600 max-w-20 truncate">
                      {m.s_simeyniy_ukr || '—'}
                    </td>
                    <td className="py-1.5 px-1.5 border-r border-slate-300 text-center text-slate-600">
                      {m.s_socialniy_ukr || '—'}
                    </td>

                    {/* Baptisms dates & years inside church */}
                    <td className="py-1 px-1 border-r border-slate-300 text-center font-mono text-slate-600 w-[86px] min-w-[86px] max-w-[86px] text-[10px] truncate bg-slate-50/10">
                      {renderWaterBaptism(m.d_vodnogo)}
                    </td>
                    <td className="py-1 px-1 border-r border-slate-300 text-center font-mono text-slate-600 w-[86px] min-w-[86px] max-w-[86px] text-[10px] truncate bg-slate-50/10">
                      {formatDateToUA(m.d_vstupu)}
                    </td>
                    <td className="py-1.5 px-1 border-r border-slate-300 text-center font-bold font-mono text-[#1e4620] bg-[#c3dfc7] group-hover:bg-[#9dbb9f]">
                      {yearsInChurch}
                    </td>

                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={20} className="py-8 text-center text-slate-400 font-bold bg-white italic">
                  Жодних записів не знайдено відповідно до умов вашої фільтрації.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
