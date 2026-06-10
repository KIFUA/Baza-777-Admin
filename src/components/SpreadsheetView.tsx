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
  const [showRayonColumn, setShowRayonColumn] = useState(false);
  
  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDates, setEditingDates] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  // Dropdown cell editing state
  const [editingCell, setEditingCell] = useState<{ id: number; field: 'di_admin' | 's_slujinnya_spysok' | 'vidviduvanist' | 'prysutnist' | 'presviter' | 'rayon2_ukr' } | null>(null);

  const caregivers = useMemo(() => {
    return (lookups?.directories?.opika as string[]) || [
      "Бевзюк В.", "Бурчак Ю.", "Галюк Б.", "Дмитраш М.", "Євстратов О.", 
      "Ільницький О.", "Луцак М.", "Марунчак В.", "Мельничук В.", "Несен Ю.", 
      "Прохніцький Б.", "Решетило Р.", "Самелюк О.", "Скіцко І.", "Скриник М.", 
      "Стасінчук В.", "Стафіїв М.", "Стефурак Д.", "Факас О.", "Черняк Вал.", 
      "Черняк Вікт.", "Шпарман Ю.", "Черняк Вас."
    ];
  }, [lookups]);

  const fallbackMinistries = useMemo(() => [
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
  ], []);

  const ministryOptions = useMemo(() => {
    const list = (lookups?.directories?.slujinnya as string[]) || fallbackMinistries;
    return list.filter(Boolean);
  }, [lookups, fallbackMinistries]);

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
        const addressMatch = m.address?.toLowerCase().includes(q);
        
        return pibMatch || phoneMatch || presvMatch || rayonMatch || primitkaMatch || addressMatch;
      }

      return true;
    });

    // Sort alphabetically by full name (pib)
    return [...list].sort((a, b) => (a.pib || '').localeCompare(b.pib || '', 'uk-UA'));
  }, [members, filterType, searchQuery]);

  // Calculate dynamic ПІБ column width based on the longest record
  const pibColumnWidth = useMemo(() => {
    if (!filteredMembers || filteredMembers.length === 0) return 208;
    
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = "bold 12px Inter, system-ui, -apple-system, sans-serif";
        let maxWidth = 0;
        filteredMembers.forEach(m => {
          const name = m.pib || "";
          const w = ctx.measureText(name).width;
          if (w > maxWidth) {
            maxWidth = w;
          }
        });
        // Dots, button scale spacing and padding buffer
        const finalWidth = maxWidth + 101;
        return Math.max(208, Math.ceil(finalWidth));
      }
    } catch (e) {}

    let maxCharLen = 0;
    filteredMembers.forEach(m => {
      const len = (m.pib || "").length;
      if (len > maxCharLen) maxCharLen = len;
    });
    return Math.max(208, maxCharLen * 7.5 + 105);
  }, [filteredMembers]);

  const rayonColWidth = 90;
  const pibLeftSticky = showRayonColumn ? (40 + rayonColWidth) : 40;

  // Dropdown inline cell renderer (Request 5 & 6)
  const renderDropdownCell = (
    m: Member, 
    field: 'di_admin' | 's_slujinnya_spysok' | 'vidviduvanist' | 'prysutnist' | 'presviter' | 'rayon2_ukr',
    options: string[],
    fallbackText = '—',
    colorClasses = 'text-slate-600',
    extraTdProps: React.HTMLAttributes<HTMLTableCellElement> = {}
  ) => {
    const isEditingCell = editingCell?.id === m.id && editingCell?.field === field;
    const value = m[field] || '';

    const tdStyle = extraTdProps.style;
    const tdClassName = extraTdProps.className || "py-1 px-1.5 border-r border-slate-300 text-center cursor-pointer hover:bg-slate-200/50 min-h-[28px] transition-colors";

    if (isEditingCell) {
      return (
        <td 
          style={tdStyle}
          className={`${extraTdProps.className || ""} py-1 px-1 border-r border-slate-300 bg-white`}
          onClick={(e) => e.stopPropagation()}
        >
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
        style={tdStyle}
        onClick={(e) => { e.stopPropagation(); setEditingCell({ id: m.id, field }); }}
        className={`${tdClassName} text-center cursor-pointer hover:bg-slate-200/50 min-h-[28px] transition-colors`}
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

        {/* Toggle Rayon Column */}
        <div className="flex items-center space-x-2 shrink-0 sm:ml-auto">
          <button
            id="toggle_rayon_col_btn"
            type="button"
            onClick={() => setShowRayonColumn(!showRayonColumn)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md border text-[10px] sm:text-[11px] font-bold uppercase transition-all select-none cursor-pointer outline-none ${
              showRayonColumn
                ? "bg-[#387d7a] border-[#387d7a] text-white shadow-sm font-semibold"
                : "bg-[#1a3843] border-[#1b3642] text-slate-300 hover:text-white"
            }`}
          >
            <span>Район у таблиці 🧭</span>
            <span className="opacity-80">
              {showRayonColumn ? "(Показано)" : "(Приховано)"}
            </span>
          </button>
        </div>

      </div>

      {/* Spreadsheet grid scroll core */}
      <div className="flex-1 overflow-auto bg-[#cde0cf] max-h-[580px] h-[580px] w-full border border-[#8fba94] rounded-md shadow-inner">
        <table className="w-full border-collapse border border-[#8fba94] text-[11px] bg-[#cde0cf] select-text">
          <thead className="sticky top-0 z-[100] shadow-[0_1px_2px_rgba(0,0,0,0.1)] outline outline-1 outline-[#8fba94]">
            <tr className="bg-[#b2cfb6] text-[#0d341d]">
              <th 
                style={{ width: '40px', minWidth: '40px', maxWidth: '40px', left: '0px' }}
                className="py-2 px-1 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] sticky z-[120]"
              >
                №
              </th>
              {showRayonColumn && (
                <th 
                  style={{ width: `${rayonColWidth}px`, minWidth: `${rayonColWidth}px`, maxWidth: `${rayonColWidth}px`, left: '40px' }}
                  className="py-2 px-2 border border-[#8fba94] text-center font-bold bg-[#b2cfb6] sticky z-[115] shadow-[1px_0_3px_rgba(0,0,0,0.05)] truncate"
                >
                  РАЙОН
                </th>
              )}
              <th 
                style={{ 
                  width: `${pibColumnWidth}px`, 
                  minWidth: `${pibColumnWidth}px`, 
                  maxWidth: `${pibColumnWidth}px`,
                  left: `${pibLeftSticky}px` 
                }}
                className="py-2 px-3 border border-[#8fba94] text-left font-bold bg-[#b2cfb6] sticky z-[110] shadow-[2px_0_5px_rgba(0,0,0,0.05)] truncate"
              >
                ПІБ
              </th>
              <th className="py-1 px-1 border border-[#8fba94] text-center text-[10px] font-bold text-[#1e4620] bg-[#c3dfc7] w-[86px] min-w-[86px] max-w-[86px] leading-tight">Дати контактів з пресв.</th>
              <th className="py-2 px-3 border border-[#8fba94] text-left font-bold w-48 min-w-[192px] truncate bg-[#b2cfb6]">ПРИМІТКИ і ПОЯСНЕННЯ</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold w-28 min-w-[112px] bg-[#b2cfb6]">Дії</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold w-28 min-w-[112px] max-w-[112px] bg-[#b2cfb6]">Опіка</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold w-48 min-w-[192px] max-w-[192px] bg-[#b2cfb6]">Служіння</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold w-20 min-w-[80px] bg-[#b2cfb6]">Відвідування</th>
              <th className="py-2 px-2 border border-[#8fba94] text-center font-bold w-20 min-w-[80px] bg-[#b2cfb6]">Присутність</th>
              <th className="py-2 px-1 border border-[#8fba94] text-center font-bold w-12 min-w-[48px] bg-[#b2cfb6]">Вік</th>
              <th className="py-2 px-2 border border-[#8fba94] text-left font-bold min-w-44 bg-[#b2cfb6]">Адрес</th>
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
                    <td 
                      style={{ width: '40px', minWidth: '40px', maxWidth: '40px', left: '0px' }}
                      className="py-1.5 px-2 border border-[#8fba94] text-center bg-[#b2cfb6] group-hover:bg-[#a8c7ab] font-bold sticky z-20 shadow-[1px_0_2px_rgba(0,0,0,0.05)] text-slate-800"
                    >
                      {idx + 1}
                    </td>

                    {/* Sticky РАЙОН cell if shown */}
                    {showRayonColumn && renderDropdownCell(
                      m,
                      'rayon2_ukr',
                      lookups?.directories?.rayon2 || [],
                      '—',
                      'text-[#0a2f16] font-extrabold text-[10px]',
                      {
                        style: { width: `${rayonColWidth}px`, minWidth: `${rayonColWidth}px`, maxWidth: `${rayonColWidth}px`, left: '40px' },
                        className: "py-1.5 px-2 border border-[#8fba94] text-center bg-[#c3dfc7]/80 group-hover:bg-[#a8c7ab] sticky z-15 shadow-[1px_0_3px_rgba(0,0,0,0.05)] truncate text-[10px]"
                      }
                    )}

                    {/* Sticky ПІБ cell */}
                    <td 
                      style={{ 
                        width: `${pibColumnWidth}px`, 
                        minWidth: `${pibColumnWidth}px`, 
                        maxWidth: `${pibColumnWidth}px`,
                        left: `${pibLeftSticky}px`
                      }}
                      className="py-1 px-3 border border-[#8fba94] font-bold text-[#0d341d] group-odd:bg-[#e4efe5] group-even:bg-[#d5e6d8] group-hover:bg-[#a8c7ab] sticky z-[30] shadow-[2px_0_5px_rgba(0,0,0,0.05)] overflow-hidden"
                    >
                      <div className="flex items-center justify-between space-x-1">
                        <div className="flex items-center space-x-1 truncate min-w-0 flex-1">
                          {m.id_vybuttya > 0 && (
                            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 shrink-0" title="Знято з обліку" />
                          )}
                          {(() => {
                            const parts = (m.pib || "").trim().split(/\s+/);
                            if (parts.length <= 1) {
                              return <span className="truncate text-xs font-extrabold">{m.pib}</span>;
                            }
                            const lastName = parts[0];
                            const givenName = parts.slice(1).join(" ");
                            return (
                              <div className="flex flex-col min-w-0 leading-tight">
                                <span className="text-xs font-extrabold text-[#052e16] truncate">{lastName}</span>
                                <span className="text-[10px] font-semibold text-slate-600 truncate">{givenName}</span>
                              </div>
                            );
                          })()}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProfile(m.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 ml-1 px-1.5 py-0.5 text-[9px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded flex items-center space-x-0.5 transition-all text-center h-5 shrink-0 scale-75 origin-center"
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
                    {renderDropdownCell(m, 'presviter', caregivers, '—', 'text-slate-700 bg-emerald-50/40 rounded px-1')}

                    {/* "Служіння" Column (Ministry) with multiple choice popup */}
                    <td 
                      className="py-1 px-1.5 border-r border-[#8fba94] text-center w-48 min-w-[192px] max-w-[192px] relative cursor-pointer hover:bg-emerald-800/10 transition-colors select-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCell({ id: m.id, field: 's_slujinnya_spysok' });
                      }}
                      title="Клацніть для швидкої зміни служінь"
                    >
                      {editingCell?.id === m.id && editingCell?.field === 's_slujinnya_spysok' && (
                        <>
                          {/* Invisible click backdrop to dismiss edit mode on outer-click */}
                          <div 
                            className="fixed inset-0 z-[240] cursor-default bg-transparent" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCell(null);
                            }}
                          />
                          <div 
                            className="absolute left-1/2 top-full -translate-x-1/2 mt-1 z-[250] bg-white border border-slate-300 rounded-lg shadow-xl p-2 w-[240px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between border-b pb-1 mb-1.5">
                              <span className="font-extrabold text-[10px] text-slate-700 uppercase tracking-tight">Служіння</span>
                              <button 
                                onClick={() => setEditingCell(null)}
                                className="text-white hover:bg-emerald-800 bg-emerald-700 px-2 py-0.5 rounded text-[9px] font-bold shadow-sm transition-colors cursor-pointer"
                              >
                                Готово
                              </button>
                            </div>
                            <div className="max-h-52 overflow-y-auto text-left space-y-1.5 pr-1">
                              {ministryOptions.map((opt) => {
                                const selectedList = m.s_slujinnya_spysok 
                                  ? m.s_slujinnya_spysok.split(/[,;]+/).map(s => s.trim()).filter(Boolean) 
                                  : [];
                                const isChecked = selectedList.includes(opt);
                                return (
                                  <label 
                                    key={opt} 
                                    className="flex items-center gap-2 py-1 px-1.5 cursor-pointer rounded hover:bg-slate-100/80 transition-colors select-none text-[10.5px] font-bold text-slate-700"
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
                                        await onUpdateMember(m.id, { s_slujinnya_spysok: valString });
                                      }}
                                      className="h-3 w-3 rounded border-slate-350 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span className={isChecked ? 'text-emerald-950 font-extrabold' : ''}>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Display of selected */}
                      {(() => {
                        const selectedList = m.s_slujinnya_spysok 
                          ? m.s_slujinnya_spysok.split(/[,;]+/).map(s => s.trim()).filter(Boolean) 
                          : [];
                        return selectedList.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1 w-full p-0.5">
                            {selectedList.map(name => (
                              <span 
                                key={name} 
                                className="bg-emerald-800/10 border border-emerald-800/25 text-[#0d341d] px-1 py-0.5 rounded text-[9px] truncate font-extrabold block text-center shadow-[0_1px_1px_rgba(0,0,0,0.02)]" 
                                title={name}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-bold text-[10px]">немає</span>
                        );
                      })()}
                    </td>

                    {/* "Відвідуваність" Inline Dropdown (Request 6) */}
                    {renderDropdownCell(m, 'vidviduvanist', lookups?.directories?.vidviduvanist || [], 'н/д', 'text-slate-700 bg-slate-100/70 rounded-full px-1.5 py-0.5')}

                    {/* "Присутність" Inline Dropdown (Request 6) */}
                    {renderDropdownCell(m, 'prysutnist', lookups?.directories?.prysutnist || [], 'н/д', 'text-blue-700 bg-blue-50 rounded-full px-1.5 py-0.5')}

                    {/* Demographics */}
                    <td className="py-1.5 px-1 border-r border-slate-300 text-center font-semibold font-mono">
                      {m.vik_rokiv1 ? `${m.vik_rokiv1}` : '—'}
                    </td>

                    {/* Address & Tel */}
                    <td className="py-1.5 px-2 border-r border-slate-300 text-[#0d341d] font-bold bg-[#edf7f0]/45 truncate max-w-xs" title={m.address}>
                      {m.address || '—'}
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
