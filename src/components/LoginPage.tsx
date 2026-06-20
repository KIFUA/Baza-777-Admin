import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: any) => void;
  accessList: any[];
}

export default function LoginPage({ onLogin, accessList }: LoginPageProps) {
  const [selectedUser, setSelectedUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const users = Array.from(new Set(accessList.map(a => a.user))).filter(Boolean).sort();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = accessList.find(a => a.user === selectedUser);
    
    if (!user) {
        setError('Оберіть користувача');
        return;
    }

    const level = user.level || 'І-й';
    // Password check: only if level is NOT 'І-й' or if user actually set a password in the system for Level 1 as well? 
    // The user said: "без пароля вхід має бути для І рівня"
    if (level === 'І-й') {
        onLogin(user);
    } else {
        // Require password for level > І-й
        if (user.password === password) {
          onLogin(user);
        } else {
          setError('Невірний пароль');
        }
    }
  };

  return (
    <div className="fixed inset-0 bg-[#12282e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#13282e] border border-[#224853] rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
            <h1 className="text-2xl font-black text-white tracking-tighter">Вхід в систему</h1>
            <p className="text-slate-400 text-xs mt-2">Будь ласка, введіть ваші дані</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Користувач</label>
            <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <select 
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full bg-[#1a3843] border border-[#224853] text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
                >
                    <option value="">Оберіть зі списку...</option>
                    {users.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Пароль</label>
            <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#1a3843] border border-[#224853] text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    placeholder="Введіть пароль (необов'язково для І рівня)"
                />
            </div>
          </div>

          {error && <p className="text-rose-400 text-xs text-center font-bold">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-sky-700 hover:bg-sky-800 text-white font-bold py-2.5 rounded-lg transition-all"
          >
            Увійти
          </button>
        </form>
      </div>
    </div>
  );
}
