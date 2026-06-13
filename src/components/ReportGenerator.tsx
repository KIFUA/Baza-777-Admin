import React, { useState, useMemo, useEffect } from 'react';
import { Member } from '../types';
import { Filter, Printer, CheckSquare, Square, ListFilter, Users, RefreshCw, Layers, Plus } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
  { key: 'rayon2_ukr', label: 'Район', defaultChecked: false },
  { key: 'pib', label: 'ПІБ', defaultChecked: true },
  { key: 'd_kontaktiv', label: 'Дати контактів', defaultChecked: true },
  { key: 'presviter', label: 'Опікун', defaultChecked: true },
  { key: 's_slujinnya_spysok', label: 'Служіння', defaultChecked: false },
  { key: 'vidviduvanist', label: 'Відвідування', defaultChecked: true },
  { key: 'prysutnist', label: 'Прич. відсутності', defaultChecked: true },
  { key: 'vik_rokiv1', label: 'Вік', defaultChecked: true },
  { key: 'address', label: 'Адреса', defaultChecked: false },
  { key: 'tel_mob', label: 'Телефон', defaultChecked: true },
  { key: 'd_narodjennya', label: 'Д. народження', defaultChecked: false },
  { key: 'stat', label: 'Стать', defaultChecked: false },
  { key: 's_simeyniy_ukr', label: 'Сімейний стан', defaultChecked: false },
];

export default function ReportGenerator({ members = [], lookups }: ReportGeneratorProps) {
  // Available filters configuration (expandable)
  const [selectedStatus, setSelectedStatus] = useState<string>('Наявні');
  const [selectedVybuttyaId, setSelectedVybuttyaId] = useState<string>('');
  const [selectedRayon, setSelectedRayon] = useState<string>('');
  const [selectedPresviter, setSelectedPresviter] = useState<string>('');
  const [selectedSlujinnya, setSelectedSlujinnya] = useState<string>('');
  
  // Extra filters
  const [selectedVidviduvanist, setSelectedVidviduvanist] = useState<string>('');
  const [selectedPrysutnist, setSelectedPrysutnist] = useState<string>('');
  const [selectedStat, setSelectedStat] = useState<string>('');
  const [showExtraFilters, setShowExtraFilters] = useState<boolean>(false);
  const [internalSearch, setInternalSearch] = useState<string>('');
  const [pdfGenerating, setPdfGenerating] = useState<boolean>(false);

  // Column choices
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.filter(c => c.defaultChecked).map(c => c.key)
  );

  // Reset all filters
  const handleReset = () => {
    setSelectedStatus('Наявні');
    setSelectedVybuttyaId('');
    setSelectedRayon('');
    setSelectedPresviter('');
    setSelectedSlujinnya('');
    setSelectedVidviduvanist('');
    setSelectedPrysutnist('');
    setSelectedStat('');
    setInternalSearch('');
  };

  // Extract unique dropdown selections from either lookups or databases dynamically
  const RAYON_LIST_ORDER = ["АЕРОПОРТ", "КАСКАД", "ОБ'ЇЗНА", "ЦЕНТР"];
  
  const sortRayonsList = (list: any[]) => {
    return [...list].sort((a, b) => {
      const strA = String(a || "").trim();
      const strB = String(b || "").trim();
      const idxA = RAYON_LIST_ORDER.indexOf(strA.toUpperCase());
      const idxB = RAYON_LIST_ORDER.indexOf(strB.toUpperCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return strA.localeCompare(strB);
    });
  };

  const uniqueRayons = useMemo(() => {
    const raw = lookups?.directories?.rayon || Array.from(new Set(members.map(m => m.rayon2_ukr).filter(Boolean)));
    return sortRayonsList(raw);
  }, [lookups, members]);

  const uniquePresviters = useMemo(() => {
    // Obtain the base caregivers (opika)
    const baseList = lookups?.directories?.opika || Array.from(new Set(members.map(m => m.presviter).filter(Boolean)));
    const allPresviters = Array.from(new Set(baseList)).filter(Boolean);

    // If no rayon is selected, show all caretakers
    if (!selectedRayon) {
      return (allPresviters as string[]).sort();
    }

    const targetRayonNorm = selectedRayon.trim().toUpperCase();

    // Leaders map representing direct district leaders:
    const leaderMap: Record<string, string> = {
      "БЕВЗЮК В": "АЕРОПОРТ",
      "СКІЦКО І": "КАСКАД",
      "ЧЕРНЯК ВАС": "ОБ'ЇЗНА",
      "ЧЕРНЯК ВАЛ": "ЦЕНТР"
    };

    return (allPresviters as string[]).filter(p => {
      const pStr = String(p || "");
      const pNorm = pStr.trim().toUpperCase().replace(/\./g, '').trim();
      
      // 1. Leader match
      if (leaderMap[pNorm]) {
        return leaderMap[pNorm] === targetRayonNorm;
      }

      // 2. Member match to locate caretaker's district
      const foundMember = members.find(m => {
        if (m.id_vybuttya > 0) return false; // active members only
        if (!m.pib) return false;
        
        const mPibClean = m.pib.trim().toLowerCase();
        const pClean = pStr.trim().toLowerCase();
        
        if (mPibClean === pClean) return true;
        
        const mParts = mPibClean.split(/\s+/).filter(Boolean);
        const pParts = pClean.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
        
        if (mParts.length === 0 || pParts.length === 0) return false;
        
        if (mParts[0] !== pParts[0]) return false;
        if (pParts.length === 1) return true;
        
        const mFirst = mParts[1] || "";
        const pFirst = pParts[1] || "";
        if (mFirst && pFirst) {
          if (mFirst.startsWith(pFirst) || pFirst.startsWith(mFirst)) {
            return true;
          }
        }
        return false;
      });

      if (foundMember) {
        const memRayon = String(foundMember.rayon2_ukr || "").trim().toUpperCase();
        return memRayon === targetRayonNorm;
      }

      return false;
    }).sort();
  }, [lookups, members, selectedRayon]);

  // Adjust selected caretaker filter if it's no longer present among options for selected district
  useEffect(() => {
    if (selectedRayon && selectedPresviter) {
      if (!uniquePresviters.includes(selectedPresviter)) {
        setSelectedPresviter('');
      }
    }
  }, [selectedRayon, selectedPresviter, uniquePresviters]);

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

  // Helper code to deduplicate profile records
  const isMergedProfile = (m: Member, list: Member[]) => {
    const pibSelf = String(m.pib || "").trim().toLowerCase();
    if (!pibSelf) return false;
    
    const selfId = Number(m.id);
    return list.some(other => {
      const otherId = Number(other.id);
      if (otherId <= selfId) return false;
      
      const otherPib = String(other.pib || "").trim().toLowerCase();
      if (otherPib !== pibSelf) return false;
      
      return other.id_vybuttya === 0;
    });
  };

  // Calculate filtered members with case-insensitivity, trim, and duplicate control
  const filteredRecords = useMemo(() => {
    const list = members.filter(m => {
      // 0. Status Filter of Active / Inactive
      if (selectedStatus === 'Наявні') {
        if (m.id_vybuttya > 0) return false;
        if (isMergedProfile(m, members)) return false;
      } else if (selectedStatus === 'Вибулі') {
        if (m.id_vybuttya === 0) return false;
        if (isMergedProfile(m, members)) return false;
        if (selectedVybuttyaId && String(m.id_vybuttya) !== selectedVybuttyaId) return false;
      } else {
        // "Всі" members: still deduplicate to match standard active lists
        if (isMergedProfile(m, members)) return false;
      }

      // 1. Rayon Filter
      if (selectedRayon) {
        const memRayon = String(m.rayon2_ukr || '').trim().toLowerCase();
        const selRayon = String(selectedRayon).trim().toLowerCase();
        if (memRayon !== selRayon) return false;
      }

      // 2. Presviter Filter
      if (selectedPresviter) {
        const memCaretaker = String(m.presviter || '').trim().toLowerCase();
        const selCaretaker = String(selectedPresviter).trim().toLowerCase();
        if (memCaretaker !== selCaretaker) return false;
      }

      // 3. Slujinnya Filter
      if (selectedSlujinnya) {
        if (!m.s_slujinnya_spysok) return false;
        const normS = m.s_slujinnya_spysok.toLowerCase();
        const normTarget = selectedSlujinnya.toLowerCase();
        if (!normS.includes(normTarget)) return false;
      }

      // 4. Vidviduvanist Filter
      if (selectedVidviduvanist) {
        const memVidvid = String(m.vidviduvanist || '').trim().toLowerCase();
        const selVidvid = String(selectedVidviduvanist).trim().toLowerCase();
        if (memVidvid !== selVidvid) return false;
      }

      // 5. Prysutnist Filter
      if (selectedPrysutnist) {
        const memPrysut = String(m.prysutnist || '').trim().toLowerCase();
        const selPrysut = String(selectedPrysutnist).trim().toLowerCase();
        if (memPrysut !== selPrysut) return false;
      }

      // 6. Gender Filter
      if (selectedStat) {
        const memGender = String(m.stat || '').trim().toLowerCase();
        const selGender = String(selectedStat).trim().toLowerCase();
        if (memGender !== selGender) return false;
      }

      // 7. Text Search query filter
      if (internalSearch) {
        const q = internalSearch.toLowerCase().trim();
        const pibMatch = String(m.pib || '').toLowerCase().includes(q);
        const telMatch = String(m.tel_mob || '').toLowerCase().includes(q);
        const addMatch = String(m.address || '').toLowerCase().includes(q);
        const caretMatch = String(m.presviter || '').toLowerCase().includes(q);
        const rayonMatch = String(m.rayon2_ukr || '').toLowerCase().includes(q);
        if (!pibMatch && !telMatch && !addMatch && !caretMatch && !rayonMatch) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => (a.pib || '').localeCompare(b.pib || '', 'uk-UA'));
  }, [members, selectedStatus, selectedVybuttyaId, selectedRayon, selectedPresviter, selectedSlujinnya, selectedVidviduvanist, selectedPrysutnist, selectedStat, internalSearch]);

  // Column Toggle handler
  const handleToggleColumn = (colKey: string) => {
    setSelectedColumns(prev => 
      prev.includes(colKey)
        ? prev.filter(k => k !== colKey)
        : [...prev, colKey]
    );
  };

  // Print view report builder
  const handlePrint = async () => {
    if (filteredRecords.length === 0) {
      alert("Сформований список порожній. Будь ласка, змініть фільтри.");
      return;
    }

    setPdfGenerating(true);

    try {
      // Prepare active filters list description
      const activeFiltersText: string[] = [];
      if (selectedStatus && selectedStatus !== 'Всі') {
        activeFiltersText.push(`Статус: ${selectedStatus}`);
        if (selectedStatus === 'Вибулі' && selectedVybuttyaId) {
          const found = lookups?.vybuv?.find((v: any) => String(v.ID) === selectedVybuttyaId);
          if (found) {
            activeFiltersText.push(`Причина вибуття: ${found.Value}`);
          }
        }
      }
      if (selectedRayon) activeFiltersText.push(`Район: ${selectedRayon}`);
      if (selectedPresviter) activeFiltersText.push(`Опікун: ${selectedPresviter}`);
      if (selectedSlujinnya) activeFiltersText.push(`Служіння: ${selectedSlujinnya}`);
      if (selectedVidviduvanist) activeFiltersText.push(`Відвідування: ${selectedVidviduvanist}`);
      if (selectedPrysutnist) activeFiltersText.push(`Прич. відсутності: ${selectedPrysutnist}`);
      if (selectedStat) activeFiltersText.push(`Стать: ${selectedStat}`);

      const filterSpec = activeFiltersText.length > 0 ? activeFiltersText.join(' | ') : 'Всі члени церкви';

      // Get table columns labels
      const displayColumns = AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key));

      // Create offscreen container
      const container = document.createElement('div');
      container.id = 'dynamic-pdf-render-container';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0px';
      container.style.width = '1120px';
      container.style.background = '#ffffff';
      container.style.color = '#000000';

      const htmlContent = `
        <div style="padding: 30px; background-color: #ffffff; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; width: 100%;">
          <style>
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
              table-layout: auto;
            }
            th {
              background-color: #e2e8f0;
              color: #0f172a;
              font-weight: 600;
              font-size: 5.5px !important;
              border: 1px solid #94a3b8;
              padding: 6px 8px;
              text-align: center !important;
              vertical-align: middle !important;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              white-space: normal;
              word-wrap: break-word;
              word-break: break-all;
            }
            td {
              font-size: 11px;
              border: 1px solid #cbd5e1;
              padding: 5px 8px;
              color: #1e293b;
              white-space: normal;
              word-break: normal;
              word-wrap: break-word;
              vertical-align: middle !important;
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
          </style>
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
                    let tdStyle = '';
                    if (col.key === 'd_narodjennya' && cellVal) {
                      try {
                        const parts = String(cellVal).split('-');
                        if (parts.length === 3) {
                          cellVal = `${parts[2]}.${parts[1]}.${parts[0]}`;
                        }
                      } catch(e){}
                    }
                    
                    if (col.key === 'pib' && cellVal && cellVal !== '—') {
                      const parts = String(cellVal).trim().split(/\s+/);
                      if (parts.length > 1) {
                        const lastName = parts[0];
                        const givenAndPatronymic = parts.slice(1).join(" ");
                        cellVal = `<div style="font-weight: 700; color: #0f172a; margin-bottom: 2px; line-height: 1.2;">${lastName}</div><div style="font-size: 10px; color: #475569; font-weight: 500; line-height: 1.2;">${givenAndPatronymic}</div>`;
                      } else {
                        cellVal = `<div style="font-weight: 700; color: #0f172a; line-height: 1.2;">${cellVal}</div>`;
                      }
                      tdStyle = ' style="white-space: normal;"';
                    }
                    
                    if (col.key === 'address' && cellVal && cellVal !== '—') {
                      const strVal = String(cellVal).trim();
                      const hasRayon = strVal.toLowerCase().includes('р-н') || strVal.toLowerCase().includes('район');
                      if (hasRayon) {
                        const markers = [', вул.', ', пров.', ', просп.', ', пл.', ', бул.', ', кв.'];
                        let splitIdx = -1;
                        for (const m of markers) {
                          const idx = strVal.toLowerCase().indexOf(m);
                          if (idx !== -1) {
                            splitIdx = idx;
                            break;
                          }
                        }
                        
                        if (splitIdx !== -1) {
                          const part1 = strVal.substring(0, splitIdx).trim();
                          let part2 = strVal.substring(splitIdx).trim();
                          if (part2.startsWith(',')) {
                            part2 = part2.substring(1).trim();
                          }
                          cellVal = `<div style="font-weight: 600; color: #1e293b;">${part1}</div><div style="font-size: 10px; color: #475569; margin-top: 1px;">${part2}</div>`;
                          tdStyle = ' style="white-space: normal;"';
                        } else {
                          const parts = strVal.split(',');
                          if (parts.length >= 3) {
                            const part1 = parts.slice(0, 2).join(',').trim();
                            const part2 = parts.slice(2).join(',').trim();
                            cellVal = `<div style="font-weight: 600; color: #1e293b;">${part1}</div><div style="font-size: 10px; color: #475569; margin-top: 1px;">${part2}</div>`;
                            tdStyle = ' style="white-space: normal;"';
                          } else {
                            tdStyle = ' style="white-space: normal;"';
                          }
                        }
                      } else {
                        tdStyle = ' style="white-space: normal;"';
                      }
                    }
                    
                    if (col.key === 's_slujinnya_spysok' && cellVal && cellVal !== '—') {
                      const strVal = String(cellVal).trim();
                      const names = strVal.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
                      if (names.length > 2) {
                        const groups = [];
                        for (let i = 0; i < names.length; i += 2) {
                          groups.push(names.slice(i, i + 2).join(', '));
                        }
                        cellVal = groups.join('<br />');
                      }
                      tdStyle = ' style="white-space: normal;"';
                    }
                    return `<td${tdStyle}>${cellVal}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <span>Всього у сформованому списку: ${filteredRecords.length} осіб</span>
            <span>База даних Церкви</span>
          </div>
        </div>
      `;

      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Render offscreen container to canvas
      const canvas = await html2canvas(container, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Remove offscreen container
      document.body.removeChild(container);

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = 297;
      const pdfHeight = 210;

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Add multi-page slice if height exceeds A4 height
      while (heightLeft > 0) {
        position = position - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const todayString = new Date().toISOString().slice(0, 10);
      pdf.save(`Zvit_Chleniv_Tserkvy_${todayString}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Виникла помилка під час формування PDF-файлу. Спробуйте ще раз.");
    } finally {
      setPdfGenerating(false);
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
          <p className="text-xs text-slate-300 font-medium mt-1">
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
            disabled={filteredRecords.length === 0 || pdfGenerating}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-all ${filteredRecords.length > 0 && !pdfGenerating ? 'bg-[#387d7a] hover:bg-[#2b5f5d] cursor-pointer' : 'bg-slate-700 cursor-not-allowed opacity-50'}`}
          >
            {pdfGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin text-teal-200" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            <span>{pdfGenerating ? 'ГЕНЕРАЦІЯ...' : 'ДРУК (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Dynamic Filters Area */}
        <div className="bg-[#11252d] rounded-xl border border-[#1f424f] p-4">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">Вибір встановлених фільтрів</h3>
          <div className="flex flex-wrap gap-4 items-end">
            
            {/* Filter: СТАТУС */}
            <div className="flex flex-col space-y-1 w-full md:w-[130px] shrink-0">
              <label className="text-xs font-bold text-slate-350">Статус</label>
              <select
                value={selectedStatus}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedStatus(val);
                  if (val !== 'Вибулі') {
                    setSelectedVybuttyaId('');
                  }
                }}
                className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
              >
                <option value="Всі">Всі члени</option>
                <option value="Наявні">Наявні</option>
                <option value="Вибулі">Вибулі</option>
              </select>
            </div>

            {/* Filter: ПРИЧИНА ВИБУТТЯ */}
            {selectedStatus === 'Вибулі' && (
              <div className="flex flex-col space-y-1 w-full md:w-[230px] shrink-0 animate-fade-in">
                <label className="text-xs font-bold text-slate-350 text-amber-400">Причина вибуття</label>
                <select
                  value={selectedVybuttyaId}
                  onChange={e => setSelectedVybuttyaId(e.target.value)}
                  className="w-full rounded-lg border border-amber-500/50 p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
                >
                  <option value="">-- Всі причини --</option>
                  {lookups?.vybuv?.map((v: any) => (
                    <option key={v.ID} value={String(v.ID)}>{v.Value}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter: РАЙОН */}
            <div className="flex flex-col space-y-1 w-full md:w-[150px] shrink-0">
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
            <div className="flex flex-col space-y-1 w-full md:w-[220px] shrink-0">
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
            <div className="flex flex-col space-y-1 w-full md:w-[250px] shrink-0">
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

            {/* Filter: ШВИДКИЙ ПОШУК (Name/Phone) */}
            <div className="flex flex-col space-y-1 w-full md:w-[180px] shrink-0">
              <label className="text-xs font-bold text-teal-400">Пошук ім'я / тел.</label>
              <input
                type="text"
                value={internalSearch}
                onChange={e => setInternalSearch(e.target.value)}
                placeholder="Фільтр результатів..."
                className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200 placeholder-slate-400"
              />
            </div>

          </div>

          {/* Active Filter Chips Area */}
          {(selectedRayon || selectedPresviter || selectedSlujinnya || (selectedStatus && selectedStatus !== 'Всі') || selectedVidviduvanist || selectedPrysutnist || selectedStat || internalSearch) && (
            <div className="mt-4 pt-3 border-t border-[#1f424f]/60 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Активні фільтри:</span>
              {selectedStatus && selectedStatus !== 'Всі' && (
                <span className="inline-flex items-center gap-1 bg-teal-950/40 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35">
                  <span>Статус: {selectedStatus}</span>
                  <button onClick={() => setSelectedStatus('Всі')} className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold">×</button>
                </span>
              )}
              {selectedVybuttyaId && (
                <span className="inline-flex items-center gap-1 bg-amber-950/40 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/35">
                  <span>Причина вибуття</span>
                  <button onClick={() => setSelectedVybuttyaId('')} className="hover:text-red-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold">×</button>
                </span>
              )}
              {selectedRayon && (
                <span className="inline-flex items-center gap-1 bg-[#1a3843] text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35 animate-fade-in">
                  <span>Район: {selectedRayon}</span>
                  <button onClick={() => setSelectedRayon('')} className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold">×</button>
                </span>
              )}
              {selectedPresviter && (
                <span className="inline-flex items-center gap-1 bg-[#1a3843] text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35 animate-fade-in">
                  <span>Опікун: {selectedPresviter}</span>
                  <button onClick={() => setSelectedPresviter('')} className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold">×</button>
                </span>
              )}
              {selectedSlujinnya && (
                <span className="inline-flex items-center gap-1 bg-[#1a3843] text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35 animate-fade-in">
                  <span>Служіння: {selectedSlujinnya}</span>
                  <button onClick={() => setSelectedSlujinnya('')} className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold">×</button>
                </span>
              )}
              {selectedVidviduvanist && (
                <span className="inline-flex items-center gap-1 bg-[#1a3843] text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35 animate-fade-in">
                  <span>Відвідування: {selectedVidviduvanist}</span>
                  <button onClick={() => setSelectedVidviduvanist('')} className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold">×</button>
                </span>
              )}
              {selectedPrysutnist && (
                <span className="inline-flex items-center gap-1 bg-[#1a3843] text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35 animate-fade-in">
                  <span>Причина відсутності: {selectedPrysutnist}</span>
                  <button onClick={() => setSelectedPrysutnist('')} className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold">×</button>
                </span>
              )}
              {selectedStat && (
                <span className="inline-flex items-center gap-1 bg-[#1a3843] text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35 animate-fade-in">
                  <span>Стать: {selectedStat}</span>
                  <button onClick={() => setSelectedStat('')} className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold">×</button>
                </span>
              )}
              {internalSearch && (
                <span className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700/80 text-teal-200 text-[10px] font-semibold px-2 py-0.5 rounded animate-fade-in">
                  <span>Пошук: "{internalSearch}"</span>
                  <button onClick={() => setInternalSearch('')} className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold">×</button>
                </span>
              )}
            </div>
          )}

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
            <div className="border border-[#1f424f] rounded-xl overflow-hidden shadow-sm max-h-[350px] overflow-x-auto overflow-y-auto">
              <table className="w-full text-left border-collapse bg-[#11252d] table-auto">
                <thead className="bg-[#1a3843] sticky top-0 border-b border-[#1f424f] z-[10]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12 font-bold text-[11px] text-slate-300 tracking-wider whitespace-nowrap">№</th>
                    {AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key)).map(col => (
                      <th key={col.key} className="py-2.5 px-3 font-bold text-[11px] text-slate-300 tracking-wider whitespace-normal break-words leading-snug max-w-[110px]">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f424f]">
                  {filteredRecords.slice(0, 10).map((m, idx) => (
                    <tr key={m.id} className="hover:bg-[#1a3843]/40 transition-colors align-top">
                      <td className="py-2 px-3 text-center text-xs text-slate-400 font-mono font-bold whitespace-nowrap">{idx + 1}</td>
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
                        
                        if (col.key === 'pib' && cellVal && cellVal !== '—') {
                          const parts = String(cellVal).trim().split(/\s+/);
                          if (parts.length > 1) {
                            const lastName = parts[0];
                            const givenAndPatronymic = parts.slice(1).join(" ");
                            return (
                              <td key={col.key} className="py-2 px-3 text-xs text-slate-200 font-medium whitespace-normal">
                                <span className="font-extrabold text-slate-100 block">{lastName}</span>
                                <span className="text-[10px] text-slate-400 font-semibold block">{givenAndPatronymic}</span>
                              </td>
                            );
                          }
                          return (
                            <td key={col.key} className="py-2 px-3 text-xs text-slate-200 font-medium whitespace-normal">
                              <span className="font-extrabold text-slate-100">{cellVal}</span>
                            </td>
                          );
                        }
                        
                        if (col.key === 'address' && cellVal && cellVal !== '—') {
                          const strVal = String(cellVal).trim();
                          const hasRayon = strVal.toLowerCase().includes('р-н') || strVal.toLowerCase().includes('район');
                          if (hasRayon) {
                            const markers = [', вул.', ', пров.', ', просп.', ', пл.', ', бул.', ', кв.'];
                            let splitIdx = -1;
                            for (const m of markers) {
                              const idx = strVal.toLowerCase().indexOf(m);
                              if (idx !== -1) {
                                splitIdx = idx;
                                break;
                              }
                            }
                            
                            if (splitIdx !== -1) {
                              const part1 = strVal.substring(0, splitIdx).trim();
                              let part2 = strVal.substring(splitIdx).trim();
                              if (part2.startsWith(',')) {
                                part2 = part2.substring(1).trim();
                              }
                              return (
                                <td key={col.key} className="py-2 px-3 text-xs text-slate-200 font-medium whitespace-normal">
                                  <div className="font-semibold text-slate-100">{part1}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{part2}</div>
                                </td>
                              );
                            } else {
                              const parts = strVal.split(',');
                              if (parts.length >= 3) {
                                const part1 = parts.slice(0, 2).join(',').trim();
                                const part2 = parts.slice(2).join(',').trim();
                                return (
                                  <td key={col.key} className="py-2 px-3 text-xs text-slate-200 font-medium whitespace-normal">
                                    <div className="font-semibold text-slate-100">{part1}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">{part2}</div>
                                  </td>
                                );
                              }
                            }
                          }
                          return (
                            <td key={col.key} className="py-2 px-3 text-xs text-slate-200 font-medium whitespace-normal">
                              {cellVal}
                            </td>
                          );
                        }
                        
                        if (col.key === 's_slujinnya_spysok' && cellVal && cellVal !== '—') {
                          const strVal = String(cellVal).trim();
                          const names = strVal.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
                          if (names.length > 2) {
                            const groups: string[] = [];
                            for (let i = 0; i < names.length; i += 2) {
                              groups.push(names.slice(i, i + 2).join(', '));
                            }
                            return (
                              <td key={col.key} className="py-2 px-3 text-xs text-slate-200 font-medium whitespace-normal">
                                {groups.map((group, grpIdx) => (
                                  <div key={grpIdx} className="whitespace-nowrap">{group}</div>
                                ))}
                              </td>
                            );
                          }
                        }

                        return (
                          <td key={col.key} className="py-2 px-3 text-xs text-slate-200 font-medium whitespace-nowrap">
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
