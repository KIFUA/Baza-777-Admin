import React, { useState, useEffect } from 'react';
import { Save, Bell, Info, Plus, Trash2, Mail, Send } from 'lucide-react';

import { PrintExport } from './PrintExport';
import { AppSettings, TelegramBotConnector } from '../types';

export function NotificationSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = async (updatedSettings?: AppSettings) => {
    const toSave = updatedSettings || settings;
    if (!toSave) return;

    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave)
      });
      if (res.ok) {
        setMessage('Налаштування успішно збережено!');
        const data = await res.json();
        if (data.settings) setSettings(data.settings);
      } else {
        setMessage('Помилка при збереженні.');
      }
    } catch (err) {
      setMessage('Помилка з\'єднання.');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const addTelegramBot = () => {
    if (!settings) return;
    const newBot: TelegramBotConnector = {
      id: `bot_${Date.now()}`,
      name: `Бот ${settings.connectors.telegramBots.length + 1}`,
      token: ''
    };
    const newSettings = {
      ...settings,
      connectors: {
        ...settings.connectors,
        telegramBots: [...settings.connectors.telegramBots, newBot]
      }
    };
    setSettings(newSettings);
  };

  const removeTelegramBot = (id: string) => {
    if (!settings) return;
    if (settings.connectors.telegramBots.length <= 1) {
      alert("Має бути хоча б один бот.");
      return;
    }
    const newSettings = {
      ...settings,
      connectors: {
        ...settings.connectors,
        telegramBots: settings.connectors.telegramBots.filter(b => b.id !== id)
      }
    };
    setSettings(newSettings);
  };

  const updateBot = (id: string, field: keyof TelegramBotConnector, value: string) => {
    if (!settings) return;
    const newSettings = {
      ...settings,
      connectors: {
        ...settings.connectors,
        telegramBots: settings.connectors.telegramBots.map(b => 
          b.id === id ? { ...b, [field]: value } : b
        )
      }
    };
    setSettings(newSettings);
  };

  const updateEmail = (field: string, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      connectors: {
        ...settings.connectors,
        email: {
          ...settings.connectors.email,
          [field]: value
        }
      }
    });
  };

  if (loading || !settings) return <div className="p-8 text-center text-slate-400">Завантаження налаштувань...</div>;

  return (
    <div className="bg-[#13282e] rounded-xl border border-[#224853]/50 shadow-sm overflow-hidden mb-6 mt-4">
      <div className="bg-[#1a3843]/60 px-4 py-3 border-b border-[#224853]/50 flex items-center gap-2">
        <Send className="w-4 h-4 text-emerald-400" />
        <h3 className="font-bold text-white text-xs uppercase tracking-widest">Керування конекторами (Telegram & Email)</h3>
      </div>
      
      <div className="p-5 space-y-8">
        <div className="bg-[#1a3843]/40 border border-[#224853] rounded-lg p-4 flex gap-3 text-xs text-slate-300">
          <Info className="w-5 h-5 flex-shrink-0 text-sky-400" />
          <div>
            <p className="font-bold text-white mb-1">Налаштування каналів зв'язку</p>
            <p className="mb-2">Тут ви фіксуєте параметри підключення до зовнішніх сервісів. Ці конектори потім використовуються в різних частинах додатку (наприклад, для розсилки іменинників).</p>
          </div>
        </div>

        {/* Telegram Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#224853]/50 pb-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Send className="w-4 h-4 text-sky-400" />
              Telegram Боти
            </h4>
            <button 
              onClick={addTelegramBot}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded text-[10px] font-bold transition-all border border-emerald-500/30"
            >
              <Plus className="w-3 h-3" />
              Додати бота
            </button>
          </div>

          <div className="space-y-3">
            {settings.connectors.telegramBots.map((bot) => (
              <div key={bot.id} className="bg-[#0e2128] border border-[#224853] p-4 rounded-lg flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                <div className="flex-1 w-full space-y-3 sm:space-y-0 sm:flex sm:gap-4">
                  <div className="sm:w-1/4">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Назва бота</label>
                    <input 
                      type="text"
                      value={bot.name}
                      onChange={(e) => updateBot(bot.id, 'name', e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#1a3843]/40 border border-[#224853] text-white rounded text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="Напр. Основний бот"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Token (від @BotFather)</label>
                    <input 
                      type="password"
                      value={bot.token}
                      onChange={(e) => updateBot(bot.id, 'token', e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#1a3843]/40 border border-[#224853] text-white rounded text-xs focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                      placeholder="123456789:ABCdef..."
                    />
                  </div>
                </div>
                <button 
                  onClick={() => removeTelegramBot(bot.id)}
                  className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
                  title="Видалити бота"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Email Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#224853]/50 pb-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400" />
              Email (SMTP Gmail)
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0e2128] border border-[#224853] p-4 rounded-lg">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Gmail Адреса</label>
              <input 
                type="text" 
                value={settings.connectors.email.user} 
                onChange={(e) => updateEmail('user', e.target.value)}
                placeholder="kostel.if.ua@gmail.com"
                className="w-full px-3 py-2 bg-[#1a3843]/40 border border-[#224853] text-white rounded text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">App Password (16-значний)</label>
              <input 
                type="password" 
                value={settings.connectors.email.appPassword} 
                onChange={(e) => updateEmail('appPassword', e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full px-3 py-2 bg-[#1a3843]/40 border border-[#224853] text-white rounded text-xs focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1.5">Створіть у налаштуваннях безпеки Google акаунта.</p>
            </div>
          </div>
        </section>
      </div>

      <div className="bg-[#1a3843]/60 px-4 py-3 border-t border-[#224853]/50 flex justify-between items-center">
        <span className="text-xs font-bold text-emerald-400">{message}</span>
        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 outline-none"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Збереження...' : 'Зберегти конектори'}
        </button>
      </div>
    </div>
  );
}
