import React, { useState, useMemo, useEffect } from 'react';
import { Member } from '../types';
import { 
  FileText, Download, Send, Printer, CheckSquare, Square, Filter, 
  RotateCcw, Eye, Settings2, Check, ChevronDown, Sparkles, AlertCircle, X, Code 
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportGeneratorProps {
  members: Member[];
  lookups: any;
}

interface ColumnConfig {
  key: string;
  label: string;
  defaultSelected: boolean;
}

const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: 'pib', label: 'ПІБ', defaultSelected: true },
  { key: 'd_narodjennya', label: 'Дата народж.', defaultSelected: false },
  { key: 'vik_rokiv1', label: 'Вік', defaultSelected: true },
  { key: 'stat', label: 'Стать', defaultSelected: false },
  { key: 'tel_mob', label: 'Телефон', defaultSelected: true },
  { key: 'address', label: 'Адреса', defaultSelected: false },
  { key: 's_simeyniy_ukr', label: 'Сім. стан', defaultSelected: false },
  { key: 's_socialniy_ukr', label: 'Соц. стан', defaultSelected: false },
  { key: 's_profesiya_ukr', label: 'Професія', defaultSelected: false },
  { key: 's_osvita_ukr', label: 'Освіта', defaultSelected: false },
  { key: 'n_dilyci', label: 'Дільниця', defaultSelected: false },
  { key: 'rayon2_ukr', label: 'Район', defaultSelected: false },
  { key: 'presviter', label: 'Опікун', defaultSelected: true },
  { key: 'vidviduvanist', label: 'Відвідування', defaultSelected: true },
  { key: 'prysutnist', label: 'Прич. відсутності', defaultSelected: true },
  { key: 's_vybuv_ukr', label: 'Статус вибуття', defaultSelected: false },
  { key: 's_slujinnya_spysok', label: 'Служіння', defaultSelected: false },
  { key: 'd_vodnogo', label: 'Хрещення', defaultSelected: false },
  { key: 'd_vstupu', label: 'Прийняття', defaultSelected: false },
  { key: 'd_kontaktiv', label: 'Дати контактів', defaultSelected: false }
];

export default function ReportGenerator({ members, lookups }: ReportGeneratorProps) {
  // Filter states
  const [selectedStatus, setSelectedStatus] = useState<string>('Наявні');
  const [selectedRayon, setSelectedRayon] = useState<string>('');
  const [selectedVidviduvanist, setSelectedVidviduvanist] = useState<string>('');
  const [selectedPrysutnist, setSelectedPrysutnist] = useState<string>('');
  const [selectedStat, setSelectedStat] = useState<string>('');
  const [selectedSimeyniy, setSelectedSimeyniy] = useState<string>('');
  const [selectedSocialniy, setSelectedSocialniy] = useState<string>('');
  const [selectedProfesiya, setSelectedProfesiya] = useState<string>('');
  const [selectedOsvita, setSelectedOsvita] = useState<string>('');
  const [selectedDilyntsya, setSelectedDilyntsya] = useState<string>('');
  const [selectedAgeMin, setSelectedAgeMin] = useState<string>('');
  const [selectedAgeMax, setSelectedAgeMax] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');
  const [selectedOpika, setSelectedOpika] = useState<string>('');

  useEffect(() => {
    setSelectedOpika('');
  }, [selectedRayon]);

  // UI toggles
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(true);

  // Column selection state
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.filter(c => c.defaultSelected).map(c => c.key)
  );

  // Print / PDF / Telegram settings
  const [printColors, setPrintColors] = useState<boolean>(true);
  const [pdfGenerating, setPdfGenerating] = useState<boolean>(false);
  const [tgMaterialType, setTgMaterialType] = useState<'pdf' | 'text' | 'list'>('pdf');
  const [tgComment, setTgComment] = useState<string>('Сформований список членів церкви');
  const [tgSending, setTgSending] = useState<boolean>(false);
  const [tgStatusMessage, setTgStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Helper for marital status formatting
  const formatMaritalStatus = (val: string) => {
    if (!val) return '';
    const l = val.toLowerCase();
    if (l.includes('одруж') || l.includes('заміж') || l.includes('одр')) return 'Одружені';
    if (l.includes('неодруж') || l.includes('холост') || l.includes('не одр')) return 'Неодружені';
    if (l.includes('вдов')) return 'Вдові / Вдовці';
    if (l.includes('розвод') || l.includes('розлучен')) return 'Розлучені';
    return val;
  };

  const cleanAddress = (addr: string) => {
    if (!addr) return '';
    return addr.replace(/^(м\.|с\.|смт\.)\s*/i, '').trim();
  };

  // Filter members
  const filteredRecords = useMemo(() => {
    return members.filter(m => {
      // Status filter
      if (selectedStatus) {
        const statName = (m.id_vybuttya && m.id_vybuttya > 0) ? (m.s_vybuv_ukr || 'Вибув') : 'Наявні';
        if (statName !== selectedStatus) return false;
      }

      // Rayon filter
      if (selectedRayon && m.rayon2_ukr !== selectedRayon) return false;

      // Opika filter
      if (selectedOpika && m.presviter !== selectedOpika) return false;

      // Vidviduvanist
      if (selectedVidviduvanist && m.vidviduvanist !== selectedVidviduvanist) return false;

      // Prysutnist
      if (selectedPrysutnist && m.prysutnist !== selectedPrysutnist) return false;

      // Stat
      if (selectedStat && m.stat !== selectedStat) return false;

      // Simeyniy
      if (selectedSimeyniy) {
        const famFormatted = formatMaritalStatus(m.s_simeyniy_ukr || '');
        if (famFormatted !== selectedSimeyniy) return false;
      }

      // Socialniy
      if (selectedSocialniy && m.s_socialniy_ukr !== selectedSocialniy) return false;

      // Profesiya
      if (selectedProfesiya && m.s_profesiya_ukr !== selectedProfesiya) return false;

      // Osvita
      if (selectedOsvita && m.s_osvita_ukr !== selectedOsvita) return false;

      // Dilyntsya
      if (selectedDilyntsya && String(m.n_dilyci || '') !== String(selectedDilyntsya)) return false;

      // Service type
      if (selectedServiceType) {
        const servList = (m.s_slujinnya_spysok || '').toLowerCase();
        if (!servList.includes(selectedServiceType.toLowerCase())) return false;
      }

      // Age range
      if (selectedAgeMin || selectedAgeMax) {
        const age = Number(m.vik_rokiv1) || 0;
        if (selectedAgeMin && age < Number(selectedAgeMin)) return false;
        if (selectedAgeMax && age > Number(selectedAgeMax)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pib = (m.pib || '').toLowerCase();
        const tel = (m.tel_mob || '').toLowerCase();
        const addr = (m.address || '').toLowerCase();
        if (!pib.includes(q) && !tel.includes(q) && !addr.includes(q)) return false;
      }

      return true;
    });
  }, [
    members, selectedStatus, selectedRayon, selectedOpika, selectedVidviduvanist, selectedPrysutnist,
    selectedStat, selectedSimeyniy, selectedSocialniy, selectedProfesiya, selectedOsvita,
    selectedDilyntsya, selectedServiceType, selectedAgeMin, selectedAgeMax, searchQuery
  ]);

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const resetAllFilters = () => {
    setSelectedStatus('Наявні');
    setSelectedRayon('');
    setSelectedVidviduvanist('');
    setSelectedPrysutnist('');
    setSelectedStat('');
    setSelectedSimeyniy('');
    setSelectedSocialniy('');
    setSelectedProfesiya('');
    setSelectedOsvita('');
    setSelectedDilyntsya('');
    setSelectedServiceType('');
    setSelectedOpika('');
    setSelectedAgeMin('');
    setSelectedAgeMax('');
    setSearchQuery('');
  };

  // Build PDF Document
  const buildPdfDoc = async (withColors: boolean) => {
    if (filteredRecords.length === 0) return null;
    setPdfGenerating(true);

    try {
      const displayColumns = AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key));
      if (displayColumns.length === 0) {
        setPdfGenerating(false);
        return null;
      }

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#000000';
      document.body.appendChild(container);

      const estimatedWidths: Record<string, number> = {};
      displayColumns.forEach(col => {
        const headerLines = col.label.replace(/<br\s*\/?>/gi, '\n').split('\n');
        let maxLen = headerLines.reduce((max, l) => l.length > max ? l.length : max, 0);

        filteredRecords.forEach(m => {
          let val = m[col.key as keyof Member];
          if (val !== undefined && val !== null && val !== '') {
            let strVal = String(val).trim();
            if (col.key === 's_simeyniy_ukr') {
              strVal = formatMaritalStatus(strVal);
            } else if (col.key === 'address') {
              strVal = cleanAddress(strVal);
            }
            if (strVal.length > maxLen) {
              maxLen = strVal.length;
            }
          }
        });

        const charWidth = 6.2;
        let natW = Math.max(35, Math.floor(maxLen * charWidth) + 14);

        if (col.key === 'vik_rokiv1') natW = Math.max(30, Math.min(42, natW));
        else if (col.key === 'stat') natW = Math.max(35, Math.min(48, natW));
        else if (col.key === 'n_dilyci') natW = Math.max(40, Math.min(65, natW));
        else if (col.key === 'pib') natW = Math.max(95, Math.min(190, natW));
        else if (col.key === 'address') natW = Math.max(75, Math.min(170, natW));
        else if (col.key === 'tel_mob') natW = Math.max(75, Math.min(98, natW));

        estimatedWidths[col.key] = natW;
      });

      const maxIndexDigits = String(filteredRecords.length).length;
      const indexColWidth = Math.max(26, Math.min(36, maxIndexDigits * 6 + 14));

      const colWidthsPx: Record<string, number> = {};
      displayColumns.forEach(col => {
        colWidthsPx[col.key] = estimatedWidths[col.key] || 60;
      });

      const actualTableWidth = indexColWidth + displayColumns.reduce((sum, col) => sum + (colWidthsPx[col.key] || 0), 0);
      const contentBlockWidth = Math.max(actualTableWidth, 500);
      const pageWidthPx = contentBlockWidth + 60;

      container.style.width = `${pageWidthPx}px`;

      const todayString = new Date().toLocaleDateString('uk-UA');

      const activeFiltersText: string[] = [];
      if (selectedStatus) activeFiltersText.push(`Статус: ${selectedStatus}`);
      if (selectedRayon) activeFiltersText.push(`Район: ${selectedRayon}`);
      if (selectedVidviduvanist) activeFiltersText.push(`Відвідування: ${selectedVidviduvanist}`);
      if (selectedPrysutnist) activeFiltersText.push(`Прич. відсутності: ${selectedPrysutnist}`);
      if (selectedStat) activeFiltersText.push(`Стать: ${selectedStat}`);
      if (selectedSimeyniy) activeFiltersText.push(`Сім. стан: ${selectedSimeyniy}`);
      if (selectedSocialniy) activeFiltersText.push(`Соц. стан: ${selectedSocialniy}`);
      if (selectedProfesiya) activeFiltersText.push(`Професія: ${selectedProfesiya}`);
      if (selectedOsvita) activeFiltersText.push(`Освіта: ${selectedOsvita}`);
      if (selectedDilyntsya) activeFiltersText.push(`Дільниця: ${selectedDilyntsya}`);
      if (selectedAgeMin || selectedAgeMax) activeFiltersText.push(`Вік: ${selectedAgeMin || 0}-${selectedAgeMax || '∞'} р.`);

      const filterSummary = activeFiltersText.length > 0 ? activeFiltersText.join(' | ') : 'Всі члени церкви';

      container.innerHTML = `
        <div style="font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; padding: 28px 30px; box-sizing: border-box; width: ${pageWidthPx}px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 14px;">
            <h1 style="font-size: 18px; font-weight: bold; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">СПИСОК ЧЛЕНІВ ЦЕРКВИ</h1>
            <div style="font-size: 10px; color: #64748b; font-weight: 600;">ДАТА: ${todayString}</div>
          </div>

          <div style="margin-bottom: 16px; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 10.5px; color: #334155;">
            <strong>Параметри відбору:</strong> ${filterSummary} (${filteredRecords.length} осіб)
          </div>

          <table style="width: ${actualTableWidth}px; border-collapse: collapse; table-layout: fixed; margin: 0 auto;">
            <thead>
              <tr style="background-color: ${withColors ? '#f1f5f9' : '#ffffff'}; border-bottom: 2px solid #334155;">
                <th style="width: ${indexColWidth}px; padding: 6px 4px; text-align: center; font-size: 10px; font-weight: bold; color: #1e293b; border-right: 1px solid #cbd5e1;">№</th>
                ${displayColumns.map(col => `
                  <th style="width: ${colWidthsPx[col.key]}px; padding: 6px 6px; text-align: left; font-size: 10px; font-weight: bold; color: #1e293b; border-right: 1px solid #cbd5e1; word-break: break-word;">
                    ${col.label}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${filteredRecords.map((m, idx) => {
                const rowBg = withColors && idx % 2 === 1 ? '#f8fafc' : '#ffffff';
                return `
                  <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                    <td style="width: ${indexColWidth}px; padding: 5px 4px; text-align: center; font-size: 9.5px; color: #475569; border-right: 1px solid #e2e8f0; vertical-align: top;">${idx + 1}</td>
                    ${displayColumns.map(col => {
                      let val = m[col.key as keyof Member];
                      let displayVal = val !== undefined && val !== null ? String(val) : '—';
                      if (col.key === 's_simeyniy_ukr') {
                        displayVal = formatMaritalStatus(displayVal);
                      } else if (col.key === 'address') {
                        displayVal = cleanAddress(displayVal);
                      } else if (col.key === 'tel_mob') {
                        if (displayVal.includes(' / ')) {
                          displayVal = displayVal.split(' / ').join('<br/>');
                        }
                      }
                      return `
                        <td style="width: ${colWidthsPx[col.key]}px; padding: 5px 6px; font-size: 9.5px; color: #0f172a; border-right: 1px solid #e2e8f0; vertical-align: top; word-break: break-word; line-height: 1.3;">
                          ${displayVal || '—'}
                        </td>
                      `;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div style="margin-top: 20px; display: flex; justify-content: space-between; font-size: 9px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            <div>Всього записів: <strong>${filteredRecords.length}</strong></div>
            <div>Система обліку церкви</div>
          </div>
        </div>
      `;

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidthPx / 3.78;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const isLandscape = imgWidth > 200;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfPageWidth = isLandscape ? 297 : 210;
      const pdfPageHeight = isLandscape ? 210 : 297;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth > (pdfPageWidth - 20) ? (pdfPageWidth - 20) : imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= (pdfPageHeight - 20);

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position + 10, imgWidth > (pdfPageWidth - 20) ? (pdfPageWidth - 20) : imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= (pdfPageHeight - 20);
      }

      setPdfGenerating(false);
      return pdf;
    } catch (err) {
      console.error("[PDF Generation Error]", err);
      setPdfGenerating(false);
      return null;
    }
  };

  const handleDownloadPdf = async (colors: boolean) => {
    const pdf = await buildPdfDoc(colors);
    if (pdf) {
      const todayString = new Date().toISOString().split('T')[0];
      pdf.save(`Zvit_Chleniv_Tserkvy_${todayString}.pdf`);
    }
  };

  const handleDownloadHtml = () => {
    const displayColumns = AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key));
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Список членів церкви</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; color: #111; }
          h1 { font-size: 18px; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; }
        </style>
      </head>
      <body>
        <h1>СПИСОК ЧЛЕНІВ ЦЕРКВИ</h1>
        <p>Всього записів: ${filteredRecords.length}</p>
        <table>
          <thead>
            <tr>
              <th>№</th>
              ${displayColumns.map(c => `<th>${c.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${filteredRecords.map((m, idx) => `
              <tr>
                <td>${idx + 1}</td>
                ${displayColumns.map(c => `<td>${m[c.key as keyof Member] || '—'}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zvit_chleniv.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendTelegram = async () => {
    if (filteredRecords.length === 0) return;
    setTgSending(true);
    setTgStatusMessage(null);

    try {
      let pdfBase64 = undefined;
      let filename = undefined;
      const todayString = new Date().toISOString().split('T')[0];

      if (tgMaterialType === 'pdf') {
        const pdf = await buildPdfDoc(printColors);
        if (!pdf) {
          setTgSending(false);
          return;
        }
        const arrayBuffer = pdf.output('arraybuffer');
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        pdfBase64 = window.btoa(binary);
        filename = `Zvit_Chleniv_Tserkvy_${todayString}.pdf`;
      }

      const listText = filteredRecords.map((m, idx) => 
        `${idx + 1}. ${m.pib || ''} | Вік: ${m.vik_rokiv1 || '—'} | Тел: ${m.tel_mob || '—'}`
      ).join('\n');

      const fullMessage = `${tgComment}\n\n📌 <b>Кількість членів:</b> ${filteredRecords.length}\n\n${listText}`;

      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fullMessage,
          pdfBase64,
          filename
        })
      });

      const data = await res.json();
      if (data.success) {
        setTgStatusMessage({ type: 'success', text: 'Звіт успішно надіслано!' });
      } else {
        setTgStatusMessage({ type: 'error', text: data.error || 'Помилка надсилання' });
      }
    } catch (err) {
      console.error('[Send Error]', err);
      setTgStatusMessage({ type: 'error', text: 'Помилка мережі при надсиланні' });
    } finally {
      setTgSending(false);
    }
  };

  // Unique lookup arrays
  const uniqueStatuses = useMemo(() => Array.from(new Set(members.map(m => (m.id_vybuttya && m.id_vybuttya > 0) ? (m.s_vybuv_ukr || 'Вибув') : 'Наявні'))).filter(Boolean), [members]);
  const uniqueRayons = useMemo(() => Array.from(new Set(members.map(m => m.rayon2_ukr))).filter(Boolean), [members]);
  const uniqueOpika = useMemo(() => {
    const baseList = (lookups?.directories?.opika as string[]) || Array.from(new Set(members.map(m => m.presviter).filter(Boolean)));
    const allPresviters = Array.from(new Set(baseList)).filter(Boolean);

    if (!selectedRayon) {
      return (allPresviters as string[]).sort((a, b) => a.localeCompare(b, 'uk-UA'));
    }

    const targetRayonNorm = selectedRayon.trim().toUpperCase();

    const leaderMap: Record<string, string> = {
      "БЕВЗЮК В": "АЕРОПОРТ",
      "СКІЦКО І": "КАСКАД",
      "ЧЕРНЯК ВАС": "ОБ'ЇЗНА",
      "ЧЕРНЯК ВАЛ": "ЦЕНТР"
    };

    const opikaBindings = lookups?.directories?.opika_bindings || [];

    return (allPresviters as string[]).filter(p => {
      const pStr = String(p || "");
      const pNorm = pStr.trim().toUpperCase().replace(/\./g, '').trim();
      
      if (leaderMap[pNorm]) {
        return leaderMap[pNorm] === targetRayonNorm;
      }

      if (opikaBindings.length > 0) {
        let hasAnyBindingForP = false;
        let isBoundToTargetRayon = false;

        for (const b of opikaBindings) {
          if (!b.name || !b.rayon) continue;
          const bNameNorm = b.name.trim().toLowerCase().replace(/[^a-zа-яёієїґ0-9]/g, '');
          const pNameNorm = pStr.trim().toLowerCase().replace(/[^a-zа-яёієїґ0-9]/g, '');
          if (bNameNorm === pNameNorm || bNameNorm.includes(pNameNorm) || pNameNorm.includes(bNameNorm)) {
            hasAnyBindingForP = true;
            if (b.rayon.trim().toUpperCase() === targetRayonNorm) {
              isBoundToTargetRayon = true;
            }
          }
        }

        if (hasAnyBindingForP) {
          return isBoundToTargetRayon;
        }
      }

      const foundMember = members.find(m => {
        if (m.id_vybuttya && m.id_vybuttya > 0) return false;
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
    }).sort((a, b) => a.localeCompare(b, 'uk-UA'));
  }, [lookups, members, selectedRayon]);
  const uniqueVidviduvanist = useMemo(() => Array.from(new Set(members.map(m => m.vidviduvanist))).filter(Boolean), [members]);
  const uniquePrysutnist = useMemo(() => Array.from(new Set(members.map(m => m.prysutnist))).filter(Boolean), [members]);
  const uniqueStats = useMemo(() => Array.from(new Set(members.map(m => m.stat))).filter(Boolean), [members]);
  const uniqueMarital = useMemo(() => Array.from(new Set(members.map(m => formatMaritalStatus(m.s_simeyniy_ukr || '')))).filter(Boolean), [members]);
  const uniqueSocial = useMemo(() => Array.from(new Set(members.map(m => m.s_socialniy_ukr))).filter(Boolean), [members]);
  const uniqueProfessions = useMemo(() => Array.from(new Set(members.map(m => m.s_profesiya_ukr))).filter(Boolean), [members]);
  const uniqueOsvita = useMemo(() => Array.from(new Set(members.map(m => m.s_osvita_ukr))).filter(Boolean), [members]);
  const uniqueDilyntsyu = useMemo(() => Array.from(new Set(members.map(m => String(m.n_dilyci || '')))).filter(Boolean).sort((a,b) => Number(a)-Number(b)), [members]);
  const uniqueServices = useMemo(() => {
    const sSet = new Set<string>();
    members.forEach(m => {
      if (m.s_slujinnya_spysok) {
        m.s_slujinnya_spysok.split(/[,;]+/).forEach(s => {
          const trimmed = s.trim();
          if (trimmed) sSet.add(trimmed);
        });
      }
    });
    return Array.from(sSet);
  }, [members]);

  return (
    <div className="flex flex-col h-full bg-[#122830] text-slate-100 overflow-y-auto p-4 sm:p-5 space-y-4">
      {/* Top Header Banner matching the screenshot */}
      <div className="bg-[#1a3843] border border-[#224853] p-4 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" />
            Конструктор звітів та формування списків
          </h1>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Відберіть осіб за критеріями, відзначте необхідні колонки, завантажте HTML-таблицю або сформуйте PDF-документ.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={resetAllFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-[#122830] hover:bg-[#204250] border border-[#224853] rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
            Скинути
          </button>
          <button
            onClick={handleDownloadHtml}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#204250] hover:bg-[#285567] border border-[#2e5d70] rounded-lg transition disabled:opacity-50"
          >
            <Code className="w-3.5 h-3.5 text-teal-400" />
            В HTML
          </button>
          <button
            onClick={() => handleDownloadPdf(true)}
            disabled={filteredRecords.length === 0 || pdfGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#387d7a] hover:bg-[#2b5f5d] border border-[#1b3642] rounded-lg transition disabled:opacity-50 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Плашки у PDF
          </button>
          <button
            onClick={() => handleDownloadPdf(false)}
            disabled={filteredRecords.length === 0 || pdfGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-[#1a3843] hover:bg-[#204250] border border-[#224853] rounded-lg transition disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            Друк (без плашок)
          </button>
        </div>
      </div>

      {/* Search & Service & Rayon Filter Bar */}
      <div className="bg-[#1a3843] border border-[#224853] p-4 rounded-xl shadow-md flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Введіть пошук (ПІБ, телефон, тощо)..."
            className="w-full px-3.5 py-2 text-xs bg-[#122830] border border-[#224853] rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="w-full sm:w-60">
          <select
            value={selectedRayon}
            onChange={e => setSelectedRayon(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#122830] border border-[#224853] rounded-lg text-slate-100 focus:outline-none focus:border-teal-500"
          >
            <option value="">-- Всі райони --</option>
            {uniqueRayons.map(rayon => (
              <option key={rayon} value={rayon}>{rayon}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-60">
          <select
            value={selectedOpika}
            onChange={e => setSelectedOpika(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#122830] border border-[#224853] rounded-lg text-slate-100 focus:outline-none focus:border-teal-500"
          >
            <option value="">-- Вся опіка --</option>
            {uniqueOpika.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedServiceType}
            onChange={e => setSelectedServiceType(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#122830] border border-[#224853] rounded-lg text-slate-100 focus:outline-none focus:border-teal-500"
          >
            <option value="">-- Всі види служінь --</option>
            {uniqueServices.map(serv => (
              <option key={serv} value={serv}>{serv}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Tags Bar */}
      <div className="bg-[#1a3843] border border-[#224853] px-4 py-2.5 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-teal-400 uppercase tracking-wide text-[10px]">АКТИВНІ:</span>
          
          {selectedStatus && (
            <span className="inline-flex items-center gap-1 bg-[#122830] border border-[#224853] px-2.5 py-1 rounded-md text-slate-200 text-[11px]">
              Статус: {selectedStatus}
              <button onClick={() => setSelectedStatus('')} className="text-slate-400 hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedRayon && (
            <span className="inline-flex items-center gap-1 bg-[#122830] border border-[#224853] px-2.5 py-1 rounded-md text-slate-200 text-[11px]">
              Район: {selectedRayon}
              <button onClick={() => setSelectedRayon('')} className="text-slate-400 hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedOpika && (
            <span className="inline-flex items-center gap-1 bg-[#122830] border border-[#224853] px-2.5 py-1 rounded-md text-slate-200 text-[11px]">
              Опіка: {selectedOpika}
              <button onClick={() => setSelectedOpika('')} className="text-slate-400 hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedSimeyniy && (
            <span className="inline-flex items-center gap-1 bg-[#122830] border border-[#224853] px-2.5 py-1 rounded-md text-slate-200 text-[11px]">
              Сім. стан: {selectedSimeyniy}
              <button onClick={() => setSelectedSimeyniy('')} className="text-slate-400 hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedSocialniy && (
            <span className="inline-flex items-center gap-1 bg-[#122830] border border-[#224853] px-2.5 py-1 rounded-md text-slate-200 text-[11px]">
              Соц. стан: {selectedSocialniy}
              <button onClick={() => setSelectedSocialniy('')} className="text-slate-400 hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}
          {(selectedAgeMin || selectedAgeMax) && (
            <span className="inline-flex items-center gap-1 bg-[#122830] border border-[#224853] px-2.5 py-1 rounded-md text-slate-200 text-[11px]">
              Вік: {selectedAgeMin || 0}-{selectedAgeMax || '99'} р.
              <button onClick={() => { setSelectedAgeMin(''); setSelectedAgeMax(''); }} className="text-slate-400 hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedVidviduvanist && (
            <span className="inline-flex items-center gap-1 bg-[#122830] border border-[#224853] px-2.5 py-1 rounded-md text-slate-200 text-[11px]">
              Відвідування: {selectedVidviduvanist}
              <button onClick={() => setSelectedVidviduvanist('')} className="text-slate-400 hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedDilyntsya && (
            <span className="inline-flex items-center gap-1 bg-[#122830] border border-[#224853] px-2.5 py-1 rounded-md text-slate-200 text-[11px]">
              Дільниця: {selectedDilyntsya}
              <button onClick={() => setSelectedDilyntsya('')} className="text-slate-400 hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className="text-teal-400 hover:underline font-semibold"
          >
            {showFiltersPanel ? 'Сховати фільтри' : 'Показати фільтри'}
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={resetAllFilters}
            className="text-slate-300 hover:text-white font-semibold"
          >
            Скинути все
          </button>
          <span className="text-teal-300 font-bold bg-teal-950/80 px-2.5 py-1 rounded border border-teal-800">
            Знайдено: {filteredRecords.length}
          </span>
        </div>
      </div>

      {/* Collapsible Advanced Filters & Column Settings Grid */}
      {showFiltersPanel && (
        <div className="bg-[#1a3843] border border-[#224853] p-4 rounded-xl shadow-md space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* Age Min / Max */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Вік (років)</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={selectedAgeMin}
                  onChange={e => setSelectedAgeMin(e.target.value)}
                  placeholder="Від"
                  className="w-full px-2 py-1.5 text-xs bg-[#122830] border border-[#224853] rounded text-slate-100 focus:outline-none focus:border-teal-500"
                />
                <input
                  type="number"
                  value={selectedAgeMax}
                  onChange={e => setSelectedAgeMax(e.target.value)}
                  placeholder="До"
                  className="w-full px-2 py-1.5 text-xs bg-[#122830] border border-[#224853] rounded text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Marital status */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Сімейний стан</label>
              <select
                value={selectedSimeyniy}
                onChange={e => setSelectedSimeyniy(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-[#122830] border border-[#224853] rounded text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Всі --</option>
                {uniqueMarital.map(ms => <option key={ms} value={ms}>{ms}</option>)}
              </select>
            </div>

            {/* Social status */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Соціальний стан</label>
              <select
                value={selectedSocialniy}
                onChange={e => setSelectedSocialniy(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-[#122830] border border-[#224853] rounded text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Всі --</option>
                {uniqueSocial.map(soc => <option key={soc} value={soc}>{soc}</option>)}
              </select>
            </div>

            {/* Profession */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Професія</label>
              <select
                value={selectedProfesiya}
                onChange={e => setSelectedProfesiya(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-[#122830] border border-[#224853] rounded text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Всі --</option>
                {uniqueProfessions.map(prof => <option key={prof} value={prof}>{prof}</option>)}
              </select>
            </div>

            {/* Education */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Освіта</label>
              <select
                value={selectedOsvita}
                onChange={e => setSelectedOsvita(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-[#122830] border border-[#224853] rounded text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Всі --</option>
                {uniqueOsvita.map(osv => <option key={osv} value={osv}>{osv}</option>)}
              </select>
            </div>

            {/* Dilyntsya */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Дільниця</label>
              <select
                value={selectedDilyntsya}
                onChange={e => setSelectedDilyntsya(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-[#122830] border border-[#224853] rounded text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Всі --</option>
                {uniqueDilyntsyu.map(d => <option key={d} value={d}>№{d}</option>)}
              </select>
            </div>

            {/* Vidviduvanist */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Відвідування</label>
              <select
                value={selectedVidviduvanist}
                onChange={e => setSelectedVidviduvanist(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-[#122830] border border-[#224853] rounded text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Будь-яка --</option>
                {uniqueVidviduvanist.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* Prysutnist */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Прич. відсутності</label>
              <select
                value={selectedPrysutnist}
                onChange={e => setSelectedPrysutnist(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-[#122830] border border-[#224853] rounded text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Всі --</option>
                {uniquePrysutnist.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Stat */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Стать</label>
              <select
                value={selectedStat}
                onChange={e => setSelectedStat(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-[#122830] border border-[#224853] rounded text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Всі --</option>
                {uniqueStats.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>

            {/* Rayon */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Район</label>
              <select
                value={selectedRayon}
                onChange={e => setSelectedRayon(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-[#122830] border border-[#224853] rounded text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Всі --</option>
                {uniqueRayons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Opika */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Опіка</label>
              <select
                value={selectedOpika}
                onChange={e => setSelectedOpika(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-[#122830] border border-[#224853] rounded text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Всі --</option>
                {uniqueOpika.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Статус</label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-[#122830] border border-[#224853] rounded text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Всі --</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Column Checkboxes / Pills as seen in screenshot */}
          <div className="border-t border-[#224853] pt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-teal-300 mr-2">Колонки у звіті:</span>
            {AVAILABLE_COLUMNS.map(col => {
              const isSelected = selectedColumns.includes(col.key);
              return (
                <button
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition border ${
                    isSelected 
                      ? 'bg-teal-950/70 border-teal-700 text-teal-200 font-medium' 
                      : 'bg-[#122830] border-[#224853] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isSelected ? <CheckSquare className="w-3 h-3 text-teal-400 shrink-0" /> : <Square className="w-3 h-3 text-slate-500 shrink-0" />}
                  <span>{col.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-[#224853] pt-3">
            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={printColors}
                onChange={e => setPrintColors(e.target.checked)}
                className="rounded border-[#224853] bg-[#122830] text-teal-600 focus:ring-teal-500"
              />
              Друк кольорових плашок
            </label>

            <button
              onClick={() => setSelectedColumns(AVAILABLE_COLUMNS.map(c => c.key))}
              className="text-[11px] text-teal-400 hover:underline font-bold"
            >
              Вибрати всі колонки
            </button>
          </div>
        </div>
      )}

      {/* Telegram Dispatch Card */}
      <div className="bg-[#1a3843] border border-[#224853] p-4 rounded-xl shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Розсилка в Telegram / Email</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTgMaterialType('pdf')}
              className={`px-3 py-1 rounded text-xs font-bold border transition ${
                tgMaterialType === 'pdf' ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300' : 'bg-[#122830] border-[#224853] text-slate-300'
              }`}
            >
              PDF документ
            </button>
            <button
              onClick={() => setTgMaterialType('list')}
              className={`px-3 py-1 rounded text-xs font-bold border transition ${
                tgMaterialType === 'list' ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300' : 'bg-[#122830] border-[#224853] text-slate-300'
              }`}
            >
              Текстовий список
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <input
            type="text"
            value={tgComment}
            onChange={e => setTgComment(e.target.value)}
            placeholder="Супровідний коментар до звіту..."
            className="flex-1 w-full px-3 py-2 text-xs bg-[#122830] border border-[#224853] rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleSendTelegram}
            disabled={tgSending || filteredRecords.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm transition disabled:opacity-50 whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            {tgSending ? "НАДСИЛАННЯ..." : "РОЗСИЛКА В TELEGRAM"}
          </button>
        </div>

        {tgStatusMessage && (
          <div className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
            tgStatusMessage.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
          }`}>
            {tgStatusMessage.text}
          </div>
        )}
      </div>

      {/* Live Table Preview matching screenshot */}
      <div className="bg-[#1a3843] border border-[#224853] p-4 rounded-xl shadow-md space-y-3 flex-1 flex flex-col min-h-[350px]">
        <div className="flex items-center justify-between border-b border-[#224853] pb-2">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-4 h-4 text-teal-400" />
            ПЕРЕГЛЯД РЕЗУЛЬТАТІВ ВІДБОРУ ({filteredRecords.length} ЗАПИСІВ)
          </h2>
          <span className="text-[11px] text-slate-400">Показано згідно обраних колонок</span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mb-2 text-slate-500" />
            <p className="text-xs font-medium">Не знайдено жодного запису за обраними критеріями.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#224853] rounded-lg bg-[#122830] flex-1">
            <table className="w-full border-collapse text-xs text-slate-200">
              <thead>
                <tr className="bg-[#1a3843] border-b border-[#224853] text-teal-300">
                  <th className="p-2.5 text-center font-bold border-r border-[#224853] w-12">№</th>
                  {AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key)).map(col => (
                    <th key={col.key} className="p-2.5 text-left font-bold border-r border-[#224853] whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((m, idx) => (
                  <tr key={m.id || idx} className={`border-b border-[#224853]/60 ${idx % 2 === 1 && printColors ? 'bg-[#15313c]' : 'bg-[#122830]' } hover:bg-[#204250] transition`}>
                    <td className="p-2.5 text-center font-medium text-slate-400 border-r border-[#224853]">{idx + 1}</td>
                    {AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key)).map(col => {
                      let val = m[col.key as keyof Member];
                      let displayVal = val !== undefined && val !== null ? String(val) : '—';
                      if (col.key === 's_simeyniy_ukr') {
                        displayVal = formatMaritalStatus(displayVal);
                      } else if (col.key === 'address') {
                        displayVal = cleanAddress(displayVal);
                      }
                      return (
                        <td key={col.key} className="p-2.5 text-slate-200 border-r border-[#224853]/60">
                          {displayVal || '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
