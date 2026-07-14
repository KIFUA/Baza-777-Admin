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
    testTelegramId: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
          testTelegramId: data.testTelegramId || ''
        });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
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
            <p className="mb-2">Система щопонеділка (о 11:00) та щосереди (о 11:00) автоматично формує списки і відправляє їх.</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong>Email:</strong> Оскільки сервер відправляє листи у фоні, вам потрібно створити <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 underline font-medium">Пароль додатку (App Password)</a> у вашому акаунті Google.</li>
              <li><strong>Telegram:</strong> Використовується Telegram Bot. Створіть бота через <a href="https://t.me/botfather" target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 underline font-medium">@BotFather</a> та вставте його токен нижче.</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-bold text-white border-b border-[#224853]/50 pb-2 text-sm flex items-center gap-2">
              <span className="bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Пн 11:00</span>
              Текстовий список
            </h4>
            
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
            <h4 className="font-bold text-white border-b border-[#224853]/50 pb-2 text-sm flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Ср 11:00</span>
              PDF формат A5
            </h4>
            
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

        {/* Test Mode Redirection Section */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 space-y-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
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
                placeholder="Введіть ваш Telegram ID (наприклад, 240931069)"
                className="w-full px-3 py-1.5 bg-[#0e2128] border border-[#224853] text-white rounded-md text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-slate-600 transition-colors"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                При активному режимі, повідомлення надходитимуть на цей ID з детальним описом того, кому вони мали бути відправлені.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1a3843]/60 px-4 py-3 border-t border-[#224853]/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-emerald-400">{message}</span>
          <button
            onClick={async () => {
              if(!confirm("Надіслати сповіщення керівникам про всіх, хто приєднався за останні 6 днів?")) return;
              try {
                const res = await fetch('/api/admin/notify-recent-members', { method: 'POST' });
                const data = await res.json();
                alert(`Готово! Опрацьовано людей: ${data.processed}. Надіслано сповіщень: ${data.sent}`);
              } catch (err) {
                alert('Помилка при відправці');
              }
            }}
            className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-indigo-500/30"
          >
            <Bell className="w-3.5 h-3.5" />
            Сповістити про нових (6 днів)
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 outline-none"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Збереження...' : 'Зберегти налаштування'}
        </button>
      </div>
    </div>
  );
}
