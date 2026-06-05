import React, { useState, useEffect } from 'react';
import { Member } from './types';
import StatsDashboard from './components/StatsDashboard';
import PastoralCareManager from './components/PastoralCareManager';
import HistoryJournal from './components/HistoryJournal';
import MemberProfile from './components/MemberProfile';
import MemberForm from './components/MemberForm';
import SpreadsheetView from './components/SpreadsheetView';
import DirectoriesManager from './components/DirectoriesManager';
import { 
  Users, UserCheck, Heart, Shield, History, BarChart3, Search, 
  MapPin, Phone, UserPlus, Filter, RotateCcw, ChevronLeft, ChevronRight, BookOpen,
  Table2, Lock
} from 'lucide-react';

export default function App() {
  // System State
  const [members, setMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [lookups, setLookups] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [spreadsheetLoading, setSpreadsheetLoading] = useState(true);
  
  // High level UI Modes: 'spreadsheet' (СПИСОК) or 'questionnaire' (АНКЕТИ) or 'settings' (НАЛАШТУВАННЯ)
  const [mainMode, setMainMode] = useState<'spreadsheet' | 'questionnaire' | 'settings'>('spreadsheet');
  const [activeTab, setActiveTab] = useState<'members' | 'pastoral' | 'history' | 'stats'>('members');
  const [activeAnketaId, setActiveAnketaId] = useState<number | null>(null);

  // Interactive local session simulator based on Google Sheet tab "ДОСТУП"
  const [currentSessionUser, setCurrentSessionUser] = useState<any>(null);

  // Directory Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // default to 'active' for church management!
  const [caregiverFilter, setCaregiverFilter] = useState('');

  // Active Selected Context
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      // Build search query url params
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (genderFilter) params.append('gender', genderFilter);
      
      // Force rayon segment constraint if restricted session is active
      const targetRayon = currentSessionUser?.rayon || areaFilter;
      if (targetRayon) params.append('area', targetRayon);

      if (groupFilter) params.append('group', groupFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (caregiverFilter) params.append('caretaker', caregiverFilter);

      const resp = await fetch(`/api/members?${params.toString()}`);
      if (resp.ok) {
        const json = await resp.json();
        setMembers(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMembers = async () => {
    setSpreadsheetLoading(true);
    try {
      const resp = await fetch('/api/members?status='); // empty status returns all records
      if (resp.ok) {
        const json = await resp.json();
        setAllMembers(json);
      }
    } catch (err) {
      console.error("Error loading spreadsheet members:", err);
    } finally {
      setSpreadsheetLoading(false);
    }
  };

  const fetchLookupsAndStats = async () => {
    try {
      const lookResp = await fetch('/api/lookups');
      if (lookResp.ok) {
        const lookJson = await lookResp.json();
        setLookups(lookJson);
      }
      
      const statsResp = await fetch('/api/stats');
      if (statsResp.ok) {
        const statsJson = await statsResp.json();
        setStats(statsJson);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const preloadRawFirebase = async () => {
    try {
      const res = await fetch('/api/firebase/members.json');
      if (res.ok) {
        const data = await res.json();
        (window as any).__bazaRawFirebaseData = data;
        console.log("Preloaded/Refreshed raw firebase database successfully");
      }
    } catch (err) {
      console.error("Failed to preload raw firebase database:", err);
    }
  };

  useEffect(() => {
    fetchMembers();
    setCurrentPage(1); // reset to page 1 on filter changes
  }, [searchQuery, genderFilter, areaFilter, groupFilter, statusFilter, caregiverFilter, currentSessionUser]);

  useEffect(() => {
    fetchLookupsAndStats();
    fetchAllMembers();
    preloadRawFirebase();
  }, []);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeAnketaId) {
        setActiveAnketaId(null);
        await fetchAllMembers();
        await fetchMembers();
        await preloadRawFirebase();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAnketaId]);

  const handleSpreadsheetUpdate = async (id: number, updatedFields: Partial<Member>) => {
    try {
      const resp = await fetch(`/api/members/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (resp.ok) {
        // Optimistically update both sets of data in react state
        setAllMembers(prev => prev.map(m => m.id === id ? { ...m, ...updatedFields } : m));
        setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updatedFields } : m));
        await fetchLookupsAndStats();
        return true;
      }
    } catch (err) {
      console.error("Error saving inline spreadsheet update:", err);
    }
    alert("Помилка під час швидкого збереження.");
    return false;
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setGenderFilter('');
    setAreaFilter('');
    setGroupFilter('');
    setStatusFilter('active');
    setCaregiverFilter('');
  };

  // Create or Update form save callback
  const handleSaveMember = async (data: Partial<Member>) => {
    try {
      const url = editingMember ? `/api/members/${editingMember.id}` : '/api/members';
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (resp.ok) {
        const resJson = await resp.json();
        setShowForm(false);
        setEditingMember(null);
        
        // Refresh
        await fetchMembers();
        await fetchAllMembers();
        await fetchLookupsAndStats();
        
        if (!editingMember && resJson.memberId) {
          // If created new, navigate to details immediately
          setSelectedMemberId(resJson.memberId);
        } else if (editingMember) {
          // Keep active view open
          setSelectedMemberId(editingMember.id);
        }
      } else {
        alert("Помилка під час збереження профайлу.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Navigate to spouse or related member from links
  const handleNavigateToMember = (id: number) => {
    setSelectedMemberId(id);
    setShowForm(false);
    setEditingMember(null);
  };

  // Determine Unique Lists for Filter dropdowns dynamically from lookups or master records
  const getUniqueAreas = () => {
    if (lookups?.selo) {
      // Can extract distinct area labels or custom ones
    }
    const set = new Set(members.map(m => m.rayon2_ukr).filter(Boolean));
    return Array.from(set).sort();
  };

  const getUniqueGroups = () => {
    const set = new Set(members.map(m => m.n_dilyci).filter(Boolean));
    return Array.from(set).sort();
  };

  const getUniqueCaregivers = () => {
    const set = new Set(members.map(m => m.presviter).filter(Boolean));
    return Array.from(set).sort();
  };

  // Calculate Paginated slice of members
  const totalRecords = members.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMembers = members.slice(startIndex, startIndex + pageSize);

  const activeStatsCount = members.filter(m => m.id_vybuttya === 0).length;

  return (
    <div className="h-screen flex flex-col font-sans select-none antialiased overflow-hidden" style={{ backgroundColor: '#264653' }}>
      
      <div className="w-full max-w-[1100px] mx-auto flex flex-col h-full min-h-0 px-4">
        {/* SLIM TOP BAR (MIMICKING PHOTO 1) */}
        <div className="text-white py-3 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="text-[10px] font-bold text-slate-300 leading-tight">
              СЬОГОДНІ: {new Date().toLocaleDateString('uk-UA')}<br/>
              ОНОВЛЕНО: {new Date().toLocaleTimeString('uk-UA')}
            </div>
            
            <div className="bg-[#1a3843] border border-[#142d36] rounded-md px-6 py-2 ml-10 flex text-lg font-black tracking-widest text-[#cfdfe2]">
              ВСІ <span className="ml-8">{members.length}</span>
            </div>
          </div>

          <nav className="flex space-x-2">
            <button
              onClick={() => { setMainMode('spreadsheet'); setSelectedMemberId(null); setShowForm(false); }}
              className={`px-5 py-2 text-xs font-bold transition-all rounded-md tracking-wider uppercase ${mainMode === 'spreadsheet' ? "bg-[#387d7a] text-white shadow-sm" : "bg-[#1a3843] text-slate-300 hover:bg-[#254b52]"}`}
            >
              СПИСОК
            </button>
            <button
              title="Перейти до анкет"
              onClick={() => { setMainMode('questionnaire'); setSelectedMemberId(null); setShowForm(false); }}
              className={`px-5 py-2 text-xs font-bold transition-all rounded-md tracking-wider uppercase ${mainMode === 'questionnaire' ? "bg-[#387d7a] text-white shadow-sm" : "bg-[#1a3843] text-slate-300 hover:bg-[#254b52]"}`}
            >
              АНКЕТИ
            </button>
            <button
              className="px-5 py-2 text-xs font-bold rounded-md tracking-wider uppercase bg-[#1a3843] text-slate-400 opacity-50 cursor-not-allowed"
            >
              ОПІКА
            </button>
            <button
              className="px-5 py-2 text-xs font-bold rounded-md tracking-wider uppercase bg-[#1a3843] text-slate-400 opacity-50 cursor-not-allowed"
            >
              СТАТ-КА
            </button>
          </nav>
        </div>

        {/* 2. MAIN HUB CANVAS CONTENT */}
        <main className="flex-1 min-h-0 w-full pb-2 flex flex-col">
        
        {/* Detail Visualizer or Edit forms overlay views */}
        {(selectedMemberId !== null && mainMode !== 'questionnaire') ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedMemberId(null)}
              className="group flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest pl-1 py-1"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Вернутись до списку</span>
            </button>
            <div className="bg-white rounded-2xl border border-slate-100 p-1.5 shadow-sm">
              <MemberProfile
                memberId={selectedMemberId}
                onClose={() => setSelectedMemberId(null)}
                onEdit={(m) => { setEditingMember(m); setShowForm(true); setSelectedMemberId(null); }}
                onNavigateToMember={handleNavigateToMember}
                lookups={lookups}
              />
            </div>
          </div>
        ) : showForm ? (
          <div className="space-y-4">
            <button
              onClick={() => { setShowForm(false); setEditingMember(null); }}
              className="flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest pl-1 py-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>До списку членів</span>
            </button>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <MemberForm
                member={editingMember}
                lookups={lookups}
                onSave={handleSaveMember}
                onCancel={() => { setShowForm(false); setEditingMember(null); }}
              />
            </div>
          </div>
        ) : (
          /* General Hub selectors switcher */
          <div className="flex-1 flex flex-col min-h-0">
            {mainMode === 'spreadsheet' ? (
              spreadsheetLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"></div>
                  <span className="text-xs text-slate-400 font-bold tracking-widest uppercase animate-pulse">Зчитування даних таблиці...</span>
                </div>
              ) : (
                <SpreadsheetView
                  members={allMembers}
                  lookups={lookups}
                  onOpenProfile={(id) => {
                    setActiveAnketaId(id);
                  }}
                  onUpdateMember={handleSpreadsheetUpdate}
                />
              )
            ) : mainMode === 'questionnaire' ? (
              /* Questionnaire Legacy Embedded View */
              <div className="flex-1 flex flex-col min-h-0 bg-[#333333] overflow-hidden -mx-2 -mb-2 rounded-t-lg border-t border-[#1a3843]">
                {/* Visual Utility Bar to help transition from iframe to standalone window */}
                <div className="bg-[#222222] px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-[#1a1a1a]">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded-md font-bold text-[9px] tracking-wider uppercase">
                      Єдина База Даних
                    </span>
                    <span className="text-[11px] font-bold text-slate-300">
                      Спільна база даних та сервер — синхронізація 100% миттєва!
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const idParam = selectedMemberId ? `&id=${selectedMemberId}` : '';
                        window.open(`/index_legacy.html?merge=before${idParam}`, '_blank');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] px-4.5 py-1.5 rounded-md shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>📋 ВІДКРИТИ В ОКРЕМОМУ ПОВНОМУ ВІКНІ ↗</span>
                    </button>
                    {selectedMemberId && (
                      <button
                        onClick={async () => {
                          setSelectedMemberId(null);
                          await fetchAllMembers();
                          await fetchMembers();
                        }}
                        className="bg-zinc-700 hover:bg-zinc-600 hover:text-white px-3 py-1.5 text-[11px] text-slate-200 font-bold rounded-md transition-colors cursor-pointer"
                      >
                        Очистити вибір
                      </button>
                    )}
                  </div>
                </div>
                <iframe src={`/index_legacy.html?merge=before${selectedMemberId ? `&id=${selectedMemberId}` : ''}`} className="w-full h-full border-0" title="Legacy Questionnaire"></iframe>
              </div>
            ) : mainMode === 'settings' ? (
              <DirectoriesManager
                lookups={lookups}
                onRefreshLookups={fetchLookupsAndStats}
                currentSessionUser={currentSessionUser}
                onSetSessionUser={setCurrentSessionUser}
                members={allMembers}
              />
            ) : null}
          </div>
        )}

      </main>

      {/* 3. PORTAL FOOTER CREDENTIAL INDICATOR */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-[10px] font-mono text-center py-3.5 mt-auto">
        Архівно-адміністративний кабінет громади • Версія Громади №2.5 (Access Migrated Engine) • {new Date().getFullYear()}
      </footer>

      </div>

      {/* Legacy Anketa Overlay Tool Suite (No tab navigation required) */}
      {activeAnketaId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 md:p-10 animate-fade-in">
          <div className="bg-[#1b1b1b] w-full max-w-7xl h-full rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-emerald-800/40">
            {/* Elegant Header with control suite */}
            <div className="bg-[#142327] border-b border-emerald-900/40 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <h3 className="text-white text-sm md:text-base font-extrabold tracking-wide uppercase">
                    Картка особи в реальному часі • ID {activeAnketaId}
                  </h3>
                  <p className="text-[10px] md:text-xs text-emerald-400 font-medium">
                    Спільний локальний кеш та Firebase Realtime Database. Синхронізація 100% залізна!
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 shrink-0">
                <button
                  onClick={() => window.open(`/index_legacy.html?merge=before&id=${activeAnketaId}`, '_blank')}
                  className="bg-[#0e3b2a] hover:bg-[#15563e] border border-emerald-700/60 text-emerald-300 font-bold text-xs py-2 px-3.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
                  title="Відкрити анкету цієї особи в новому повному вікні"
                >
                  <span>Відкрити в новому вікні ↗</span>
                </button>
                
                <button
                  onClick={async () => {
                    setActiveAnketaId(null);
                    // Refresh parent lists with any newly saved profile details
                    setSpreadsheetLoading(true);
                    await fetchAllMembers();
                    await fetchMembers();
                    await preloadRawFirebase();
                    setSpreadsheetLoading(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2 px-5 rounded-lg transition-all cursor-pointer shadow-md transform active:scale-95"
                >
                  ЗБЕРЕГТИ & ЗАКРИТИ (Esc)
                </button>
              </div>
            </div>

            {/* Embedded legacy frame */}
            <div className="flex-1 bg-[#222222] relative">
              <iframe 
                src={`/index_legacy.html?merge=before&id=${activeAnketaId}`} 
                className="w-full h-full border-0 absolute inset-0" 
                title="Legacy Modal Interactive Questionnaire"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
