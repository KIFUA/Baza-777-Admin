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

  // Get locked rayon for Level <= 3
  const hasSpecificRayonLock = (() => {
    try {
      const cached = localStorage.getItem("baza_current_session_user");
      if (cached) {
        const sessionUser = JSON.parse(cached);
        if (sessionUser) {
          const getLevelNum = (lvl: string): number => {
            if (!lvl) return 1;
            const s = lvl.toUpperCase();
            if (s.includes('IV') || s.includes('ІV') || s.includes('4')) return 4;
            if (s.includes('III') || s.includes('ІІІ') || s.includes('3')) return 3;
            if (s.includes('II') || s.includes('ІІ') || s.includes('2')) return 2;
            return 1;
          };
          const levelNum = getLevelNum(sessionUser.level || 'І-й');
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
    const rawAreas = lookups?.directories?.rayon2 || [
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
    ];
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

  const caregiversList = lookups?.directories?.opika || [
    "Бевзюк В.", "Бурчак Ю.", "Галюк Б.", "Дмитраш М.", "Євстратов О.", 
    "Ільницький О.", "Луцак М.", "Марунчак В.", "Мельничук В.", "Несен Ю.", 
    "Прохніцький Б.", "Решетило Р.", "Самелюк О.", "Скіцко І.", "Скриник М.", 
    "Стасінчук В.", "Стафіїв М.", "Стефурак Д.", "Факас О.", "Черняк Вал.", 
    "Черняк Вікт.", "Шегда П.", "Шпарман Ю.", "Черняк Вас."
  ];

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

  const VYBUV_STATUS_ID = Number(formData.id_vybuttya || 0);
  const VYBUV_STATUS_TEXT = formData.s_vybuv_ukr || '';

  // Check conditional fields based on "Vybuttya" details (Request 06)
  // відп. = 2 or emicgr = 3 etc. Let's make it robust based on both ID and Ukrainian word
  const isSentOrEmigrated = VYBUV_STATUS_ID === 2 || VYBUV_STATUS_ID === 3 || VYBUV_STATUS_TEXT.includes("відп") || VYBUV_STATUS_TEXT.includes("емігр");
  const isExcommunicated = VYBUV_STATUS_ID === 4 || VYBUV_STATUS_TEXT.includes("вилуч") || VYBUV_STATUS_TEXT.includes("вивед");

  return (
    <form id="member_edit_form" onSubmit={handleSubmit} className="space-y-6">
      
      {/* Title & Actions bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            {isEdit ? "Редагування профайлу члена церкви" : "Реєстрація нового члена церкви"}
          </h2>
          <p className="text-xs text-slate-500">
            {isEdit ? `ID запису: ${formData.id}` : "Заповніть анкетні дані відповідно до паперового архіву"}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <X className="h-4 w-4" />
            <span>Скасувати</span>
          </button>
          <button
            type="submit"
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Зберегти зміни</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        
        {/* SECTION 1: Personal info */}
        <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">1. Персональні дані</h3>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Повне ПІБ *</label>
            <input
              type="text"
              name="pib"
              disabled={!!isRestricted}
              value={formData.pib}
              onChange={handleChange}
              placeholder="Прізвище Ім'я По-батькові"
              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold ring-blue-50 focus:border-blue-500 focus:outline-none focus:ring-4"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Стать / Роль</label>
              <select
                name="stat"
                disabled={!!isRestricted}
                value={formData.stat}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold ring-blue-50 focus:border-blue-500 focus:outline-none focus:ring-4"
              >
                <option value="брат">брат</option>
                <option value="сестра">сестра</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Дата народження</label>
              <input
                type="date"
                name="d_narodjennya"
                disabled={!!isRestricted}
                value={formData.d_narodjennya || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 p-1.5 bg-white text-xs font-semibold ring-blue-50 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Мобільний телефон</label>
            <input
              type="text"
              name="tel_mob"
              disabled={!!isRestricted}
              value={formData.tel_mob || ''}
              onChange={handleChange}
              placeholder="067 XX XX XXX"
              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Додатковий тел.</label>
              <input
                type="text"
                name="tel1"
                disabled={!!isRestricted}
                value={formData.tel1 || ''}
                onChange={handleChange}
                placeholder="Додатковий контакт"
                className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Скайп / Месенджер</label>
              <input
                type="text"
                name="skype"
                disabled={!!isRestricted}
                value={formData.skype || ''}
                onChange={handleChange}
                placeholder="skype username"
                className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Освіта</label>
            <select
              name="id_osvita"
              disabled={!!isRestricted}
              value={formData.id_osvita}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
            >
              {lookups?.osvita?.map((o: any) => (
                <option key={o.ID} value={o.ID}>{o.Value}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Професія</label>
            <select
              name="id_profesiya"
              disabled={!!isRestricted}
              value={formData.id_profesiya}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
            >
              {lookups?.profesiya?.map((p: any) => (
                <option key={p.ID} value={p.ID}>{p.Value}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Сімейний стан</label>
            <select
              name="id_simeyniy"
              disabled={!!isRestricted}
              value={formData.id_simeyniy}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
            >
              {lookups?.simeyniy?.map((s: any) => (
                <option key={s.ID} value={s.ID}>{s.Value}</option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTION 2: Spiritual life, caregiver & area */}
        <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">2. Духовне служіння й Адреса</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Покаяння дата</label>
              <input
                type="date"
                name="d_pokayannya"
                value={formData.d_pokayannya || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Водне хрещення</label>
              <input
                type="date"
                name="d_vodnogo"
                value={formData.d_vodnogo || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Дата членства</label>
              <input
                type="date"
                name="d_vstupu"
                value={formData.d_vstupu || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="hsd"
                name="hsd"
                checked={!!formData.hsd}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="hsd" className="text-xs font-semibold text-slate-700 select-none">
                Є Духовний дар (ХСД)
              </label>
            </div>
          </div>

          <div className="border-t border-slate-50 pt-3 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Опікун (призначений служитель громади)</label>
              <select
                name="presviter"
                value={formData.presviter || ''}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none bg-white text-slate-800"
              >
                <option value="">-- Оберіть опікуна --</option>
                {caregiversList.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">Розподіл опікунів, призначених пресвітерами з числа служителів нашої єдиної церковної громади (ст. пастор, пресвітери, диякони, відповідальні за служіння).</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block text-slate-800 font-bold">Духовні служіння (вибрані активні служіння)</label>
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 max-h-40 overflow-y-auto space-y-1.5 balance-scroll">
                {ministryOptions.map((opt) => {
                  const selectedList = formData.s_slujinnya_spysok 
                    ? formData.s_slujinnya_spysok.split(/[,;]+/).map(s => s.trim()).filter(Boolean) 
                    : [];
                  const isChecked = selectedList.includes(opt);
                  return (
                    <label 
                      key={opt} 
                      className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 hover:text-slate-900 font-bold"
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
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className={isChecked ? 'font-bold text-blue-900 border-b border-blue-100' : ''}>{opt}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400">Швидкий вибір активних служінь для списку (синхронізується з колонкою "СЛУЖІННЯ" в таблиці та базою даних).</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Дати контактів з пресвітером</label>
              <input
                type="text"
                name="d_kontaktiv"
                value={formData.d_kontaktiv || ''}
                onChange={handleChange}
                placeholder="напр. 25.03.26 / 17.10.25"
                className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400">Дати духовних та опікунських бесіди з пресвітерами (відображається в таблиці та картках).</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Район структури</label>
                {hasSpecificRayonLock ? (
                  <div className="w-full rounded-lg border border-teal-500/30 bg-teal-50/10 p-2 text-xs font-bold text-teal-600 dark:text-teal-400">
                    {hasSpecificRayonLock}
                  </div>
                ) : (
                  <select
                    name="rayon2_ukr"
                    value={formData.rayon2_ukr || ''}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Не вказано</option>
                    {STRUCTURAL_AREAS.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Дільниця (Група Акцесс)</label>
                <input
                  type="text"
                  name="n_dilyci"
                  value={formData.n_dilyci || ''}
                  onChange={handleChange}
                  placeholder="напр. Дільниця №1"
                  className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Відповідальний за групу</label>
              <input
                type="text"
                name="vidpov_grupy"
                value={formData.vidpov_grupy || ''}
                onChange={handleChange}
                placeholder="Керівник дільниці"
                className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Custom characteristics & Dismissal vybuttya with conditional notes */}
        <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">3. Ознаки та Зняття з обліку</h3>
          
          {/* Custom user attributes (Requests 8 and 9) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Характеристика Відвідуваності (вимоги 8)</label>
            <select
              name="vidviduvanist"
              value={formData.vidviduvanist || ''}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none bg-white"
            >
              <option value="">-- Оберіть характеристику --</option>
              {vidviduvanistOptions.map((o: string) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Причина відсутності</label>
            <select
              name="prysutnist"
              value={formData.prysutnist || ''}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none bg-white"
            >
              <option value="">-- Оберіть причину відсутності --</option>
              {prysutnistOptions.map((o: string) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Дія адміністратора (дільничі/дияконські переміщення - di_admin)</label>
            <select
              name="di_admin"
              value={formData.di_admin || ''}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none bg-white font-semibold"
            >
              <option value="">-- Оберіть дію адміністратора --</option>
              {diAdminOptions.map((o: string) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400">Дільничі або дияконські адміністративні одиниці (переведення на каскади та центри). Тільки для адміністративних переміщень членів церкви, які виконує адміністратор.</p>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 text-rose-600">Дисциплінарний статус обліку (06_VYBUTTYA)</label>
              <select
                name="id_vybuttya"
                value={formData.id_vybuttya}
                onChange={handleChange}
                className="w-full rounded-lg border border-rose-200 bg-rose-50/20 p-1.5 text-xs font-semibold focus:border-rose-500 focus:outline-none"
              >
                <option value="0">Активний член церкви (на обліку)</option>
                {lookups?.vybuv?.map((v: any) => (
                  <option key={v.ID} value={v.ID}>{v.Value}</option>
                ))}
              </select>
            </div>

            {/* CONDITIONAL FIELD TRIGGERING BASED ON OBTAINED VYBUTTYA CHOICE (User Request 06) */}
            {isSentOrEmigrated && (
              <div className="rounded-lg bg-teal-50 border border-teal-100 p-4 space-y-2 animate-fade-in">
                <div className="flex items-center space-x-1.5 text-teal-800 text-xs font-bold uppercase">
                  <Info className="h-4 w-4" />
                  <span>Куди саме вибув?</span>
                </div>
                <label className="text-[11px] font-medium text-teal-700">
                  Вкажіть країну, місто або іншу релігійну громаду, в яку відпущено або емігрував член:
                </label>
                <input
                  type="text"
                  name="vybutty_prymitka"
                  value={formData.vybutty_prymitka || ''}
                  onChange={handleChange}
                  placeholder="напр., емігрував в США, Сакраменто; або перейшов до громади м. Львів"
                  className="w-full rounded-lg border border-teal-200 bg-white p-2 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-200"
                  required
                />
              </div>
            )}

            {isExcommunicated && (
              <div className="rounded-lg bg-rose-50 border border-rose-100 p-4 space-y-2 animate-fade-in">
                <div className="flex items-center space-x-1.5 text-rose-800 text-xs font-bold uppercase">
                  <Info className="h-4 w-4" />
                  <span>За що саме вилучено/виведено?</span>
                </div>
                <label className="text-[11px] font-medium text-rose-700">
                  Вкажіть точну канонічну чи дисциплінарну причину вилучення:
                </label>
                <textarea
                  name="vybutty_prymitka"
                  value={formData.vybutty_prymitka || ''}
                  onChange={handleChange}
                  placeholder="напр., вилучено за гріх алкоголізму, або регулярне невідвідування зібрань"
                  rows={2}
                  className="w-full rounded-lg border border-rose-200 bg-white p-2 text-xs focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-200"
                  required
                />
              </div>
            )}

            {/* General notes */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Загальна Примітка</label>
              <textarea
                name="primitka"
                value={formData.primitka || ''}
                onChange={handleChange}
                placeholder="Будь-які інші архівні замітки про цього члена церкви..."
                rows={3}
                className="w-full rounded-lg border border-slate-200 p-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

        </div>

      </div>

    </form>
  );
}
