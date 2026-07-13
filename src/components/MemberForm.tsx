import React, { useState, useEffect } from 'react';
import { Member } from '../types';
import { Save, X, Info } from 'lucide-react';

const parseAddress = (addressStr: string | undefined | null) => {
  const result = {
    nas_punkt: '',
    vulitsya: '',
    budynok: '',
    korpus: '',
    kvartyra: ''
  };

  if (!addressStr) return result;

  const str = String(addressStr).trim();
  const parts = str.split(',').map(p => p.trim());

  if (parts.length === 0) return result;

  let currentPartIndex = 0;

  // 1. Parse nas_punkt if the first part looks like city/village or contains typical prefixes
  const first = parts[0];
  if (/^(м\.|с\.|смт)\s+/i.test(first) || first.toLowerCase().includes('івано-франківськ')) {
    result.nas_punkt = first;
    currentPartIndex++;
  }

  // 2. Parse street (vulitsya)
  if (currentPartIndex < parts.length) {
    const second = parts[currentPartIndex];
    result.vulitsya = second;
    currentPartIndex++;
  }

  // 3. Parse house/building/apartment from remaining parts
  for (let i = currentPartIndex; i < parts.length; i++) {
    const p = parts[i];
    const pLower = p.toLowerCase();
    
    // Check for kvartyra
    if (pLower.startsWith('кв.') || pLower.includes('кв. ')) {
      result.kvartyra = p.replace(/кв\.\s*/i, '').trim();
    }
    // Check for korpus
    else if (pLower.includes('корп.')) {
      const korpMatch = p.match(/корп\.\s*(.+)/i);
      if (korpMatch) {
        result.korpus = korpMatch[1].trim();
      }
      const budMatch = p.match(/^([^\s]+)\s+корп\./i);
      if (budMatch) {
        result.budynok = budMatch[1].trim();
      }
    }
    // Else it might be budynok
    else {
      result.budynok = p.replace(/буд\.\s*/i, '').trim();
    }
  }

  return result;
};

interface MemberFormProps {
  member: Member | null; // null for adding new member
  lookups: any;
  onSave: (data: Partial<Member>) => void;
  onCancel: () => void;
  isRestricted?: boolean;
}

export default function MemberForm({ member, lookups, onSave, onCancel, isRestricted }: MemberFormProps) {
  const isEdit = !!member;
  
  // ... (rest of code)
  
  // Apply disabled={!!isRestricted} to all inputs/selects/textareas
  // For example:
  // <input disabled={!!isRestricted} ... />
  // <select disabled={!!isRestricted} ... />
  // <textarea disabled={!!isRestricted} ... />

  // Get level number
  const levelNum = (() => {
    try {
      const cached = localStorage.getItem("baza_current_session_user");
      if (cached) {
        const sessionUser = JSON.parse(cached);
        if (sessionUser) {
          const lvl = sessionUser.level || 'І-й';
          const s = lvl.toUpperCase();
          if (s.includes('IV') || s.includes('ІV') || s.includes('4')) return 4;
          if (s.includes('III') || s.includes('ІІІ') || s.includes('3')) return 3;
          if (s.includes('II') || s.includes('ІІ') || s.includes('2')) return 2;
          return 1;
        }
      }
    } catch (_) {}
    return 1;
  })();

  // Get locked rayon for Level <= 3
  const hasSpecificRayonLock = (() => {
    try {
      const cached = localStorage.getItem("baza_current_session_user");
      if (cached) {
        const sessionUser = JSON.parse(cached);
        if (sessionUser) {
          const sessionUserRayon = sessionUser.rayon;
          if (levelNum <= 3 && sessionUserRayon && sessionUserRayon !== 'ВСІ' && sessionUserRayon !== 'ВСЕ' && sessionUserRayon !== 'ВСІ РАЙОНИ' && sessionUserRayon !== '') {
            return sessionUserRayon;
          }
        }
      }
    } catch (_) {}
    return null;
  })();
  
  const [formData, setFormData] = useState<Partial<Member>>({
    pib: '',
    stat: 'брат',
    id_simeyniy: 5,
    s_simeyniy_ukr: 'н/д',
    id_socialniy: 6,
    s_socialniy_ukr: 'н/д',
    id_osvita: 4,
    s_osvita_ukr: 'н/д',
    id_profesiya: 41,
    s_profesiya_ukr: 'н/д',
    sluj_uchast: '',
    zaklad_osv: '',
    tel_mob: '',
    tel1: '',
    skype: '',
    d_narodjennya: '',
    email: '',
    presviter: '',
    rayon2_ukr: hasSpecificRayonLock || '',
    id_rayon2: '',
    n_dilyci: '',
    id_dilnicya: '',
    vidpov_grupy: '',
    d_vodnogo: '',
    hsd: false,
    d_vstupu: '',
    vidviduvanist: '',
    prysutnist: '',
    discipline: '',
    discipline_reason: '',
    discipline_date_start: '',
    discipline_date_end: '',
    di_admin: '',
    id_vybuttya: 0,
    s_vybuv_ukr: '',
    vybutty_prymitka: '',
    hvoryi: '',
    insha_gromada: '',
    prymitka: '',
    nas_punkt: '',
    vulitsya: '',
    budynok: '',
    korpus: '',
    kvartyra: '',
    d_shlyubu: '',
    pib_partnera: '',
    dity: ''
  });

  useEffect(() => {
    if (member) {
      const parsed = parseAddress(member.address);
      setFormData({
        ...member,
        gender: member.gender || member.stat || 'брат',
        stat: member.gender || member.stat || 'брат',
        id_dilnytsia: member.id_dilnytsia !== undefined ? member.id_dilnytsia : (member.id_dilnicya || ''),
        id_dilnicya: member.id_dilnytsia !== undefined ? member.id_dilnytsia : (member.id_dilnicya || ''),
        prymitka: member.prymitka || (member as any).primitka || '',
        nas_punkt: member.nas_punkt || parsed.nas_punkt,
        vulitsya: member.vulitsya || parsed.vulitsya,
        budynok: member.budynok || parsed.budynok,
        korpus: member.korpus || parsed.korpus,
        kvartyra: member.kvartyra || parsed.kvartyra,
        d_shlyubu: (member as any).d_shlyubu || '',
        pib_partnera: (member as any).pib_partnera || '',
        dity: (member as any).dity || '',
        sluj_uchast: member.sluj_uchast || '',
        discipline: member.discipline || '',
        discipline_reason: member.discipline_reason || '',
        discipline_date_start: member.discipline_date_start || '',
        discipline_date_end: member.discipline_date_end || ''
      });
    } else if (hasSpecificRayonLock) {
      setFormData(prev => ({
        ...prev,
        rayon2_ukr: hasSpecificRayonLock,
        nas_punkt: '',
        vulitsya: '',
        budynok: '',
        korpus: '',
        kvartyra: '',
        d_shlyubu: '',
        pib_partnera: '',
        dity: '',
        sluj_uchast: ''
      }));
    }
  }, [member, hasSpecificRayonLock]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let checked = false;
    if (e.target instanceof HTMLInputElement && type === 'checkbox') {
      checked = e.target.checked;
    }

    setFormData(prev => {
      const updated = { ...prev };
      
      if (type === 'checkbox') {
        (updated as any)[name] = checked;
      } else {
        (updated as any)[name] = value;
      }

      // Auto compile address if any address parts change
      if (['nas_punkt', 'vulitsya', 'budynok', 'korpus', 'kvartyra'].includes(name)) {
        const nas = name === 'nas_punkt' ? value : (prev.nas_punkt || '');
        const vul = name === 'vulitsya' ? value : (prev.vulitsya || '');
        const bud = name === 'budynok' ? value : (prev.budynok || '');
        const korp = name === 'korpus' ? value : (prev.korpus || '');
        const kv = name === 'kvartyra' ? value : (prev.kvartyra || '');

        const parts = [];
        if (nas.trim()) parts.push(nas.trim());
        if (vul.trim()) parts.push(vul.trim());
        
        let bPart = '';
        if (bud.trim()) bPart += bud.trim();
        if (korp.trim()) bPart += ` корп. ${korp.trim()}`;
        if (bPart) parts.push(bPart);
        
        if (kv.trim()) parts.push(`кв. ${kv.trim()}`);
        
        updated.address = parts.join(', ');
      }

      if (name === 'pib') {
        const pibVal = value.trim();
        const parts = pibVal.split(/\s+/).filter(Boolean);
        if (parts.length >= 3) {
          const patronymic = parts[2].toLowerCase();
          if (patronymic.endsWith('на') || patronymic.endsWith('ва')) {
            updated.gender = 'сестра';
            updated.stat = 'сестра';
          } else if (patronymic.endsWith('ич')) {
            updated.gender = 'брат';
            updated.stat = 'брат';
          }
        } else if (parts.length >= 2) {
          const secondWord = parts[1].toLowerCase();
          if (secondWord.endsWith('на') || secondWord.endsWith('ва')) {
            updated.gender = 'сестра';
            updated.stat = 'сестра';
          } else if (secondWord.endsWith('ич')) {
            updated.gender = 'брат';
            updated.stat = 'брат';
          }
        }
      }

      // Sync lookup labels if ID changes
      if (name === 'id_simeyniy' && lookups?.simeyniy) {
        const idNum = Number(value);
        const item = lookups.simeyniy.find((i: any) => Number(i.ID) === idNum);
        updated.s_simeyniy_ukr = item ? item.Value : 'н/д';
      }
      if (name === 'id_socialniy' && lookups?.socialniy) {
        const idNum = Number(value);
        const item = lookups.socialniy.find((i: any) => Number(i.ID) === idNum);
        updated.s_socialniy_ukr = item ? item.Value : 'н/д';
      }
      if (name === 'id_osvita' && lookups?.osvita) {
        const idNum = Number(value);
        const item = lookups.osvita.find((i: any) => Number(i.ID) === idNum);
        updated.s_osvita_ukr = item ? item.Value : 'н/д';
      }
      if (name === 'id_profesiya' && lookups?.profesiya) {
        const idNum = Number(value);
        const item = lookups.profesiya.find((i: any) => Number(i.ID) === idNum);
        updated.s_profesiya_ukr = item ? item.Value : 'н/д';
      }
      if (name === 'id_vybuttya' && lookups?.vybuv) {
        const idNum = Number(value);
        const item = lookups.vybuv.find((i: any) => Number(i.ID) === idNum);
        updated.s_vybuv_ukr = item ? item.Value : '';
        if (idNum === 0) {
          updated.vybutty_prymitka = '';
        }
      }

      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pib || formData.pib.trim() === "") {
      alert("ПІБ є обов'язковим для заповнення!");
      return;
    }
    onSave(formData);
  };

  // Pre-compiled list of standard church structural areas to clean up data entry
  const STRUCTURAL_AREAS = (() => {
    const rawAreas = (lookups?.directories?.rayon2 || [
      "ЦЕНТР",
      "АЕРОПОРТ",
      "КАСКАД",
      "ОБ'ЇЗНА",
      "ПОЗИТРОН",
      "БАМ",
      "МИКИТИНЦІ",
      "КРИХІВЦІ",
      "ХРИПЛИН",
      "УГОРНИКИ",
      "ВОВЧИНЕЦЬ",
      "ПАСІЧНА",
      "ДІБРОВА"
    ]).filter((a: string) => a && a.trim() !== "" && a.trim().toUpperCase() !== "ВСІ РАЙОНИ" && a.trim().toUpperCase() !== "ВСІ" && a.trim().toUpperCase() !== "ВСЕ");
    const customOrder = ["АЕРОПОРТ", "КАСКАД", "ОБ'ЇЗНА", "ЦЕНТР"];
    return [...rawAreas].sort((a, b) => {
      const idxA = customOrder.indexOf(a.trim().toUpperCase());
      const idxB = customOrder.indexOf(b.trim().toUpperCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  })();

  const caregiversList = (lookups?.directories?.opika || [
    "Бевзюк В.", "Бурчак Ю.", "Галюк Б.", "Дмитраш М.", "Євстратов О.", 
    "Ільницький О.", "Луцак М.", "Марунчак В.", "Мельничук В.", "Несен Ю.", 
    "Прохніцький Б.", "Решетило Р.", "Самелюк О.", "Скіцко І.", "Скриник М.", 
    "Стасінчук В.", "Стафіїв М.", "Стефурак Д.", "Факас О.", "Черняк Вал.", 
    "Черняк Вікт.", "Шегда П.", "Шпарман Ю.", "Черняк Вас."
  ]).sort((a, b) => a.localeCompare(b, 'uk-UA'));

  const vidviduvanistOptions = [
    "Постійно", "Періодично", "Рідко", "Ніколи"
  ];

  const prysutnistOptions = lookups?.directories?.prysutnist || [
    "За кордоном", "ЗСУ", "Не ходить", "Немічний"
  ];

  const diAdminOptions = lookups?.directories?.di_admin || [
    "перевести на КАСКАД", "перевести на АЕРОПОРТ", "перевести на ЦЕНТР", "перевести на ОБ'ЇЗНУ"
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

  const PARTICIPATION_MINISTRIES = [
    "ГОСПОДАРСЬКЕ",
    "ГРУПА ПОРЯДКУ",
    "ДИТЯЧЕ",
    "ЄВАНГЕЛІЗАЦІЙНЕ",
    "ЖІНОЧЕ",
    "МЕДІА",
    "МИЛОСЕРДЯ",
    "МОЛИТОВНЕ",
    "МОЛОДІЖНЕ",
    "МУЗИЧНЕ",
    "ПРОПВІДІ",
    "СОЦІАЛЬНЕ"
  ];

  const skypeString = formData.skype || '';
  const hasEfile = !!formData.efile;
  const efileValue = typeof formData.efile === 'string' ? formData.efile : '';
  let currentLabel = 'Telegram';
  let currentHandle = skypeString;
  for (const l of ['Telegram', 'Viber', 'WhatsApp', 'Skype', 'Інше']) {
    if (skypeString.startsWith(l + ': ')) {
      currentLabel = l;
      currentHandle = skypeString.substring(l.length + 2);
      break;
    }
  }

  const handleMessengerLabelChange = (lbl: string) => {
    const newSkype = lbl + ': ' + currentHandle;
    setFormData(prev => ({ ...prev, skype: newSkype }));
  };

  const handleMessengerHandleChange = (val: string) => {
    const newSkype = currentLabel + ': ' + val;
    setFormData(prev => ({ ...prev, skype: newSkype }));
  };

  return (
    <form id="member_edit_form" onSubmit={handleSubmit} className="space-y-6">
      
      {/* Title & Actions bar */}
      <div className="flex items-center justify-between border-b border-[#333333] pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            {isEdit ? "Редагування профайлу члена церкви" : "Реєстрація нового члена церкви"}
          </h2>
          <p className="text-xs text-slate-400">
            {isEdit ? `ID запису: ${formData.id}` : "Заповніть анкетні дані відповідно до паперового архіву"}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center space-x-2 rounded-lg border border-[#333333] bg-[#262626] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#333333] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
            <span>Скасувати</span>
          </button>
          <button
            type="submit"
            className="flex items-center space-x-2 rounded-lg bg-[#387d7a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2c6361] shadow-sm transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Зберегти зміни</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        
        {/* SECTION 1: Personal info */}
        <div className="space-y-4 rounded-xl border border-[#333333] bg-[#1a1a1a] p-5 shadow-sm text-slate-100">
          <h3 className="text-sm font-bold text-[#387d7a] uppercase tracking-wider">1. ПЕРСОНАЛЬНІ ДАНІ</h3>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Повне ПІБ *</label>
            <input
              type="text"
              name="pib"
              disabled={!!isRestricted}
              value={formData.pib || ''}
              onChange={handleChange}
              placeholder="не вказ."
              className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300 mb-1">Дата народж.</label>
            <input
              type="date"
              name="d_narodjennya"
              disabled={!!isRestricted}
              value={formData.d_narodjennya || ''}
              onChange={handleChange}
              placeholder="дд.мм.рррр"
              className={`w-max rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4 ${!formData.d_narodjennya ? 'text-slate-400 font-normal' : 'text-white'}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">№ тел.</label>
              <input
                type="text"
                name="tel_mob"
                disabled={!!isRestricted}
                value={formData.tel_mob || ''}
                onChange={handleChange}
                placeholder="не вказ."
                className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">Дод. тел.</label>
              <input
                type="text"
                name="tel1"
                disabled={!!isRestricted}
                value={formData.tel1 || ''}
                onChange={handleChange}
                placeholder="не вказ."
                className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">E-mail</label>
              <input
                type="email"
                name="email"
                disabled={!!isRestricted}
                value={formData.email || ''}
                onChange={handleChange}
                placeholder="не вказ."
                className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">Месенджери</label>
              <div className="flex gap-1.5">
                <select
                  value={currentLabel}
                  onChange={(e) => handleMessengerLabelChange(e.target.value)}
                  disabled={!!isRestricted}
                  className="w-1/3 rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                >
                  <option value="Telegram">Telegram</option>
                  <option value="Viber">Viber</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Skype">Skype</option>
                  <option value="Інше">Інше</option>
                </select>
                <input
                  type="text"
                  value={currentHandle}
                  onChange={(e) => handleMessengerHandleChange(e.target.value)}
                  disabled={!!isRestricted}
                  placeholder="не вказ."
                  className="w-2/3 rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                />
              </div>
            </div>
          </div>
          
          
          {/* Marital status block - ANKETA style */}
          <div className="rounded-xl border border-[#333333] p-4 bg-[#1a1a1a] shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-[#333333] pb-2 flex items-center space-x-1.5">
              <span>Сім'я</span>
            </h4>
            {(() => {
              const simeyniyLookup = lookups?.simeyniy?.find((s: any) => String(s.ID) === String(formData.id_simeyniy));
              const statusStr = String(simeyniyLookup?.Value || formData.s_simeyniy_ukr || '').toLowerCase();
              const hasSimeyniy = statusStr && 
                statusStr !== 'не вказ.' && 
                statusStr !== 'н/д' && 
                !statusStr.includes('не вказ') && 
                !statusStr.includes('н/д') &&
                formData.id_simeyniy !== 0 &&
                String(formData.id_simeyniy) !== '0' &&
                String(formData.id_simeyniy) !== '5';
              const isMarried = hasSimeyniy && (statusStr.includes('одруж') || statusStr.includes('заміж') || statusStr.includes('одр')) && !statusStr.includes('неодр');
              const isNotUnmarried = hasSimeyniy && !statusStr.includes('неодр');
              
              return (
                <div className="space-y-4">
                  <div className={isMarried ? "grid grid-cols-2 gap-4" : "w-full"}>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-300 mb-1">Сім. стан</label>
                      <select
                        name="id_simeyniy"
                        disabled={!!isRestricted}
                        value={formData.id_simeyniy || ''}
                        onChange={handleChange}
                        className={`w-32 rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4 ${(!formData.id_simeyniy || formData.id_simeyniy === 0 || String(formData.id_simeyniy) === '0' || String(formData.id_simeyniy) === '5') ? 'text-slate-400 font-normal' : 'text-white'}`}
                      >
                        <option value="" className="text-slate-400">не вказ.</option>
                        {lookups?.simeyniy
                          ?.filter((s: any) => s.Value !== 'н/д')
                          .map((s: any) => (
                            <option key={s.ID} value={s.ID} className="text-white font-semibold">{s.Value}</option>
                          ))}
                      </select>
                    </div>

                    {isMarried && (
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-300 mb-1">Дата шлюбу</label>
                        <input
                          type="date"
                          name="d_shlyubu"
                          disabled={!!isRestricted}
                          value={formData.d_shlyubu || ''}
                          onChange={handleChange}
                          placeholder="дд.мм.рррр"
                          className={`w-max rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4 ${!formData.d_shlyubu ? 'text-slate-400 font-normal' : 'text-white'}`}
                        />
                      </div>
                    )}
                    {isMarried && (
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-300 mb-1">К-ть років</label>
                        <div className="w-max rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-xs font-semibold text-white">
                          {(() => {
                            if (!formData.d_shlyubu) return '---';
                            const birthDate = new Date(formData.d_shlyubu);
                            const today = new Date();
                            let years = today.getFullYear() - birthDate.getFullYear();
                            const monthDiff = today.getMonth() - birthDate.getMonth();
                            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                              years--;
                            }
                            return years >= 0 ? years : 0;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {isMarried && (
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-300 mb-1">ПІБ партнера</label>
                      <input
                        type="text"
                        name="pib_partnera"
                        disabled={!!isRestricted}
                        value={formData.pib_partnera || ''}
                        onChange={handleChange}
                        placeholder="не вказ."
                        className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                      />
                    </div>
                  )}
                  {isNotUnmarried && (
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-300 mb-1">Діти</label>
                      <input
                        type="text"
                        name="dity"
                        disabled={!!isRestricted}
                        value={formData.dity || ''}
                        onChange={handleChange}
                        placeholder="не вказ."
                        className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                      />
                    </div>
                  )}
                </div>
              );
            })()}
            
          </div>

          {/* Address fields */}
          <div className="rounded-xl border border-[#333333] p-4 bg-[#1a1a1a] shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-[#333333] pb-2 flex items-center space-x-1.5">
              <span>Адреса</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">Нас. пункт</label>
                <input
                  type="text"
                  name="nas_punkt"
                  disabled={!!isRestricted}
                  value={formData.nas_punkt || ''}
                  onChange={handleChange}
                  placeholder="не вказ."
                  className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">Вулиця</label>
                <input
                  type="text"
                  name="vulitsya"
                  disabled={!!isRestricted}
                  value={formData.vulitsya || ''}
                  onChange={handleChange}
                  placeholder="не вказ."
                  className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">Буд.</label>
                <input
                  type="text"
                  name="budynok"
                  disabled={!!isRestricted}
                  value={formData.budynok || ''}
                  onChange={handleChange}
                  placeholder="не вказ."
                  className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">Корп.</label>
                <input
                  type="text"
                  name="korpus"
                  disabled={!!isRestricted}
                  value={formData.korpus || ''}
                  onChange={handleChange}
                  placeholder="не вказ."
                  className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300 mb-1">Кв.</label>
                <input
                  type="text"
                  name="kvartyra"
                  disabled={!!isRestricted}
                  value={formData.kvartyra || ''}
                  onChange={handleChange}
                  placeholder="не вказ."
                  className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">Освіта</label>
              <select
                name="id_osvita"
                disabled={!!isRestricted}
                value={formData.id_osvita || ''}
                onChange={handleChange}
                className={`w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4 ${(!formData.id_osvita || formData.id_osvita === 0 || String(formData.id_osvita) === '0' || String(formData.id_osvita) === '4') ? 'text-slate-400 font-normal' : 'text-white'}`}
              >
                <option value="" className="text-slate-400">не вказ.</option>
                {lookups?.osvita?.map((o: any) => (
                  <option key={o.ID} value={o.ID} className="text-white font-semibold">{o.Value}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">Соц. стан</label>
              <select
                name="id_socialniy"
                disabled={!!isRestricted}
                value={formData.id_socialniy || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              >
                <option value="" className="text-slate-400">не вказ.</option>
                {lookups?.socialniy?.map((s: any) => (
                  <option key={s.ID} value={s.ID} className="text-white font-semibold">{s.Value}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">Професія</label>
              <input
                type="text"
                name="s_profesiya_ukr"
                disabled={!!isRestricted}
                value={formData.s_profesiya_ukr === 'н/д' ? '' : (formData.s_profesiya_ukr || '')}
                onChange={handleChange}
                placeholder="не вказ."
                className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="block text-xs font-bold text-emerald-400 mb-1">ХВОРИЙ (Опис хвороби / Примітка по здоров'ю)</label>
              <input
                type="text"
                name="hvoryi"
                disabled={!!isRestricted}
                value={formData.hvoryi || ''}
                onChange={handleChange}
                placeholder="не вказ."
                className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <div className="flex items-center space-x-2 pt-5">
                <input
                  type="checkbox"
                  id="efile_checkbox"
                  checked={hasEfile}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      efile: e.target.checked ? true : ''
                    }));
                  }}
                  className="h-4 w-4 rounded border-[#333333] bg-[#262626] text-[#387d7a] focus:ring-[#387d7a] cursor-pointer"
                />
                <label htmlFor="efile_checkbox" className="text-xs font-semibold text-slate-300 select-none cursor-pointer">
                  Електронна папка (Google Drive)
                </label>
              </div>
            </div>


          </div>

          {hasEfile && (
            <div className="space-y-1 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="text-xs font-medium text-slate-300 block mb-1">Посилання на папку Google Drive</label>
              <input
                type="text"
                name="efile"
                value={efileValue}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    efile: e.target.value
                  }));
                }}
                placeholder="https://drive.google.com/..."
                className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
            </div>
          )}
        </div>

        {/* SECTION 2: Church info */}
        <div className="space-y-4 rounded-xl border border-[#333333] bg-[#1a1a1a] p-5 shadow-sm text-slate-100">
          <h3 className="text-sm font-bold text-[#387d7a] uppercase tracking-wider">2. ЦЕРКВА</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">Дата В.Х.</label>
              <input
                type="date"
                name="d_vodnogo"
                value={formData.d_vodnogo || ''}
                onChange={handleChange}
                placeholder="дд.мм.рррр"
                className={`w-max rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4 ${!formData.d_vodnogo ? 'text-slate-400 font-normal' : 'text-white'}`}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Дата прийн. в чл.</label>
              <input
                type="date"
                name="d_vstupu"
                value={formData.d_vstupu || ''}
                onChange={handleChange}
                placeholder="дд.мм.рррр"
                className={`w-max rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4 ${!formData.d_vstupu ? 'text-slate-400 font-normal' : 'text-white'}`}
              />
            </div>

            {formData.d_vodnogo && formData.d_vstupu && formData.d_vodnogo !== formData.d_vstupu && (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Перехід з іншої громади</label>
                  <input
                    type="text"
                    name="insha_gromada"
                    disabled={!!isRestricted}
                    value={formData.insha_gromada || ''}
                    onChange={handleChange}
                    placeholder="не вказ."
                    className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Примітка / Коментар</label>
                  <input
                    type="text"
                    name="prymitka"
                    disabled={!!isRestricted}
                    value={formData.prymitka || ''}
                    onChange={handleChange}
                    placeholder="не вказ."
                    className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                  />
                </div>
              </>
            )}
          </div>


          <div className="flex items-center space-x-2 pt-2 pb-4">
                  <input
                    type="checkbox"
                    id="hsd"
                    name="hsd"
                    checked={!!formData.hsd}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-[#333333] bg-[#262626] text-[#387d7a] focus:ring-[#387d7a]"
                  />
                  <label htmlFor="hsd" className="text-xs font-semibold text-slate-300 select-none">
                    Хр. С.Д.
                  </label>
                </div>

          <div className="border-t border-[#333333] pt-3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Column: Rayon and Caregiver */}
              <div className="md:col-span-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Район структури</label>
                  {hasSpecificRayonLock ? (
                    <div className="w-full rounded-lg border border-[#387d7a]/30 bg-[#387d7a]/10 p-2 text-xs font-bold text-teal-400">
                      {hasSpecificRayonLock}
                    </div>
                  ) : (
                    <select
                      name="rayon2_ukr"
                      value={formData.rayon2_ukr || ''}
                      onChange={handleChange}
                      className={`w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4 ${!formData.rayon2_ukr ? 'text-slate-400 font-normal' : 'text-white'}`}
                    >
                      <option value="" className="text-slate-400">не вказ.</option>
                      {STRUCTURAL_AREAS.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Опікун (Призначений служитель)</label>
                  <select
                    name="presviter"
                    value={formData.presviter || ''}
                    onChange={handleChange}
                    className={`w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4 ${!formData.presviter ? 'text-slate-400 font-normal' : 'text-white'}`}
                  >
                    <option value="" className="text-slate-400">не вказ.</option>
                    {caregiversList.map((c: string) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Прич. відсутності</label>
                  <select
                    name="prysutnist"
                    value={formData.prysutnist || ''}
                    onChange={handleChange}
                    className={`w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4 ${!formData.prysutnist ? 'text-slate-400 font-normal' : 'text-white'}`}
                  >
                    <option value="" className="text-slate-400">не вказ. (н/д)</option>
                    {prysutnistOptions.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const disciplineOptions = lookups?.directories?.dystsyplina || lookups?.directories?.['Дисципліна'] || [
                    "Попередження", "Вилучення"
                  ];
                  return (
                    <div className="space-y-3 pt-2 border-t border-[#333333]/40">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-300 block">Дисципл.</label>
                          <select
                            name="discipline"
                            value={formData.discipline || ''}
                            onChange={handleChange}
                            className={`w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4 ${!formData.discipline ? 'text-slate-400 font-normal' : 'text-white'}`}
                          >
                            <option value="" className="text-slate-400">немає</option>
                            {disciplineOptions.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-300 block">Прич. дисципл.</label>
                          <input
                            type="text"
                            name="discipline_reason"
                            value={formData.discipline_reason || ''}
                            onChange={handleChange}
                            placeholder="коротко..."
                            className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4 placeholder:text-slate-600"
                          />
                        </div>
                      </div>

                      {formData.discipline && (
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 block">Д. початку дії</label>
                            <input
                              type="date"
                              name="discipline_date_start"
                              value={formData.discipline_date_start || ''}
                              onChange={handleChange}
                              className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 block">Д. закінчення дії</label>
                            <input
                              type="date"
                              name="discipline_date_end"
                              value={formData.discipline_date_end || ''}
                              onChange={handleChange}
                              className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Ministry List */}
              <div className="md:col-span-7 space-y-1">
                <label className="text-xs font-semibold text-slate-300 block font-bold">Служіння, в яких може брати участь</label>
                {levelNum <= 3 ? (
                  <div className="border border-[#333333] rounded-lg p-2.5 bg-[#262626] h-[116px] overflow-y-auto space-y-1.5 balance-scroll text-white">
                    {(() => {
                      const selectedList = formData.sluj_uchast 
                        ? formData.sluj_uchast.split(/[,;]+/).map(s => s.trim()).filter(Boolean) 
                        : [];
                      if (selectedList.length === 0) {
                        return <span className="text-slate-500 italic text-xs">Служінь не вибрано</span>;
                      }
                      return selectedList.map((opt) => (
                        <div key={opt} className="flex items-center gap-2 text-xs font-bold text-[#387d7a] bg-[#387d7a]/10 rounded px-2 py-1 border border-[#387d7a]/30">
                          <span>• {opt}</span>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <div className="border border-[#333333] rounded-lg p-2.5 bg-[#262626] h-[116px] overflow-y-auto space-y-1.5 balance-scroll text-white">
                    {PARTICIPATION_MINISTRIES.map((opt) => {
                      const selectedList = formData.sluj_uchast 
                        ? formData.sluj_uchast.split(/[,;]+/).map(s => s.trim()).filter(Boolean) 
                        : [];
                      const isChecked = selectedList.includes(opt);
                      return (
                        <label 
                          key={opt} 
                          className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 hover:text-white font-bold"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let newList;
                              if (e.target.checked) {
                                newList = [...selectedList, opt];
                              } else {
                                newList = selectedList.filter(item => item !== opt);
                              }
                              const sortedNewList = PARTICIPATION_MINISTRIES.filter(o => newList.includes(o));
                              setFormData(prev => ({
                                ...prev,
                                sluj_uchast: sortedNewList.join(', ')
                              }));
                            }}
                            className="h-3.5 w-3.5 rounded border-[#333333] bg-[#1a1a1a] text-[#387d7a] focus:ring-[#387d7a] cursor-pointer"
                          />
                          <span className={isChecked ? 'font-bold text-[#387d7a] border-b border-[#387d7a]/30' : ''}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {levelNum > 3 && (
                  <p className="text-[10px] text-slate-400">Швидкий вибір активних служінь для списку.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Дільниця</label>
                <input
                  type="text"
                  name="n_dilyci"
                  value={formData.n_dilyci || ''}
                  onChange={handleChange}
                  placeholder="не вказ."
                  className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Відповідальний</label>
                <input
                  type="text"
                  name="vidpov_grupy"
                  value={formData.vidpov_grupy || ''}
                  onChange={handleChange}
                  placeholder="не вказ."
                  className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                />
              </div>
            </div>

            {/* General notes */}
            <div className="space-y-1 border-t border-[#333333] pt-3">
              <label className="text-xs font-medium text-slate-300">Загальна примітка</label>
              <textarea
                name="primitka"
                value={formData.primitka || ''}
                onChange={handleChange}
                placeholder="не вказ."
                rows={3}
                className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
            </div>

          </div>
        </div>

      </div>

    </form>
  );
}
