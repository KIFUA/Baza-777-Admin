import React, { useState } from 'react';
import { Lock, User, ShieldCheck } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: any, remember: boolean) => void;
  accessList: any[];
  rayonList?: string[];
  opikaBindings?: any[];
}

export default function LoginPage({ onLogin, accessList, rayonList = [], opikaBindings = [] }: LoginPageProps) {
  const [primaryType, setPrimaryType] = useState(''); // 'guest', 'district', or 'admin'
  const [selectedRayon, setSelectedRayon] = useState(''); // chosen district
  const [selectedGuardian, setSelectedGuardian] = useState(''); // 'ALL' or individual guardian name
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState('');

  // 1. Prepare access list & unique districts
  let displayAccessList = [...accessList];
  if (displayAccessList.length === 0) {
    displayAccessList = [{
      rayon: "ЦЕНТР",
      level: "IV-й",
      user: "Адміністратор",
      position: "Адміністратор",
      password: "777",
      telegramId: "969538290",
      email: "969538290"
    }];
  } else if (!displayAccessList.some(a => a.user === "Адміністратор")) {
    displayAccessList.push({
      rayon: "ЦЕНТР",
      level: "IV-й",
      user: "Адміністратор",
      position: "Адміністратор",
      password: "777",
      telegramId: "969538290",
      email: "969538290"
    });
  }

  // Get unique districts from database access list / rayonList (normalized and capitalized)
  const districts = Array.from(new Set([
    ...rayonList,
    ...displayAccessList.map(a => String(a.rayon || '').trim()),
    "АЕРОПОРТ", "КАСКАД", "ОБ'ЇЗНА", "ЦЕНТР"
  ].map(r => r.toUpperCase().trim())
   .filter(r => r && r !== 'ВСІ' && r !== 'ВСЕ' && r !== 'АДМІНІСТРАТОР')
  )).sort((a, b) => {
    const customOrder = ["АЕРОПОРТ", "КАСКАД", "ОБ'ЇЗНА", "ЦЕНТР"];
    const idxA = customOrder.indexOf(a);
    const idxB = customOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'uk');
  });

  // Get guardians belonging to selected district from official opika_bindings or displayAccessList
  const getGuardiansForDistrict = (district: string) => {
    // 1. First get all guardians from the system directories list (opikaBindings) for this district
    const systemGuardians = opikaBindings
      .filter((b: any) => b && String(b.rayon || '').trim().toUpperCase() === district.toUpperCase() && b.name)
      .map((b: any) => String(b.name || '').trim());

    // 2. Backup/Fallback merging with guardians found in access levels
    const accessGuardians = displayAccessList
      .filter(a => String(a.rayon || '').trim().toUpperCase() === district.toUpperCase() && a.user !== "Адміністратор" && a.user !== "Гість")
      .map(a => String(a.user || '').trim());

    // 3. Combine them and return unique list
    return Array.from(new Set([...systemGuardians, ...accessGuardians]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'uk'));
  };

  // Helper to find district leader (Level III prester or fallback to level IV or first user in that district)
  const findDistrictLeader = (rayon: string) => {
    let leader = displayAccessList.find(a => 
      String(a.rayon || '').trim().toUpperCase() === rayon.toUpperCase() && 
      (a.level === "ІІІ-й" || a.level?.includes('III') || a.level?.includes('ІІІ'))
    );
    if (!leader) {
      leader = displayAccessList.find(a => 
        String(a.rayon || '').trim().toUpperCase() === rayon.toUpperCase() && 
        (a.level === "IV-й" || a.level?.includes('IV') || a.level?.includes('ІV'))
      );
    }
    if (!leader) {
      leader = displayAccessList.find(a => String(a.rayon || '').trim().toUpperCase() === rayon.toUpperCase());
    }
    return leader;
  };

  // Determine current active user record we are logging in to
  const getTargetUser = () => {
    if (primaryType === 'guest') {
      return {
        user: "Гість",
        rayon: "ВСІ",
        level: "І-й",
        position: "Гість",
        password: ""
      };
    }
    if (primaryType === 'admin') {
      return displayAccessList.find(a => a.user === "Адміністратор" || a.position === "Адміністратор");
    }
    if (primaryType === 'district' && selectedRayon) {
      if (selectedGuardian === 'ALL') {
        return findDistrictLeader(selectedRayon);
      } else if (selectedGuardian) {
        // Look up if this specific guardian has an account in displayAccessList
        const existingUser = displayAccessList.find(a => 
          String(a.user || '').trim().toUpperCase() === selectedGuardian.trim().toUpperCase() && 
          String(a.rayon || '').trim().toUpperCase() === selectedRayon.toUpperCase()
        );
        
        // Find district leader to inherit password if this user doesn't have an explicit password
        const leader = findDistrictLeader(selectedRayon);
        const fallbackPassword = leader ? String(leader.password || '').trim() : '';

        if (existingUser) {
          // If the password is empty or "—", fall back to the leader's password
          const userPwd = String(existingUser.password || '').trim();
          const finalUser = !userPwd || userPwd === '—' 
            ? { ...existingUser, password: fallbackPassword }
            : existingUser;
          
          return {
            ...finalUser,
            level: "ІІ-й", // Force Level II so they are restricted to their care list
            isSoloGuardian: true,
            originalLevel: existingUser.level
          };
        }

        // Create a virtual user for this guardian
        return {
          user: selectedGuardian,
          rayon: selectedRayon.toUpperCase(),
          level: "ІІ-й", // Force Level II so they are restricted to their care list
          position: "Опікун",
          password: fallbackPassword,
          isSoloGuardian: true
        };
      }
    }
    return null;
  };

  const targetUser = getTargetUser();
  const isPasswordRequired = primaryType !== 'guest';
  const isPasswordCorrect = !isPasswordRequired || (!!targetUser && String(targetUser.password || '').trim() === password.trim());
  
  // Validation for instantly active submit button
  const isFormValid = !!primaryType && (
    primaryType === 'guest' || 
    (primaryType === 'admin' && isPasswordCorrect) ||
    (primaryType === 'district' && !!selectedRayon && !!selectedGuardian && isPasswordCorrect)
  );

  const handlePrimaryTypeChange = (val: string) => {
    setPrimaryType(val);
    setSelectedRayon('');
    setSelectedGuardian('');
    setPassword('');
    setError('');
  };

  const handleRayonChange = (val: string) => {
    setSelectedRayon(val);
    setSelectedGuardian('');
    setPassword('');
    setError('');
  };

  const handleGuardianChange = (val: string) => {
    setSelectedGuardian(val);
    setPassword('');
    setError('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      if (isPasswordRequired && !isPasswordCorrect) {
        setError('Невірний пароль');
      }
      return;
    }
    const target = getTargetUser();
    if (target) {
      onLogin(target, rememberDevice);
    } else {
      setError('Не вдалося знайти користувача в базі даних');
    }
  };

  const guardiansForDistrict = primaryType === 'district' && selectedRayon 
    ? getGuardiansForDistrict(selectedRayon) 
    : [];

  // Determine whether password field should be shown
  const showPasswordField = primaryType === 'admin' || (primaryType === 'district' && !!selectedRayon && !!selectedGuardian);

  return (
    <div className="fixed inset-0 bg-[#12282e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#13282e] border border-[#224853] rounded-2xl shadow-2xl p-8 space-y-6 transition-all duration-300">
        <div className="text-center">
          <h1 className="text-2xl font-black text-white tracking-tighter">Вхід в систему</h1>
          <p className="text-slate-400 text-xs mt-2">Будь ласка, оберіть роль та введіть пароль</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Поле 1: КОРИСТУВАЧ (dropdown) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              КОРИСТУВАЧ
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <select 
                value={primaryType}
                onChange={(e) => handlePrimaryTypeChange(e.target.value)}
                className="w-full bg-[#1a3843] border border-[#224853] text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer hover:bg-[#1f424f] duration-150"
              >
                <option value="">-- Оберіть користувача --</option>
                <option value="guest">Гість</option>
                <option value="district">Район</option>
                <option value="admin">Адміністратор</option>
              </select>
            </div>
          </div>

          {/* Поле 2: РАЙОН (dropdown) — Відображається тільки якщо вибрано "Район" */}
          {primaryType === 'district' && (
            <div className="space-y-1 transition-all duration-300">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                РАЙОН
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <select 
                  value={selectedRayon}
                  onChange={(e) => handleRayonChange(e.target.value)}
                  className="w-full bg-[#1a3843] border border-[#224853] text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer hover:bg-[#1f424f] duration-150"
                >
                  <option value="">-- Оберіть район --</option>
                  {districts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Поле 3: Опікун (dropdown) — Відображається тільки якщо вибрано конкретний район */}
          {primaryType === 'district' && selectedRayon && (
            <div className="space-y-1 transition-all duration-300">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                ОПІКУН
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <select 
                  value={selectedGuardian}
                  onChange={(e) => handleGuardianChange(e.target.value)}
                  className="w-full bg-[#1a3843] border border-[#224853] text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer hover:bg-[#1f424f] duration-150"
                >
                  <option value="">-- Оберіть опікуна --</option>
                  <option value="ALL">ВСІ ОПІКУНИ</option>
                  {guardiansForDistrict.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Поле 4: Пароль — Відображається згідно з умовами */}
          {showPasswordField && (
            <div className="space-y-1 transition-all duration-300">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Пароль
                </label>
                {password && isPasswordCorrect && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Пароль вірний
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className={`absolute left-3 top-3 h-4 w-4 transition-colors ${password && isPasswordCorrect ? 'text-emerald-400' : 'text-slate-400'}`} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className={`w-full bg-[#1a3843] border text-white rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none transition-all duration-200 focus:ring-2 ${
                    password && isPasswordCorrect 
                      ? 'border-emerald-500/80 focus:ring-emerald-500' 
                      : 'border-[#224853] focus:ring-sky-500'
                  }`}
                  placeholder="Введіть пароль"
                />
              </div>
            </div>
          )}

          {/* Чекбокс успішного збереження "Запам'ятати пристрій" */}
          <div className="flex items-center space-x-2 pt-1 transition-opacity duration-200">
            <input
              type="checkbox"
              id="rememberDevice"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="h-4 w-4 bg-[#1a3843] border border-[#224853] text-sky-600 rounded focus:ring-0 focus:ring-offset-0 cursor-pointer accent-sky-500"
            />
            <label htmlFor="rememberDevice" className="text-xs text-slate-300 select-none cursor-pointer font-medium hover:text-white duration-150">
              Запам'ятати цей пристрій
            </label>
          </div>

          {error && (
            <p className="text-rose-400 text-xs text-center font-bold bg-rose-500/10 py-1.5 px-2 rounded border border-rose-500/20">
              {error}
            </p>
          )}

          {/* Кнопка "Увійти" */}
          <button 
            type="submit"
            disabled={!isFormValid}
            className={`w-full font-bold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
              isFormValid 
                ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer hover:shadow-lg hover:shadow-sky-500/10 active:scale-[0.98]' 
                : 'bg-slate-700/40 text-slate-500 cursor-not-allowed border border-slate-700/20'
            }`}
          >
            Увійти
          </button>
        </form>
      </div>
    </div>
  );
}
