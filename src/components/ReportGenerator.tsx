import React, { useState, useMemo, useEffect } from 'react';
import { Member } from '../types';
import { 
  Filter, 
  Printer, 
  CheckSquare, 
  Square, 
  ListFilter, 
  RefreshCw, 
  Plus, 
  ChevronDown,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const cleanAddress = (address: string | undefined | null): string => {
  if (!address) return '';
  let str = String(address).trim();
  if (str === '—' || str === '-') return '—';

  str = str.replace(/[А-Яа-яЄєІіЇїҐґ']+\s*(?:обл|область)[а-я]*\.?/gi, '');
  str = str.replace(/[А-Яа-яЄєІіЇїҐґ']+(?:ськ)?[ийаяеіуоїі]?(?:\s+|-\s*)?(?:р-н|р\.н\.|р\sн|район)[а-я]*\.?/gi, '');
  str = str.replace(/(?:р-н|р\.н\.|р\sн|район)\s+[А-Яа-яЄєІіЇїҐґ']+/gi, '');
  str = str.replace(/(?:м\.\s*)?Івано-Франківськ[а-я']*/gi, '');

  str = str.replace(/\s+/g, ' ');
  str = str.replace(/,(\s*,)+/g, ',');
  str = str.replace(/\s*,\s*,/g, ',');
  str = str.replace(/^\s*[,.]\s*/, '');
  str = str.replace(/\s*[,.]\s*$/, '');
  str = str.trim();

  if (!str || /^[,\s.-]+$/.test(str)) {
    return '—';
  }
  return str;
};

interface AvailableColumn {
  key: string;
  label: string;
  defaultChecked: boolean;
}

const AVAILABLE_COLUMNS: AvailableColumn[] = [
  { key: "rayon2_ukr", label: "Район", defaultChecked: false },
  { key: "pib", label: "ПІБ", defaultChecked: true },
  { key: "d_kontaktiv", label: "Дати контактів", defaultChecked: true },
  { key: "presviter", label: "Опікун", defaultChecked: true },
  { key: "s_slujinnya_spysok", label: "Служіння", defaultChecked: false },
  { key: "vidviduvanist", label: "Відвідування", defaultChecked: true },
  { key: "prysutnist", label: "Прич. відсутності", defaultChecked: true },
  { key: "vik_rokiv1", label: "Вік", defaultChecked: true },
  { key: "address", label: "Адреса", defaultChecked: false },
  { key: "tel_mob", label: "Телефон", defaultChecked: true },
  { key: "d_narodjennya", label: "Д. народження", defaultChecked: false },
  { key: "stat", label: "Стать", defaultChecked: false },
  { key: "s_simeyniy_ukr", label: "Сімейний стан", defaultChecked: false }
];

interface ReportGeneratorProps {
  members: Member[];
  lookups?: {
    directories?: {
      rayon?: string[];
      opika?: string[];
      slujinnya?: string[];
      prysutnist?: string[];
    };
    vybuv?: { ID: any; Value: string }[];
  };
}

export default function ReportGenerator({ members = [], lookups }: ReportGeneratorProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("Наявні");
  const [selectedVybuttyaId, setSelectedVybuttyaId] = useState<string>("");
  const [selectedRayon, setSelectedRayon] = useState<string>("");
  const [selectedPresviter, setSelectedPresviter] = useState<string>("");
  const [selectedSlujinnya, setSelectedSlujinnya] = useState<string>("");
  const [selectedVidviduvanist, setSelectedVidviduvanist] = useState<string>("");
  const [selectedPrysutnist, setSelectedPrysutnist] = useState<string>("");
  const [selectedStat, setSelectedStat] = useState<string>("");
  const [showExtraFilters, setShowExtraFilters] = useState<boolean>(false);
  const [internalSearch, setInternalSearch] = useState<string>("");
  const [pdfGenerating, setPdfGenerating] = useState<boolean>(false);
  const [printColors, setPrintColors] = useState<boolean>(true);
  const [customColorsMap, setCustomColorsMap] = useState<Record<string, Record<string, string>>>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.filter(col => col.defaultChecked).map(col => col.key)
  );

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const res = await fetch("/api/custom-colors");
        if (res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length > 0) {
            setCustomColorsMap(data);
            localStorage.setItem("custom_colors_map", JSON.stringify(data));
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch colors from server in ReportGenerator:", err);
      }
      try {
        const saved = localStorage.getItem("custom_colors_map");
        if (saved) {
          setCustomColorsMap(JSON.parse(saved));
        }
      } catch {}
    };
    fetchColors();
  }, []);

  const getCustomColor = (category: string, value: string) => {
    try {
      if (customColorsMap && customColorsMap[category] && customColorsMap[category][value]) {
        const hex = customColorsMap[category][value];
        if (hex && hex.startsWith('#') && hex.length === 7) {
          const r = parseInt(hex.substring(1, 3), 16);
          const g = parseInt(hex.substring(3, 5), 16);
          const b = parseInt(hex.substring(5, 7), 16);
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const text = luma > 150 ? "#0f172a" : "#ffffff";
          const r_b = Math.max(0, r - 30);
          const g_b = Math.max(0, g - 30);
          const b_b = Math.max(0, b - 30);
          const border = `#${r_b.toString(16).padStart(2, '0')}${g_b.toString(16).padStart(2, '0')}${b_b.toString(16).padStart(2, '0')}`;
          return { bg: hex, text, border };
        }
      }
    } catch {}
    return null;
  };

  const getOpikaStyle = (val: string) => {
    const norm = val.trim();
    if (!norm || norm === '—') return null;
    const custom = getCustomColor("opika", norm);
    if (custom) return custom;
    if (norm === "Бевзюк В.") {
      return { bg: "#F7CB4D", text: "#2c2205", border: "#deae21" };
    }
    const creamShepherds = [
      "Галюк Б.", "Євстратов О.", "Луцак М.", "Мельничук В.", "Прохніцький Б.", 
      "Самелюк О.", "Скриник М.", "Стафіїв М.", "Факас О.", "Черняк Вікт.", "Шпарман Ю."
    ];
    if (creamShepherds.includes(norm)) {
      return { bg: "#FEF8E3", text: "#4a3c10", border: "#ebdcb1" };
    }
    return null;
  };

  const getSlujStyle = (val: string) => {
    const norm = val.trim();
    if (!norm || norm === '—') return null;
    const custom = getCustomColor("slujinnya", norm);
    if (custom) return custom;
    if (norm === "SUN SHINE") {
      return { bg: "#8989EB", text: "#FFFFFF", border: "#7373e6" };
    }
    const lavenderList = [
      "АДМІНІСТРАТИВНЕ", "ГОСТИННОСТІ", "ДИЗАЙНЕРСЬКЕ", "ДИЯКОН", "Лідер ДГ", 
      "Молитовне", "СОЦІАЛЬНЕ", "ПЕРЕКЛАДЧІ", "Підтр. мал. церков", "Проповідники", 
      "Служіння Г/Н"
    ];
    if (lavenderList.includes(norm)) {
      return { bg: "#E8E7FC", text: "#2d1663", border: "#caccfa" };
    }
    return null;
  };

  const getVidvidStyle = (val: string) => {
    const norm = val.trim();
    if (!norm || norm === '—') return null;
    const custom = getCustomColor("vidviduvanist", norm);
    if (custom) return custom;
    if (norm === "Постійно") return { bg: "#BDBDBD", text: "#111827", border: "#a6a6a6" };
    if (norm === "Рідко") return { bg: "#F3F3F3", text: "#374151", border: "#e5e5e5" };
    if (norm === "Періодично") return { bg: "#FFFFFF", text: "#1e3a1e", border: "#8fba94" };
    if (norm === "Нікови" || norm === "Ніколи") return { bg: "#FFFFFF", text: "#991b1b", border: "#dc2626" };
    return null;
  };

  const getPrysutStyle = (val: string) => {
    const norm = val.trim();
    if (!norm || norm === '—') return null;
    const custom = getCustomColor("prysutnist", norm);
    if (custom) return custom;
    if (norm === "За кордоном") return { bg: "#26A69A", text: "#FFFFFF", border: "#1f8c81" };
    if (norm === "Хворий") return { bg: "#DDF2F0", text: "#004D40", border: "#b2e3dd" };
    return null;
  };

  const getCellStyling = (field: string, val: string) => {
    const v = String(val || "").trim();
    if (!v || v === '—') return null;
    if (!printColors) {
      return { bg: "#ffffff", text: "#1e293b", border: "#94a3b8" };
    }
    if (field === 'presviter') return getOpikaStyle(v);
    if (field === 's_slujinnya_spysok') return getSlujStyle(v);
    if (field === 'vidviduvanist') return getVidvidStyle(v);
    if (field === 'prysutnist') return getPrysutStyle(v);
    return null;
  };

  const handleResetFilters = () => {
    setSelectedStatus("Наявні");
    setSelectedVybuttyaId("");
    setSelectedRayon("");
    setSelectedPresviter("");
    setSelectedSlujinnya("");
    setSelectedVidviduvanist("");
    setSelectedPrysutnist("");
    setSelectedStat("");
    setInternalSearch("");
  };

  const RAYON_LIST_ORDER = ["АЕРОПОРТ", "КАСКАД", "ОБ'ЇЗНА", "ЦЕНТР"];

  const sortRayonsList = (list: string[]) => {
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
    const baseList = lookups?.directories?.opika || Array.from(new Set(members.map(m => m.presviter).filter(Boolean)));
    const allPresviters = Array.from(new Set(baseList)).filter(Boolean);

    if (!selectedRayon) {
      return (allPresviters as string[]).sort();
    }

    const targetRayonNorm = selectedRayon.trim().toUpperCase();
    const leaderMap: Record<string, string> = {
      "БЕВЗЮК В": "АЕРОПОРТ",
      "СКІЦКО І": "КАСКАД",
      "ЧЕРНЯК ВАС": "ОБ'ЇЗНА",
      "ЧЕРНЯК ВАЛ": "ЦЕНТР"
    };

    return (allPresviters as string[]).filter(p => {
      const pStr = String(p || "");
      const pNorm = pStr.trim().toUpperCase().replace(/\./g, "").trim();
      if (leaderMap[pNorm]) {
        return leaderMap[pNorm] === targetRayonNorm;
      }

      const foundMember = members.find(m => {
        if (m.id_vybuttya > 0) return false;
        if (!m.pib) return false;
        const mPibClean = m.pib.trim().toLowerCase();
        const pClean = pStr.trim().toLowerCase();
        if (mPibClean === pClean) return true;

        const mParts = mPibClean.split(/\s+/).filter(Boolean);
        const pParts = pClean.replace(/\./g, " ").split(/\s+/).filter(Boolean);
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
        return String(foundMember.rayon2_ukr || "").trim().toUpperCase() === targetRayonNorm;
      }
      return false;
    }).sort();
  }, [lookups, members, selectedRayon]);

  useEffect(() => {
    if (selectedRayon && selectedPresviter) {
      if (!uniquePresviters.includes(selectedPresviter)) {
        setSelectedPresviter("");
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
        m.s_slujinnya_spysok.split(",").forEach(s => {
          const trimmed = s.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [lookups, members]);

  const uniqueVidvid = useMemo(() => ["Постійно", "Періодично", "Рідко", "Ніколи"], []);

  const uniquePrysut = useMemo(() => {
    if (lookups?.directories?.prysutnist) return lookups.directories.prysutnist;
    const set = new Set(members.map(m => m.prysutnist).filter(Boolean));
    return Array.from(set).sort();
  }, [lookups, members]);

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

  const filteredRecords = useMemo(() => {
    const list = members.filter(m => {
      if (selectedStatus === "Наявні") {
        if (m.id_vybuttya > 0 || isMergedProfile(m, members)) return false;
      } else if (selectedStatus === "Вибулі") {
        if (m.id_vybuttya === 0 || isMergedProfile(m, members)) return false;
        if (selectedVybuttyaId && String(m.id_vybuttya) !== selectedVybuttyaId) return false;
      } else {
        if (isMergedProfile(m, members)) return false;
      }

      if (selectedRayon) {
        if (String(m.rayon2_ukr || "").trim().toLowerCase() !== selectedRayon.trim().toLowerCase()) return false;
      }
      if (selectedPresviter) {
        if (String(m.presviter || "").trim().toLowerCase() !== selectedPresviter.trim().toLowerCase()) return false;
      }
      if (selectedSlujinnya) {
        if (!m.s_slujinnya_spysok) return false;
        if (!m.s_slujinnya_spysok.toLowerCase().includes(selectedSlujinnya.toLowerCase())) return false;
      }
      if (selectedVidviduvanist) {
        if (String(m.vidviduvanist || "").trim().toLowerCase() !== selectedVidviduvanist.trim().toLowerCase()) return false;
      }
      if (selectedPrysutnist) {
        if (String(m.prysutnist || "").trim().toLowerCase() !== selectedPrysutnist.trim().toLowerCase()) return false;
      }
      if (selectedStat) {
        if (String(m.stat || "").trim().toLowerCase() !== selectedStat.trim().toLowerCase()) return false;
      }

      if (internalSearch) {
        const q = internalSearch.toLowerCase().trim();
        const pibMatch = String(m.pib || "").toLowerCase().includes(q);
        const telMatch = String(m.tel_mob || "").toLowerCase().includes(q);
        const addMatch = String(m.address || "").toLowerCase().includes(q);
        const caretMatch = String(m.presviter || "").toLowerCase().includes(q);
        const rayonMatch = String(m.rayon2_ukr || "").toLowerCase().includes(q);
        if (!pibMatch && !telMatch && !addMatch && !caretMatch && !rayonMatch) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => (a.pib || "").localeCompare(b.pib || "", "uk-UA"));
  }, [members, selectedStatus, selectedVybuttyaId, selectedRayon, selectedPresviter, selectedSlujinnya, selectedVidviduvanist, selectedPrysutnist, selectedStat, internalSearch]);

  const handleToggleColumn = (colKey: string) => {
    setSelectedColumns(prev => 
      prev.includes(colKey) ? prev.filter(k => k !== colKey) : [...prev, colKey]
    );
  };

  const getReportHtmlContent = (autoPrint: boolean = false) => {
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
    const displayColumns = AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key));
    const todayString = new Date().toLocaleDateString('uk-UA') + " " + new Date().toLocaleTimeString('uk-UA');

    let tableHeadersHtml = `<th style="width: 45px; text-align: center;">№</th>`;
    displayColumns.forEach(col => {
      tableHeadersHtml += `<th style="text-align: ${['d_narodjennya', 'tel_mob', 'vik_rokiv1', 'stat', 'status_nazva', 'vidviduvanist', 'prysutnist'].includes(col.key) ? 'center' : 'left'};">${col.label}</th>`;
    });

    let tableRowsHtml = "";
    filteredRecords.forEach((m, idx) => {
      let cellsHtml = "";
      displayColumns.forEach(col => {
        let cellVal = m[col.key as keyof Member];
        if (cellVal === undefined || cellVal === null || cellVal === '') {
          cellVal = '—';
        }

        if (col.key === 'd_narodjennya' && cellVal !== '—') {
          try {
            const parts = String(cellVal).split('-');
            if (parts.length === 3) {
              cellVal = `${parts[2]}.${parts[1]}.${parts[0]}`;
            }
          } catch {}
        }

        // Special rendering matching report generator exactly
        if (col.key === 'pib' && cellVal !== '—') {
          const parts = String(cellVal).trim().split(/\s+/);
          if (parts.length > 1) {
            const lastName = parts[0];
            const givenAndPatronymic = parts.slice(1).join(" ");
            cellVal = `<div style="display: flex; flex-direction: column; align-items: flex-start; justify-content: center; line-height: 1.25;"><span style="font-weight: 700; color: #0f172a; display: block;">${lastName}</span><span style="font-size: 10px; color: #475569; font-weight: 500; display: block;">${givenAndPatronymic}</span></div>`;
          } else {
            cellVal = `<div style="font-weight: 700; color: #0f172a; line-height: 1.25;">${cellVal}</div>`;
          }
        }
        else if (col.key === 'address' && cellVal !== '—') {
          const cleaned = cleanAddress(String(cellVal));
          const commaIdx = cleaned.indexOf(',');
          if (commaIdx !== -1) {
            const part1 = cleaned.substring(0, commaIdx).trim();
            const part2 = cleaned.substring(commaIdx + 1).trim();
            cellVal = `<span style="font-weight: 600; color: #1e293b; display: block; margin-bottom: 2px;">${part1}</span><span style="font-size: 10px; color: #475569; display: block;">${part2}</span>`;
          } else {
            cellVal = `<span style="font-weight: 600; color: #1e293b;">${cleaned}</span>`;
          }
        }
        else if (['presviter', 'vidviduvanist', 'prysutnist'].includes(col.key) && cellVal !== '—') {
          const style = getCellStyling(col.key, String(cellVal));
          if (style) {
            cellVal = `<span style="display: inline-block; padding: 2px 6px; border-radius: 9999px; font-size: 9px; font-weight: bold; border: 1px solid ${style.border}; background-color: ${style.bg}; color: ${style.text}; white-space: nowrap; line-height: 1; vertical-align: middle; margin: 2px 0; box-sizing: border-box;">${cellVal}</span>`;
          }
        }
        else if (col.key === 's_slujinnya_spysok' && cellVal !== '—') {
          const badges = String(cellVal).split(/[,;]+/).map(s => s.trim()).filter(Boolean).map(n => {
            const style = getCellStyling('s_slujinnya_spysok', n);
            if (style) {
              return `<span style="display: inline-block; padding: 2px 6px; border-radius: 9999px; font-size: 9px; font-weight: bold; border: 1px solid ${style.border}; background-color: ${style.bg}; color: ${style.text}; white-space: nowrap; margin-right: 4px; margin-bottom: 4px; line-height: 1; vertical-align: middle; box-sizing: border-box;">${n}</span>`;
            }
            return `<span style="display: inline-block; padding: 2px 6px; border-radius: 9999px; font-size: 9px; font-weight: 500; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #475569; white-space: nowrap; margin-right: 4px; margin-bottom: 4px; line-height: 1; vertical-align: middle; box-sizing: border-box;">${n}</span>`;
          });
          cellVal = `<div style="line-height: 1.2;">${badges.join('')}</div>`;
        }

        const isCenterVal = ['d_narodjennya', 'tel_mob', 'vik_rokiv1', 'stat', 'status_nazva', 'vidviduvanist', 'prysutnist'].includes(col.key);
        const textAlign = isCenterVal ? 'center' : 'left';
        cellsHtml += `<td style="text-align: ${textAlign};">${cellVal}</td>`;
      });

      const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
      tableRowsHtml += `
        <tr style="background-color: ${rowBg};">
          <td style="text-align: center; color: #64748b; font-weight: 500;">${idx + 1}</td>
          ${cellsHtml}
        </tr>
      `;
    });

    const recordsWord = filteredRecords.length % 10 === 1 && filteredRecords.length % 100 !== 11
      ? 'особа'
      : [2, 3, 4].includes(filteredRecords.length % 10) && ![12, 13, 14].includes(filteredRecords.length % 100)
        ? 'особи'
        : 'осіб';

    const rClean = (selectedRayon || "Всі_райони").trim().replace(/[\s/\\:*?"<>|]/g, "_");
    const oClean = (selectedPresviter || "Всі_опікуни").trim().replace(/[\s/\\:*?"<>|]/g, "_");
    const datePart = new Date().toISOString().slice(0, 10);
    const fileTitle = `${rClean}_${oClean}_${datePart}`;

    const htmlContent = `<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileTitle}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f1f5f9;
            color: #1e293b;
            margin: 0;
            padding: 10mm;
            min-width: 297mm;
            overflow-x: auto;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .container {
            width: 277mm;
            max-width: 277mm;
            min-width: 277mm;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
            padding: 24px;
            border: 1px solid #e2e8f0;
        }
        .header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 12px;
            margin-bottom: 20px;
            text-align: center;
        }
        .header-sub {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            text-align: center;
        }
        h1 {
            font-size: 20px;
            font-weight: 850;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: center;
        }
        .meta-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
        }
        .filters-panel {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-left: 4px solid #0f766e;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 12px;
            margin-bottom: 20px;
        }
        .filters-title {
            font-weight: 700;
            color: #0f766e;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .filters-spec {
            color: #334155;
            font-weight: 500;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-top: 10px;
        }
        th {
            background-color: #e2e8f0;
            color: #0f172a;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border: 1px solid #94a3b8;
            padding: 10px 8px;
            vertical-align: middle;
        }
        td {
            border: 1px solid #cbd5e1;
            padding: 8px;
            color: #1e293b;
            vertical-align: middle;
            line-height: 1.4;
        }
        tr:nth-child(even) th {
            background-color: #cbd5e1;
        }
        .totals {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #475569;
            font-weight: 600;
        }
        .no-print-btn-container {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            justify-content: flex-end;
        }
        .btn {
            background-color: #0f766e;
            color: white;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 700;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            text-decoration: none;
            font-family: inherit;
        }
        .btn:hover {
            background-color: #0d5c56;
        }
        .btn-outline {
            background-color: transparent;
            color: #0f766e;
            border: 1px solid #0f766e;
        }
        .btn-outline:hover {
            background-color: #0f766e;
            color: white;
        }
        @page {
            size: 297mm 210mm;
            margin: 10mm;
        }
        @media print {
            html,
            body {
                width: 297mm;
                height: 210mm;
            }

            .container {
                width: 277mm !important;
                max-width: 277mm !important;
                min-width: 277mm !important;
            }
            @page {
                size: 297mm 210mm;
                margin: 10mm;
            }
            body {
                background-color: #ffffff;
                padding: 0 !important;
                margin: 0 !important;
                color: #000000;
            }
            .container {
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 277mm !important;
                max-width: 277mm !important;
                min-width: 277mm !important;
                box-sizing: border-box !important;
                background-color: #ffffff !important;
            }
            .no-print-btn-container {
                display: none;
            }
            tr {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            thead {
                display: table-header-group;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="no-print-btn-container">
            <button class="btn" onclick="window.print()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px;"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8" rx="2" ry="2"></rect><path d="M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"></path></svg>
                Друкувати (оберіть «Альбомна» орієнтація)
            </button>
            <button class="btn btn-outline" onclick="window.close();">
                Закрити
            </button>
        </div>

        <div class="header">
            <div class="header-sub">Українська Церква Християн Віри Євангельської м. Івано-Франківська</div>
            <h1>Сформований список членів церкви</h1>
        </div>

        <div class="filters-panel">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
                <div>
                    <div class="filters-title">Параметри відбору</div>
                    <div class="filters-spec">${filterSpec}</div>
                </div>
                <div style="text-align: right; white-space: nowrap; font-size: 11px; color: #475569; border-left: 1.5px solid #cbd5e1; padding-left: 15px; margin-left: 15px; display: flex; flex-direction: column; gap: 4px;">
                    <div><span style="font-weight: 700; color: #0f766e;">Всього у списку:</span> ${filteredRecords.length} ${recordsWord}</div>
                    <div><span style="font-weight: 700; color: #0f766e;">Дата:</span> ${todayString}</div>
                </div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    ${tableHeadersHtml}
                </tr>
            </thead>
            <tbody>
                ${tableRowsHtml}
            </tbody>
        </table>
    </div>
    ${autoPrint ? `
    <script>
        function triggerPrint() {
            setTimeout(() => {
                window.print();
            }, 1000);
        }
        document.title = "${fileTitle}";
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            triggerPrint();
        } else {
            window.addEventListener('DOMContentLoaded', triggerPrint);
        }
    </script>
    ` : ''}
</body>
</html>`;

    return { htmlContent, fileTitle };
  };

  const handleExportHtml = () => {
    if (filteredRecords.length === 0) {
      alert("Сформований список порожній. Будь ласка, змініть фільтри.");
      return;
    }

    try {
      const { htmlContent, fileTitle } = getReportHtmlContent(false);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileTitle}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating HTML export:", err);
      alert("Виникла помилка під час експорту таблиці у HTML. Спробуйте ще раз.");
    }
  };

  const handlePrint = async () => {
    if (filteredRecords.length === 0) {
      alert("Сформований список порожній. Будь ласка, змініть фільтри.");
      return;
    }

    setPdfGenerating(true);

    try {
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
      const displayColumns = AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key));

      const container = document.createElement('div');
      container.id = 'dynamic-pdf-render-container';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0px';
      container.style.width = '1120px';
      container.style.background = '#ffffff';
      container.style.color = '#000000';
      document.body.appendChild(container);

      const flexWeights: Record<string, number> = {
        rayon2_ukr: 1.1,
        pib: 2.5,
        d_kontaktiv: 1.2,
        presviter: 1.2,
        s_slujinnya_spysok: 1.5,
        vidviduvanist: 1.1,
        prysutnist: 1.2,
        vik_rokiv1: 0.5,
        address: 2.0,
        tel_mob: 1.3,
        d_narodjennya: 1.1,
        stat: 0.5,
        s_simeyniy_ukr: 1.2,
      };

      let totalWeight = 0;
      displayColumns.forEach(col => {
        totalWeight += flexWeights[col.key] || 1.0;
      });

      const totalTableWidth = 1040; // 1120px - 80px (padding)
      const indexColWidth = 45;
      const remainingWidth = totalTableWidth - indexColWidth;

      const colWidthsPx: Record<string, number> = {};
      displayColumns.forEach(col => {
        const weight = flexWeights[col.key] || 1.0;
        colWidthsPx[col.key] = Math.floor((weight / totalWeight) * remainingWidth);
      });

      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .pdf-page {
          width: 1120px;
          height: 792px;
          box-sizing: border-box;
          padding: 35px 40px;
          position: relative;
          background-color: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: 'Inter', system-ui, sans-serif;
          color: #0f172a;
          page-break-after: always;
        }
        .header {
          border-bottom: 2px solid #334155;
          padding-bottom: 12px;
          margin-bottom: 12px;
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
        .table-container {
          width: 1040px;
          margin-top: 10px;
          border-top: 1px solid #cbd5e1;
          border-left: 1px solid #cbd5e1;
          border-right: 1px solid #cbd5e1;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .table-row {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          border-bottom: 1px solid #cbd5e1;
          box-sizing: border-box;
          background-color: #ffffff;
          width: 1040px;
        }
        .table-row.header-row {
          background-color: #f1f5f9;
          border-bottom: 2px solid #cbd5e1;
        }
        .header-cell {
          color: #0f172a;
          font-weight: 600;
          font-size: 10px;
          padding: 6px 8px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          display: flex;
          align-items: center;
          box-sizing: border-box;
          height: 34px;
        }
        .header-cell:not(:last-child) {
          border-right: 1px solid #cbd5e1;
        }
        .table-cell {
          font-size: 10.5px;
          color: #1e293b;
          padding: 6px 8px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          align-self: stretch;
          box-sizing: border-box;
          min-height: 38px;
          height: 100%;
          overflow: hidden;
        }
        .table-cell:not(:last-child) {
          border-right: 1px solid #cbd5e1;
        }
        .tbody-container {
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .totals {
          margin-top: auto;
          font-size: 11px;
          font-weight: 600;
          color: #334155;
          display: flex;
          justify-content: space-between;
          border-top: 1px solid #cbd5e1;
          padding-top: 8px;
        }
      `;
      container.appendChild(styleEl);

      const pages: { pageDiv: HTMLDivElement; tbody: HTMLDivElement; footerDiv: HTMLDivElement; contentWrapper: HTMLDivElement }[] = [];
      let totalPagesCreated = 0;

      const createPageElement = (pageNumPlaceholder: string) => {
        totalPagesCreated++;
        const pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page';

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'content-wrapper';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'header';

        const isFirstPage = totalPagesCreated === 1;
        if (isFirstPage) {
          headerDiv.innerHTML = `
            <div class="title-row">
              <h1 class="title">Сформований список членів церкви</h1>
              <div class="date-info">ДАТА: ${new Date().toLocaleDateString('uk-UA')} ${new Date().toLocaleTimeString('uk-UA')}</div>
            </div>
            <div class="filters-box">
              <strong>Параметри відбору:</strong> ${filterSpec}
            </div>
          `;
        } else {
          headerDiv.innerHTML = `
            <div class="title-row">
              <h1 class="title" style="font-size: 14px; margin: 0;">Сформований список членів церкви (продовження)</h1>
              <div class="date-info">ДАТА: ${new Date().toLocaleDateString('uk-UA')} ${new Date().toLocaleTimeString('uk-UA')}</div>
            </div>
          `;
        }
        contentWrapper.appendChild(headerDiv);

        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';

        const headerRow = document.createElement('div');
        headerRow.className = 'table-row header-row';
        
        let headerHtml = `
          <div class="header-cell" style="width: ${indexColWidth}px; flex: 0 0 ${indexColWidth}px; justify-content: center; text-align: center;">№</div>
        `;
        displayColumns.forEach(col => {
          const isCenterVal = ['d_narodjennya', 'tel_mob', 'vik_rokiv1', 'stat', 'status_nazva', 'vidviduvanist', 'prysutnist'].includes(col.key);
          const justify = isCenterVal ? 'center' : 'flex-start';
          const textAlign = isCenterVal ? 'center' : 'left';
          headerHtml += `<div class="header-cell" style="width: ${colWidthsPx[col.key]}px; flex: 0 0 ${colWidthsPx[col.key]}px; justify-content: ${justify}; text-align: ${textAlign};">${col.label}</div>`;
        });
        
        headerRow.innerHTML = headerHtml;
        tableContainer.appendChild(headerRow);

        const tbody = document.createElement('div');
        tbody.className = 'tbody-container';
        tableContainer.appendChild(tbody);

        contentWrapper.appendChild(tableContainer);
        pageDiv.appendChild(contentWrapper);

        const footerDiv = document.createElement('div');
        footerDiv.className = 'totals';
        footerDiv.innerHTML = `
          <span>Всього у сформованому списку: ${filteredRecords.length} осіб</span>
          <span class="page-num-indicator">${pageNumPlaceholder}</span>
          <span>База даних Церкви</span>
        `;
        pageDiv.appendChild(footerDiv);

        container.appendChild(pageDiv);
        return { pageDiv, tbody, footerDiv, contentWrapper };
      };

      let current = createPageElement("PAGE_NUM");
      pages.push(current);

      for (let idx = 0; idx < filteredRecords.length; idx++) {
        const m = filteredRecords[idx];
        const tr = document.createElement('div');
        tr.className = 'table-row';
        tr.style.backgroundColor = idx % 2 === 1 ? '#f8fafc' : '#ffffff';

        let cellsHtml = `
          <div class="table-cell" style="width: ${indexColWidth}px; flex: 0 0 ${indexColWidth}px; justify-content: center; text-align: center; color: #64748b; font-weight: 500;">
            ${idx + 1}
          </div>
        `;

        cellsHtml += displayColumns.map(col => {
          const isCenterVal = ['d_narodjennya', 'tel_mob', 'vik_rokiv1', 'stat', 'status_nazva', 'vidviduvanist', 'prysutnist'].includes(col.key);
          const justify = isCenterVal ? 'center' : 'flex-start';
          const textAlign = isCenterVal ? 'center' : 'left';
          
          let cellVal = m[col.key as keyof Member] || '—';
          
          if (col.key === 'd_narodjennya' && cellVal) {
            try {
              const parts = String(cellVal).split('-');
              if (parts.length === 3) {
                cellVal = `${parts[2]}.${parts[1]}.${parts[0]}`;
              }
            } catch (e) {}
          }

          if (col.key === 'pib' && cellVal && cellVal !== '—') {
            const parts = String(cellVal).trim().split(/\s+/);
            if (parts.length > 1) {
              const lastName = parts[0];
              const givenAndPatronymic = parts.slice(1).join(" ");
              cellVal = `
                <div style="
                  display: flex;
                  flex-direction: column;
                  align-items: flex-start;
                  justify-content: center;
                  height: 100%;
                  line-height: 1.25;
                ">
                  <span style="font-weight: 700; color: #0f172a; display: block;">${lastName}</span>
                  <span style="font-size: 10px; color: #475569; font-weight: 500; display: block;">${givenAndPatronymic}</span>
                </div>`;
            } else {
              cellVal = `<div style="font-weight: 700; color: #0f172a; line-height: 1.25;">${cellVal}</div>`;
            }
          }
          else if (col.key === 'address' && cellVal && cellVal !== '—') {
            const cleaned = cleanAddress(cellVal);
            const isLocality = /^(с\.|смт|с-ще|м\.)/i.test(cleaned);
            if (isLocality) {
              const commaIdx = cleaned.indexOf(',');
              if (commaIdx !== -1) {
                const part1 = cleaned.substring(0, commaIdx).trim();
                const part2 = cleaned.substring(commaIdx + 1).trim();
                cellVal = `
                  <div style="
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    height: 100%;
                    text-align: left;
                    line-height: 1.25;
                  ">
                    <span style="font-weight: 600; color: #1e293b; display: block; margin-bottom: 2px;">${part1}</span>
                    <span style="font-size: 10px; color: #475569; display: block;">${part2}</span>
                  </div>`;
              } else {
                cellVal = `<div style="text-align: left; font-weight: 600; color: #1e293b; line-height: 1.25;">${cleaned}</div>`;
              }
            } else {
              cellVal = `<div style="text-align: left; font-weight: 600; color: #1e293b; line-height: 1.25;">${cleaned}</div>`;
            }
          }
          else {
            if (col.key === 'presviter' && cellVal && cellVal !== '—') {
              const style = getCellStyling('presviter', String(cellVal));
              if (style) {
                cellVal = `
                  <span style="
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2.5px 7px;
                    border-radius: 9999px;
                    font-size: 8.5px;
                    font-weight: 700;
                    border: 1px solid ${style.border};
                    background-color: ${style.bg};
                    color: ${style.text};
                    white-space: nowrap;
                    line-height: 1;
                    text-align: center;
                    vertical-align: middle;
                    margin: 1.5px;
                    box-sizing: border-box;
                  ">
                    ${cellVal}
                  </span>`;
              }
            }
            else if (col.key === 'vidviduvanist' && cellVal && cellVal !== '—') {
              const style = getCellStyling('vidviduvanist', String(cellVal));
              if (style) {
                cellVal = `
                  <span style="
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2.5px 7px;
                    border-radius: 9999px;
                    font-size: 8.5px;
                    font-weight: 700;
                    border: 1px solid ${style.border};
                    background-color: ${style.bg};
                    color: ${style.text};
                    white-space: nowrap;
                    line-height: 1;
                    text-align: center;
                    vertical-align: middle;
                    margin: 1.5px;
                    box-sizing: border-box;
                  ">
                    ${cellVal}
                  </span>`;
              }
            }
            else if (col.key === 'prysutnist' && cellVal && cellVal !== '—') {
              const style = getCellStyling('prysutnist', String(cellVal));
              if (style) {
                cellVal = `
                  <span style="
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2.5px 7px;
                    border-radius: 9999px;
                    font-size: 8.5px;
                    font-weight: 700;
                    border: 1px solid ${style.border};
                    background-color: ${style.bg};
                    color: ${style.text};
                    white-space: nowrap;
                    line-height: 1;
                    text-align: center;
                    vertical-align: middle;
                    margin: 1.5px;
                    box-sizing: border-box;
                  ">
                    ${cellVal}
                  </span>`;
              }
            }
            else if (col.key === 's_slujinnya_spysok' && cellVal && cellVal !== '—') {
              const strVal = String(cellVal).trim();
              const names = strVal.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
              
              const badgeHtmls = names.map(name => {
                const style = getCellStyling('s_slujinnya_spysok', name);
                if (style) {
                  return `
                    <span style="
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      padding: 2.5px 6.5px;
                      border-radius: 9999px;
                      font-size: 8.5px;
                      font-weight: 700;
                      border: 1px solid ${style.border};
                      background-color: ${style.bg};
                      color: ${style.text};
                      white-space: nowrap;
                      line-height: 1;
                      text-align: center;
                      vertical-align: middle;
                      margin: 1.5px;
                      box-sizing: border-box;
                    ">
                      ${name}
                    </span>`;
                }
                return `
                  <span style="
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2.5px 6.5px;
                    border-radius: 9999px;
                    font-size: 8.5px;
                    font-weight: 700;
                    border: 1px solid #cbd5e1;
                    background-color: #f1f5f9;
                    color: #475569;
                    white-space: nowrap;
                    line-height: 1;
                    text-align: center;
                    vertical-align: middle;
                    margin: 1.5px;
                    box-sizing: border-box;
                  ">
                    ${name}
                  </span>`;
              });

              cellVal = `
                <div style="
                  line-height: 1.2;
                  text-align: left;
                  display: flex;
                  flex-wrap: wrap;
                  align-items: center;
                ">
                  ${badgeHtmls.join('')}
                </div>`;
            }
          }

          return `
            <div class="table-cell" style="
              width: ${colWidthsPx[col.key]}px;
              flex: 0 0 ${colWidthsPx[col.key]}px;
              justify-content: ${justify};
              align-items: center;
              text-align: ${textAlign};
            ">
              ${cellVal}
            </div>
          `;
        }).join('');

        tr.innerHTML = cellsHtml;
        current.tbody.appendChild(tr);

        const currentHeight = current.contentWrapper.offsetHeight;
        const rowCount = current.tbody.children.length;
        if (currentHeight > 660 && rowCount > 1) {
          current.tbody.removeChild(tr);
          current = createPageElement("PAGE_NUM");
          pages.push(current);
          idx--;
        }
      }

      const totalPagesNum = pages.length;
      pages.forEach((p, index) => {
        const pageNum = index + 1;
        const pageNumIndicator = p.pageDiv.querySelector('.page-num-indicator');
        if (pageNumIndicator) {
          pageNumIndicator.textContent = `Сторінка ${pageNum} з ${totalPagesNum}`;
        }
      });

      // Ensure all custom fonts are completely ready before rendering
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      } catch (fErr) {
        console.warn("Fonts ready promise error:", fErr);
      }

      // Small tick for stable font rendering/layout engine settle
      await new Promise(resolve => setTimeout(resolve, 150));

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i].pageDiv;
        const canvas = await html2canvas(pageEl, {
          scale: 2.0,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
      }

      document.body.removeChild(container);

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
      <div className="bg-[#16303a] border-b border-[#1f424f] px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-teal-400 tracking-tight flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-teal-400" />
            <span>Конструктор звітів та формування списків</span>
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Відберіть осіб за критеріями, відзначте необхідні колонки, завантажте HTML-таблицю або сформуйте PDF-документ.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            type="button" 
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#1a3843] hover:bg-[#224b5a] border border-[#2d5d70] rounded-lg shadow-sm transition-all cursor-pointer outline-none focus:outline-none"
            title="Очистити всі фільтри"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Скинути</span>
          </button>
          <button 
            type="button" 
            onClick={handleExportHtml}
            disabled={filteredRecords.length === 0}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-all focus:outline-none outline-none ${
              filteredRecords.length > 0
                ? "bg-[#10b981] hover:bg-[#059669] cursor-pointer"
                : "bg-slate-700 cursor-not-allowed opacity-50"
            }`}
            title="Зберегти як автономну HTML-сторінку для друку або збереження"
          >
            <Download className="h-4 w-4" />
            <span>В HTML</span>
          </button>
          <button 
            type="button" 
            onClick={handlePrint}
            disabled={filteredRecords.length === 0 || pdfGenerating}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-all focus:outline-none outline-none ${
              filteredRecords.length > 0 && !pdfGenerating
                ? "bg-[#387d7a] hover:bg-[#2b5f5d] cursor-pointer"
                : "bg-slate-700 cursor-not-allowed opacity-50"
            }`}
          >
            {pdfGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin text-teal-200" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            <span>{pdfGenerating ? "ГЕНЕРАЦІЯ..." : "ДРУК (PDF)"}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-[#11252d] rounded-xl border border-[#1f424f] p-4">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">
            Вибір встановлених фільтрів
          </h3>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col space-y-1 w-full md:w-[130px] shrink-0">
              <label className="text-xs font-bold text-slate-350">Статус</label>
              <select 
                value={selectedStatus} 
                onChange={e => {
                  const val = e.target.value;
                  setSelectedStatus(val);
                  if (val !== "Вибулі") setSelectedVybuttyaId("");
                }}
                className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
              >
                <option value="Всі">Всі члени</option>
                <option value="Наявні">Наявні</option>
                <option value="Вибулі">Вибулі</option>
              </select>
            </div>

            {selectedStatus === "Вибулі" && (
              <div className="flex flex-col space-y-1 w-full md:w-[230px] shrink-0 animate-fade-in">
                <label className="text-xs font-bold text-slate-350 text-amber-400">Причина вибуття</label>
                <select 
                  value={selectedVybuttyaId} 
                  onChange={e => setSelectedVybuttyaId(e.target.value)}
                  className="w-full rounded-lg border border-amber-500/50 p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
                >
                  <option value="">-- Всі причини --</option>
                  {lookups?.vybuv?.map(v => (
                    <option key={v.ID} value={String(v.ID)}>{v.Value}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col space-y-1 w-full md:w-[150px] shrink-0">
              <label className="text-xs font-bold text-slate-350">Район громади</label>
              <select 
                value={selectedRayon} 
                onChange={e => setSelectedRayon(e.target.value)}
                className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
              >
                <option value="">-- Всі райони --</option>
                {uniqueRayons.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-1 w-full md:w-[220px] shrink-0">
              <label className="text-xs font-bold text-slate-350">Пастор відповідальний / Опікун</label>
              <select 
                value={selectedPresviter} 
                onChange={e => setSelectedPresviter(e.target.value)}
                className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
              >
                <option value="">-- Всі опікуни --</option>
                {uniquePresviters.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-1 w-full md:w-[250px] shrink-0">
              <label className="text-xs font-bold text-slate-350">Задіяне християнське служіння</label>
              <select 
                value={selectedSlujinnya} 
                onChange={e => setSelectedSlujinnya(e.target.value)}
                className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
              >
                <option value="">-- Всі види служінь --</option>
                {uniqueSlujinnya.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

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

          {(selectedRayon || selectedPresviter || selectedSlujinnya || (selectedStatus && selectedStatus !== 'Всі') || selectedVidviduvanist || selectedPrysutnist || selectedStat || internalSearch) && (
            <div className="mt-4 pt-3 border-t border-[#1f424f]/60 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Активні фільтри:</span>
              {selectedStatus && selectedStatus !== 'Всі' && (
                <span className="inline-flex items-center gap-1 bg-teal-950/40 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35">
                  <span>Статус: {selectedStatus}</span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedStatus("Всі")}
                    className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedVybuttyaId && (
                <span className="inline-flex items-center gap-1 bg-amber-950/40 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/35">
                  <span>Причина вибуття</span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedVybuttyaId("")}
                    className="hover:text-red-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedRayon && (
                <span className="inline-flex items-center gap-1 bg-[#1a3843] text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35 animate-fade-in">
                  <span>Район: {selectedRayon}</span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedRayon("")}
                    className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedPresviter && (
                <span className="inline-flex items-center gap-1 bg-[#1a3843] text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35 animate-fade-in">
                  <span>Опікун: {selectedPresviter}</span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedPresviter("")}
                    className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedSlujinnya && (
                <span className="inline-flex items-center gap-1 bg-[#1a3843] text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35 animate-fade-in">
                  <span>Служіння: {selectedSlujinnya}</span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedSlujinnya("")}
                    className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedVidviduvanist && (
                <span className="inline-flex items-center gap-1 bg-[#1a3843] text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35 animate-fade-in">
                  <span>Відвідування: {selectedVidviduvanist}</span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedVidviduvanist("")}
                    className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedPrysutnist && (
                <span className="inline-flex items-center gap-1 bg-[#1a3843] text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35 animate-fade-in">
                  <span>Причина відсутності: {selectedPrysutnist}</span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedPrysutnist("")}
                    className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedStat && (
                <span className="inline-flex items-center gap-1 bg-[#1a3843] text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/35 animate-fade-in">
                  <span>Стать: {selectedStat}</span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedStat("")}
                    className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold"
                  >
                    ×
                  </button>
                </span>
              )}
              {internalSearch && (
                <span className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700/80 text-teal-200 text-[10px] font-semibold px-2 py-0.5 rounded animate-fade-in">
                  <span>Пошук: "{internalSearch}"</span>
                  <button 
                    type="button" 
                    onClick={() => setInternalSearch("")}
                    className="hover:text-amber-400 text-slate-400 cursor-pointer text-[12px] ml-0.5 font-semibold"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}

          <div className="mt-3.5 border-t border-[#1f424f] pt-3 flex justify-between items-center">
            <button 
              type="button" 
              onClick={() => setShowExtraFilters(!showExtraFilters)}
              className="group flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-teal-300 transition-colors cursor-pointer outline-none"
            >
              <Plus className={`h-3 w-3 transition-transform ${showExtraFilters ? "rotate-45 text-teal-400" : "text-slate-400"}`} />
              <span>{showExtraFilters ? "Сховати додаткові критерії" : "Показати більше фільтрів..."}</span>
            </button>
            <span className="text-[10px] font-mono text-slate-400">
              Знайдено: <strong className="text-teal-400 font-bold">{filteredRecords.length}</strong> із <strong className="text-slate-300">{members.length}</strong>
            </span>
          </div>

          {showExtraFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 mt-3 border-t border-[#1f424f] ease-in duration-150">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-350">Регулярність відвідування</label>
                <select 
                  value={selectedVidviduvanist} 
                  onChange={e => setSelectedVidviduvanist(e.target.value)}
                  className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
                >
                  <option value="">-- Будь-яка --</option>
                  {uniqueVidvid.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-xs font-bold text-slate-350">Причина відсутності</label>
                <select 
                  value={selectedPrysutnist} 
                  onChange={e => setSelectedPrysutnist(e.target.value)}
                  className="w-full rounded-lg border border-[#1f424f] p-2 text-xs font-semibold focus:border-teal-500 focus:outline-[#1f424f] bg-[#1a3843] text-slate-200"
                >
                  <option value="">-- Без обмежень --</option>
                  {uniquePrysut.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

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

        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1f424f] pb-2 gap-2">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-teal-400" />
              <span>Вибір колонок для включення в таблицю</span>
            </h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-teal-300 transition-colors select-none font-bold">
                <input 
                  type="checkbox" 
                  checked={printColors} 
                  onChange={e => setPrintColors(e.target.checked)}
                  className="rounded text-[#387d7a] focus:ring-teal-500 bg-[#16303a] border-[#1f424f] h-4 w-4 cursor-pointer"
                />
                <span>Друк кольорових плашок</span>
              </label>
              <span className="text-[10px] text-slate-400">Відзначте колонки для фінального документу</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {AVAILABLE_COLUMNS.map(col => {
              const isSelected = selectedColumns.includes(col.key);
              return (
                <button 
                  type="button" 
                  key={col.key} 
                  onClick={() => handleToggleColumn(col.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected 
                      ? "bg-[#387d7a]/20 border-teal-500 text-teal-300 font-semibold" 
                      : "border-[#1f424f] hover:border-[#387d7a] bg-[#16303a] text-slate-300"
                  }`}
                >
                  {isSelected ? (
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

        <div className="space-y-3">
          <div className="flex justify-between items-center border-b border-[#1f424f] pb-2">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
              Перегляд результатів відбору ({filteredRecords.length} записів)
            </h3>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="text-center text-slate-450 py-12 bg-[#11252d] rounded-xl border border-[#1f424f] text-xs font-semibold">
              Жодного запису не знайдено за вказаними критеріями відбору
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#1f424f] bg-[#11252d]">
              <table className="w-full border-collapse text-left text-xs text-slate-300">
                <thead>
                  <tr className="bg-[#16303a] border-b border-[#1f424f]">
                    <th className="py-3 px-4 font-bold border-r border-[#1f424f] text-slate-200">#</th>
                    {AVAILABLE_COLUMNS.filter(col => selectedColumns.includes(col.key)).map(col => (
                      <th key={col.key} className="py-3 px-4 font-bold border-r border-[#1f424f] text-slate-200">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.slice(0, 100).map((m, index) => (
                    <tr key={m.id} className="border-b border-[#1f424f]/65 hover:bg-[#16323c]/45 transition-colors">
                      <td className="py-2 px-4 border-r border-[#1f424f]/40 font-semibold text-slate-400">{index + 1}</td>
                      {AVAILABLE_COLUMNS.filter(col => selectedColumns.includes(col.key)).map(col => {
                        let val = m[col.key as keyof Member];
                        if (col.key === 'd_narodjennya' && val) {
                          try {
                            const p = String(val).split('-');
                            if (p.length === 3) val = `${p[2]}.${p[1]}.${p[0]}`;
                          } catch {}
                        }
                        return (
                          <td key={col.key} className="py-2 px-4 border-r border-[#1f424f]/40">
                            {col.key === 'presviter' && val && val !== '—' ? (
                              (() => {
                                const st = getCellStyling('presviter', String(val));
                                return st ? (
                                  <span className="inline-flex items-center justify-center rounded-full text-[9px] font-bold px-1.5 py-0.5 border" style={{ backgroundColor: st.bg, color: st.text, borderColor: st.border }}>
                                    {String(val)}
                                  </span>
                                ) : String(val);
                              })()
                            ) : col.key === 'vidviduvanist' && val && val !== '—' ? (
                              (() => {
                                const st = getCellStyling('vidviduvanist', String(val));
                                return st ? (
                                  <span className="inline-flex items-center justify-center rounded-full text-[9px] font-bold px-1.5 py-0.5 border" style={{ backgroundColor: st.bg, color: st.text, borderColor: st.border }}>
                                    {String(val)}
                                  </span>
                                ) : String(val);
                              })()
                            ) : col.key === 'prysutnist' && val && val !== '—' ? (
                              (() => {
                                const st = getCellStyling('prysutnist', String(val));
                                return st ? (
                                  <span className="inline-flex items-center justify-center rounded-full text-[9px] font-bold px-1.5 py-0.5 border" style={{ backgroundColor: st.bg, color: st.text, borderColor: st.border }}>
                                    {String(val)}
                                  </span>
                                ) : String(val);
                              })()
                            ) : col.key === 's_slujinnya_spysok' && val && val !== '—' ? (
                              <div className="flex flex-wrap gap-1">
                                {String(val).split(/[,;]+/).map(s => s.trim()).filter(Boolean).map((n, i) => {
                                  const st = getCellStyling('s_slujinnya_spysok', n);
                                  return st ? (
                                    <span key={i} className="inline-flex items-center justify-center rounded-full text-[9px] font-bold px-1.5 py-0.5 border" style={{ backgroundColor: st.bg, color: st.text, borderColor: st.border }}>
                                      {n}
                                    </span>
                                  ) : (
                                    <span key={i} className="inline-flex items-center justify-center rounded-full text-[9px] font-medium px-1.5 py-0.5 bg-slate-700/60 border border-slate-600 text-slate-300">
                                      {n}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : col.key === 'address' ? (
                              cleanAddress(String(val || ""))
                            ) : (
                              String(val || '—')
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRecords.length > 100 && (
                <div className="py-3 px-4 bg-[#142d36] text-center text-[11px] text-slate-400 font-medium">
                  Показано перші 100 результатів пошуку. Повний список із {filteredRecords.length} записів буде експортовано до файлу PDF.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
