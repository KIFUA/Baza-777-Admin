import React, { useState, useMemo, useEffect } from 'react';
import { Member, DashboardStats } from '../types';
import { Users, UserCheck, UserMinus, ShieldAlert, MapPin, Heart, HelpCircle, Activity, User, FileDown, ChevronDown, ChevronUp } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface StatsDashboardProps {
  stats: DashboardStats | null;
  members: Member[];
  lookups?: any;
}

export default function StatsDashboard({ stats, members, lookups }: StatsDashboardProps) {
  // State for District selector
  const [selectedRayon, setSelectedRayon] = useState<string>('');
  const [isPdfGenerating, setIsPdfGenerating] = useState<boolean>(false);
  const [showTotalRegisterStats, setShowTotalRegisterStats] = useState<boolean>(false);

  // Extract unique rayon/neighborhood names with "Всі райони" option
  const uniqueRayons = useMemo(() => {
    const rs = new Set<string>();
    members.forEach(m => {
      if (m.rayon2_ukr && m.rayon2_ukr.trim()) {
        rs.add(m.rayon2_ukr.trim());
      }
    });
    if (lookups?.directories?.rayon2) {
      lookups.directories.rayon2.forEach((r: string) => {
        if (r && r.trim() && r !== '—') rs.add(r.trim());
      });
    }
    return ["Всі райони", ...Array.from(rs).sort()];
  }, [members, lookups]);

  // Default to first rayon (which will be "Всі райони") once available
  useEffect(() => {
    if (uniqueRayons.length > 0 && !selectedRayon) {
      setSelectedRayon(uniqueRayons[0]);
    }
  }, [uniqueRayons, selectedRayon]);

  // Compute active members in selected rayon
  const rayonMembers = useMemo(() => {
    if (!selectedRayon) return [];
    if (selectedRayon === "Всі райони") {
      return members.filter(m => m.id_vybuttya === 0);
    }
    return members.filter(
      m => m.id_vybuttya === 0 && m.rayon2_ukr && m.rayon2_ukr.trim().toLowerCase() === selectedRayon.trim().toLowerCase()
    );
  }, [selectedRayon, members]);

  // Compute stats for the selected rayon
  const rayonStats = useMemo(() => {
    const total = rayonMembers.length;
    const brothers = rayonMembers.filter(m => String(m.stat).trim().toLowerCase().includes('брат')).length;
    const sisters = rayonMembers.filter(m => String(m.stat).trim().toLowerCase().includes('сестра') || String(m.stat).trim().toLowerCase().includes('сес')).length;
    const others = total - brothers - sisters;

    // Marital Status counts
    let single = 0;
    let married = 0;
    let divorced = 0;
    let widowed = 0;
    let nd = 0;

    rayonMembers.forEach(m => {
      const status = String(m.s_simeyniy_ukr || '').trim().toLowerCase();
      if (!status || status === 'н/д' || status === 'не визначено' || status === '—') {
        nd++;
      } else if (status.startsWith('неодр') || status.includes('неод')) {
        single++;
      } else if (status.startsWith('одр') || status === 'одр.' || status === 'одружений' || status === 'одружена') {
        married++;
      } else if (status.startsWith('розл') || status.includes('розлуч')) {
        divorced++;
      } else if (status.startsWith('вд') || status.includes('вдов') || status.includes('вдiв')) {
        widowed++;
      } else {
        nd++;
      }
    });

    // Attendance ("Відвідування") counts
    const attendance: Record<string, number> = {};
    rayonMembers.forEach(m => {
      const key = String(m.vidviduvanist || '').trim() || 'н/д';
      attendance[key] = (attendance[key] || 0) + 1;
    });
    const sortedAttendance = Object.entries(attendance).sort((a, b) => b[1] - a[1]);

    // Reason for absence ("Прич. відсутності") counts - FILTER OUT "н/д"
    const presence: Record<string, number> = {};
    rayonMembers.forEach(m => {
      const key = String(m.prysutnist || '').trim();
      const isNA = !key || key.toLowerCase() === 'н/д' || key === '—' || key === '-';
      if (!isNA) {
        presence[key] = (presence[key] || 0) + 1;
      }
    });
    const sortedPresence = Object.entries(presence).sort((a, b) => b[1] - a[1]);

    // Caregivers list
    const caregivers: Record<string, number> = {};
    rayonMembers.forEach(m => {
      const key = String(m.presviter || '').trim() || 'Без опікуна';
      caregivers[key] = (caregivers[key] || 0) + 1;
    });
    const sortedCaregivers = Object.entries(caregivers).sort((a, b) => b[1] - a[1]);

    // Area/District stats client-side
    const area: Record<string, number> = {};
    rayonMembers.forEach(m => {
      const key = String(m.rayon2_ukr || '').trim() || 'н/д';
      area[key] = (area[key] || 0) + 1;
    });
    const sortedArea = Object.entries(area).sort((a, b) => b[1] - a[1]);

    return {
      total,
      brothers,
      sisters,
      others,
      marital: { single, married, divorced, widowed, nd },
      attendance: sortedAttendance,
      presence: sortedPresence,
      caregivers: sortedCaregivers,
      area: sortedArea
    };
  }, [rayonMembers]);

  const handleDownloadPDF = async () => {
    if (!selectedRayon) return;
    setIsPdfGenerating(true);
    try {
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.id = 'temp-pdf-dashboard-container';

      const isAll = selectedRayon === "Всі райони";
      const totalActive = rayonStats.total;
      const bPct = totalActive > 0 ? Math.round((rayonStats.brothers / totalActive) * 100) : 0;
      const sPct = totalActive > 0 ? Math.round((rayonStats.sisters / totalActive) * 100) : 0;
      const oPct = totalActive > 0 ? Math.round((rayonStats.others / totalActive) * 100) : 0;

      // Extract unique area counts for PDF
      const areaStats: Record<string, number> = {};
      rayonMembers.forEach(m => {
        const key = String(m.rayon2_ukr || '').trim() || 'н/д';
        areaStats[key] = (areaStats[key] || 0) + 1;
      });
      const sortedAreaStats = Object.entries(areaStats).sort((a, b) => b[1] - a[1]);

      const htmlContent = `
        <div style="width: 1050px; background: #f1f5f9; color: #0f172a; padding: 24px 30px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <!-- Header Card -->
          <div style="background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-left: 6px solid #10b981; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div>
              <h1 style="font-size: 24px; font-weight: 850; color: #064e3b; margin: 0; letter-spacing: -0.5px;">⛪ АНАЛІТИЧНИЙ ЗВІТ РЕЄСТРУ ЦЕРКВИ</h1>
              <p style="font-size: 11.5px; color: #4b5563; font-weight: 600; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px;">
                ${isAll ? "Узагальнена статистика по всіх районах" : `Звіт по району: ${selectedRayon}`}
              </p>
            </div>
            <div style="text-align: right;">
              <div style="background: #ecfdf5; border: 1px solid #059669; color: #047857; font-size: 10.5px; font-weight: 700; padding: 6px 16px; border-radius: 99px; text-transform: uppercase; display: inline-block;">
                Активних членів: ${totalActive} осіб
              </div>
              <p style="font-size: 10.5px; color: #9ca3af; margin: 6px 0 0 0; font-weight: 500;">Дата формування: ${new Date().toLocaleDateString('uk-UA')} ${new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <!-- Grid Content -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
            
            <!-- COLUMN 1: General & Areas (Moved right under General) -->
            <div style="display: flex; flex-direction: column;">
              <!-- General Count Card -->
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px;">
                <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 0 0 14px 0; letter-spacing: 0.5px;">👥 Загальний розподіл членів</h3>
                <div style="font-size: 32px; font-weight: 900; color: #0f172a; margin-bottom: 14px; display: flex; align-items: baseline; gap: 6px;">
                  ${totalActive}
                  <span style="font-size: 13px; font-weight: 600; color: #64748b; margin-left: 4px;">активних осіб</span>
                </div>
                
                <!-- Progress bar split -->
                <div style="height: 9px; width: 100%; background: #e2e8f0; border-radius: 99px; overflow: hidden; display: flex; margin-bottom: 14px;">
                  <div style="height: 100%; width: ${bPct}%; background: #0ea5e9;" title="Брати"></div>
                  <div style="height: 100%; width: ${sPct}%; background: #f43f5e;" title="Сестри"></div>
                  <div style="height: 100%; width: ${oPct}%; background: #94a3b8;" title="Інші"></div>
                </div>

                <div style="display: flex; flex-direction: column;">
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; padding: 5px 8px; background: #e0f2fe; border-radius: 8px; margin-bottom: 8px; box-sizing: border-box;">
                    <span style="font-weight: 700; color: #0369a1;">👦 Брати</span>
                    <span style="font-weight: 800; color: #0369a1;">${rayonStats.brothers} (${bPct}%)</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; padding: 5px 8px; background: #ffe4e6; border-radius: 8px; box-sizing: border-box;">
                    <span style="font-weight: 700; color: #be123c;">👧 Сестри</span>
                    <span style="font-weight: 800; color: #be123c;">${rayonStats.sisters} (${sPct}%)</span>
                  </div>
                </div>
              </div>

              <!-- Areas density block (Moved here under General) -->
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 0 0 14px 0; letter-spacing: 0.5px;">📍 Райони структури</h3>
                <div style="display: flex; flex-direction: column;">
                  ${sortedAreaStats.slice(0, 6).map(([lbl, val]) => {
                    const pct = totalActive > 0 ? Math.round((val / totalActive) * 100) : 0;
                    return `
                      <div style="font-size: 11px; margin-bottom: 10px; box-sizing: border-box;">
                        <div style="display: flex; justify-content: space-between; font-weight: 700; color: #334155; margin-bottom: 3px;">
                          <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 170px; display: inline-block;">${lbl || "н/д"}</span>
                          <span>${val} (${pct}%)</span>
                        </div>
                        <div style="height: 6px; width: 100%; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
                          <div style="height: 100%; width: ${pct}%; background: #10b981; border-radius: 99px;"></div>
                        </div>
                      </div>
                    `;
                  }).join('') || '<p style="font-size: 11.5px; color: #94a3b8; font-style: italic; margin: 0;">Дані відсутні</p>'}
                </div>
              </div>
            </div>

            <!-- COLUMN 2: Marital, Attendance & Reasons -->
            <div style="display: flex; flex-direction: column;">
              <!-- Marital Status Card -->
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px;">
                <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 0 0 14px 0; letter-spacing: 0.5px;">💍 Сімейний Стан</h3>
                <div style="display: flex; flex-direction: column;">
                  <div style="display: flex; justify-content: space-between; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 5px; box-sizing: border-box;">
                    <span style="font-weight: 600; color: #334155;">одружені</span>
                    <span style="font-weight: 700; color: #0f172a;">${rayonStats.marital.married}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 5px; box-sizing: border-box;">
                    <span style="font-weight: 600; color: #334155;">неодружені</span>
                    <span style="font-weight: 700; color: #0f172a;">${rayonStats.marital.single}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 5px; box-sizing: border-box;">
                    <span style="font-weight: 600; color: #334155;">розлучені</span>
                    <span style="font-weight: 700; color: #0f172a;">${rayonStats.marital.divorced}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 5px; box-sizing: border-box;">
                    <span style="font-weight: 600; color: #334155;">вдова/вдівець</span>
                    <span style="font-weight: 700; color: #0f172a;">${rayonStats.marital.widowed}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; padding-bottom: 1px; box-sizing: border-box;">
                    <span style="font-weight: 550; color: #94a3b8; font-style: italic;">не вказано</span>
                    <span style="font-weight: 700; color: #64748b;">${rayonStats.marital.nd}</span>
                  </div>
                </div>
              </div>

              <!-- Attendance Card -->
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px;">
                <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 0 0 14px 0; letter-spacing: 0.5px;">📈 Аналіз відвідуваності</h3>
                <div style="display: flex; flex-direction: column;">
                  ${rayonStats.attendance.slice(0, 5).map(([lbl, val]) => {
                    const pct = totalActive > 0 ? Math.round((val / totalActive) * 100) : 0;
                    return `
                      <div style="font-size: 11px; margin-bottom: 10px; box-sizing: border-box;">
                        <div style="display: flex; justify-content: space-between; font-weight: 700; color: #334155; margin-bottom: 3px;">
                          <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 170px; display: inline-block;">${lbl || "н/д"}</span>
                          <span>${val} (${pct}%)</span>
                        </div>
                        <div style="height: 6px; width: 100%; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
                          <div style="height: 100%; width: ${pct}%; background: #3b82f6; border-radius: 99px;"></div>
                        </div>
                      </div>
                    `;
                  }).join('') || '<p style="font-size: 11.5px; color: #94a3b8; font-style: italic; margin: 0;">Дані відсутні</p>'}
                </div>
              </div>

              <!-- Presence/Absence reason (no "н/д"!) -->
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 0 0 14px 0; letter-spacing: 0.5px;">📌 Причини відсутності</h3>
                <div style="display: flex; flex-direction: column;">
                  ${rayonStats.presence.slice(0, 5).map(([lbl, val]) => {
                    const pct = totalActive > 0 ? Math.round((val / totalActive) * 100) : 0;
                    return `
                      <div style="font-size: 11px; margin-bottom: 10px; box-sizing: border-box;">
                        <div style="display: flex; justify-content: space-between; font-weight: 700; color: #334155; margin-bottom: 3px;">
                          <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 170px; display: inline-block;">${lbl}</span>
                          <span>${val} (${pct}%)</span>
                        </div>
                        <div style="height: 6px; width: 100%; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
                          <div style="height: 100%; width: ${pct}%; background: #f59e0b; border-radius: 99px;"></div>
                        </div>
                      </div>
                    `;
                  }).join('') || '<p style="font-size: 11.5px; color: #64748b; font-style: italic; margin: 0;">Всі присутні</p>'}
                </div>
              </div>
            </div>

            <!-- COLUMN 3: Caregivers list (fully visible in two columns) -->
            <div style="display: flex; flex-direction: column;">
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); min-height: 480px; display: flex; flex-direction: column;">
                <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 0 0 14px 0; letter-spacing: 0.5px;">💚 Розподіл пастирської опіки</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; box-sizing: border-box;">
                  ${rayonStats.caregivers.map(([name, count]) => {
                    const pct = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;
                    return `
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; padding: 6px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; box-sizing: border-box; min-width: 0;">
                        <span style="font-weight: 700; color: #1e293b; display: inline-block; word-break: break-all; line-height: 1.1; margin-right: 4px;">${name}</span>
                        <span style="font-weight: 800; background: #10b981; color: #ffffff; padding: 2px 5px; border-radius: 10px; font-size: 8.5px; display: inline-block; white-space: nowrap;">
                          ${count} (${pct}%)
                        </span>
                      </div>
                    `;
                  }).join('') || '<p style="font-size: 11.5px; color: #94a3b8; font-style: italic; text-align: center; margin-top: 50px;">Опікунів не знайдено</p>'}
                </div>
              </div>
            </div>

          </div>

          <!-- Footer seal -->
          <div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b; font-weight: 500;">
            <span>Сгенеровано автоматично з Системи Реєстру Громади. Для внутрішнього користування.</span>
            <span style="font-weight: 700; color: #10b981;">Церква ЄХБ «Христа Спасителя»</span>
          </div>
        </div>
      `;

      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Render to canvas
      const canvas = await html2canvas(container, {
        scale: 2, // ultra crisp output
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f1f5f9',
        logging: false
      });

      document.body.removeChild(container);

      const imgWidth = 297; // A4 Landscape
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      const filename = `Statystyka_Rayonu_${selectedRayon.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Не вдалося завантажити PDF звіт. Будь ласка, спробуйте ще раз.");
    } finally {
      setIsPdfGenerating(false);
    }
  };

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

  // Let's build a clean, custom indicator card with high-contrast, dark-mode friendly styling
  const cards = [
    {
      id: "stat_total",
      title: "Загальний реєстр",
      value: totalCount,
      sub: "Всі записи в системі",
      icon: Users,
      color: "text-blue-300 bg-blue-950/80 border-blue-800/80",
    },
    {
      id: "stat_active",
      title: "Активні члени церкви",
      value: activeMembersCount,
      sub: `${Math.round((activeMembersCount / totalCount) * 100)}% від реєстру`,
      icon: UserCheck,
      color: "text-emerald-300 bg-emerald-950/80 border-emerald-800/80",
    },
    {
      id: "stat_left",
      title: "Зняті з обліку (вибули)",
      value: leftCount,
      sub: `${Math.round((leftCount / totalCount) * 100)}% померли/виїхали`,
      icon: UserMinus,
      color: "text-amber-300 bg-amber-950/80 border-amber-800/80",
    },
    {
      id: "stat_discipline",
      title: "Під стягненням / Опіка",
      value: members.filter(m => m.id_vybuttya === 0 && m.hvoryi).length,
      sub: "Потребують посиленої уваги",
      icon: ShieldAlert,
      color: "text-rose-300 bg-rose-950/80 border-rose-800/80",
    }
  ];

  // Render a clean percentage bar with dark theme backgrounds and high-contrast labels
  const renderBar = (label: string, value: number, max: number, colorClass = "bg-blue-600", isCompact = false) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    const isNA = !label || label.toLowerCase() === "н/д" || label === "Не визначено" || label.trim() === "";
    const labelToDisplay = isNA ? "н/д" : label;
    return (
      <div key={label || "empty"} className={`group flex flex-col ${isCompact ? "space-y-0.5" : "space-y-1"}`}>
        <div className={`flex items-center justify-between ${isCompact ? "text-[9px] font-bold" : "text-xs font-semibold"} text-slate-200`}>
          <span className={`truncate max-w-[70%] ${isNA ? "text-slate-400 font-normal italic" : ""}`}>{labelToDisplay}</span>
          <div className={`flex-1 border-b border-dotted border-white/15 ${isCompact ? "mx-1.5" : "mx-2"} self-center h-0.5 opacity-30`} />
          <span className="text-slate-350 shrink-0">{value} ({pct}%)</span>
        </div>
        <div className={`${isCompact ? "h-1" : "h-1.5"} w-full overflow-hidden rounded-full bg-slate-800/50`}>
          <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div id="stats_dashboard" className="space-y-6 animate-fade-in text-slate-100">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-white animate-fade-in">Аналітична статистика реєстру</h2>
          <p className="text-xs text-slate-300">Авторизований зріз по структурі за активними членами громади</p>
        </div>
      </div>

      {/* COMPACT PER-DISTRICT INDEPENDENT REPORT */}
      {selectedRayon && (
        <div className="bg-gradient-to-br from-emerald-950/20 to-teal-950/20 border border-emerald-500/20 rounded-xl p-3 sm:p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center space-x-1.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-xs sm:text-xs font-bold text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                📍 Районний аналітичний зріз:
                <select
                  value={selectedRayon}
                  onChange={(e) => setSelectedRayon(e.target.value)}
                  className="bg-[#244b5a]/40 border border-[#2c5869] text-emerald-400 font-extrabold rounded-md py-0.5 px-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-[10px] sm:text-[11px] uppercase tracking-wider transition-colors outline-none"
                >
                  {uniqueRayons.map(rayon => (
                    <option key={rayon} value={rayon} className="bg-[#1a3843] text-emerald-300 font-bold text-xs uppercase">
                      {rayon}
                    </option>
                  ))}
                </select>
              </h3>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={handleDownloadPDF}
                disabled={isPdfGenerating}
                className="flex items-center gap-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-850 disabled:text-slate-500 text-white px-2.5 py-1 rounded-lg border border-blue-500/30 cursor-pointer shadow-sm transition-colors"
              >
                <FileDown className="h-3 w-3 shrink-0" />
                {isPdfGenerating ? 'PDF...' : 'Завантажити PDF'}
              </button>
              <span className="text-[9px] font-black bg-emerald-900 border border-emerald-700 text-emerald-200 px-2 py-1 rounded-full uppercase tracking-wider">
                {rayonStats.total} активних
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* COLUMN 1 */}
            <div className="md:col-span-6 lg:col-span-3 space-y-3">
              {/* 1. General counts */}
              <div className="bg-[#1a3843]/85 border border-[#204250] rounded-lg p-2.5 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-350 uppercase tracking-widest block mb-1">
                    Загальна кількість членів
                  </span>
                  <div className="flex items-baseline space-x-1.5 mb-2">
                    <span className="text-xl sm:text-xl font-black text-white">{rayonStats.total}</span>
                    <span className="text-[9px] font-semibold text-slate-300">всього в районі</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-white/5">
                  <div className="bg-[#244b5a]/60 rounded p-1.5 border border-[#2c5869]/40">
                    <div className="text-[9px] uppercase font-bold text-sky-300 flex items-center gap-0.5">
                      <User className="h-2.5 w-2.5 text-sky-400" /> Брати
                    </div>
                    <div className="text-sm font-black text-sky-100">{rayonStats.brothers}</div>
                    <div className="text-[9px] text-sky-300 font-medium mt-0.5">
                      {rayonStats.total > 0 ? Math.round((rayonStats.brothers / rayonStats.total) * 100) : 0}%
                    </div>
                  </div>
                  <div className="bg-[#2a4454]/60 rounded p-1.5 border border-[#355468]/40">
                    <div className="text-[9px] uppercase font-bold text-rose-300 flex items-center gap-0.5">
                      <User className="h-2.5 w-2.5 text-rose-400" /> Сестри
                    </div>
                    <div className="text-sm font-black text-rose-100">{rayonStats.sisters}</div>
                    <div className="text-[9px] text-rose-300 font-medium mt-0.5">
                      {rayonStats.total > 0 ? Math.round((rayonStats.sisters / rayonStats.total) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 1b. Райони структури (rayon2) - Kept permanently under general counts! */}
              <div className="bg-[#1a3843]/85 border border-[#204250] rounded-lg p-2.5 shadow-sm space-y-2">
                <span className="text-[9px] font-bold text-slate-350 uppercase tracking-widest block border-b border-white/5 pb-1">
                  Райони структури (rayon2)
                </span>
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-0.5">
                  {rayonStats.area.map(([lbl, val]) => 
                    renderBar(lbl === "" ? "н/д" : lbl, val, rayonStats.total, "bg-emerald-400", true)
                  )}
                  {rayonStats.area.length === 0 && (
                    <div className="py-3 text-center text-[10px] text-slate-400 italic">
                      Немає даних по районах
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 2 */}
            <div className="md:col-span-6 lg:col-span-3 space-y-3">
              {/* 2. Marital Status */}
              <div className="bg-[#1a3843]/85 border border-[#204250] rounded-lg p-2.5 shadow-sm space-y-2">
                <span className="text-[9px] font-bold text-slate-350 uppercase tracking-widest block">
                  Сімейний Стан («Сім. стан»)
                </span>
                <div className="grid grid-cols-2 gap-1 px-0.5 text-[10px]">
                  <div className="flex justify-between items-center bg-[#244b5a]/50 rounded p-1 border border-[#2c5869]/35 w-full">
                    <span className="text-slate-200 shrink-0">одр.</span>
                    <div className="flex-1 border-b border-dotted border-white/10 mx-1.5 self-center h-0.5 opacity-30" />
                    <span className="font-bold text-white shrink-0">{rayonStats.marital.married}</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#244b5a]/50 rounded p-1 border border-[#2c5869]/35 w-full">
                    <span className="text-slate-200 shrink-0">неодр.</span>
                    <div className="flex-1 border-b border-dotted border-white/10 mx-1.5 self-center h-0.5 opacity-30" />
                    <span className="font-bold text-white shrink-0">{rayonStats.marital.single}</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#244b5a]/50 rounded p-1 border border-[#2c5869]/35 w-full">
                    <span className="text-slate-200 font-medium shrink-0">розлуч.</span>
                    <div className="flex-1 border-b border-dotted border-white/10 mx-1.5 self-center h-0.5 opacity-30" />
                    <span className="font-bold text-white shrink-0">{rayonStats.marital.divorced}</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#244b5a]/50 rounded p-1 border border-[#2c5869]/35 w-full">
                    <span className="text-slate-200 font-medium shrink-0">вдво.</span>
                    <div className="flex-1 border-b border-dotted border-white/10 mx-1.5 self-center h-0.5 opacity-30" />
                    <span className="font-bold text-white shrink-0">{rayonStats.marital.widowed}</span>
                  </div>
                  <div className="col-span-2 flex justify-between items-center bg-[#244b5a]/30 rounded py-0.5 px-1.5 border border-dashed border-[#2c5869]/40 text-[9px] w-full">
                    <span className="text-slate-400 italic shrink-0">не вказано (н/д)</span>
                    <div className="flex-1 border-b border-dotted border-white/10 mx-1.5 self-center h-0.5 opacity-20" />
                    <span className="font-bold text-slate-300 shrink-0">{rayonStats.marital.nd}</span>
                  </div>
                </div>
              </div>

              {/* 3. Attendance ("Відвідування") - Placed in Column 2 */}
              <div className="bg-[#1a3843]/85 border border-[#204250] rounded-lg p-2.5 shadow-sm space-y-2">
                <span className="text-[9px] font-bold text-slate-350 uppercase tracking-widest block border-b border-white/5 pb-1">
                  Аналіз Відвідування
                </span>
                <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-0.5">
                  {rayonStats.attendance.map(([lbl, val]) => {
                    const pct = rayonStats.total > 0 ? Math.round((val / rayonStats.total) * 100) : 0;
                    return (
                      <div key={lbl} className="flex items-center justify-between text-[10px] w-full">
                        <span className="text-slate-100 truncate max-w-[130px] shrink-0">{lbl || 'н/д'}</span>
                        <div className="flex-1 border-b border-dotted border-white/15 mx-2 self-center h-0.5 opacity-25" />
                        <span className="font-mono text-[9px] font-bold text-slate-200 shrink-0">
                          {val} <span className="text-slate-400 font-normal">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                  {rayonStats.attendance.length === 0 && (
                    <div className="py-3 text-center text-[10px] text-slate-400 italic">
                      Немає даних відвідуваності
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Reason for absence ("Прич. відсутності") - Placed in Column 2 */}
              <div className="bg-[#1a3843]/85 border border-[#204250] rounded-lg p-2.5 shadow-sm space-y-2">
                <span className="text-[9px] font-bold text-slate-350 uppercase tracking-widest block border-b border-white/5 pb-1">
                  Причини відсутності
                </span>
                <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-0.5">
                  {rayonStats.presence.map(([lbl, val]) => {
                    const pct = rayonStats.total > 0 ? Math.round((val / rayonStats.total) * 100) : 0;
                    return (
                      <div key={lbl} className="flex items-center justify-between text-[10px] w-full">
                        <span className="text-slate-100 truncate max-w-[130px] shrink-0">{lbl}</span>
                        <div className="flex-1 border-b border-dotted border-white/15 mx-2 self-center h-0.5 opacity-25" />
                        <span className="font-mono text-[9px] font-bold text-slate-200 shrink-0">
                          {val} <span className="text-slate-400 font-normal">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                  {rayonStats.presence.length === 0 && (
                    <div className="py-3 text-center text-[10px] text-slate-400 italic">
                      Всі присутні
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 3: Caregivers list - fully visible without scrolling, 2 columns */}
            <div className="md:col-span-12 lg:col-span-6 bg-[#1a3843]/85 border border-[#204250] rounded-lg p-2.5 shadow-sm space-y-2 flex flex-col">
              <div className="border-b border-white/5 pb-1">
                <span className="text-[9px] font-bold text-slate-350 uppercase tracking-widest block">
                  Список Опікунів Району
                </span>
                <span className="text-[8px] text-slate-400 block">Пастирська опіка («Опікун»)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-0.5">
                {rayonStats.caregivers.map(([name, count]) => {
                  const pct = rayonStats.total > 0 ? Math.round((count / rayonStats.total) * 100) : 0;
                  return (
                    <div key={name} className="flex items-center justify-between gap-1.5 text-[10px] bg-[#244b5a]/60 hover:bg-[#2c5869]/60 p-1.5 rounded border border-[#2c5869]/30 transition-colors">
                      <div className="flex items-center space-x-1 min-w-0 flex-1">
                        <User className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                        <span className="font-semibold text-slate-100 break-words leading-tight">{name}</span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <span className="bg-emerald-950 border border-emerald-700/80 text-emerald-300 font-extrabold text-[9px] px-1 py-0.2 rounded">
                          {count}
                        </span>
                        <span className="text-[8px] text-slate-350">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
                {rayonStats.caregivers.length === 0 && (
                  <div className="col-span-full py-4 text-center text-[10px] text-slate-400 italic">
                    Немає призначених опікунів
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid of details charts - 2 columns layout since Districts is moved to selected rayon */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        
        {/* Gender & Marital State */}
        <div className="rounded-lg border border-[#204250] bg-[#1a3843]/80 p-4 shadow-sm space-y-4">
          <div className="border-b border-white/10 pb-2">
            <h3 className="font-display font-bold text-sm text-slate-100">Стать та Сімейний стан</h3>
            <p className="text-[10px] text-slate-350">Співвідношення статей та статус шлюбу церковних родин</p>
          </div>
          
          <div className="space-y-4">
            {/* Gender Ratio */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Статевий розподіл</span>
              <div className="flex h-5 w-full overflow-hidden rounded-lg bg-[#142d36] font-mono text-[10px] font-bold text-white">
                <div 
                  className="flex items-center justify-center bg-sky-600 transition-all duration-300"
                  style={{ width: `${stats.malesCount + stats.femalesCount > 0 ? (stats.malesCount / (stats.malesCount + stats.femalesCount)) * 100 : 50}%` }}
                >
                  Бр ({stats.malesCount})
                </div>
                <div 
                  className="flex items-center justify-center bg-rose-500 transition-all duration-300"
                  style={{ width: `${stats.malesCount + stats.femalesCount > 0 ? (stats.femalesCount / (stats.malesCount + stats.femalesCount)) * 100 : 50}%` }}
                >
                  Сст ({stats.femalesCount})
                </div>
              </div>
            </div>

            {/* Marital status bar chart */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Сімейний Стан</span>
              {Object.entries(stats.maritalStats).map(([lbl, val]) => 
                renderBar(lbl, val, stats.activeMembers, "bg-indigo-400")
              )}
            </div>
          </div>
        </div>

        {/* Education & Social Class Group */}
        <div className="rounded-lg border border-[#204250] bg-[#1a3843]/80 p-4 shadow-sm space-y-4">
          <div className="border-b border-white/10 pb-2">
            <h3 className="font-display font-semibold text-sm text-slate-100">Освіта та Соціальний статус</h3>
            <p className="text-[10px] text-slate-350">Розділ за рівнями навчання та соціальним класом</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Рівень освіти</span>
              <div className="space-y-2">
                {Object.entries(stats.educationStats).map(([lbl, val]) => 
                  renderBar(lbl, val, stats.activeMembers, "bg-violet-400")
                )}
              </div>
            </div>
            
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Соціальна категорія</span>
              <div className="space-y-2">
                {Object.entries(stats.socialStats)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([lbl, val]) => 
                    renderBar(lbl, val, stats.activeMembers, "bg-amber-400")
                  )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Collapsible Total Register Stats Accordion at the very bottom */}
      <div className="border border-[#204250] bg-[#1a3843]/60 rounded-xl overflow-hidden transition-all duration-300">
        <button
          onClick={() => setShowTotalRegisterStats(!showTotalRegisterStats)}
          className="w-full flex items-center justify-between p-4 text-left font-display font-semibold text-xs sm:text-sm text-slate-100 hover:bg-[#204250]/40 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-5 text-emerald-400 shrink-0" />
            <span>Загальна статистика реєстру громади (всі записи, вибули, активні)</span>
          </div>
          {showTotalRegisterStats ? (
            <ChevronUp className="h-4 w-4 text-slate-300 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-300 shrink-0" />
          )}
        </button>
        
        {showTotalRegisterStats && (
          <div className="p-4 border-t border-white/5 bg-[#142d36]/40 animate-slide-up duration-200">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map(c => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-[#204250] bg-[#1a3843]/85 p-3.5 shadow-sm">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{c.title}</span>
                    <div className="font-display text-xl sm:text-2xl font-black text-white">{c.value}</div>
                    <p className="text-[9px] text-slate-300 font-medium">{c.sub}</p>
                  </div>
                  <div className={`rounded-lg border p-1.5 shrink-0 ${c.color}`}>
                    <c.icon className="h-4 w-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
