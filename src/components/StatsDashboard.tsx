import React, { useState, useMemo, useEffect } from 'react';
import { Member, DashboardStats } from '../types';
import { Users, UserCheck, UserMinus, ShieldAlert, MapPin, Heart, HelpCircle, Activity, User, FileDown, ChevronDown, ChevronUp } from 'lucide-react';

interface StatsDashboardProps {
  stats: DashboardStats | null;
  members: Member[];
  lookups?: any;
}

export default function StatsDashboard({ stats, members, lookups }: StatsDashboardProps) {
  // State for District selector
  const [selectedRayon, setSelectedRayon] = useState<string>('');
  const [isHtmlGenerating, setIsHtmlGenerating] = useState<boolean>(false);
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

  const handleDownloadHTML = () => {
    if (!selectedRayon) return;
    setIsHtmlGenerating(true);
    try {
      const isAll = selectedRayon === "Всі райони";
      const totalActive = rayonStats.total;
      const churchTotalActive = members.filter(m => m.id_vybuttya === 0).length;
      const bPct = totalActive > 0 ? Math.round((rayonStats.brothers / totalActive) * 100) : 0;
      const sPct = totalActive > 0 ? Math.round((rayonStats.sisters / totalActive) * 100) : 0;
      const oPct = totalActive > 0 ? Math.round((rayonStats.others / totalActive) * 100) : 0;

      // Extract unique area counts for HTML
      const areaStats: Record<string, number> = {};
      rayonMembers.forEach(m => {
        const key = String(m.rayon2_ukr || '').trim() || 'н/д';
        areaStats[key] = (areaStats[key] || 0) + 1;
      });
      const sortedAreaStats = Object.entries(areaStats).sort((a, b) => b[1] - a[1]);

      // Extract unique education and social statistics for HTML
      const educationStats: Record<string, number> = {};
      const socialStats: Record<string, number> = {};
      rayonMembers.forEach(m => {
        const edu = String(m.osvita || '').trim() || 'н/д';
        educationStats[edu] = (educationStats[edu] || 0) + 1;

        const soc = String(m.soc_status || '').trim() || 'н/д';
        socialStats[soc] = (socialStats[soc] || 0) + 1;
      });
      const sortedEducation = Object.entries(educationStats).sort((a, b) => b[1] - a[1]);
      const sortedSocial = Object.entries(socialStats).sort((a, b) => b[1] - a[1]);

      const reportDate = new Date().toLocaleDateString('uk-UA');
      const reportTime = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

      const htmlContent = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Статистика району: ${selectedRayon}</title>
  <style>
    body {
      margin: 0;
      padding: 40px 20px;
      background: #f1f5f9;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .print-btn-container {
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
    }
    .print-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      transition: background 0.2s;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }
    .container {
      width: 100%;
      max-width: 800px;
      min-height: 1120px;
      background: #f1f5f9;
      padding: 24px 30px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 8px;
    }
    .header-card {
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 6px solid #10b981;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      box-sizing: border-box;
    }
    .header-title {
      font-size: 20px;
      font-weight: 850;
      color: #064e3b;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .header-sub {
      font-size: 14px;
      color: #047857;
      font-weight: 800;
      margin: 4px 0 0 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-status {
      background: #ecfdf5;
      border: 1px solid #059669;
      color: #047857;
      font-size: 9px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 99px;
      text-transform: uppercase;
      display: inline-block;
    }
    .header-date {
      font-size: 9px;
      color: #9ca3af;
      margin: 4px 0 0 0;
      font-weight: 500;
    }
    .upper-grid, .lower-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
      height: auto;
      box-sizing: border-box;
      align-items: stretch;
    }
    .col {
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-sizing: border-box;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      box-sizing: border-box;
    }
    .card-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin: 0 0 10px 0;
      letter-spacing: 0.5px;
    }
    .total-count {
      font-size: 26px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 10px;
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .total-sub {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-left: 4px;
    }
    .progress-bar {
      height: 8px;
      width: 100%;
      background: #e2e8f0;
      border-radius: 99px;
      overflow: hidden;
      display: flex;
      margin-bottom: 10px;
    }
    .progress-segment {
      height: 100%;
    }
    .gender-rows {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .gender-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      padding: 4px 8px;
      border-radius: 6px;
      box-sizing: border-box;
    }
    .gender-row-brothers {
      background: #e0f2fe;
    }
    .gender-row-sisters {
      background: #ffe4e6;
    }
    .district-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      flex: 1;
      max-height: 350px;
    }
    .scroll-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow: visible;
      flex: 1;
      padding-right: 2px;
    }
    .scroll-list::-webkit-scrollbar {
      width: 4px;
    }
    .scroll-list::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 2px;
    }
    .marital-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      box-sizing: border-box;
    }
    .marital-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin: 0 0 8px 0;
      letter-spacing: 0.5px;
    }
    .marital-rows {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .marital-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 3px;
      box-sizing: border-box;
    }
    .marital-row-nd {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      box-sizing: border-box;
    }
    .attendance-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      box-sizing: border-box;
      flex: none;
      height: auto;
      display: flex;
      flex-direction: column;
    }
    .care-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      height: auto;
      margin-bottom: 16px;
    }
    .care-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 12px;
      box-sizing: border-box;
      overflow: visible;
      flex: 1;
      padding-right: 2px;
    }
    .care-grid::-webkit-scrollbar {
      width: 4px;
    }
    .care-grid::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 2px;
    }
    .care-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      padding: 5px 8px;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      box-sizing: border-box;
      min-width: 0;
    }
    .care-badge {
      font-weight: 850;
      background: #10b981;
      color: #ffffff;
      padding: 1.5px 5px;
      border-radius: 8px;
      font-size: 8px;
      display: inline-block;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #64748b;
      font-weight: 500;
      box-sizing: border-box;
      margin-top: auto;
    }
    
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .container {
        border: none !important;
        box-shadow: none !important;
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
        background: #ffffff !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-btn-container no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Друкувати звіт</button>
  </div>
  
  <div class="container">
    <div>
      <!-- Header Card -->
      <div class="header-card">
        <div>
          <h1 class="header-title">⛪ СТАТИСТИЧНИЙ ЗВІТ ПО ЧЛЕНСТВУ ЦЕРКВИ</h1>
          <p class="header-sub">
            ${isAll ? "Узагальнена статистика по всіх районах" : `Звіт по району: ${selectedRayon}`}
          </p>
        </div>
        <div style="text-align: right;">
          <div class="header-status">
            ВСЬОГО ЧЛЕНІВ ЦЕРКВИ ${churchTotalActive}
          </div>
          <p class="header-date">Дата формування: ${reportDate} ${reportTime}</p>
        </div>
      </div>

      <!-- Upper Half Grid (Left Column vs Right Column) -->
      <div class="upper-grid">
        
        <!-- Left Column -->
        <div class="col">
          <!-- ЗАГАЛЬНИЙ РОЗПОДІЛ ЧЛЕНІВ -->
          <div class="card">
            <h3 class="card-title">👥 Загальний розподіл членів</h3>
            <div class="total-count">
              ${totalActive}
              <span class="total-sub">активних осіб</span>
            </div>
            
            <!-- Progress bar split -->
            <div class="progress-bar">
              <div class="progress-segment" style="width: ${bPct}%; background: #0ea5e9;" title="Брати"></div>
              <div class="progress-segment" style="width: ${sPct}%; background: #f43f5e;" title="Сестри"></div>
              <div class="progress-segment" style="width: ${oPct}%; background: #94a3b8;" title="Інші"></div>
            </div>
 
            <div class="gender-rows">
              <div class="gender-row gender-row-brothers">
                <span style="font-weight: 700; color: #0369a1;">👦 Брати</span>
                <span style="font-weight: 800; color: #0369a1;">${rayonStats.brothers} (${bPct}%)</span>
              </div>
              <div class="gender-row gender-row-sisters">
                <span style="font-weight: 700; color: #be123c;">👧 Сестри</span>
                <span style="font-weight: 800; color: #be123c;">${rayonStats.sisters} (${sPct}%)</span>
              </div>
            </div>
          </div>
        </div>
 
        <!-- Right Column -->
        <div class="col" style="gap: 12px;">
 
          <!-- АНАЛІЗ ВІДВІДУВАНОСТІ -->
          <div class="attendance-card">
            <h3 class="card-title">📈 ${isAll ? "Аналіз відвідуваності" : "Аналіз відвідуваності району"}</h3>
            <div class="scroll-list">
              ${rayonStats.attendance.slice(0, 5).map(([lbl, val]) => {
                const pct = totalActive > 0 ? Math.round((val / totalActive) * 100) : 0;
                return `
                  <div style="font-size: 10px; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; font-weight: 700; color: #334155; margin-bottom: 2px;">
                      <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 155px; display: inline-block;">${lbl || "н/д"}</span>
                      <span>${val} (${pct}%)</span>
                    </div>
                    <div style="height: 5px; width: 100%; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
                      <div style="height: 100%; width: ${pct}%; background: #3b82f6; border-radius: 99px;"></div>
                    </div>
                  </div>
                `;
              }).join('') || '<p style="font-size: 10px; color: #94a3b8; font-style: italic; margin: 0;">Дані відсутні</p>'}
            </div>
          </div>
 
          <!-- СІМЕЙНИЙ СТАН -->
          <div class="marital-card">
            <h3 class="marital-title">💍 Сімейний Стан</h3>
            <div class="marital-rows">
              <div class="marital-row">
                <span style="font-weight: 600; color: #334155;">одружені</span>
                <span style="font-weight: 700; color: #0f172a;">${rayonStats.marital.married}</span>
              </div>
              <div class="marital-row">
                <span style="font-weight: 600; color: #334155;">неодружені</span>
                <span style="font-weight: 700; color: #0f172a;">${rayonStats.marital.single}</span>
              </div>
              <div class="marital-row">
                <span style="font-weight: 600; color: #334155;">розлучені</span>
                <span style="font-weight: 700; color: #0f172a;">${rayonStats.marital.divorced}</span>
              </div>
              <div class="marital-row">
                <span style="font-weight: 600; color: #334155;">вдова/вдівець</span>
                <span style="font-weight: 700; color: #0f172a;">${rayonStats.marital.widowed}</span>
              </div>
              <div class="marital-row-nd">
                <span style="font-weight: 550; color: #94a3b8; font-style: italic;">не вказано</span>
                <span style="font-weight: 700; color: #64748b;">${rayonStats.marital.nd}</span>
              </div>
            </div>
          </div>
 
          <!-- ПРИЧИНИ ВІДСУТНОСТІ -->
          <div class="attendance-card">
            <h3 class="card-title">📌 ${isAll ? "Причини відсутності" : "Причини відсутності району"}</h3>
            <div class="scroll-list">
              ${rayonStats.presence.slice(0, 5).map(([lbl, val]) => {
                const pct = totalActive > 0 ? Math.round((val / totalActive) * 100) : 0;
                return `
                  <div style="font-size: 10px; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; font-weight: 700; color: #334155; margin-bottom: 2px;">
                      <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 155px; display: inline-block;">${lbl}</span>
                      <span>${val} (${pct}%)</span>
                    </div>
                    <div style="height: 5px; width: 100%; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
                      <div style="height: 100%; width: ${pct}%; background: #f59e0b; border-radius: 99px;"></div>
                    </div>
                  </div>
                `;
              }).join('') || '<p style="font-size: 10px; color: #64748b; font-style: italic; margin: 0;">Всі присутні</p>'}
            </div>
          </div>
        </div>
 
      </div>
 
      <!-- Lower Grid (Distribution of Care & Education/Social status side by side) -->
      <div class="lower-grid">
        <!-- РОЗПОДІЛ ОПІКИ (Об'єднані блоки Райони Структури та Опікуни) -->
        <div class="care-card" style="margin-bottom: 0;">
          <div style="box-sizing: border-box;">
            
            <!-- Райони структури -->
            <div style="margin-bottom: 12px;">
              <h4 style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.5px;">📍 Райони структури</h4>
              <div class="scroll-list" style="overflow: visible;">
                ${sortedAreaStats.map(([lbl, val]) => {
                  const pct = totalActive > 0 ? Math.round((val / totalActive) * 100) : 0;
                  return `
                    <div style="font-size: 10px; box-sizing: border-box; margin-bottom: 4px;">
                      <div style="display: flex; justify-content: space-between; font-weight: 700; color: #334155; margin-bottom: 1px;">
                        <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 150px; display: inline-block;">${lbl || "н/д"}</span>
                        <span>${val} (${pct}%)</span>
                      </div>
                      <div style="height: 5px; width: 100%; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
                        <div style="height: 100%; width: ${pct}%; background: #10b981; border-radius: 99px;"></div>
                      </div>
                    </div>
                  `;
                }).join('') || '<p style="font-size: 10px; color: #94a3b8; font-style: italic; margin: 0;">Дані відсутні</p>'}
              </div>
            </div>
 
            <!-- Список опікунів -->
            <div style="border-top: 1px solid #cbd5e1; padding-top: 12px; margin-top: 12px;">
              <h4 style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.5px;">👤 Список опікунів</h4>
              <div class="care-grid" style="display: grid; grid-template-columns: 1fr; gap: 6px;">
                ${rayonStats.caregivers.map(([name, count]) => {
                  const pct = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;
                  return `
                    <div class="care-item" style="margin-bottom: 0;">
                      <span style="font-weight: 700; color: #1e293b; display: inline-block; word-break: break-all; line-height: 1.1; margin-right: 4px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 140px;">${name}</span>
                      <span class="care-badge">
                        ${count} (${pct}%)
                      </span>
                    </div>
                  `;
                }).join('') || '<p style="font-size: 10px; color: #94a3b8; font-style: italic; margin: 0;">Опікунів не знайдено</p>'}
              </div>
            </div>
 
          </div>
        </div>
 
        <!-- ОСВІТА ТА СОЦІАЛЬНИЙ СТАТУС -->
        <div class="attendance-card" style="margin-top: 0; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; box-sizing: border-box; height: auto;">
          <h3 class="card-title" style="font-size: 11px; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">🎓 ОСВІТА ТА СОЦІАЛЬНИЙ СТАТУС</h3>
          
          <!-- Рівень освіти -->
          <div style="margin-bottom: 12px;">
            <h4 style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.5px;">🎓 Рівень освіти</h4>
            <div class="scroll-list" style="overflow: visible;">
              ${sortedEducation.map(([lbl, val]) => {
                const pct = totalActive > 0 ? Math.round((val / totalActive) * 100) : 0;
                return `
                  <div style="font-size: 10px; box-sizing: border-box; margin-bottom: 4px;">
                    <div style="display: flex; justify-content: space-between; font-weight: 700; color: #334155; margin-bottom: 1px;">
                      <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 150px; display: inline-block;">${lbl || "н/д"}</span>
                      <span>${val} (${pct}%)</span>
                    </div>
                    <div style="height: 5px; width: 100%; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
                      <div style="height: 100%; width: ${pct}%; background: #a78bfa; border-radius: 99px;"></div>
                    </div>
                  </div>
                `;
              }).join('') || '<p style="font-size: 10px; color: #94a3b8; font-style: italic; margin: 0;">Дані відсутні</p>'}
            </div>
          </div>
 
          <!-- Соціальна категорія -->
          <div style="border-top: 1px solid #cbd5e1; padding-top: 12px; margin-top: 12px;">
            <h4 style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.5px;">💼 Соціальна категорія</h4>
            <div class="scroll-list" style="overflow: visible;">
              ${sortedSocial.map(([lbl, val]) => {
                const pct = totalActive > 0 ? Math.round((val / totalActive) * 100) : 0;
                return `
                  <div style="font-size: 10px; box-sizing: border-box; margin-bottom: 4px;">
                    <div style="display: flex; justify-content: space-between; font-weight: 700; color: #334155; margin-bottom: 1px;">
                      <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 150px; display: inline-block;">${lbl || "н/д"}</span>
                      <span>${val} (${pct}%)</span>
                    </div>
                    <div style="height: 5px; width: 100%; background: #e2e8f0; border-radius: 99px; overflow: hidden;">
                      <div style="height: 100%; width: ${pct}%; background: #fbbf24; border-radius: 99px;"></div>
                    </div>
                  </div>
                `;
              }).join('') || '<p style="font-size: 10px; color: #94a3b8; font-style: italic; margin: 0;">Дані відсутні</p>'}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <span>Звіт згенеровано автоматично з Системи Реєстру Громади. Для внутрішнього користування.</span>
      <span style="font-weight: 700; color: #10b981;">Церква ЄХБ «Христа Спасителя»</span>
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const filename = `Statystyka_Rayonu_${selectedRayon.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("HTML generation failed:", error);
      alert("Не вдалося завантажити HTML звіт. Будь ласка, спробуйте ще раз.");
    } finally {
      setIsHtmlGenerating(false);
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
          <h2 className="font-display text-xl font-bold tracking-tight text-white animate-fade-in">Статистика по членству церкви</h2>
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
                <select
                  value={selectedRayon}
                  onChange={(e) => setSelectedRayon(e.target.value)}
                  className="bg-[#244b5a]/40 border border-[#2c5869] text-emerald-400 font-black rounded-lg py-1 px-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer text-xs sm:text-sm md:text-base uppercase tracking-wider transition-all outline-none"
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
                onClick={handleDownloadHTML}
                disabled={isHtmlGenerating}
                className="flex items-center gap-1 text-[10px] font-bold bg-[#10b981] hover:bg-[#0d9488] disabled:bg-slate-850 disabled:text-slate-500 text-white px-2.5 py-1 rounded-lg border border-emerald-500/30 cursor-pointer shadow-sm transition-colors"
              >
                <FileDown className="h-3 w-3 shrink-0" />
                {isHtmlGenerating ? 'HTML...' : 'Завантажити HTML'}
              </button>
              <span className="text-[9px] font-black bg-emerald-900 border border-emerald-700 text-emerald-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {rayonStats.total} ВСЬОГО ЧЛЕНІВ
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* LEFT SIDE: GENERAL, ATTENDANCE & REASON FOR ABSENCE */}
            <div className="md:col-span-12 lg:col-span-6 space-y-3 flex flex-col">
              {/* 1. General counts - Single Row */}
              <div className="bg-[#1a3843]/85 border border-[#204250] rounded-lg p-2.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[9px] font-bold text-slate-350 uppercase tracking-widest whitespace-nowrap">
                    Загальна кількість членів
                  </span>
                  <span className="text-lg font-black text-white">{rayonStats.total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-[#244b5a]/60 rounded px-2 py-1 border border-[#2c5869]/40 flex items-center space-x-1.5 flex-1 sm:flex-none justify-center">
                    <span className="text-[9px] uppercase font-bold text-sky-300 flex items-center gap-0.5 whitespace-nowrap">
                      <User className="h-2.5 w-2.5 text-sky-400" /> Брати
                    </span>
                    <span className="text-xs font-black text-sky-100">{rayonStats.brothers}</span>
                    <span className="text-[9px] text-sky-300 font-medium font-mono">
                      ({rayonStats.total > 0 ? Math.round((rayonStats.brothers / rayonStats.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="bg-[#2a4454]/60 rounded px-2 py-1 border border-[#355468]/40 flex items-center space-x-1.5 flex-1 sm:flex-none justify-center">
                    <span className="text-[9px] uppercase font-bold text-rose-300 flex items-center gap-0.5 whitespace-nowrap">
                      <User className="h-2.5 w-2.5 text-rose-400" /> Сестри
                    </span>
                    <span className="text-xs font-black text-rose-100">{rayonStats.sisters}</span>
                    <span className="text-[9px] text-rose-300 font-medium font-mono">
                      ({rayonStats.total > 0 ? Math.round((rayonStats.sisters / rayonStats.total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Horizontal sequence: Attendance and Reason for absence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 2. Attendance ("Відвідування") */}
                <div className="bg-[#1a3843]/85 border border-[#204250] rounded-lg p-2.5 shadow-sm space-y-2 h-fit">
                  <div>
                    <span className="text-[9px] font-bold text-slate-350 uppercase tracking-widest block border-b border-white/5 pb-1">
                      Аналіз Відвідування
                    </span>
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5 mt-1.5">
                      {rayonStats.attendance.map(([lbl, val]) => 
                        renderBar(lbl || 'н/д', val, rayonStats.total, "bg-blue-400", true)
                      )}
                      {rayonStats.attendance.length === 0 && (
                        <div className="py-3 text-center text-[10px] text-slate-400 italic">
                          Немає даних відвідуваності
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Reason for absence ("Прич. відсутності") */}
                <div className="bg-[#1a3843]/85 border border-[#204250] rounded-lg p-2.5 shadow-sm space-y-2 h-fit">
                  <div>
                    <span className="text-[9px] font-bold text-slate-350 uppercase tracking-widest block border-b border-white/5 pb-1">
                      Причини відсутності
                    </span>
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5 mt-1.5">
                      {rayonStats.presence.map(([lbl, val]) => 
                        renderBar(lbl, val, rayonStats.total, "bg-red-400", true)
                      )}
                      {rayonStats.presence.length === 0 && (
                        <div className="py-3 text-center text-[10px] text-slate-400 italic">
                          Всі присутні
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Added Marital Status and Education Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div className="bg-[#1a3843]/85 border border-[#204250] rounded-lg p-2.5 shadow-sm space-y-2 h-fit">
                    <span className="text-[9px] font-bold text-slate-350 uppercase tracking-widest block border-b border-white/5 pb-1">Сімейний стан</span>
                    <div className="space-y-1 mt-1.5 text-[10px]">
                      {Object.entries(rayonStats.marital).map(([label, value]) =>
                         renderBar(label, value as number, Object.values(rayonStats.marital as Record<string, number>).reduce((acc: number, curr: number) => acc + curr, 0), "bg-indigo-400", true)
                      )}
                    </div>
                 </div>
                 
                 <div className="bg-[#1a3843]/85 border border-[#204250] rounded-lg p-2.5 shadow-sm space-y-2 h-fit">
                    <span className="text-[9px] font-bold text-slate-350 uppercase tracking-widest block border-b border-white/5 pb-1">Освіта та Соц. статус</span>
                    <div className="space-y-3 mt-1.5">
                      <div className="space-y-1">
                         <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Рівень освіти</span>
                         {Object.entries(stats.educationStats).map(([lbl, val]) => 
                            renderBar(lbl, val, stats.activeMembers, "bg-violet-400")
                         )}
                      </div>
                      <div className="space-y-1 pt-1">
                         <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Соціальна категорія</span>
                         {Object.entries(stats.socialStats)
                           .sort((a, b) => b[1] - a[1])
                           .slice(0, 4)
                           .map(([lbl, val]) => 
                             renderBar(lbl, val, stats.activeMembers, "bg-amber-400")
                           )
                         }
                      </div>
                    </div>
                 </div>
              </div>
            </div>

            {/* COLUMN 3: РОЗПОДІЛ ОПІКИ */}
            <div className="md:col-span-12 lg:col-span-6 bg-[#1a3843]/85 border border-[#204250] rounded-lg p-2.5 shadow-sm space-y-3 flex flex-col">
              
              <div className="space-y-4">
                {/* Top side: Райони структури */}
                <div className="space-y-2">
                  <span className="text-[8px] font-bold text-slate-350 uppercase tracking-wider block">📍 Райони структури</span>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-0.5">
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

                {/* Bottom side: Список опікунів */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[8px] font-bold text-slate-350 uppercase tracking-wider block">👤 Список опікунів</span>
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
          </div>
        </div>
      )}

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
