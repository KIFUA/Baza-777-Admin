import React, { useState, useEffect } from 'react';
import { Save, Bell, Info } from 'lucide-react';

export function NotificationSettings() {
  const [settings, setSettings] = useState({
    mondayEmails: '',
    wednesdayEmails: '',
    mondayTelegramIds: '',
    wednesdayTelegramIds: '',
    botToken: '',
    appPassword: '',
    enableTestMode: false,
    testTelegramId: '',
    notificationDays: 14,
    mondayMailingDay: 1,
    mondayMailingHour: 11,
    mondayMailingMinute: 0,
    wednesdayMailingDay: 3,
    wednesdayMailingHour: 11,
    wednesdayMailingMinute: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then(res => res.json())
      .then(data => {
        setSettings({
          mondayEmails: data.mondayEmails || '',
          wednesdayEmails: data.wednesdayEmails || '',
          mondayTelegramIds: data.mondayTelegramIds || '',
          wednesdayTelegramIds: data.wednesdayTelegramIds || '',
          botToken: data.botToken || '',
          appPassword: data.appPassword || '',
          enableTestMode: data.enableTestMode === true || data.enableTestMode === "true",
          testTelegramId: data.testTelegramId || '',
          notificationDays: data.notificationDays !== undefined ? data.notificationDays : 14,
          mondayMailingDay: data.mondayMailingDay !== undefined ? Number(data.mondayMailingDay) : 1,
          mondayMailingHour: data.mondayMailingHour !== undefined ? Number(data.mondayMailingHour) : 11,
          mondayMailingMinute: data.mondayMailingMinute !== undefined ? Number(data.mondayMailingMinute) : 0,
          wednesdayMailingDay: data.wednesdayMailingDay !== undefined ? Number(data.wednesdayMailingDay) : 3,
          wednesdayMailingHour: data.wednesdayMailingHour !== undefined ? Number(data.wednesdayMailingHour) : 11,
          wednesdayMailingMinute: data.wednesdayMailingMinute !== undefined ? Number(data.wednesdayMailingMinute) : 0
        });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSettings({ 
      ...settings, 
      [name]: type === 'number' ? parseInt(value) : value 
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage('Налаштування успішно збережено!');
      } else {
        setMessage('Помилка при збереженні.');
      }
    } catch (err) {
      setMessage('Помилка з\'єднання.');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Завантаження налаштувань...</div>;

  const UKR_DAYS = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];

  return (
    <div className="bg-[#13282e] rounded-xl border border-[#224853]/50 shadow-sm overflow-hidden mb-6 mt-4">
      <div className="bg-[#1a3843]/60 px-4 py-3 border-b border-[#224853]/50 flex items-center gap-2">
        <Bell className="w-4 h-4 text-emerald-400" />
        <h3 className="font-bold text-white text-xs uppercase tracking-widest">Автоматичні розсилки іменинників</h3>
      </div>
      
      <div className="p-5 space-y-6">
        <div className="bg-[#1a3843]/40 border border-[#224853] rounded-lg p-4 flex gap-3 text-xs text-slate-300">
          <Info className="w-5 h-5 flex-shrink-0 text-sky-400" />
          <div>
            <p className="font-bold text-white mb-1">Як працює автоматична розсилка?</p>
            <p className="mb-2">Система автоматично формує списки і відправляє їх у встановлений вами час (за часом Києва).</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong>Email:</strong> Оскільки сервер відправляє листи у фоні, вам потрібно створити <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 underline font-medium">Пароль додатку (App Password)</a> у вашому акаунті Google.</li>
              <li><strong>Telegram:</strong> Використовується Telegram Bot. Створіть бота через <a href="https://t.me/botfather" target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 underline font-medium">@BotFather</a> та вставте його токен нижче.</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#224853]/50 pb-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                Розсилка 1: Текстовий список
              </h4>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">День</label>
                <select 
                  name="mondayMailingDay" 
                  value={settings.mondayMailingDay} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {UKR_DAYS.map((day, idx) => (
                    <option key={idx} value={idx}>{day}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Година</label>
                <input 
                  type="number" 
                  name="mondayMailingHour" 
                  min="0" 
                  max="23" 
                  value={settings.mondayMailingHour} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Хв.</label>
                <input 
                  type="number" 
                  name="mondayMailingMinute" 
                  min="0" 
                  max="59" 
                  value={settings.mondayMailingMinute} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Електронні адреси (через кому)</label>
              <input 
                type="text" 
                name="mondayEmails" 
                value={settings.mondayEmails} 
                onChange={handleChange}
                placeholder="email1@gmail.com, email2@gmail.com"
                className="w-full px-3 py-2 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Telegram Chat IDs (через кому)</label>
              <input 
                type="text" 
                name="mondayTelegramIds" 
                value={settings.mondayTelegramIds} 
                onChange={handleChange}
                placeholder="240931069, 858036501"
                className="w-full px-3 py-2 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#224853]/50 pb-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                Розсилка 2: PDF формат A5
              </h4>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">День</label>
                <select 
                  name="wednesdayMailingDay" 
                  value={settings.wednesdayMailingDay} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {UKR_DAYS.map((day, idx) => (
                    <option key={idx} value={idx}>{day}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Година</label>
                <input 
                  type="number" 
                  name="wednesdayMailingHour" 
                  min="0" 
                  max="23" 
                  value={settings.wednesdayMailingHour} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Хв.</label>
                <input 
                  type="number" 
                  name="wednesdayMailingMinute" 
                  min="0" 
                  max="59" 
                  value={settings.wednesdayMailingMinute} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Електронні адреси (через кому)</label>
              <input 
                type="text" 
                name="wednesdayEmails" 
                value={settings.wednesdayEmails} 
                onChange={handleChange}
                placeholder="email1@gmail.com"
                className="w-full px-3 py-2 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Telegram Chat IDs (через кому)</label>
              <input 
                type="text" 
                name="wednesdayTelegramIds" 
                value={settings.wednesdayTelegramIds} 
                onChange={handleChange}
                placeholder="240931069"
                className="w-full px-3 py-2 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0e2128]/50 p-4 rounded-lg border border-[#224853]/50">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Telegram Bot Token</label>
            <input 
              type="password" 
              name="botToken" 
              value={settings.botToken} 
              onChange={handleChange}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full px-3 py-2 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 transition-colors font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1.5">Отримайте токен у @BotFather</p>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">App Password (Gmail)</label>
            <input 
              type="password" 
              name="appPassword" 
              value={settings.appPassword} 
              onChange={handleChange}
              placeholder="16-значний код"
              className="w-full px-3 py-2 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-600 transition-colors font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1.5">Для відправки листів з kostel.if.ua@gmail.com</p>
          </div>
        </div>

        {/* Additional Services Section */}
        <div className="border-t border-[#224853]/30 pt-4 mt-2">
          <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest mb-2.5">Додаткові сервіси</h4>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-indigo-600/10 border border-indigo-500/30 rounded-lg overflow-hidden transition-all">
              <button
                onClick={async () => {
                  if(!confirm(`Надіслати сповіщення керівникам про всіх нових членів, хто приєднався за останні ${settings.notificationDays || 14} днів?`)) return;
                  try {
                    const res = await fetch('/api/admin/notify-recent-members', { 
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ days: settings.notificationDays || 14 })
                    });
                    const data = await res.json();
                    alert(`Готово! Опрацьовано людей: ${data.processed}. Надіслано сповіщень: ${data.sent}`);
                  } catch (err) {
                    alert('Помилка при відправці');
                  }
                }}
                className="flex items-center gap-1.5 hover:bg-indigo-600 text-indigo-400 hover:text-white px-3 py-1.5 text-[10px] font-bold transition-all outline-none border-r border-indigo-500/20"
              >
                <Bell className="w-3.5 h-3.5" />
                Сповістити про нових членів
              </button>
              <select 
                value={settings.notificationDays || 14}
                onChange={(e) => setSettings({ ...settings, notificationDays: parseInt(e.target.value) })}
                className="bg-transparent text-indigo-300 text-[10px] font-bold px-2 py-1.5 outline-none cursor-pointer hover:bg-indigo-600/20 appearance-none text-center min-w-[60px]"
              >
                <option value={7} className="bg-[#13282e]">7 днів</option>
                <option value={14} className="bg-[#13282e]">14 днів</option>
                <option value={30} className="bg-[#13282e]">30 днів</option>
                <option value={60} className="bg-[#13282e]">60 днів</option>
                <option value={90} className="bg-[#13282e]">90 днів</option>
              </select>
            </div>

            <button
              onClick={() => setShowTestModal(true)}
              className="flex items-center gap-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-amber-500/30 outline-none"
            >
              ⚙️ Режим тестування бота та перенаправлення
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#1a3843]/60 px-4 py-3 border-t border-[#224853]/50 flex justify-between items-center">
        <span className="text-xs font-bold text-emerald-400">{message}</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 outline-none"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Збереження...' : 'Зберегти налаштування'}
        </button>
      </div>

      {/* Test Mode Redirection Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
          <div className="bg-[#13282e] border border-amber-500/30 rounded-xl p-5 max-w-md w-full shadow-2xl relative space-y-4">
            <button 
              onClick={() => setShowTestModal(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white text-sm outline-none"
            >
              ✕
            </button>
            
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 flex-shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="font-bold text-amber-400 text-xs uppercase tracking-wider mb-1">Режим тестування бота та перенаправлення</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Оскільки Telegram забороняє надсилати повідомлення користувачам, які не натиснули <strong>СТАРТ</strong> у боті, ви можете увімкнути тестовий режим. 
                  Усі сповіщення для керівників районів будуть надходити <strong>особисто вам</strong> на тестовий ID. Ви зможете перевірити роботу бота без залучення керівників.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#224853]/40">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="enableTestMode"
                  name="enableTestMode"
                  checked={settings.enableTestMode}
                  onChange={(e) => setSettings({ ...settings, enableTestMode: e.target.checked })}
                  className="w-4 h-4 rounded border-[#224853] bg-[#0e2128] text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                />
                <label htmlFor="enableTestMode" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                  Увімкнути тестовий режим (перенаправлення)
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Ваш тестовий Telegram Chat ID
                </label>
                <input 
                  type="text"
                  name="testTelegramId"
                  value={settings.testTelegramId}
                  onChange={handleChange}
                  placeholder="наприклад, 240931069"
                  className="w-full px-3 py-1.5 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-slate-600 transition-colors font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#224853]/40">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-3 py-1.5 bg-[#1a3843]/80 hover:bg-[#1a3843] text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors outline-none"
              >
                Скасувати
              </button>
              <button
                onClick={async () => {
                  await handleSave();
                  setShowTestModal(false);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors outline-none"
              >
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
