import React, { useState, useMemo } from 'react';
import { Member } from '../types';
import { Filter, Printer, CheckSquare, Square, ListFilter, Users, RefreshCw, Layers, Plus } from 'lucide-react';

interface ReportGeneratorProps {
  members: Member[];
  lookups: any;
}

interface ColumnOption {
  key: string;
  label: string;
  defaultChecked: boolean;
}

const AVAILABLE_COLUMNS: ColumnOption[] = [
  { key: 'pib', label: 'ПІБ', defaultChecked: true },
  { key: 'rayon2_ukr', label: 'Район', defaultChecked: true },
  { key: 'presviter', label: 'Опікун', defaultChecked: true },
  { key: 's_slujinnya_spysok', label: 'Служіння', defaultChecked: false },
  { key: 'tel_mob', label: 'Телефон', defaultChecked: true },
  { key: 'address', label: 'Адреса', defaultChecked: false },
  { key: 'vik_rokiv1', label: 'Вік', defaultChecked: false },
  { key: 'd_narodjennya', label: 'Д. народження', defaultChecked: false },
  { key: 'stat', label: 'Стать', defaultChecked: false },
  { key: 's_simeyniy_ukr', label: 'Сімейний стан', defaultChecked: false },
  { key: 'vidviduvanist', label: 'Відвідування', defaultChecked: false },
  { key: 'prysutnist', label: 'Прич. відсутності', defaultChecked: false },
  { key: 'd_kontaktiv', label: 'Дати контактів', defaultChecked: false },
];

export default function ReportGenerator({ members = [], lookups }: ReportGeneratorProps) {
  // Available filters configuration (expandable)
  const [selectedRayon, setSelectedRayon] = useState<string>('');
  const [selectedPresviter, setSelectedPresviter] = useState<string>('');
  const [selectedSlujinnya, setSelectedSlujinnya] = useState<string>('');
  
  // Extra filters
  const [selectedVidviduvanist, setSelectedVidviduvanist] = useState<string>('');
  const [selectedPrysutnist, setSelectedPrysutnist] = useState<string>('');
  const [selectedStat, setSelectedStat] = useState<string>('');
  const [showExtraFilters, setShowExtraFilters] = useState<boolean>(false);

  // Column choices
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.filter(c => c.defaultChecked).map(c => c.key)
  );

  // Reset all filters
  const handleReset = () => {
    setSelectedRayon('');
    setSelectedPresviter('');
    setSelectedSlujinnya('');
    setSelectedVidviduvanist('');
    setSelectedPrysutnist('');
    setSelectedStat('');
  };

  // Extract unique dropdown selections from either lookups or databases dynamically
  const uniqueRayons = useMemo(() => {
    if (lookups?.directories?.rayon) return lookups.directories.rayon;
    const set = new Set(members.map(m => m.rayon2_ukr).filter(Boolean));
    return Array.from(set).sort();
  }, [lookups, members]);

  const uniquePresviters = useMemo(() => {
    if (lookups?.directories?.opika) return lookups.directories.opika;
    const set = new Set(members.map(m => m.presviter).filter(Boolean));
    return Array.from(set).sort();
  }, [lookups, members]);

  const uniqueSlujinnya = useMemo(() => {
    if (lookups?.directories?.slujinnya) {
      return lookups.directories.slujinnya;
    }
    const set = new Set<string>();
    members.forEach(m => {
      if (m.s_slujinnya_spysok) {
        m.s_slujinnya_spysok.split(',').forEach(s => {
          const trimmed = s.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [lookups, members]);

  const uniqueVidvid = useMemo(() => {
    return ["Постійно", "Періодично", "Рідко", "Ніколи"];
  }, []);

  const uniquePrysut = useMemo(() => {
    if (lookups?.directories?.prysutnist) return lookups.directories.prysutnist;
    const set = new Set(members.map(m => m.prysutnist).filter(Boolean));
    return Array.from(set).sort();
  }, [lookups, members]);

  // Calculate filtered members
  const filteredRecords = useMemo(() => {
    return members.filter(m => {
      // 1. Rayon Filter
      if (selectedRayon && m.rayon2_ukr !== selectedRayon) return false;

      // 2. Presviter Filter
      if (selectedPresviter && m.presviter !== selectedPresviter) return false;

      // 3. Slujinnya Filter
      if (selectedSlujinnya) {
        if (!m.s_slujinnya_spysok) return false;
        const normS = m.s_slujinnya_spysok.toLowerCase();
        const normTarget = selectedSlujinnya.toLowerCase();
        if (!normS.includes(normTarget)) return false;
      }

      // 4. Vidviduvanist Filter
      if (selectedVidviduvanist && m.vidviduvanist !== selectedVidviduvanist) return false;

      // 5. Prysutnist Filter
      if (selectedPrysutnist && m.prysutnist !== selectedPrysutnist) return false;

      // 6. Gender Filter
      if (selectedStat && m.stat !== selectedStat) return false;

      return true;
    });
  }, [members, selectedRayon, selectedPresviter, selectedSlujinnya, selectedVidviduvanist, selectedPrysutnist, selectedStat]);

  // Column Toggle handler
  const handleToggleColumn = (colKey: string) => {
    setSelectedColumns(prev => 
      prev.includes(colKey)
        ? prev.filter(k => k !== colKey)
        : [...prev, colKey]
    );
  };

  // Print view report builder
  const handlePrint = () => {
    if (filteredRecords.length === 0) {
      alert("Сформований список порожній. Будь ласка, змініть фільтри.");
      return;
    }

    // Prepare active filters list description
    const activeFiltersText: string[] = [];
    if (selectedRayon) activeFiltersText.push(`Район: ${selectedRayon}`);
    if (selectedPresviter) activeFiltersText.push(`Опікун: ${selectedPresviter}`);
    if (selectedSlujinnya) activeFiltersText.push(`Служіння: ${selectedSlujinnya}`);
    if (selectedVidviduvanist) activeFiltersText.push(`Відвідування: ${selectedVidviduvanist}`);
    if (selectedPrysutnist) activeFiltersText.push(`Прич. відсутності: ${selectedPrysutnist}`);
    if (selectedStat) activeFiltersText.push(`Стать: ${selectedStat}`);

    const filterSpec = activeFiltersText.length > 0 ? activeFiltersText.join(' | ') : 'Всі члени церкви';

    // Get table columns labels
    const displayColumns = AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key));

    const printIframe = document.createElement('iframe');
    printIframe.id = 'print-iframe-element';
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Звіт — Сформований список</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
              @page {
                size: A4 landscape;
                margin: 12mm;
              }
              body {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                color: #0f172a;
                background: #ffffff;
                margin: 0;
                padding: 0;
                line-height: 1.4;
              }
              .header {
                border-bottom: 2px solid #334155;
                padding-bottom: 12px;
                margin-bottom: 20px;
              }
              .title-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
              }
              .title {
                font-size: 20px;
                font-weight: 700;
                color: #1e293b;
                margin: 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .date-info {
                font-size: 10px;
                font-family: monospace;
                color: #64748b;
              }
              .filters-box {
                margin-top: 8px;
                font-size: 11px;
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                padding: 6px 10px;
                border-radius: 4px;
                color: #334155;
                font-weight: 500;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
              }
              th {
                background-color: #e2e8f0;
                color: #0f172a;
                font-weight: 600;
                font-size: 11px;
                border: 1px solid #94a3b8;
                padding: 6px 8px;
                text-align: left;
                text-transform: uppercase;
                letter-spacing: 0.3px;
              }
              td {
                font-size: 11px;
                border: 1px solid #cbd5e1;
                padding: 5px 8px;
                color: #1e293b;
              }
              tr:nth-child(even) {
                background-color: #f8fafc;
              }
              .totals {
                margin-top: 15px;
                font-size: 11px;
                font-weight: 600;
                color: #334155;
                display: flex;
                justify-content: space-between;
                border-top: 1px solid #cbd5e1;
                padding-top: 8px;
              }
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title-row">
                <h1 class="title">Сформований список членів церкви</h1>
                <div class="date-info">ДАТА: ${new Date().toLocaleDateString('uk-UA')} ${new Date().toLocaleTimeString('uk-UA')}</div>
              </div>
              <div class="filters-box">
                <strong>Параметри відбору:</strong> ${filterSpec}
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">№</th>
                  ${displayColumns.map(col => `<th>${col.label}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${filteredRecords.map((m, idx) => `
                  <tr>
                    <td style="text-align: center; font-weight: 500; color: #64748b;">${idx + 1}</td>
                    ${displayColumns.map(col => {
                      let cellVal = m[col.key as keyof Member] || '—';
                      if (col.key === 'd_narodjennya' && cellVal) {
                        try {
                          const parts = String(cellVal).split('-');
                          if (parts.length === 3) {
                            cellVal = `${parts[2]}.${parts[1]}.${parts[0]}`;
                          }
                        } catch(e){}
                      }
                      return `<td>${cellVal}</td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="totals">
              <span>Всього у сформованому списку: ${filteredRecords.length} осіб</span>
              <span>База даних Церкви</span>
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
        
        // Cleanup document iframe
        setTimeout(() => {
          document.body.removeChild(printIframe);
        }, 2000);
      }, 500);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0e2128] rounded-2xl border border-[#1f424f] shadow-lg overflow-hidden animate-fade-in" id="reportGeneratorPanel">
      {/* Header Panel */}
      <div className="bg-[#16303a] border-b border-[#1f424f] px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-teal-400 tracking-tight flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-teal-400" />
            <span>Конструктор звітів та формування списків</span>
          </h2>
          <p className="text-xs text-slate-350 mt-0.5">
            Відберіть осіб за необхідними критеріями, відзначте необхідні колонки та роздрукуйте PDF-документ.
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#1a3843] hover:bg-[#224b5a] border border-[#2d5d70] rounded-lg shadow-sm transition-all cursor-pointer"
            title="Очистити всі фільтри"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Скинути</span>
          </button>
          
          <button
            onClick={handlePrint}
            disabled={filteredRecords.length === 0}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-all ${filteredRecords.length > 0 ? 'bg-[#387d7a] hover:bg-[#2b5f5d] cursor-pointer' : 'bg-slate-700 cursor-not-allowed opacity-50'}`}
          >
            <Printer className="h-4 w-4" />
            <span>ДРУК (PDF)</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Dynamic Filters Area */}
        <div className="bg-[#11252d] rounded-xl border border-[#1f424f] p-4">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">Вибір встановлених фільтрів</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Filter: РАЙОН */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-350">Район громади</label>
              <select
                value={selectedRayon}
                onChange={e => setSelectedRayon(e.target.value)}
                className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
              >
                <option value="">-- Всі райони --</option>
                {uniqueRayons.map((r: string) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Filter: ОПІКУН */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-350">Пастор відповідальний / Опікун</label>
              <select
                value={selectedPresviter}
                onChange={e => setSelectedPresviter(e.target.value)}
                className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
              >
                <option value="">-- Всі опікуни --</option>
                {uniquePresviters.map((p: string) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Filter: СЛУЖІННЯ */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-350">Задіяне християнське служіння</label>
              <select
                value={selectedSlujinnya}
                onChange={e => setSelectedSlujinnya(e.target.value)}
                className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
              >
                <option value="">-- Всі види служінь --</option>
                {uniqueSlujinnya.map((s: string) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Toggle for Expandable Extra Filters */}
          <div className="mt-3.5 border-t border-[#1f424f] pt-3 flex justify-between items-center">
            <button
              onClick={() => setShowExtraFilters(!showExtraFilters)}
              className="group flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-teal-300 transition-colors cursor-pointer"
            >
              <Plus className={`h-3 w-3 transition-transform ${showExtraFilters ? 'rotate-45 text-teal-400' : 'text-slate-400'}`} />
              <span>{showExtraFilters ? 'Сховати додаткові критерії' : 'Показати більше фільтрів...'}</span>
            </button>
            <span className="text-[10px] font-mono text-slate-400">
              Знайдено: <strong className="text-teal-400 font-bold">{filteredRecords.length}</strong> із <strong className="text-slate-300">{members.length}</strong>
            </span>
          </div>

          {/* Expanded extra filters block */}
          {showExtraFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 mt-3 border-t border-[#1f424f] ease-in duration-150">
              
              {/* Extra Filter: ВІДВІДУВАНІСТЬ */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-350">Регулярність відвідування</label>
                <select
                  value={selectedVidviduvanist}
                  onChange={e => setSelectedVidviduvanist(e.target.value)}
                  className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
                >
                  <option value="">-- Будь-яка --</option>
                  {uniqueVidvid.map((v: string) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Extra Filter: ПРИЧИНА ВІДСУТНОСТІ */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-350">Причина відсутності</label>
                <select
                  value={selectedPrysutnist}
                  onChange={e => setSelectedPrysutnist(e.target.value)}
                  className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
                >
                  <option value="">-- Без обмежень --</option>
                  {uniquePrysut.map((p: string) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Extra Filter: СТАТЬ */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-350">Стать</label>
                <select
                  value={selectedStat}
                  onChange={e => setSelectedStat(e.target.value)}
                  className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
                >
                  <option value="">-- Будь-яка --</option>
                  <option value="брат">брат</option>
                  <option value="сестра">сестра</option>
                </select>
              </div>

            </div>
          )}
        </div>

        {/* Multiple Column Selection List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-[#1f424f] pb-2">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-teal-400" />
              <span>Вибір колонок для включення в таблицю</span>
            </h3>
            <span className="text-[10px] text-slate-400">Відзначте колонки, які будуть присутні в фінальному документі</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {AVAILABLE_COLUMNS.map(col => {
              const checked = selectedColumns.includes(col.key);
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => handleToggleColumn(col.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${checked ? 'bg-[#387d7a]/20 border-teal-500 text-teal-300 font-semibold' : 'border-[#1f424f] hover:border-[#387d7a] bg-[#16303a] text-slate-300'}`}
                >
                  {checked ? (
                    <CheckSquare className="h-4 w-4 text-teal-400 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-500 shrink-0" />
                  )}
                  <span className="text-xs block truncate">{col.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Preview Pane */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Попередній перегляд сформованого списку ({filteredRecords.length})</h3>
            {filteredRecords.length > 0 && (
              <span className="text-[11px] text-slate-400">Показано перші 10 записів</span>
            )}
          </div>

          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[#1f424f] rounded-xl bg-[#132c35]/20 text-center">
              <Users className="h-8 w-8 text-slate-500 mb-2" />
              <p className="text-xs text-slate-300 font-bold">Немає осіб, які задовольняють встановленим фільтрам.</p>
              <p className="text-[10px] text-slate-400">Спробуйте послабити обмеження для результатів.</p>
            </div>
          ) : (
            <div className="border border-[#1f424f] rounded-xl overflow-hidden shadow-sm max-h-[350px] overflow-y-auto">
              <table className="w-full text-left border-collapse bg-[#11252d]">
                <thead className="bg-[#1a3843] sticky top-0 border-b border-[#1f424f]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12 font-bold text-[11px] text-slate-300 tracking-wider">№</th>
                    {AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key)).map(col => (
                      <th key={col.key} className="py-2.5 px-3 font-bold text-[11px] text-slate-300 tracking-wider">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f424f]">
                  {filteredRecords.slice(0, 10).map((m, idx) => (
                    <tr key={m.id} className="hover:bg-[#1a3843]/40 transition-colors">
                      <td className="py-2 px-3 text-center text-xs text-slate-400 font-mono font-bold">{idx + 1}</td>
                      {AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key)).map(col => {
                        let cellVal = m[col.key as keyof Member] || '—';
                        if (col.key === 'd_narodjennya' && cellVal) {
                          try {
                            const parts = String(cellVal).split('-');
                            if (parts.length === 3) {
                              cellVal = `${parts[2]}.${parts[1]}.${parts[0]}`;
                            }
                          } catch(e){}
                        }
                        return (
                          <td key={col.key} className="py-2 px-3 text-xs text-slate-200 font-medium truncate max-w-[200px]">
                            {cellVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRecords.length > 10 && (
                <div className="bg-[#16303a]/50 text-center py-2 border-t border-[#1f424f]">
                  <span className="text-[10px] text-slate-400 font-bold tracking-wider">
                    ... І ще {filteredRecords.length - 10} осіб не показані в попередньому перегляді (будуть присутні на друці) ...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
