import React, { useState, useEffect } from 'react';
import { Member } from '../types';
import { Save, X, Info } from 'lucide-react';

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
    zaklad_osv: '',
    tel_mob: '',
    tel1: '',
    skype: '',
    d_narodjennya: '',
    presviter: '',
    rayon2_ukr: hasSpecificRayonLock || '',
    id_rayon2: '',
    n_dilyci: 'Дільниця №1',
    id_dilnicya: '1',
    vidpov_grupy: '',
    d_pokayannya: '',
    d_vodnogo: '',
    hsd: false,
    d_vstupu: '',
    vidviduvanist: '',
    prysutnist: '',
    di_admin: '',
    id_vybuttya: 0,
    s_vybuv_ukr: '',
    vybutty_prymitka: '',
    hvoryi: '',
    insha_gromada: '',
    primitka: ''
  });

  useEffect(() => {
    if (member) {
      setFormData({ ...member });
    } else if (hasSpecificRayonLock) {
      setFormData(prev => ({ ...prev, rayon2_ukr: hasSpecificRayonLock }));
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

      if (name === 'pib') {
        const pibVal = value.trim();
        const parts = pibVal.split(/\s+/).filter(Boolean);
        if (parts.length >= 3) {
          const patronymic = parts[2].toLowerCase();
          if (patronymic.endsWith('на') || patronymic.endsWith('ва')) {
            updated.stat = 'сестра';
          } else if (patronymic.endsWith('ич')) {
            updated.stat = 'брат';
          }
        } else if (parts.length >= 2) {
          const secondWord = parts[1].toLowerCase();
          if (secondWord.endsWith('на') || secondWord.endsWith('ва')) {
            updated.stat = 'сестра';
          } else if (secondWord.endsWith('ич')) {
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

  const skypeString = formData.skype || '';
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
          <h3 className="text-sm font-bold text-[#387d7a] uppercase tracking-wider">1. Персональні дані</h3>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Повне ПІБ *</label>
            <input
              type="text"
              name="pib"
              disabled={!!isRestricted}
              value={formData.pib}
              onChange={handleChange}
              placeholder="Прізвище Ім'я По-батькові"
              style={{ width: '200.793px' }}
              className="rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Дата народж.</label>
            <input
              type="date"
              name="d_narodjennya"
              disabled={!!isRestricted}
              value={formData.d_narodjennya || ''}
              onChange={handleChange}
              style={{ width: '100.793px' }}
              className="rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Мобільний телефон</label>
              <input
                type="text"
                name="tel_mob"
                disabled={!!isRestricted}
                value={formData.tel_mob || ''}
                onChange={handleChange}
                placeholder="067 XX XX XXX"
                style={{ width: '115.575px' }}
                className="rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Додатковий тел.</label>
              <input
                type="text"
                name="tel1"
                disabled={!!isRestricted}
                value={formData.tel1 || ''}
                onChange={handleChange}
                placeholder="Додатковий контакт"
                style={{ width: '115.583px' }}
                className="rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Месенджери</label>
            <div className="flex gap-1.5">
              <select
                value={currentLabel}
                onChange={(e) => handleMessengerLabelChange(e.target.value)}
                disabled={!!isRestricted}
                style={{ width: '59.995px' }}
                className="rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4 shrink-0"
              >
                <option value="Telegram">Telegram</option>
                <option value="Viber">Viber</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Skype">Skype</option>
                <option value="Інше">Інше</option>
              </select>
              <input
                type="text"
                disabled={!!isRestricted}
                value={currentHandle}
                onChange={(e) => handleMessengerHandleChange(e.target.value)}
                placeholder="@username або телефон"
                style={{ width: '130.175px' }}
                className="rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Освіта</label>
            <select
              name="id_osvita"
              disabled={!!isRestricted}
              value={formData.id_osvita}
              onChange={handleChange}
              className="w-fit min-w-[160px] max-w-full block rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
            >
              {lookups?.osvita?.map((o: any) => (
                <option key={o.ID} value={o.ID}>{o.Value}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Професія</label>
            <select
              name="id_profesiya"
              disabled={!!isRestricted}
              value={formData.id_profesiya}
              onChange={handleChange}
              className="w-fit min-w-[160px] max-w-full block rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
            >
              {lookups?.profesiya?.map((p: any) => (
                <option key={p.ID} value={p.ID}>{p.Value}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Сімейний стан</label>
            <select
              name="id_simeyniy"
              disabled={!!isRestricted}
              value={formData.id_simeyniy}
              onChange={handleChange}
              className="w-fit min-w-[160px] max-w-full block rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
            >
              {lookups?.simeyniy?.map((s: any) => (
                <option key={s.ID} value={s.ID}>{s.Value}</option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTION 2: Spiritual life, caregiver & area */}
        <div className="space-y-4 rounded-xl border border-[#333333] bg-[#1a1a1a] p-5 shadow-sm text-slate-100">
          <h3 className="text-sm font-bold text-[#387d7a] uppercase tracking-wider">2. Духовне служіння й Адреса</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Дата покаяння</label>
              <input
                type="date"
                name="d_pokayannya"
                value={formData.d_pokayannya || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Дата В.Х.</label>
              <input
                type="date"
                name="d_vodnogo"
                value={formData.d_vodnogo || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Дата прийняття в члени</label>
              <input
                type="date"
                name="d_vstupu"
                value={formData.d_vstupu || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-6">
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
          </div>

          <div className="border-t border-[#333333] pt-3 space-y-4">
            {/* РАЙОН СТРУКТУРИ - Перенесено перед Опікун */}
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
                  className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                >
                  <option value="">Не вказано</option>
                  {STRUCTURAL_AREAS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Опікун (Призначений служитель)</label>
              <select
                name="presviter"
                value={formData.presviter || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              >
                <option value="">-- Оберіть опікуна --</option>
                {caregiversList.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">Розподіл опікунів, призначених пресвітерами з числа служителів нашої єдиної церковної громади (ст. пастор, пресвітери, диякони, відповідальні за служіння).</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block font-bold">Служіння, в яких може брати участь</label>
              {levelNum <= 3 ? (
                <div className="border border-[#333333] rounded-lg p-2.5 bg-[#262626] max-h-40 overflow-y-auto space-y-1.5 balance-scroll text-white">
                  {(() => {
                    const selectedList = formData.s_slujinnya_spysok 
                      ? formData.s_slujinnya_spysok.split(/[,;]+/).map(s => s.trim()).filter(Boolean) 
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
                <div className="border border-[#333333] rounded-lg p-2.5 bg-[#262626] max-h-40 overflow-y-auto space-y-1.5 balance-scroll text-white">
                  {ministryOptions.map((opt) => {
                    const selectedList = formData.s_slujinnya_spysok 
                      ? formData.s_slujinnya_spysok.split(/[,;]+/).map(s => s.trim()).filter(Boolean) 
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
                            const sortedNewList = ministryOptions.filter(o => newList.includes(o));
                            setFormData(prev => ({
                              ...prev,
                              s_slujinnya_spysok: sortedNewList.join(', ')
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
                <p className="text-[10px] text-slate-400">Швидкий вибір активних служінь для списку (синхронізується з колонкою "СЛУЖІННЯ" в таблиці та базою даних).</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Дати контактів</label>
              <input
                type="text"
                name="d_kontaktiv"
                value={formData.d_kontaktiv || ''}
                onChange={handleChange}
                placeholder="напр. 25.03.26 / 17.10.25"
                className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
              />
              <p className="text-[10px] text-slate-400">Дати духовних та опікунських бесіди з пресвітерами (відображається в таблиці та картках).</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Дільниця</label>
                <input
                  type="text"
                  name="n_dilyci"
                  value={formData.n_dilyci || ''}
                  onChange={handleChange}
                  placeholder="напр. Дільниця №1"
                  className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Відповідальний за групу</label>
                <input
                  type="text"
                  name="vidpov_grupy"
                  value={formData.vidpov_grupy || ''}
                  onChange={handleChange}
                  placeholder="Керівник дільниці"
                  className="w-full rounded-lg border border-[#333333] p-1.5 bg-[#262626] text-white placeholder-slate-500 text-xs font-semibold ring-emerald-500/10 focus:border-[#387d7a] focus:outline-none focus:ring-4"
                />
              </div>
            </div>

            {/* General notes moved here from Section 3 */}
            <div className="space-y-1 border-t border-[#333333] pt-3">
              <label className="text-xs font-medium text-slate-300">Загальна Примітка</label>
              <textarea
                name="primitka"
                value={formData.primitka || ''}
                onChange={handleChange}
                placeholder="Будь-які інші архівні замітки про цього члена церкви..."
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
